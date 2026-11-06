// Startpunt van de openbare verlanglijst.
import { isDemo, subscribePublic } from "../lib/store.js";
import { countByCategory, domId, escapeHtml, filterItems, sortItems } from "../lib/util.js";
import { installImageFallback, showDemoBanner, showToast } from "../lib/ui.js";
import { isSurpriseMode, setSurpriseMode } from "../lib/surprise.js";
import { confettiOncePerVisit } from "../lib/confetti.js";
import { renderFavorite, renderTag } from "./render.js";
import { setupFilters } from "./filters.js";
import { canUndo, forgetMissing, isMine, startClaim, undoClaim } from "./claims.js";

const els = {
  items: document.getElementById("items"),
  count: document.getElementById("count"),
  favorites: document.getElementById("favorites"),
  favoritesSection: document.getElementById("favorites-section"),
  claimedSection: document.getElementById("claimed-section"),
  claimedItems: document.getElementById("claimed-items"),
  claimedCount: document.getElementById("claimed-count"),
  mineStrip: document.getElementById("mine-strip"),
  updated: document.getElementById("updated"),
  share: document.getElementById("share")
};

let state = { mode: null, items: [], claims: {}, settings: {} };
let firstRender = true;

const { filters, updateCounts, reset } = setupFilters(render);

const surprise = isSurpriseMode();

function tagState(item) {
  const claimed = Boolean(state.claims[item.id]);
  return { claimed, mine: claimed && isMine(item.id), canUndo: claimed && canUndo(item.id), surprise };
}

function render() {
  const { items } = state;
  // In verrassingsmodus doet de pagina alsof er nog niets gegeven wordt.
  const claims = surprise ? {} : state.claims;
  const openItems = items.filter((i) => !claims[i.id]);

  // Favorieten bovenaan: alleen wat nog niet gegeven wordt.
  const favorites = sortItems(openItems.filter((i) => i.favorite), "nieuw");
  els.favoritesSection.hidden = favorites.length === 0;
  els.favorites.innerHTML = favorites.map((i) => renderFavorite(i, tagState(i))).join("");

  updateCounts(countByCategory(items), items.length);

  const visible = sortItems(filterItems(items, filters, claims), filters.sort, claims);
  const claimedCount = items.length - openItems.length;
  els.count.textContent =
    `${items.length} ${items.length === 1 ? "wens" : "wensen"}` +
    (claimedCount ? `, waarvan ${claimedCount} al ${claimedCount === 1 ? "wordt" : "worden"} gegeven` : "");
  // ‘Bijgewerkt op …’: de laatste keer dat er een wens bij kwam of veranderde, zodat bezoekers zien dat de lijst actueel is.
  const lastUpdate = Math.max(0, ...items.map((i) => Math.max(i.updatedAt || 0, i.createdAt || 0)));
  els.updated.hidden = !lastUpdate;
  els.updated.textContent = lastUpdate ? `Bijgewerkt op ${formatUpdate(lastUpdate)}` : "";

  // Open wensen bovenaan; wat al gegeven wordt zakt naar een eigen, grijze groep onderaan.
  // (In verrassingsmodus is `claims` leeg, dus dan blijft alles gewoon in één lijst.)
  const openVisible = visible.filter((i) => !claims[i.id]);
  const claimedVisible = visible.filter((i) => claims[i.id]);

  if (!items.length) {
    els.items.innerHTML = `<div class="notice"><p>${escapeHtml(state.settings.emptyList)}</p></div>`;
  } else if (!visible.length) {
    els.items.innerHTML = `<div class="notice"><p>Niets gevonden met deze filters.</p><button type="button" class="btn" data-reset>Filters wissen</button></div>`;
  } else if (!openVisible.length) {
    els.items.innerHTML = filters.q || filters.cat || filters.band
      ? `<div class="notice"><p>Alles wat hier past, wordt al gegeven. Kijk eens bij een andere categorie of prijs.</p><button type="button" class="btn" data-reset>Filters wissen</button></div>`
      : `<div class="notice"><p>Alles op de lijst wordt al gegeven. Dank je wel!</p></div>`;
  } else {
    els.items.innerHTML = openVisible.map((i) => renderTag(i, tagState(i))).join("");
  }
  els.claimedSection.hidden = claimedVisible.length === 0;
  els.claimedCount.textContent = claimedVisible.length ? `(${claimedVisible.length})` : "";
  els.claimedItems.innerHTML = claimedVisible.map((i) => renderTag(i, tagState(i))).join("");

  // ‘Jij geeft:’ met een link naar elk eigen cadeau (die nu onderaan in de grijze groep staan).
  const mineItems = items.filter((i) => claims[i.id] && isMine(i.id));
  els.mineStrip.hidden = mineItems.length === 0;
  els.mineStrip.innerHTML = mineItems.length
    ? `<span aria-hidden="true">🎁</span> Jij geeft: ${mineItems
        .map((i) => `<a href="#${escapeHtml(domId(i.id))}">${escapeHtml(i.title)}</a>`)
        .join(", ")}. Vergeet het niet te kopen!`
    : "";
  els.items.setAttribute("aria-busy", "false");

  if (firstRender && items.length) {
    firstRender = false;
    highlightFromHash();
  }
}

