// Datalaag: alles wat met Firebase praat zit hier, zodat de pagina's het niet hoeven te weten.
//
// Drie standen:
//  - "v2":     de nieuwe structuur (wishlist/…, private/…), beveiligd met database.rules.json
//  - "legacy": de oude structuur (een node per categorie). Wordt automatisch gebruikt zolang
//              de overstap nog niet gedaan is, zodat de site altijd blijft werken.
//  - "demo":   voorbeelddata in het geheugen (?demo in de adresbalk). Raakt de echte database niet.

import { firebaseConfig, FIREBASE_SDK, CATEGORIES, LISTS, PATHS, DEFAULT_SETTINGS } from "../config.js";
import { newId, toTimestamp, normalizePrice } from "./util.js";
import { LEGACY_NODES } from "./migrate.js";

export function isDemo() {
  return new URLSearchParams(location.search).has("demo");
}

const toList = (obj, extra = {}) =>
  Object.entries(obj || {})
    .filter(([, v]) => v && typeof v === "object")
    .map(([id, v]) => ({ ...v, id, ...extra }));

// ============================================================
// Firebase
// ============================================================

// Gecachete promises: zo wordt Firebase maar één keer geladen, ook als twee delen tegelijk vragen.
let fbPromise = null;
function firebase() {
  fbPromise ??= Promise.all([
    import(`${FIREBASE_SDK}/firebase-app.js`),
    import(`${FIREBASE_SDK}/firebase-database.js`)
  ]).then(([appMod, dbMod]) => {
    const app = appMod.initializeApp(firebaseConfig);
    return { app, db: dbMod.getDatabase(app), ...dbMod };
  });
  return fbPromise;
}

// Bezoekers hebben alleen anoniem inloggen nodig. Zonder de popup-helper laadt Firebase dan geen
// Google-scripts of iframes (die de CSP van de openbare pagina ook niet toestaat).
// Elke pagina gebruikt maar één soort, dus de eerste aanroep bepaalt welke.
let authPromise = null;
function auth({ withPopup = false } = {}) {
  authPromise ??= Promise.all([firebase(), import(`${FIREBASE_SDK}/firebase-auth.js`)]).then(([{ app }, mod]) => ({
    ...mod,
    auth: mod.initializeAuth(app, {
      persistence: [mod.indexedDBLocalPersistence, mod.browserLocalPersistence],
      ...(withPopup ? { popupRedirectResolver: mod.browserPopupRedirectResolver } : {})
    })
  }));
  return authPromise;
}

// ============================================================
// Openbare kant
// ============================================================

/**
 * Luistert live naar de openbare lijst. `cb` krijgt { mode, items, claims, settings, error }.
 * Geeft een functie terug om te stoppen met luisteren.
 */
export async function subscribePublic(cb) {
  if (isDemo()) return (await demo()).subscribePublic(cb);
  const { db, ref, onValue } = await firebase();
  let stopLegacy = null;

  const stop = onValue(
    ref(db, "wishlist"),
    (snap) => {
      const data = snap.val();
      if (data) {
        stopLegacy?.(); stopLegacy = null;
        cb({
          mode: "v2",
          items: toList(data.items),
          claims: data.claims || {},
          settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) }
        });
      } else if (!stopLegacy) {
        stopLegacy = subscribeLegacy(cb);
      }
    },
    () => { if (!stopLegacy) stopLegacy = subscribeLegacy(cb); }   // geen leesrechten: oude structuur
  );
  return () => { stop(); stopLegacy?.(); };
}

