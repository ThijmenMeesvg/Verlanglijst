// Kleine hulpfuncties zonder afhankelijkheden (ook te testen met `node --test`).
import { CATEGORIES, PRICE_BANDS } from "../config.js";

// ---------- Veilig tonen ----------

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Maakt tekst veilig om in HTML te zetten (ook binnen attributen). */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Geeft alleen http(s)-links terug; al het andere (javascript:, data:, rommel) wordt "". */
export function safeUrl(value, { upgrade = false } = {}) {
  if (!value) return "";
  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (upgrade && url.protocol === "http:") url.protocol = "https:";
    return url.href;
  } catch {
    return "";
  }
}

// ---------- Prijzen ----------

const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

/** Prijs als getal, of null als hij onbekend is (0, leeg of ongeldig telt als onbekend). */
export function normalizePrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parsePrice(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/** Leest "12,95", "€ 1.299,00", "1,299.00" of "24.5" als getal. */
export function parsePrice(text) {
  if (typeof text === "number") return text;
  let s = String(text ?? "").replace(/[^\d.,]/g, "");
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");          // 1.299,95 -> 1299.95
  } else if (lastDot > lastComma && lastComma !== -1) {
    s = s.replace(/,/g, "");                              // 1,299.95 -> 1299.95
  } else if (lastComma === -1 && (s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, "");                             // 1.299.000 -> 1299000
  }
  return parseFloat(s);
}

/** Is dit een bedrag dat iemand zou typen? "24,95", "€ 1.299,00", "15" wel; "12,5x" of "abc" niet. */
export function isValidPriceText(text) {
  return /^\s*€?\s*\d{1,3}(?:[.\s]?\d{3})*(?:[.,]\d{1,2})?\s*(?:€|euro)?\s*$/i.test(String(text ?? ""));
}

export function formatPrice(value) {
  const n = normalizePrice(value);
  return n === null ? "Prijs onbekend" : euro.format(n);
}

// ---------- Links ----------

// Parameters die alleen tracking/advertentie zijn. Variant-keuzes (kleur, maat) blijven staan.
const TRACKING_PARAMS = new Set([
  "gclid", "gbraid", "wbraid", "gad_source", "gad_campaignid", "dclid", "fbclid", "msclkid", "yclid",
  "igshid", "mc_cid", "mc_eid", "srsltid", "_gl", "bltgh", "referrer", "ref", "ref_",
  "content_source", "logging_key", "organic_search_click", "sr_prefetch", "pf_from",
  "bfgb", "wt_mc", "wt_cc1", "cq_cmp", "channable", "_pos", "_sid", "_ss", "admitad_uid",
  "content-id", "aicid", "exp_dlv", "exp_price", "gsattrs"
]);
const TRACKING_PREFIXES = ["utm_", "pd_rd_", "pf_rd_", "ga_", "pk_", "mtm_", "hsa_"];
// Parameters die alleen op een bepaalde winkel tracking zijn (elders kunnen ze iets betekenen).
const SHOP_TRACKING = {
  "bol.com": ["cid"],
  "etsy.com": ["ls", "sts", "pro", "frs", "pop", "external"]
};

/** Haalt tracking-parameters (utm, gclid, …) en Amazons /ref=…-stukje uit een link. */
export function cleanUrl(value) {
  const href = safeUrl(value);
  if (!href) return String(value ?? "").trim();
  const url = new URL(href);
  const shopSpecific = SHOP_TRACKING[shopName(href)] || [];
  let changed = false;
  for (const key of [...url.searchParams.keys()]) {
    const k = key.toLowerCase();
    if (TRACKING_PARAMS.has(k) || shopSpecific.includes(k) || TRACKING_PREFIXES.some((p) => k.startsWith(p))) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  const path = url.pathname.replace(/\/ref=.*$/i, "");                // Amazon: /ref=…/sessie-id
  if (path !== url.pathname) { url.pathname = path; changed = true; }
  if (!changed) return String(value).trim();          // niets weg te halen: link precies laten zoals hij was
  url.hash = "";
  return url.href.replace(/\?$/, "");
}

/** Vergelijkbare vorm van een link, om dubbele items te herkennen. */
export function linkKey(value) {
  const cleaned = cleanUrl(value);
  return cleaned
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

/** "www.bol.com" -> "bol.com", "eu.stance.com" -> "stance.com", "shop.dopper.com" -> "dopper.com". */
export function shopName(value) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    if (parts.length <= 2) return host;
    const twoPartTld = /^(co|com|org|net)\.[a-z]{2}$/.test(parts.slice(-2).join("."));
    return parts.slice(twoPartTld ? -3 : -2).join(".");
  } catch {
    return "";
  }
}

