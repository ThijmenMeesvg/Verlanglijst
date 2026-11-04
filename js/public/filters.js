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
  const query = p.toString().replace(/(^|&)demo=(&|$)/, "$1demo$2");   // ?demo zonder lelijk "="
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

  // Telefoon: sorteren, prijs en ‘verberg’ zitten achter de knop ‘Filters’; het bolletje telt wat er aanstaat.
  const toggle = document.getElementById("filter-toggle");
  const panel = document.getElementById("filter-panel");
  const badge = document.getElementById("filter-badge");
  const updateBadge = () => {
    const active = [filters.band, filters.sort !== DEFAULTS.sort, filters.hideClaimed].filter(Boolean).length;
    badge.hidden = active === 0;
    badge.textContent = active;
    toggle.setAttribute("aria-label", active ? `Filters, ${active} actief` : "Filters");
  };
  const setOpen = (open) => {
    panel.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  // Staat er bij het openen al een filter aan (bijv. via een gedeelde link)? Dan het paneel meteen tonen.
  setOpen(Boolean(filters.band || filters.hideClaimed || filters.sort !== DEFAULTS.sort));

  const changed = () => {
    writeFiltersToUrl(filters);
    syncPressed();
    updateBadge();
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

  // Vervagende rand als er meer chips buiten beeld staan.
  const markOverflow = (el) => {
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    if (left && right) el.dataset.more = "both";
    else if (left) el.dataset.more = "left";
    else if (right) el.dataset.more = "right";
    else delete el.dataset.more;
  };
  for (const el of [catChips, priceChips]) {
    el.addEventListener("scroll", () => markOverflow(el), { passive: true });
    new ResizeObserver(() => markOverflow(el)).observe(el);
  }

  syncPressed();
  updateBadge();
  return { filters, updateCounts: (counts, total) => { updateCounts(counts, total); markOverflow(catChips); }, reset };
}
