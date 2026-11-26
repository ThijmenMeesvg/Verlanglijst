// De categorieën van de lijst. Ze staan in de database (wishlist/categories) en je beheert ze zelf.
//
// Opbouw in de database:
//   wishlist/categories = { initialized: true, items: { <id>: { label, emoji, order } } }
// `initialized` onderscheidt "nog nooit opgeslagen" (dan gelden de standaardcategorieën uit config.js)
// van "alles bewust verwijderd" (een lege lijst; Firebase bewaart geen lege objecten).
//
// Items verwijzen naar een categorie-id. Hoort een id bij geen enkele bestaande categorie
// (leeg, oud, of de categorie is verwijderd), dan valt het item onder ‘Overig’.

import { DEFAULT_CATEGORIES, OVERIG, CATEGORY_LIMITS } from "../config.js";

let current = withOrder(DEFAULT_CATEGORIES);

function withOrder(list) {
  return list.map((c, i) => ({ id: c.id, label: c.label, emoji: c.emoji, order: i }));
}

/** Zet de ruwe database-node om naar een gesorteerde lijst categorieën (zonder Overig). */
export function parseCategories(node) {
  if (!node || typeof node !== "object" || node.initialized !== true) return withOrder(DEFAULT_CATEGORIES);
  return Object.entries(node.items || {})
    .filter(([id, v]) => v && typeof v === "object" && id !== OVERIG.id)
    .map(([id, v]) => ({
      id,
      label: String(v.label || "Naamloos").slice(0, CATEGORY_LIMITS.label),
      emoji: String(v.emoji || "🏷️").slice(0, CATEGORY_LIMITS.emoji),
      order: Number.isFinite(v.order) ? v.order : 0
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "nl"));
}

/** De omgekeerde weg: een lijst categorieën als waarde voor wishlist/categories. */
export function serializeCategories(list) {
  const items = {};
  list.forEach((c, i) => {
    items[c.id] = { label: c.label.trim().slice(0, CATEGORY_LIMITS.label) || "Naamloos", emoji: (c.emoji || "🏷️").trim().slice(0, CATEGORY_LIMITS.emoji) || "🏷️", order: i };
  });
  return { initialized: true, ...(list.length ? { items } : {}) };
}

/** Wordt aangeroepen zodra er (nieuwe) gegevens uit de database binnenkomen. */
export function setCategories(list) {
  current = list;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("verlanglijst-categories"));
}

/** De zelfgemaakte categorieën, in volgorde (zonder Overig). */
export function getCategories() {
  return current;
}

/** Alle categorieën om uit te kiezen: de eigen, met Overig als laatste. */
export function allCategories() {
  return [...current, OVERIG];
}

export function categoryById(id) {
  return current.find((c) => c.id === id) || OVERIG;
}

/** Het categorie-id waaronder een item echt valt (onbekend of leeg wordt ‘overig’). */
export function categoryOf(item) {
  return current.some((c) => c.id === item?.category) ? item.category : OVERIG.id;
}
