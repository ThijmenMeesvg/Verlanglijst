// De zoek- en filterbalk. De gekozen filters staan ook in de adresbalk,
// zodat je een link als "…/?cat=boeken" kunt doorsturen.
import { SORTS } from "../config.js";
import { allCategories } from "../lib/categories.js";
import { boundsFromBand, escapeHtml, formatPrice, toBound } from "../lib/util.js";

const DEFAULTS = { q: "", cat: "", min: null, max: null, sort: SORTS[0].id, hideClaimed: false };

export function readFiltersFromUrl() {
  const p = new URLSearchParams(location.search);
  const old = boundsFromBand(p.get("prijs"));   // oude links: ?prijs=tot15
  return {
    q: p.get("q") || "",
    // Of de categorie bestaat, weten we pas als de lijst geladen is (zie updateCounts).
    cat: /^[\w-]{1,40}$/.test(p.get("cat") || "") ? p.get("cat") : "",
    min: toBound(p.get("van")) ?? old.min,
    max: toBound(p.get("tot")) ?? old.max,
    sort: SORTS.some((s) => s.id === p.get("sort")) ? p.get("sort") : DEFAULTS.sort,
    hideClaimed: p.get("verberg") === "1"
  };
}

function writeFiltersToUrl(f) {
  const p = new URLSearchParams(location.search);
  const set = (key, value, isDefault) => (isDefault ? p.delete(key) : p.set(key, value));
  set("q", f.q, !f.q);
  set("cat", f.cat, !f.cat);
  p.delete("prijs");
  set("van", String(f.min), f.min === null);
  set("tot", String(f.max), f.max === null);
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
  const priceMin = document.getElementById("price-min");
  const priceMax = document.getElementById("price-max");
  const priceClear = document.getElementById("price-clear");
  const hide = document.getElementById("hide-claimed");

  sort.innerHTML = SORTS.map((s) => `<option value="${s.id}">${escapeHtml(s.label)}</option>`).join("");
  const showBound = (n) => (n === null ? "" : formatPrice(n).replace(/^€\s?/, "").replace(/,00$/, ""));
  priceMin.value = showBound(filters.min);
  priceMax.value = showBound(filters.max);

  search.value = filters.q;
  sort.value = filters.sort;
  hide.checked = filters.hideClaimed;

  // Telefoon: sorteren, prijs en ‘verberg’ zitten achter de knop ‘Filters’; het bolletje telt wat er aanstaat.
  const toggle = document.getElementById("filter-toggle");
  const panel = document.getElementById("filter-panel");
  const badge = document.getElementById("filter-badge");
  const updateBadge = () => {
    const active = [filters.min !== null || filters.max !== null, filters.sort !== DEFAULTS.sort, filters.hideClaimed].filter(Boolean).length;
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
  setOpen(Boolean(filters.min !== null || filters.max !== null || filters.hideClaimed || filters.sort !== DEFAULTS.sort));

  const changed = () => {
    writeFiltersToUrl(filters);
    syncPressed();
    updateBadge();
    onChange({ ...filters });
  };

  const syncPressed = () => {
    for (const chip of catChips.querySelectorAll(".chip")) chip.setAttribute("aria-pressed", String(chip.dataset.cat === filters.cat));
    priceClear.hidden = filters.min === null && filters.max === null;
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
  // Prijs: na een korte pauze in het typen filteren. Onzin (‘abc’) wordt rood gemarkeerd en genegeerd.
  let typingPrice;
  const readPrice = () => {
    for (const [input, key] of [[priceMin, "min"], [priceMax, "max"]]) {
      const bound = toBound(input.value.trim());
      input.setAttribute("aria-invalid", String(input.value.trim() !== "" && bound === null));
      filters[key] = bound;
    }
    changed();
  };
  for (const input of [priceMin, priceMax]) {
    input.addEventListener("input", () => { clearTimeout(typingPrice); typingPrice = setTimeout(readPrice, 350); });
    input.addEventListener("change", () => { clearTimeout(typingPrice); readPrice(); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); input.blur(); } });
  }
  priceClear.addEventListener("click", () => {
    priceMin.value = priceMax.value = "";
    for (const input of [priceMin, priceMax]) input.removeAttribute("aria-invalid");
    filters.min = filters.max = null;
    changed();
    priceMin.focus();
  });

  /**
   * Categorie-chips met aantallen (die rekening houden met zoeken en prijs). Categorieën zonder items
   * worden niet getoond, behalve de gekozen categorie, zodat je die altijd weer uit kunt zetten.
   * Bestaat de gekozen categorie niet (meer), bijv. uit een oude link? Dan gewoon alles tonen.
   */
  function updateCounts(counts, total) {
    if (filters.cat && !allCategories().some((c) => c.id === filters.cat)) {
      filters.cat = "";
      writeFiltersToUrl(filters);
      onChange({ ...filters });
      return;
    }
    const chips = [`<button type="button" class="chip" data-cat="" aria-pressed="false">Alles <span class="chip__count">${total}</span></button>`];
    for (const c of allCategories()) {
      if (!counts[c.id] && filters.cat !== c.id) continue;
      chips.push(
        `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="false"><span aria-hidden="true">${c.emoji}</span> ${escapeHtml(c.label)} <span class="chip__count">${counts[c.id] || 0}</span></button>`
      );
    }
    catChips.innerHTML = chips.join("");
    syncPressed();
  }

  function reset() {
    Object.assign(filters, DEFAULTS);
    search.value = "";
    priceMin.value = priceMax.value = "";
    for (const input of [priceMin, priceMax]) input.removeAttribute("aria-invalid");
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
  for (const el of [catChips]) {
    el.addEventListener("scroll", () => markOverflow(el), { passive: true });
    new ResizeObserver(() => markOverflow(el)).observe(el);
  }

  syncPressed();
  updateBadge();
  /** Toont als voorbeeld de hoogste prijs op de lijst in het ‘tot’-veld, zodat je weet waar het ophoudt. */
  function setPriceHint(highest) {
    priceMax.placeholder = highest ? String(Math.ceil(highest)) : "max";
  }

  return { filters, updateCounts: (counts, total) => { updateCounts(counts, total); markOverflow(catChips); }, reset, setPriceHint };
}
