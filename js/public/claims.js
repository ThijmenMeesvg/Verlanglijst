// "Ik geef dit": bevestigen, opslaan, en onthouden op dit apparaat wat jíj gekozen hebt,
// zodat alleen jij het (binnen 24 uur) kunt terugdraaien.
import { claim, unclaim } from "../lib/store.js";
import { confirmDialog, showToast } from "../lib/ui.js";
import { confetti } from "../lib/confetti.js";
import { domId } from "../lib/util.js";

const STORAGE_KEY = "verlanglijst-mijn-cadeaus";
const UNDO_WINDOW = 24 * 60 * 60 * 1000;   // gelijk aan de database-regel

function readMine() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function writeMine(mine) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mine)); } catch { /* privé-venster: dan alleen deze sessie */ }
}

let mine = readMine();

export function isMine(id) {
  return Boolean(mine[id]);
}

export function canUndo(id) {
  return Boolean(mine[id]) && Date.now() - mine[id] < UNDO_WINDOW;
}

/** Ruimt eigen claims op die niet meer bestaan (bijv. omdat Thijmen het item heeft opgeruimd). */
export function forgetMissing(claims) {
  let changed = false;
  for (const id of Object.keys(mine)) {
    if (!claims[id]) { delete mine[id]; changed = true; }
  }
  if (changed) writeMine(mine);
}

const busy = new Set();   // voorkomt dubbel klikken terwijl iets wordt opgeslagen
// Net ongedaan gemaakt: de lijst schuift, en de tweede klik van een dubbelklik landt dan op een
// ‘Ik geef dit’-knop die toevallig op die plek komt te staan. Die negeren we heel even.
let lastUndoAt = 0;

/** Korte titel voor in meldingen, zodat een lange naam de melding niet opblaast. */
const short = (title) => (title.length > 60 ? `${title.slice(0, 57).trimEnd()}…` : title);

function errorMessage(err, fallback) {
  const code = String(err?.code || err?.message || "");
  if (code.startsWith("auth/network") || code.includes("network") || !navigator.onLine) {
    return "Geen internetverbinding. Controleer je verbinding en probeer het opnieuw.";
  }
  if (code.startsWith("auth/")) return "Kiezen lukt op dit moment niet. Probeer het later nog eens of laat het Thijmen weten.";
  return fallback;
}

/** Na het opnieuw tekenen van de lijst de focus terugzetten op hetzelfde item (voor toetsenbordgebruikers). */
function refocus(itemId, selector) {
  requestAnimationFrame(() => {
    const card = document.getElementById(domId(itemId));
    const target = card?.querySelector(selector) || card?.querySelector("a, button");
    target?.focus();
  });
}

/**
 * @param {{ fromFavorite?: boolean }} [options] gekozen vanuit de favorieten bovenaan: dan blijft de pagina daar staan
 */
export async function startClaim(item, mode, isTaken, { fromFavorite = false } = {}) {
  if (busy.has(item.id) || Date.now() - lastUndoAt < 800) return;
  const ok = await confirmDialog({
    title: "Geef je dit cadeau?",
    body: [
      `“${item.title}”`,
      "Iedereen die de lijst bekijkt ziet dan dat dit al gegeven wordt, zodat niemand het dubbel koopt. Je kunt het binnen 24 uur op dit apparaat nog ongedaan maken."
    ],
    confirmLabel: "Ja, ik geef dit"
  });
  if (!ok || isTaken()) {
    if (ok) showToast("Iemand anders was je net voor: dit wordt al gegeven.", { error: true });
    return;
  }

  busy.add(item.id);
  // Eerst onthouden, dan opslaan: de lijst tekent zichzelf al opnieuw zodra de wijziging lokaal binnenkomt,
  // en moet dan al weten dat dit jouw keuze is.
  mine[item.id] = Date.now();
  writeMine(mine);
  try {
    await claim(item, mode);
    confetti({ pieces: 90, duration: 2200 });
    showToast(`Genoteerd: jij geeft “${short(item.title)}”.`, {
      actionLabel: "Ongedaan maken",
      onAction: () => undoClaim(item, mode, () => true, { fromFavorite }),
      duration: 10000
    });
    if (fromFavorite) {
      // De favoriet verdwijnt uit de rij; bij de favorieten blijven (op de kop, niet op de knop van een ander cadeau).
      focusFavoritesHeading();
    } else {
      refocus(item.id, "[data-unclaim]");
    }
  } catch (err) {
    delete mine[item.id];
    writeMine(mine);
    showToast(
      errorMessage(err, isTaken() ? "Iemand anders was je net voor: dit wordt al gegeven." : "Dit is niet opgeslagen. Ververs de pagina en probeer het opnieuw."),
      { error: true }
    );
  } finally {
    busy.delete(item.id);
  }
}

function focusFavoritesHeading() {
  requestAnimationFrame(() => {
    const heading = document.getElementById("favorites-title");
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  });
}

/** `isClaimed()` zegt of het item op dit moment nog als gegeven staat. */
export async function undoClaim(item, mode, isClaimed, { fromFavorite = false } = {}) {
  if (busy.has(item.id)) return;
  if (!isClaimed()) {
    delete mine[item.id];
    writeMine(mine);
    showToast(`“${short(item.title)}” staat al weer open.`);
    return;
  }
  busy.add(item.id);
  try {
    await unclaim(item, mode);
    lastUndoAt = Date.now();
    delete mine[item.id];
    writeMine(mine);
    showToast(`“${short(item.title)}” staat weer open.`);
    if (fromFavorite) focusFavoritesHeading();
    else refocus(item.id, "[data-claim]");
  } catch (err) {
    showToast(
      errorMessage(err, "Ongedaan maken lukte niet. Dat kan alleen op het apparaat waarmee je het koos, binnen 24 uur. Daarna kan alleen Thijmen het terugzetten."),
      { error: true }
    );
  } finally {
    busy.delete(item.id);
  }
}