/** Oude structuur: elke categorie apart lezen (de root mag niet in één keer gelezen worden). */
function subscribeLegacy(cb) {
  const perCategory = {};
  const failed = new Set();
  let stopped = false;
  const stops = [];

  const emit = () => {
    if (stopped) return;
    const items = [];
    const claims = {};
    for (const cat of CATEGORIES) {
      for (const [key, v] of Object.entries(perCategory[cat.legacy] || {})) {
        if (!v || typeof v !== "object" || v.private === true || !v.link) continue;
        const id = `${cat.legacy}/${key}`;          // in oude modus bevat het id het pad
        items.push({
          id,
          title: v.title || "Naamloos item",
          link: v.link,
          image: v.image || "",
          price: normalizePrice(v.price),
          category: cat.id,
          favorite: v.favorite === true,
          createdAt: toTimestamp(v.dateAdded)
        });
        if (v.done === true) claims[id] = { at: 0 };
      }
    }
    const allFailed = failed.size === CATEGORIES.length;
    cb({
      mode: "legacy",
      items,
      claims,
      settings: { ...DEFAULT_SETTINGS },
      error: allFailed ? "De lijst kon niet geladen worden." : undefined
    });
  };

  firebase().then(({ db, ref, onValue }) => {
    if (stopped) return;
    for (const cat of CATEGORIES) {
      stops.push(
        onValue(
          ref(db, cat.legacy),
          (snap) => { perCategory[cat.legacy] = snap.val() || {}; failed.delete(cat.legacy); emit(); },
          () => { failed.add(cat.legacy); emit(); }
        )
      );
    }
  });
  return () => { stopped = true; stops.forEach((s) => s()); };
}

/**
 * Anonieme gebruiker voor deze browser. Een claim onthoudt dit id, zodat alleen
 * wie iets koos het (binnen 24 uur) kan terugdraaien. Pas geladen bij de eerste klik.
 */
async function visitorId() {
  const { auth: a, signInAnonymously, onAuthStateChanged } = await auth();
  // Wachten tot een eerder opgeslagen sessie geladen is, anders krijgt de bezoeker een nieuw id.
  await new Promise((resolve) => { const stop = onAuthStateChanged(a, () => { stop(); resolve(); }); });
  return (a.currentUser || (await signInAnonymously(a)).user).uid;
}

/** Markeert een item als "wordt gegeven". */
export async function claim(item, mode) {
  if (isDemo()) return (await demo()).claim(item.id);
  const { db, ref, set, update, serverTimestamp } = await firebase();
  if (mode === "legacy") return update(ref(db, item.id), { done: true });
  const by = await visitorId();
  return set(ref(db, `${PATHS.claims}/${item.id}`), { at: serverTimestamp(), by });
}

export async function unclaim(item, mode) {
  if (isDemo()) return (await demo()).unclaim(item.id);
  const { db, ref, remove, update } = await firebase();
  if (mode === "legacy") return update(ref(db, item.id), { done: false });
  await visitorId();
  return remove(ref(db, `${PATHS.claims}/${item.id}`));
}

// ============================================================
// Beheer
// ============================================================

/** cb({ user, isAdmin }) bij elke in- of uitlog. */
export async function onAuth(cb) {
  if (isDemo()) { cb({ user: { displayName: "Demo", email: "demo", uid: "demo" }, isAdmin: true }); return () => {}; }
  const { auth: a, onAuthStateChanged } = await auth({ withPopup: true });
  const { db, ref, get } = await firebase();
  return onAuthStateChanged(a, async (user) => {
    // Een anonieme bezoeker (van ‘Ik geef dit’) telt hier als niet ingelogd.
    if (!user || user.isAnonymous) return cb({ user: null, isAdmin: false });
    let isAdmin = false;
    try { isAdmin = (await get(ref(db, `${PATHS.admins}/${user.uid}`))).val() === true; } catch { /* nog geen regels */ }
    cb({ user, isAdmin });
  });
}

export async function signIn() {
  const { auth: a, GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await auth({ withPopup: true });
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(a, provider);
  } catch (err) {
    if (err?.code === "auth/popup-blocked" || err?.code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(a, provider);
    } else {
      throw err;
    }
  }
}

export async function signOut() {
  if (isDemo()) return;
  const { auth: a, signOut: out } = await auth({ withPopup: true });
  await out(a);
}

