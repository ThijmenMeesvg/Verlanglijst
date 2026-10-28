// "Ik geef dit": bevestigen, opslaan, en onthouden op dit apparaat wat jíj gekozen hebt,
// zodat alleen jij het (binnen 24 uur) kunt terugdraaien.
import { claim, unclaim } from "../lib/store.js";
import { confirmDialog, showToast } from "../lib/ui.js";
import { confetti } from "../lib/confetti.js";

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

export async function startClaim(item, mode) {
  const ok = await confirmDialog({
    title: "Geef je dit cadeau?",
    body: [
      `“${item.title}”`,
      "Iedereen die de lijst bekijkt ziet dan dat dit al gegeven wordt, zodat niemand het dubbel koopt. Je kunt het binnen 24 uur op dit apparaat nog ongedaan maken."
    ],
    confirmLabel: "Ja, ik geef dit"
  });
  if (!ok) return;

  // Eerst onthouden, dan opslaan: de lijst tekent zichzelf al opnieuw zodra de wijziging lokaal binnenkomt,
  // en moet dan al weten dat dit jouw keuze is.
  mine[item.id] = Date.now();
  writeMine(mine);
  try {
    await claim(item, mode);
    confetti({ pieces: 90, duration: 2200 });
    showToast(`Genoteerd: jij geeft “${item.title}”.`, {
      actionLabel: "Ongedaan maken",
      onAction: () => undoClaim(item, mode),
      duration: 10000
    });
  } catch {
    delete mine[item.id];
    writeMine(mine);
    showToast("Dit is niet opgeslagen. Iemand anders was je misschien net voor; ververs de pagina en probeer het opnieuw.", { error: true });
  }
}

export async function undoClaim(item, mode) {
  try {
    await unclaim(item, mode);
    delete mine[item.id];
    writeMine(mine);
    showToast(`“${item.title}” staat weer open.`);
  } catch {
    showToast("Ongedaan maken lukte niet. Na 24 uur kan alleen Thijmen dit nog terugzetten.", { error: true });
  }
}
