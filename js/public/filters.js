// De zoek- en filterbalk. De gekozen filters staan ook in de adresbalk,
// zodat je een link als "…/?cat=boeken" kunt doorsturen.
import { CATEGORIES, PRICE_BANDS, SORTS } from "../config.js";
import { escapeHtml } from "../lib/util.js";

const DEFAULTS = { q: "", cat: "", band: "", sort: "nieuw", hideClaimed: false };

export function readFiltersFromUrl() {
  const p = new URLSearchParams(location.search);
  return {
    q: p.get("q") || "",
    cat: CATEGORIES.some((c) => c.id === p.get("cat")) ? p.get("cat") : "",
    band: PRICE_BANDS.some((b) => b.id === p.get("prijs")) ? p.get("prijs") : "",
    sort: SORTS.some((s) => s.id === p.get("sort")) ? p.get("sort") : DEFAULTS.sort,
    hideClaimed: p.get("verberg") === "1"
  };
}

function writeFiltersToUrl(f) {
  const p = new URLSearchParams(location.search);
  const set = (key, value, isDefault) => (isDefault ? p.delete(key) : p.set(key, value));
  set("q", f.q, !f.q);
  set("cat", f.cat, !f.cat);
  set("prijs", f.band, !f.band);
  set("sort", f.sort, f.sort === DEFAULTS.sort);
  set("verberg", "1", !f.hideClaimed);
  const query = p.toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
}

/**
 * Koppelt de filterbalk. `onChange(filters)` wordt aangeroepen bij elke wijziging.
 * Geeft `updateCounts(countsPerCategory, total)` terug om de aantallen in de chips bij te werken.
 */
export function setupFilters(onChange) {
  const filters = readFiltersFromUrl();
  const search = document.getElementById("search");
  const sort = document.getElementById("sort");
  const catChips = document.getElementById("category-chips");
  const priceChips = document.getElementById("price-chips");
  const hide = document.getElementById("hide-claimed");

  sort.innerHTML = SORTS.map((s) => `<option value="${s.id}">${escapeHtml(s.label)}</option>`).join("");
  priceChips.innerHTML = PRICE_BANDS.map(
    (b) => `<button type="button" class="chip" data-band="${b.id}" aria-pressed="false">${escapeHtml(b.label)}</button>`
  ).join("");

  search.value = filters.q;
  sort.value = filters.sort;
  hide.checked = filters.hideClaimed;

  const changed = () => {
    writeFiltersToUrl(filters);
    syncPressed();
    onChange({ ...filters });
  };

  const syncPressed = () => {
    for (const chip of catChips.querySelectorAll(".chip")) chip.setAttribute("aria-pressed", String(chip.dataset.cat === filters.cat));
    for (const chip of priceChips.querySelectorAll(".chip")) chip.setAttribute("aria-pressed", String(chip.dataset.band === filters.band));
  };

  let typing;
  search.addEventListener("input", () => {
    clearTimeout(typing);
    typing = setTimeout(() => { filters.q = search.value.trim(); changed(); }, 150);
  });
  sort.addEventListener("change", () => { filters.sort = sort.value; changed(); });
  hide.addEventListener("change", () => { filters.hideClaimed = hide.checked; changed(); });
  catChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    filters.cat = filters.cat === chip.dataset.cat ? "" : chip.dataset.cat;
    changed();
  });
  priceChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    filters.band = filters.band === chip.dataset.band ? "" : chip.dataset.band;
    changed();
  });

  /** Categorie-chips met aantallen; categorieën zonder items worden niet getoond. */
  function updateCounts(counts, total) {
    const chips = [`<button type="button" class="chip" data-cat="" aria-pressed="false">Alles <span class="chip__count">${total}</span></button>`];
    for (const c of CATEGORIES) {
      if (!counts[c.id]) continue;
      chips.push(
        `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="false"><span aria-hidden="true">${c.emoji}</span> ${escapeHtml(c.label)} <span class="chip__count">${counts[c.id]}</span></button>`
      );
    }
    catChips.innerHTML = chips.join("");
    syncPressed();
  }

  function reset() {
    Object.assign(filters, DEFAULTS);
    search.value = "";
    sort.value = DEFAULTS.sort;
    hide.checked = false;
    changed();
  }

  syncPressed();
  return { filters, updateCounts, reset };
}