/**
 * Alles voor de beheerpagina, live. cb({ lists: {public:[], cadeaus:[], voorMij:[]}, claims, settings, tempLinks }).
 */
export async function subscribeAdmin(cb, onError) {
  if (isDemo()) return (await demo()).subscribeAdmin(cb);
  const { db, ref, onValue } = await firebase();
  const state = { wishlist: null, private: null };
  const emit = () => {
    if (!state.wishlist || !state.private) return;
    const lists = { public: toList(state.wishlist.items, { listId: "public" }) };
    for (const l of LISTS.filter((l) => l.isPrivate)) {
      lists[l.id] = toList(state.private[l.id]?.items, { listId: l.id });
    }
    cb({
      lists,
      claims: state.wishlist.claims || {},
      settings: { ...DEFAULT_SETTINGS, ...(state.wishlist.settings || {}) },
      tempLinks: toList(state.private.tempLinks).sort((a, b) => (b.at || 0) - (a.at || 0))
    });
  };
  const s1 = onValue(ref(db, "wishlist"), (s) => { state.wishlist = s.val() || {}; emit(); }, onError);
  const s2 = onValue(ref(db, "private"), (s) => { state.private = s.val() || {}; emit(); }, onError);
  return () => { s1(); s2(); };
}

const itemPath = (listId, id) => (listId === "public" ? `${PATHS.items}/${id}` : `${PATHS.privateList(listId)}/${id}`);

/** Haalt velden die niet in de database horen eraf (id, listId) en lege velden weg. */
function cleanForSave(data, listId) {
  const out = {};
  const allowed = ["title", "link", "category", "price", "image", "note", "favorite", "createdAt", "updatedAt"];
  if (listId !== "public") allowed.push("done", "archivedAt", "fromList");
  for (const key of allowed) {
    const v = data[key];
    if (v === undefined || v === null || v === "") continue;
    out[key] = v;
  }
  return out;
}

/**
 * Slaat een item op. Bij een andere lijst dan voorheen wordt het in één keer verplaatst
 * (oude plek + eventuele claim weg, nieuwe plek erbij).
 */
export async function saveItem({ id, fromListId, listId, data }) {
  const itemId = id || newId();
  const payload = cleanForSave({ ...data, updatedAt: Date.now(), createdAt: data.createdAt || Date.now() }, listId);
  const updates = { [itemPath(listId, itemId)]: payload };
  if (fromListId && fromListId !== listId) {
    updates[itemPath(fromListId, itemId)] = null;
    if (fromListId === "public") updates[`${PATHS.claims}/${itemId}`] = null;
  }
  await applyUpdates(updates);
  return itemId;
}

/**
 * Verplaatst items naar het archief (in één keer). Een item dat al gegeven werd, krijgt `done: true`.
 * @param {Array<{ item: object, claimed?: boolean }>} entries
 */
export async function archiveItems(entries) {
  const updates = {};
  const now = Date.now();
  for (const { item, claimed } of entries) {
    const data = cleanForSave({ ...item, archivedAt: now, fromList: item.listId, done: claimed || item.done || undefined }, "archief");
    updates[itemPath("archief", item.id)] = data;
    updates[itemPath(item.listId, item.id)] = null;
    if (item.listId === "public") updates[`${PATHS.claims}/${item.id}`] = null;
  }
  return applyUpdates(updates);
}

/** Definitief verwijderen (alleen gebruikt vanuit het archief). */
export async function deleteItems(entries) {
  const updates = {};
  for (const { listId, id } of entries) {
    updates[itemPath(listId, id)] = null;
    if (listId === "public") updates[`${PATHS.claims}/${id}`] = null;
  }
  return applyUpdates(updates);
}

export async function setFields(listId, id, fields) {
  const updates = {};
  for (const [k, v] of Object.entries(fields)) updates[`${itemPath(listId, id)}/${k}`] = v ?? null;
  return applyUpdates(updates);
}