/** Maakt een leesbare titel uit een productlink, bv. ".../the-girl-who-loved-tom-gordon/9200…" -> "The Girl Who Loved Tom Gordon". */
export function titleFromUrl(value) {
  try {
    const segments = new URL(value).pathname.split("/").filter(Boolean);
    const candidates = segments
      .map((s) => decodeURIComponent(s).replace(/\.(html?|php)$/i, ""))
      .filter((s) => s.includes("-") && /[a-z]/i.test(s) && !/^\d+$/.test(s.replace(/-/g, "")));
    if (!candidates.length) return "";
    const best = candidates.sort((a, b) => b.length - a.length)[0];
    return best
      .split("-")
      .filter((w) => w && !/^\d{6,}$/.test(w))
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
      .trim();
  } catch {
    return "";
  }
}

// ---------- Datums ----------

/** Zet "2025-10-30", een tijdstempel of niets om naar milliseconden. */
export function toTimestamp(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : fallback;
}

const dateFmt = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });
export function formatDate(ts) {
  return ts ? dateFmt.format(new Date(ts)) : "";
}

// ---------- Categorieën ----------

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES.find((c) => c.id === "overig");
}

// ---------- Filteren en sorteren ----------

function normalizeText(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Filtert items. `claims` is een object { itemId: {...} } met wat al gegeven wordt.
 * Opties: q (zoektekst), cat (categorie-id), band (prijsband-id), hideClaimed (bool).
 */
export function filterItems(items, { q = "", cat = "", band = "", hideClaimed = false } = {}, claims = {}) {
  const words = normalizeText(q).split(/\s+/).filter(Boolean);
  const priceBand = PRICE_BANDS.find((b) => b.id === band);
  return items.filter((item) => {
    if (cat && item.category !== cat) return false;
    if (hideClaimed && claims[item.id]) return false;
    if (priceBand) {
      const p = normalizePrice(item.price);
      if (p === null || p < priceBand.min || p >= priceBand.max) return false;
    }
    if (words.length) {
      const haystack = normalizeText(`${item.title} ${item.note || ""} ${shopName(item.link)} ${categoryById(item.category).label}`);
      if (!words.every((w) => haystack.includes(w))) return false;
    }
    return true;
  });
}

/** Sorteert: openstaande items altijd boven al-gegeven items, daarbinnen volgens `sort`. */
export function sortItems(items, sort = "nieuw", claims = {}) {
  const priceOrNull = (i) => normalizePrice(i.price);
  const byPrice = (dir) => (a, b) => {
    const pa = priceOrNull(a), pb = priceOrNull(b);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1;            // onbekende prijs altijd achteraan
    if (pb === null) return -1;
    return dir * (pa - pb);
  };
  const newest = (a, b) => (b.createdAt || 0) - (a.createdAt || 0);
  const compare = {
    nieuw: newest,
    goedkoop: byPrice(1),
    duur: byPrice(-1),
    favoriet: (a, b) => (b.favorite === true) - (a.favorite === true) || newest(a, b)
  }[sort] || newest;

  return [...items].sort((a, b) => {
    const ca = claims[a.id] ? 1 : 0, cb = claims[b.id] ? 1 : 0;
    return ca - cb || compare(a, b);
  });
}

/** Telt per categorie hoeveel (nog open) items er zijn. */
export function countByCategory(items) {
  const counts = {};
  for (const item of items) counts[item.category] = (counts[item.category] || 0) + 1;
  return counts;
}

/** Korte, unieke-genoeg id voor nieuwe items (database-sleutels mogen geen . # $ [ ] / bevatten). */
export function newId() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `i${Date.now().toString(36)}${rand}`;
}

/** Een veilige sleutel voor in een URL-hash of HTML-id. */
export function domId(id) {
  return "item-" + encodeURIComponent(id).replace(/%/g, "_");
}
