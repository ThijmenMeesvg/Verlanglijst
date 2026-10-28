import test from "node:test";
import assert from "node:assert/strict";
import { planMigration, cleanTitle } from "../js/lib/migrate.js";

const NOW = Date.parse("2026-10-28");

// Klein nagemaakt voorbeeld van de oude database-indeling (geen echte data).
const legacy = {
  Boeken: {
    boeken3: { checked: false, dateAdded: "2025-10-30", favorite: false, image: "https://img/x.jpg",
      link: "https://www.bol.com/nl/nl/p/boek/1/?gclid=abc", price: 10.25, title: "Notities - Moomin" },
    "-Ox": { dateAdded: "2026-04-25", done: true, favorite: true, image: "",
      link: "https://www.bruna.nl/boeken/la-mesa", price: 32.5, private: false,
      title: "La Mesa Mexicana, Rosa Cienfuegos | Boek | 9789461433596" }
  },
  "Kleding & Accesoires": {
    "kleding & accesoires1": { dateAdded: "2025-10-30", favorite: false, image: "http://cdn/x.jpg",
      link: "https://shop/sweater", price: 0, title: "Scoutlife Sweater" },
    geheim: { dateAdded: "2025-11-01", link: "https://shop/geheim", price: 5, private: true, title: "Geheim" }
  },
  Cadeaus: {
    c1: { dateAdded: "2025-11-07", done: true, link: "https://etsy.com/x", price: 50, private: true, title: "Boekenstandaard" }
  },
  "Voor Thijmen": {
    t1: { dateAdded: "2026-01-23", link: "https://www.bol.com/nl/nl/f/the-river/9200000095134274/", price: 0, private: true, title: "Onbekend product" }
  },
  v2: { items: { x: { title: "oude kopie" } } },
  tempLinks: { k1: "https://a.nl", k2: "" },
  Raar: { r1: { link: "https://raar.nl", title: "Raar ding", price: 3 } }
};

test("cleanTitle", () => {
  assert.equal(cleanTitle("La Mesa Mexicana, Rosa Cienfuegos | Boek | 9789461433596"), "La Mesa Mexicana, Rosa Cienfuegos");
  assert.equal(cleanTitle("Italian streetfood, Paola Bacchia | Kookboek"), "Italian streetfood, Paola Bacchia · Kookboek");
  assert.equal(cleanTitle("Onbekend product", "https://www.bol.com/nl/nl/f/the-river/92/"), "The River");
  assert.equal(cleanTitle("  Kaart sterren "), "Kaart sterren");
});

test("planMigration zet alles op de juiste plek", () => {
  const { updates, report } = planMigration(legacy, NOW);

  // Openbare items
  assert.deepEqual(updates["wishlist/items/boeken3"], {
    title: "Notities - Moomin", link: "https://www.bol.com/nl/nl/p/boek/1/", category: "boeken",
    favorite: false, createdAt: Date.parse("2025-10-30"), price: 10.25, image: "https://img/x.jpg"
  });
  assert.equal(updates["wishlist/items/-Ox"].title, "La Mesa Mexicana, Rosa Cienfuegos");
  assert.equal(updates["wishlist/items/-Ox"].favorite, true);
  assert.equal("image" in updates["wishlist/items/-Ox"], false);

  // Gegeven ("done") wordt een claim
  assert.deepEqual(updates["wishlist/claims/-Ox"], { at: NOW });
  assert.equal(report.claims, 1);

  // Prijs 0 wordt onbekend, http-afbeelding wordt https
  const sweater = updates["wishlist/items/kleding & accesoires1"];
  assert.equal("price" in sweater, false);
  assert.equal(sweater.image, "https://cdn/x.jpg");
  assert.equal(sweater.category, "kleding");

  // Privé
  assert.equal(updates["private/cadeaus/items/c1"].done, true);
  assert.equal(updates["private/voorMij/items/t1"].title, "The River");
  assert.equal(updates["private/voorMij/items/geheim"].category, "kleding");
  assert.equal(updates["wishlist/items/geheim"], undefined);
  assert.equal(updates["wishlist/claims/c1"], undefined);

  // Tijdelijke links, v2 overgeslagen, onbekende node naar "overig"
  assert.deepEqual(updates["private/tempLinks/k1"], { url: "https://a.nl", at: NOW });
  assert.equal(updates["private/tempLinks/k2"], undefined);
  assert.equal(Object.keys(updates).some((k) => k.includes("v2")), false);
  assert.equal(updates["wishlist/items/r1"].category, "overig");
  assert.deepEqual(report.unknownNodes, ["Raar"]);

  assert.equal(report.total, 7);
  assert.equal(report.linksCleaned, 1);
  assert.equal(report.tempLinks, 1);
});

test("planMigration is herhaalbaar (zelfde sleutels, zelfde resultaat)", () => {
  assert.deepEqual(planMigration(legacy, NOW).updates, planMigration(legacy, NOW).updates);
});
