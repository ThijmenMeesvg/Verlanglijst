// Draaien met: node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { parseCategories, serializeCategories, setCategories, categoryOf, categoryById, allCategories } from "../js/lib/categories.js";
import { countByCategory, filterItems, sortItems, isNew, dayKey } from "../js/lib/util.js";

test("zonder opgeslagen categorieën gelden Boeken, Spelletjes en Muziek", () => {
  const list = parseCategories(null);
  assert.deepEqual(list.map((c) => c.id), ["boeken", "spellen", "muziek"]);
  assert.deepEqual(parseCategories({ items: { x: { label: "X" } } }).map((c) => c.id), ["boeken", "spellen", "muziek"]);
});

test("opgeslagen categorieën: volgorde, en alles bewust verwijderd blijft leeg", () => {
  const node = { initialized: true, items: { b: { label: "Koken", emoji: "🍳", order: 1 }, a: { label: "Lego", emoji: "🧱", order: 0 }, overig: { label: "nep" } } };
  assert.deepEqual(parseCategories(node).map((c) => c.label), ["Lego", "Koken"]);
  assert.deepEqual(parseCategories({ initialized: true }), []);
  assert.deepEqual(parseCategories(serializeCategories([])), []);
});

test("serializeCategories en parseCategories passen op elkaar", () => {
  const list = [{ id: "a", label: " Lego ", emoji: "🧱" }, { id: "b", label: "Koken", emoji: "" }];
  const back = parseCategories(serializeCategories(list));
  assert.deepEqual(back, [
    { id: "a", label: "Lego", emoji: "🧱", order: 0 },
    { id: "b", label: "Koken", emoji: "🏷️", order: 1 }
  ]);
});

test("items met een onbekende of verwijderde categorie vallen onder Overig", () => {
  setCategories(parseCategories(null));
  assert.equal(categoryOf({ category: "boeken" }), "boeken");
  assert.equal(categoryOf({ category: "uitzet" }), "overig");
  assert.equal(categoryOf({}), "overig");
  assert.equal(categoryById("kleding").label, "Overig");
  assert.equal(allCategories().at(-1).id, "overig");

  const items = [
    { id: "1", title: "Boek", category: "boeken" },
    { id: "2", title: "Deurmat", category: "uitzet" },
    { id: "3", title: "Iets", category: "overig" },
    { id: "4", title: "Trui", category: "kleding" }
  ];
  assert.deepEqual(countByCategory(items), { boeken: 1, overig: 3 });
  assert.deepEqual(filterItems(items, { cat: "overig" }).map((i) => i.id), ["2", "3", "4"]);
  assert.deepEqual(filterItems(items, { cat: "uitzet" }).map((i) => i.id), []);
});

test("‘Elke dag anders’: zelfde dag zelfde volgorde, andere dag (meestal) anders", () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ id: `item${i}`, createdAt: i }));
  const a = sortItems(items, "dag", {}, { seed: "2026-11-26" }).map((i) => i.id);
  const b = sortItems(items, "dag", {}, { seed: "2026-11-26" }).map((i) => i.id);
  const c = sortItems(items, "dag", {}, { seed: "2026-11-27" }).map((i) => i.id);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.notDeepEqual(a, sortItems(items, "nieuw").map((i) => i.id));
  // Gegeven items blijven onderaan.
  const claimed = sortItems(items, "dag", { item0: {} }, { seed: "x" });
  assert.equal(claimed.at(-1).id, "item0");
});

test("dayKey en isNew", () => {
  assert.equal(dayKey(new Date(2026, 0, 5)), "2026-01-05");
  const now = Date.UTC(2026, 10, 26);
  assert.equal(isNew({ createdAt: now - 3 * 86400000 }, now), true);
  assert.equal(isNew({ createdAt: now - 20 * 86400000 }, now), false);
  assert.equal(isNew({}, now), false);
});