/** ‘vandaag’, ‘gisteren’, of ‘4 november’ (met jaartal als het niet dit jaar was). */
function formatUpdate(ts) {
  const d = new Date(ts), now = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  if (diff <= 0) return "vandaag";
  if (diff === 1) return "gisteren";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
}

function highlightFromHash() {
  if (!location.hash.startsWith("#item-")) return;
  const target = document.getElementById(location.hash.slice(1));
  if (!target) return;
  for (const el of document.querySelectorAll(".tag.is-highlighted")) el.classList.remove("is-highlighted");
  target.classList.add("is-highlighted");
  target.scrollIntoView({ block: "center" });
}

function findItem(id) {
  return state.items.find((i) => i.id === id);
}

// Eén klik-afhandeling voor alle kaarten (ook die later opnieuw getekend worden).
document.addEventListener("click", (e) => {
  const give = e.target.closest("[data-claim]");
  const undo = e.target.closest("[data-unclaim]");
  if (give) {
    const item = findItem(give.dataset.claim);
    if (item) startClaim(item, state.mode, () => Boolean(state.claims[item.id]), { fromFavorite: Boolean(give.closest(".fav")) });
  } else if (undo) {
    const item = findItem(undo.dataset.unclaim);
    if (item) undoClaim(item, state.mode, () => Boolean(state.claims[item.id]));
  } else if (e.target.closest("[data-reset]")) {
    reset();
  }
});

installImageFallback();
window.addEventListener("hashchange", highlightFromHash);

// ‘↑ Zoeken en filters’ verschijnt zodra de filterbalk ver boven je uit beeld is.
const toTop = document.getElementById("to-top");
const toolbar = document.querySelector(".toolbar");
new IntersectionObserver(([entry]) => {
  toTop.hidden = entry.isIntersecting || entry.boundingClientRect.top > 0;
}, { rootMargin: "600px 0px 0px 0px" }).observe(toolbar);

// De beheerpagina zet dit vlaggetje na een geslaagde login; dan staat er ‘⚙ Beheer’ in plaats van alleen ‘⚙’.
// (Het is maar een snelkoppeling: toegang regelt de database, niet deze knop.)
try {
  if (isDemo() || localStorage.getItem("verlanglijst-beheerder") === "1") document.querySelector(".topbar__admin-label").hidden = false;
} catch { /* geen opslag beschikbaar */ }

if (surprise) {
  const notice = document.getElementById("surprise-notice");
  notice.hidden = false;
  document.getElementById("hide-claimed").closest("label").hidden = true;
  notice.querySelector("button").addEventListener("click", () => {
    setSurpriseMode(false);
    location.reload();
  });
}

els.share.addEventListener("click", async () => {
  const url = `${location.origin}${location.pathname}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: document.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      showToast("Link gekopieerd. Plak hem in een app of mail.");
    }
  } catch (err) {
    if (err?.name !== "AbortError") showToast("Kopiëren lukte niet. Kopieer de link uit de adresbalk.", { error: true });
  }
});

subscribePublic((data) => {
  if (data.error) {
    els.items.innerHTML = `<div class="notice"><p>De lijst kon niet geladen worden. Controleer je internetverbinding en ververs de pagina.</p></div>`;
    els.items.setAttribute("aria-busy", "false");
    return;
  }
  state = data;
  // Teksten uit het beheer; textContent, dus nooit als HTML uitgevoerd.
  for (const el of document.querySelectorAll("[data-text]")) {
    el.textContent = data.settings[el.dataset.text] ?? el.textContent;
  }
  document.title = data.settings.title;
  if (data.mode === "v2") forgetMissing(data.claims);   // in de oude modus komen categorieën los binnen
  render();
}).catch(() => {
  els.items.innerHTML = `<div class="notice"><p>De lijst kon niet geladen worden. Controleer je internetverbinding en ververs de pagina.</p></div>`;
});

if (isDemo()) showDemoBanner();
confettiOncePerVisit();
