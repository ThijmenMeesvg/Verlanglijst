// Zet de oude database-indeling (een node per categorie) om naar de nieuwe structuur.
// Puur rekenwerk zonder Firebase: geeft een lijst met database-updates en een verslag terug.
import { CATEGORIES, LIMITS, LISTS, PATHS } from "../config.js";
import { cleanUrl, normalizePrice, safeUrl, titleFromUrl, toTimestamp } from "./util.js";

// Nodes in de root die geen oude categorie zijn en dus overgeslagen worden.
const NON_LEGACY = new Set(["v2", "wishlist", "private", "admins", "tempLinks"]);

/** Ruimt een oude titel op: spaties, "Onbekend product", ISBN-staartjes. */
export function cleanTitle(title, link) {
  let t = String(title ?? "").replace(/\s+/g, " ").trim();
  if (!t || /^onbekend product$/i.test(t)) t = titleFromUrl(link) || "Naamloos item";
  // "La Mesa Mexicana, Rosa Cienfuegos | Boek | 9789461433596" -> "La Mesa Mexicana, Rosa Cienfuegos"
  const parts = t.split(" | ").map((p) => p.trim()).filter(Boolean);
  const kept = parts.filter((p, i) => i === 0 || !(/^\d[\d-]{9,}$/.test(p) || /^boek$/i.test(p)));
  return clip(kept.join(" · "), LIMITS.title);
}

function clip(text, max) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Een oude link zonder http(s):// ("www.bol.com/…") alsnog bruikbaar maken; anders "". */
function repairLink(raw) {
  const text = String(raw ?? "").trim();
  const candidate = safeUrl(text) ? text : /^[\w-]+(\.[\w-]+)+(\/|$)/.test(text) ? `https://${text}` : "";
  const url = candidate ? cleanUrl(candidate) : "";
  return url && safeUrl(url) && url.length <= LIMITS.link ? url : "";
}

/**
 * Zet één oud item om naar het nieuwe formaat, binnen de grenzen van de databaseregels.
 * Geeft null terug als het item geen bruikbare link heeft (dan kan het niet automatisch over).
 */
export function convertItem(old, categoryId, now = Date.now()) {
  const link = repairLink(old.link);
  if (!link) return null;
  const item = {
    title: cleanTitle(old.title, old.link),
    link,
    category: categoryId,
    favorite: old.favorite === true,
    createdAt: toTimestamp(old.dateAdded, now)
  };
  const price = normalizePrice(old.price);
  if (price !== null && price <= LIMITS.maxPrice) item.price = price;
  const image = safeUrl(old.image, { upgrade: true });
  if (image && image.length <= LIMITS.image) item.image = image;
  if (old.note) item.note = clip(String(old.note), LIMITS.note);
  return item;
}

/** Namen van alle oude mappen die na de overstap opgeruimd mogen worden. */
export const LEGACY_NODES = [
  ...CATEGORIES.map((c) => c.legacy),
  ...LISTS.filter((l) => l.legacy).map((l) => l.legacy),
  "tempLinks",
  "v2"
];

/**
 * @param {object} root  De oude database (bijv. de JSON-export of losse categorie-nodes).
 * @param {number} [now]
 * @param {Set<string>} [existingIds]  Ids die al in de nieuwe indeling staan (in welke lijst of het archief dan ook).
 *   Die worden overgeslagen, zodat opnieuw overzetten nooit latere wijzigingen overschrijft.
 * @returns {{ updates: Record<string, any>, report: object }}
 *   `updates` kun je in één keer aan Firebase `update(ref(db), updates)` geven.
 */
export function planMigration(root, now = Date.now(), existingIds = new Set()) {
  const updates = {};
  const report = {
    perDestination: {},          // { "Openbaar · Boeken": 8, "Cadeaus": 3, ... }
    total: 0,
    claims: 0,
    linksCleaned: 0,
    titlesChanged: [],
    unknownPrices: [],
    noImage: [],
    unknownNodes: [],
    tempLinks: 0,
    skipped: 0,
    notMovable: []       // items zonder bruikbare link: niet overgezet, gaan verloren bij opruimen
  };
  const bump = (key) => (report.perDestination[key] = (report.perDestination[key] || 0) + 1);

  const legacyCategory = Object.fromEntries(CATEGORIES.map((c) => [c.legacy, c]));
  const legacyList = Object.fromEntries(LISTS.filter((l) => l.legacy).map((l) => [l.legacy, l]));

  for (const [nodeName, node] of Object.entries(root || {})) {
    if (!node || typeof node !== "object") continue;
    if (nodeName === "tempLinks") {
      for (const [key, url] of Object.entries(node)) {
        if (existingIds.has(key)) continue;
        if (typeof url === "string" && url.trim()) {
          updates[`${PATHS.tempLinks}/${key}`] = { url: url.trim(), at: now };
          report.tempLinks++;
        }
      }
      continue;
    }
    if (NON_LEGACY.has(nodeName)) continue;

    const category = legacyCategory[nodeName];
    const privateList = legacyList[nodeName];
    if (!category && !privateList) report.unknownNodes.push(nodeName);

    for (const [key, old] of Object.entries(node)) {
      if (!old || typeof old !== "object") continue;
      if (existingIds.has(key)) { report.skipped++; continue; }
      const categoryId = category ? category.id : "overig";
      const item = convertItem(old, categoryId, now);
      if (!item) {
        report.notMovable.push(`${String(old.title || key).slice(0, 80)} (${nodeName})`);
        continue;
      }

      if (item.link !== String(old.link ?? "").trim()) report.linksCleaned++;
      if (item.title !== String(old.title ?? "").trim()) report.titlesChanged.push({ from: old.title, to: item.title });
      if (item.price === undefined) report.unknownPrices.push(item.title);
      if (!item.image) report.noImage.push(item.title);

      // Privélijst: de oude privé-categorie, of een openbaar item dat op privé stond.
      const targetList = privateList || (old.private === true ? LISTS.find((l) => l.id === "voorMij") : null);
      if (targetList) {
        if (old.done === true) item.done = true;
        updates[`${PATHS.privateList(targetList.id)}/${key}`] = item;
        bump(targetList.short);
      } else {
        updates[`${PATHS.items}/${key}`] = item;
        if (old.done === true) {
          // Het echte moment is onbekend; de toevoegdatum zorgt dat bezoekers het niet meer kunnen terugdraaien.
          updates[`${PATHS.claims}/${key}`] = { at: item.createdAt };
          report.claims++;
        }
        bump(`Openbaar · ${CATEGORIES.find((c) => c.id === categoryId).label}`);
      }
      report.total++;
    }
  }
  // Markeert dat de nieuwe indeling in gebruik is, zodat de site nooit meer terugvalt op de oude
  // (ook niet als je later alle openbare items archiveert).
  if (report.total) updates[`${PATHS.settings}/migratedAt`] = now;
  return { updates, report };
}
