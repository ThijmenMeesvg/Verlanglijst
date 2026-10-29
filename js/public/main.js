// Startpunt van de openbare verlanglijst.
import { isDemo, subscribePublic } from "../lib/store.js";
import { countByCategory, filterItems, sortItems } from "../lib/util.js";
import { installImageFallback, showDemoBanner, showToast } from "../lib/ui.js";
import { isSurpriseMode, setSurpriseMode } from "../lib/surprise.js";
import { confettiOncePerVisit } from "../lib/confetti.js";
import { renderFavorite, renderTag } from "./render.js";
import { setupFilters } from "./filters.js";
import { canUndo, forgetMissing, isMine, startClaim, undoClaim } from "./claims.js";

const els = {
  title: document.getElementById("title"),
  intro: document.getElementById("intro"),
  items: document.getElementById("items"),
  count: document.getElementById("count"),
  favorites: document.getElementById("favorites"),
  favoritesSection: document.getElementById("favorites-section"),
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

  if (!items.length) {
    els.items.innerHTML = `<div class="notice"><p>De lijst is nog leeg. Kom later nog eens kijken.</p></div>`;
  } else if (!visible.length) {
    els.items.innerHTML = `<div class="notice"><p>Niets gevonden met deze filters.</p><button type="button" class="btn" data-reset>Filters wissen</button></div>`;
  } else {
    els.items.innerHTML = visible.map((i) => renderTag(i, tagState(i))).join("");
  }
  els.items.setAttribute("aria-busy", "false");

  if (firstRender && items.length) {
    firstRender = false;
    highlightFromHash();
  }
}

function highlightFromHash() {
  if (!location.hash.startsWith("#item-")) return;
  const target = document.getElementById(location.hash.slice(1));
  if (!target) return;
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
    if (item) startClaim(item, state.mode, () => Boolean(state.claims[item.id]));
  } else if (undo) {
    const item = findItem(undo.dataset.unclaim);
    if (item) undoClaim(item, state.mode, () => Boolean(state.claims[item.id]));
  } else if (e.target.closest("[data-reset]")) {
    reset();
  }
});

installImageFallback();

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
  els.title.textContent = data.settings.title;
  els.intro.textContent = data.settings.intro;
  document.title = data.settings.title;
  if (data.mode === "v2") forgetMissing(data.claims);   // in de oude modus komen categorieën los binnen
  render();
}).catch(() => {
  els.items.innerHTML = `<div class="notice"><p>De lijst kon niet geladen worden. Controleer je internetverbinding en ververs de pagina.</p></div>`;
});

if (isDemo()) showDemoBanner();
confettiOncePerVisit();
