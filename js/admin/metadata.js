// Haalt titel, foto en (als de winkel hem meegeeft) prijs op bij een productlink.
// Browsers mogen winkelpagina's niet zelf uitlezen (CORS), daarom via Microlink:
// die dienst krijgt alleen de productlink te zien. Het gratis gebruik heeft een daglimiet.
import { normalizePrice, safeUrl, titleFromUrl } from "../lib/util.js";

const ENDPOINT = "https://api.microlink.io/";

export class MetadataError extends Error {
  constructor(message, { rateLimited = false } = {}) {
    super(message);
    this.rateLimited = rateLimited;
  }
}

/**
 * @returns {Promise<{ title: string, image: string, price: number|null }>}
 * @throws {MetadataError}
 */
export async function fetchProductInfo(url) {
  const params = new URLSearchParams({
    url,
    palette: "false",
    audio: "false",
    video: "false",
    iframe: "false",
    // Productgegevens (schema.org) staan bij de meeste winkels in JSON-LD; daar zit ook de prijs.
    "data.ld.selectorAll": 'script[type="application/ld+json"]',
    "data.ld.attr": "html",
    "data.metaPrice.selector": 'meta[property="product:price:amount"]',
    "data.metaPrice.attr": "content"
  });

  let res, body;
  try {
    res = await fetch(`${ENDPOINT}?${params}`, { headers: { Accept: "application/json" } });
    body = await res.json();
  } catch {
    throw new MetadataError("Geen verbinding met de ophaaldienst.");
  }
  if (res.status === 429 || /rate limit/i.test(body?.message || "")) {
    throw new MetadataError("Automatisch ophalen lukt vandaag niet meer (daglimiet bereikt).", { rateLimited: true });
  }
  if (!res.ok || body.status !== "success") {
    throw new MetadataError("Deze winkel geeft zijn gegevens niet vrij.");
  }

  const d = body.data || {};
  const product = findProduct(d.ld);
  const offer = [].concat(product?.offers || [])[0] || {};
  const price =
    normalizePrice(offer.price ?? offer.lowPrice ?? offer.priceSpecification?.price) ?? normalizePrice(d.metaPrice);
  const ldImage = [].concat(product?.image || [])[0];

  // Sommige winkels (zoals bol) geven alleen hun eigen naam als titel terug: dan liever de productnaam.
  const genericTitle = !d.title || /^(bol|bol\.com|amazon(\.\w+)?)$/i.test(d.title.trim());
  // Sommige winkels (bol) geven aan zo'n dienst alleen een productnummer als naam; dan liever de naam uit de link.
  const usable = (t) => (t && !/^[\d\s-]+$/.test(String(t).trim()) ? String(t) : "");
  return {
    title: cleanShopTitle(usable(product?.name) || (genericTitle ? "" : usable(d.title)) || titleFromUrl(url)),
    image: safeUrl(d.image?.url || (typeof ldImage === "string" ? ldImage : ldImage?.url), { upgrade: true }),
    price
  };
}

/** Zoekt het Product-blok in de JSON-LD van een pagina (ook als het in een @graph zit). */
export function findProduct(ldScripts) {
  for (const raw of [].concat(ldScripts || [])) {
    // Microlink geeft de blokken meestal al uitgepakt terug, soms nog als tekst.
    let parsed = raw;
    if (typeof raw === "string") {
      try { parsed = JSON.parse(raw.replace(/^<script[^>]*>|<\/script>$/gi, "")); } catch { continue; }
    }
    const nodes = [].concat(parsed).flatMap((n) => [n, ...[].concat(n?.["@graph"] || [])]);
    const product = nodes.find((n) => [].concat(n?.["@type"] || []).some((t) => /product/i.test(t)));
    if (product) return product;
  }
  return null;
}

/** Haalt winkelnaam-staartjes weg: "Sony HT-S40R | Coolblue | Soundbars" -> "Sony HT-S40R". */
function cleanShopTitle(title) {
  return title
    .replace(/\s*\|\s*(coolblue|bol(\.com)?|bruna|ikea|hema|etsy|amazon\.\w+)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}
