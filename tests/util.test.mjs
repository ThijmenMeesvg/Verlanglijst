// Draaien met: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml, safeUrl, normalizePrice, parsePrice, formatPrice, isValidPriceText, cleanUrl, linkKey, shopName,
  titleFromUrl, toTimestamp, filterItems, sortItems, domId
} from "../js/lib/util.js";

test("escapeHtml maakt tekst veilig", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert(1)">`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(escapeHtml(null), "");
});

test("safeUrl laat alleen http(s) door", () => {
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("data:text/html,hoi"), "");
  assert.equal(safeUrl("geen url"), "");
  assert.equal(safeUrl("https://bol.com/x"), "https://bol.com/x");
  assert.equal(safeUrl("http://kikkerlandeu.com/a.jpg", { upgrade: true }), "https://kikkerlandeu.com/a.jpg");
});

test("prijzen", () => {
  assert.equal(parsePrice("12,95"), 12.95);
  assert.equal(parsePrice("€ 1.299,00"), 1299);
  assert.equal(parsePrice("1,299.50"), 1299.5);
  assert.equal(parsePrice("24.5"), 24.5);
  assert.equal(parsePrice("24.95"), 24.95);
  assert.equal(parsePrice("1.299"), 1299);
  assert.equal(parsePrice("12.999"), 12999);
  assert.equal(normalizePrice(0), null);
  assert.equal(normalizePrice(""), null);
  assert.equal(normalizePrice("7,5"), 7.5);
  assert.equal(formatPrice(0), "Prijs onbekend");
  assert.match(formatPrice(24.75), /24,75/);
});

test("cleanUrl haalt tracking weg maar laat varianten staan", () => {
  assert.equal(
    cleanUrl("https://www.dille-kamille.nl/x-00041763.html?channable=40f&gad_source=1&gclid=abc"),
    "https://www.dille-kamille.nl/x-00041763.html"
  );
  assert.equal(
    cleanUrl("https://estherbennink.nl/products/seizoenenlamp-eiken?variant=53223664255308"),
    "https://estherbennink.nl/products/seizoenenlamp-eiken?variant=53223664255308"
  );
  assert.equal(
    cleanUrl("https://www.etsy.com/nl/listing/1/pet?ls=r&ref=hp&sts=1&variation0=3115857029"),
    "https://www.etsy.com/nl/listing/1/pet?variation0=3115857029"
  );
  assert.equal(
    cleanUrl("https://www.bol.com/nl/nl/p/rooted/9300000071182734/?cid=1&bltgh=x&Referrer=ADV"),
    "https://www.bol.com/nl/nl/p/rooted/9300000071182734/"
  );
  assert.equal(
    cleanUrl("https://www.amazon.nl/Ravensburger/dp/B0BCF8Y5RN/ref=pb_pd_lutyp?pd_rd_w=PEt1R&psc=1"),
    "https://www.amazon.nl/Ravensburger/dp/B0BCF8Y5RN?psc=1"
  );
  // Elders betekent "cid" mogelijk iets: niet weghalen.
  assert.equal(cleanUrl("https://shop.example.com/p?cid=12"), "https://shop.example.com/p?cid=12");
});

test("linkKey herkent dezelfde link", () => {
  assert.equal(linkKey("https://www.bol.com/p/1/?gclid=x"), linkKey("http://bol.com/p/1"));
});

test("shopName", () => {
  assert.equal(shopName("https://www.bol.com/nl/x"), "bol.com");
  assert.equal(shopName("https://eu.stance.com/x"), "stance.com");
  assert.equal(shopName("https://shop.example.co.uk/x"), "example.co.uk");
  assert.equal(shopName("nonsens"), "");
});

test("titleFromUrl", () => {
  assert.equal(titleFromUrl("https://www.bol.com/nl/nl/f/the-girl-who-loved-tom-gordon/9200000025787633/"), "The Girl Who Loved Tom Gordon");
  assert.equal(titleFromUrl("https://www.bol.com/nl/nl/f/the-river/9200000095134274/"), "The River");
});

test("toTimestamp", () => {
  assert.equal(toTimestamp("2025-10-30"), Date.parse("2025-10-30"));
  assert.equal(toTimestamp(undefined, 5), 5);
  assert.equal(toTimestamp(123), 123);
});

const items = [
  { id: "a", title: "Boek Rooted", category: "boeken", price: 15.99, createdAt: 3, link: "https://bol.com/a" },
  { id: "b", title: "Makita boormachine", category: "overig", price: 215, createdAt: 2, favorite: true, link: "https://toolstation.nl/b" },
  { id: "c", title: "Tshirt scouting", category: "kleding", price: null, createdAt: 1, link: "https://scoutshop.nl/c" },
  { id: "d", title: "Crème brûlée-brander", category: "uitzet", price: 30, createdAt: 4, link: "https://x.nl/d" }
];

test("filterItems", () => {
  assert.deepEqual(filterItems(items, { cat: "boeken" }).map((i) => i.id), ["a"]);
  assert.deepEqual(filterItems(items, { band: "tot15" }).map((i) => i.id), []);
  assert.deepEqual(filterItems(items, { band: "15-30" }).map((i) => i.id), ["a"]);
  assert.deepEqual(filterItems(items, { band: "30-50" }).map((i) => i.id), ["d"]);
  assert.deepEqual(filterItems(items, { q: "creme" }).map((i) => i.id), ["d"]);
  assert.deepEqual(filterItems(items, { q: "bol" }).map((i) => i.id), ["a"]);
  assert.deepEqual(filterItems(items, { hideClaimed: true }, { b: { at: 1 } }).map((i) => i.id), ["a", "c", "d"]);
});

test("sortItems: gegeven items onderaan, onbekende prijs achteraan", () => {
  assert.deepEqual(sortItems(items, "nieuw").map((i) => i.id), ["d", "a", "b", "c"]);
  assert.deepEqual(sortItems(items, "goedkoop").map((i) => i.id), ["a", "d", "b", "c"]);
  assert.deepEqual(sortItems(items, "duur").map((i) => i.id), ["b", "d", "a", "c"]);
  assert.deepEqual(sortItems(items, "favoriet").map((i) => i.id), ["b", "d", "a", "c"]);
  assert.deepEqual(sortItems(items, "nieuw", { d: { at: 1 } }).map((i) => i.id), ["a", "b", "c", "d"]);
});

test("domId is veilig voor sleutels met spaties en &", () => {
  assert.match(domId("kleding & accesoires1"), /^item-[\w-]+$/);
});

test("isValidPriceText", () => {
  for (const ok of ["24,95", "24.95", "15", "€ 1.299,00", "1299,00", "€12", "7,5", "40 euro"]) assert.equal(isValidPriceText(ok), true, ok);
  for (const bad of ["12,5x", "abc12", "", "12,999", "€", "1,2,3"]) assert.equal(isValidPriceText(bad), false, bad);
});
