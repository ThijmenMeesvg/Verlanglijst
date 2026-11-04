// Centrale instellingen: Firebase-project, categorieën, lijsten en prijsfilters.
// Categorieën pas je alleen hier aan; de hele site (ook de beheerpagina) leest deze lijst.

export const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/10.12.2";

export const firebaseConfig = {
  apiKey: "AIzaSyCnDzhefAQWgoShNY2geSFwxTzNwqUqvTU",
  authDomain: "verlanglijst-12015.firebaseapp.com",
  databaseURL: "https://verlanglijst-12015-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "verlanglijst-12015",
  storageBucket: "verlanglijst-12015.firebasestorage.app",
  messagingSenderId: "512971362808",
  appId: "1:512971362808:web:b16ec8341ec4fbe795460d"
};

export const FIREBASE_CONSOLE = "https://console.firebase.google.com/project/verlanglijst-12015";

// Categorieën van de openbare lijst. `legacy` = naam van de categorie in de oude database.
export const CATEGORIES = [
  { id: "boeken",  label: "Boeken",                emoji: "📚", legacy: "Boeken" },
  { id: "spellen", label: "Spelletjes",            emoji: "🎲", legacy: "Spelletjes" },
  { id: "muziek",  label: "Muziek",                emoji: "🎵", legacy: "Muziek" },
  { id: "kleding", label: "Kleding & accessoires", emoji: "👕", legacy: "Kleding & Accesoires" },
  { id: "uitzet",  label: "Uitzet",                emoji: "🏡", legacy: "Uitzet" },
  { id: "buiten",  label: "Sport & buiten",        emoji: "⛰️", legacy: "Sport & Buiten" },
  { id: "overig",  label: "Overig",                emoji: "✨", legacy: "Overig" }
];

// Lijsten. "public" is wat bezoekers zien; de rest is alleen voor de beheerder.
// Het archief vangt verwijderde en ontvangen items op, zodat niets per ongeluk voorgoed weg is.
export const LISTS = [
  { id: "public",  label: "Verlanglijst (openbaar)", short: "Openbaar",    emoji: "🌍", isPrivate: false },
  { id: "cadeaus", label: "Cadeaus voor anderen",    short: "Cadeaus",     emoji: "🎁", isPrivate: true, legacy: "Cadeaus" },
  { id: "voorMij", label: "Voor mezelf",             short: "Voor mezelf", emoji: "🧍", isPrivate: true, legacy: "Voor Thijmen" },
  { id: "archief", label: "Archief",                 short: "Archief",     emoji: "🗄️", isPrivate: true }
];

export const PRICE_BANDS = [
  { id: "tot15", label: "Tot €15", min: 0,  max: 15 },
  { id: "15-30", label: "€15–30",  min: 15, max: 30 },
  { id: "30-50", label: "€30–50",  min: 30, max: 50 },
  { id: "50plus", label: "€50+",   min: 50, max: Infinity }
];

export const SORTS = [
  { id: "nieuw",    label: "Nieuwste eerst" },
  { id: "goedkoop", label: "Prijs: laag → hoog" },
  { id: "duur",     label: "Prijs: hoog → laag" },
  { id: "favoriet", label: "Favorieten eerst" }
];

// Alle teksten op de openbare pagina die je in het beheer (Instellingen → Teksten) kunt aanpassen.
// Leeg laten = deze standaardtekst. `max` staat ook in database.rules.json.
export const TEXT_FIELDS = [
  { key: "title",            group: "Bovenaan",       label: "Titel",                    max: 100,  default: "Verlanglijst van Thijmen" },
  { key: "intro",            group: "Bovenaan",       label: "Welkomsttekst",            max: 1000, multiline: true, default: "Hier houd ik mijn (ellenlange) verlanglijstje bij. Leuk dat je komt kijken!" },
  { key: "step1",            group: "Zo werkt het",   label: "Stap 1",                   max: 200,  default: "Zoek iets uit dat je wilt geven." },
  { key: "step2",            group: "Zo werkt het",   label: "Stap 2",                   max: 200,  default: "Klik op ‘Ik geef dit’." },
  { key: "step3",            group: "Zo werkt het",   label: "Stap 3",                   max: 200,  default: "Iedereen ziet dat het geregeld is, dus niets komt dubbel." },
  { key: "favoritesHeading", group: "Kopjes",         label: "Kopje boven de favorieten", max: 100, default: "Wat ik het liefst wil" },
  { key: "listHeading",      group: "Kopjes",         label: "Kopje boven de hele lijst", max: 100, default: "Alle wensen" },
  { key: "emptyList",        group: "Onderaan",       label: "Tekst als de lijst leeg is", max: 200, default: "De lijst is nog leeg. Kom later nog eens kijken." },
  { key: "footer",           group: "Onderaan",       label: "Onderschrift",             max: 200,  default: "Gemaakt door Thijmen." }
];

export const DEFAULT_SETTINGS = Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, f.default]));

// Grenzen die ook in database.rules.json staan; formulier en overstap houden zich hieraan.
export const LIMITS = { title: 300, link: 2000, image: 2000, note: 500, maxPrice: 99999.99 };

// Paden in de database (nieuwe structuur).
export const PATHS = {
  items: "wishlist/items",
  claims: "wishlist/claims",
  settings: "wishlist/settings",
  privateList: (listId) => `private/${listId}/items`,
  tempLinks: "private/tempLinks",
  admins: "admins"
};
