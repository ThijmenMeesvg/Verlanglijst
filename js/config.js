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

export const DEFAULT_SETTINGS = {
  title: "Verlanglijst van Thijmen",
  intro: "Hier houd ik mijn (ellenlange) verlanglijstje bij. Leuk dat je komt kijken!"
};

// Paden in de database (nieuwe structuur).
export const PATHS = {
  items: "wishlist/items",
  claims: "wishlist/claims",
  settings: "wishlist/settings",
  privateList: (listId) => `private/${listId}/items`,
  tempLinks: "private/tempLinks",
  admins: "admins"
};