/** Door de beheerder gezet: zonder eigenaar en met tijdstip 0, dus bezoekers kunnen het niet terugdraaien. */
export async function setClaimAdmin(id, claimed) {
  return applyUpdates({ [`${PATHS.claims}/${id}`]: claimed ? { at: 0 } : null });
}

export async function saveSettings(settings) {
  return applyUpdates({ [`${PATHS.settings}/title`]: settings.title || null, [`${PATHS.settings}/intro`]: settings.intro || null });
}

export async function addTempLinks(urls) {
  const updates = {};
  urls.forEach((url, i) => (updates[`${PATHS.tempLinks}/${newId()}${i}`] = { url, at: Date.now() }));
  return applyUpdates(updates);
}

export async function deleteTempLinks(ids) {
  return applyUpdates(Object.fromEntries(ids.map((id) => [`${PATHS.tempLinks}/${id}`, null])));
}

/** Voert meerdere wijzigingen tegelijk uit: alles slaagt, of niets. */
export async function applyUpdates(updates) {
  if (isDemo()) return (await demo()).applyUpdates(updates);
  const { db, ref, update } = await firebase();
  return update(ref(db), updates);
}

/** Leest alle oude categorie-nodes (voor de overstap). */
export async function readLegacy() {
  if (isDemo()) return structuredClone((await import("./demo-data.js")).DEMO_DATA.legacy);
  const { db, ref, get } = await firebase();
  const root = {};
  await Promise.all(
    LEGACY_NODES.map(async (name) => {
      try { root[name] = (await get(ref(db, name))).val(); } catch { /* geen toegang of bestaat niet */ }
    })
  );
  return root;
}

// ============================================================
// Demo-modus (alleen in het geheugen)
// ============================================================

let demoPromise = null;
function demo() {
  demoPromise ??= import("./demo-data.js").then((m) => makeDemo(m.DEMO_DATA));
  return demoPromise;
}

function makeDemo(DEMO_DATA) {
  const db = structuredClone(DEMO_DATA.v2);
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn());

  const getPath = (path) => path.split("/").reduce((o, k) => (o == null ? undefined : o[k]), db);
  const setPath = (path, value) => {
    const keys = path.split("/");
    let o = db;
    keys.slice(0, -1).forEach((k) => (o = o[k] ??= {}));
    if (value === null) delete o[keys.at(-1)];
    else o[keys.at(-1)] = structuredClone(value);
  };

  return {
    subscribePublic(cb) {
      const fn = () =>
        cb({
          mode: "demo",
          items: toList(getPath("wishlist/items")),
          claims: { ...(getPath("wishlist/claims") || {}) },
          settings: { ...DEFAULT_SETTINGS, ...(getPath("wishlist/settings") || {}) }
        });
      listeners.add(fn);
      setTimeout(fn, 150);
      return () => listeners.delete(fn);
    },
    subscribeAdmin(cb) {
      const fn = () => {
        const lists = { public: toList(getPath("wishlist/items"), { listId: "public" }) };
        for (const l of LISTS.filter((l) => l.isPrivate)) lists[l.id] = toList(getPath(`private/${l.id}/items`), { listId: l.id });
        cb({
          lists,
          claims: { ...(getPath("wishlist/claims") || {}) },
          settings: { ...DEFAULT_SETTINGS, ...(getPath("wishlist/settings") || {}) },
          tempLinks: toList(getPath("private/tempLinks")).sort((a, b) => (b.at || 0) - (a.at || 0))
        });
      };
      listeners.add(fn);
      setTimeout(fn, 100);
      return () => listeners.delete(fn);
    },
    async claim(id) { setPath(`wishlist/claims/${id}`, { at: Date.now(), by: "demo" }); notify(); },
    async unclaim(id) { setPath(`wishlist/claims/${id}`, null); notify(); },
    async applyUpdates(updates) {
      for (const [path, value] of Object.entries(updates)) setPath(path, value);
      notify();
    }
  };
}
