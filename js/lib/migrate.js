// Zet de oude database-indeling (een node per categorie) om naar de nieuwe structuur.
// Puur rekenwerk zonder Firebase: geeft een lijst met database-updates en een verslag terug.
import { CATEGORIES, LISTS, PATHS } from "../config.js";
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
  return kept.join(" · ");
}

/** Zet één oud item om naar het nieuwe formaat. */
export function convertItem(old, categoryId, now = Date.now()) {
  const link = cleanUrl(old.link || "");
  const item = {
    title: cleanTitle(old.title, old.link),
    link,
    category: categoryId,
    favorite: old.favorite === true,
    createdAt: toTimestamp(old.dateAdded, now)
  };
  const price = normalizePrice(old.price);
  if (price !== null) item.price = price;
  const image = safeUrl(old.image, { upgrade: true });
  if (image) item.image = image;
  if (old.note) item.note = String(old.note).slice(0, 500);
  return item;
}

/**
 * @param {object} root  De oude database (bijv. de JSON-export of losse categorie-nodes).
 * @returns {{ updates: Record<string, any>, report: object }}
 *   `updates` kun je in één keer aan Firebase `update(ref(db), updates)` geven.
 */
export function planMigration(root, now = Date.now()) {
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
    tempLinks: 0
  };
  const bump = (key) => (report.perDestination[key] = (report.perDestination[key] || 0) + 1);

  const legacyCategory = Object.fromEntries(CATEGORIES.map((c) => [c.legacy, c]));
  const legacyList = Object.fromEntries(LISTS.filter((l) => l.legacy).map((l) => [l.legacy, l]));

  for (const [nodeName, node] of Object.entries(root || {})) {
    if (!node || typeof node !== "object") continue;
    if (nodeName === "tempLinks") {
      for (const [key, url] of Object.entries(node)) {
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
      if (!old || typeof old !== "object" || !old.link) continue;
      const categoryId = category ? category.id : "overig";
      const item = convertItem(old, categoryId, now);

      if (item.link !== String(old.link).trim()) report.linksCleaned++;
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
  return { updates, report };
}
