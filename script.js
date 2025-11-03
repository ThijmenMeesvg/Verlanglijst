// --- script.js (ESM) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// === Firebase config (jouw waarden) ===
const firebaseConfig = {
  apiKey: "AIzaSyCnDzhefAQWgoShNY2geSFwxTzNwqUqvTU",
  authDomain: "verlanglijst-12015.firebaseapp.com",
  databaseURL: "https://verlanglijst-12015-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "verlanglijst-12015",
  storageBucket: "verlanglijst-12015.firebasestorage.app",
  messagingSenderId: "512971362808",
  appId: "1:512971362808:web:b16ec8341ec4fbe795460d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ------- Helpers -------
async function fetchAllItems() {
  const snap = await get(ref(db, "/"));
  const root = snap.val() || {}; // { Boeken: {key: item}, Muziek: {...}, ... }

  const all = [];
  for (const [cat, obj] of Object.entries(root)) {
    if (!obj) continue;
    for (const [key, item] of Object.entries(obj)) {
      all.push({ ...item, category: cat, key });
    }
  }
  return all;
}

function renderItems(container, items) {
  if (!items.length) {
    container.innerHTML = "<p>Geen items gevonden.</p>";
    return;
  }

  container.innerHTML = items.map(i => `
    <div class="preview-card${i.favorite ? " favorite" : ""} ${i.done ? "done" : ""}" 
         data-key="${i.key}" data-category="${i.category}">
      ${i.image ? `<img src="${i.image}" alt="${i.title}">` : ""}
      <div>
        <h3>${i.title}</h3>
        <p>💶 €${(i.price ?? 0).toFixed(2)}</p>
        <a href="${i.link}" target="_blank" style="color:#2563eb;">Bekijk product</a>
        <p style="font-size:0.9rem;color:#555;margin-top:.4rem;">Categorie: ${i.category}</p>
        <button class="strike-btn">${i.done ? "Afgestreept" : "Afstrepen"}</button>
      </div>
    </div>
  `).join("");

  // koppel “Afstrepen”
  container.querySelectorAll(".strike-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const card = e.currentTarget.closest(".preview-card");
      const key = card.dataset.key;
      const category = card.dataset.category;

      const newDone = !card.classList.contains("done");
      await update(ref(db, `/${category}/${key}`), { done: newDone });

      card.classList.toggle("done", newDone);
      e.currentTarget.textContent = newDone ? "Afgestreept" : "Afstrepen";
    });
  });
}

function applyPriceFilter(list, min, max) {
  let out = list;
  if (min != null) out = out.filter(i => (i.price ?? 0) >= min);
  if (max != null) out = out.filter(i => (i.price ?? 0) <= max);
  return out;
}

function shufflePick(arr, n = 3) {
  // Fisher-Yates
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

// ------- Pagina-entrypoints -------

async function runHome() {
  const container = document.getElementById("item-container");
  if (!container) return;

  container.innerHTML = "Even laden...";
  const all = await fetchAllItems();
  const favs = all.filter(i => i.favorite === true);
  const pick = favs.length ? shufflePick(favs, 3) : all.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).slice(0, 3);
  renderItems(container, pick);
}

async function runAllItems() {
  const container = document.getElementById("item-container");
  if (!container) return;

  container.innerHTML = "Even laden...";
  let all = await fetchAllItems();

  // filters
  const categorySelect = document.getElementById("categoryFilter");
  const minEl = document.getElementById("minPrice");
  const maxEl = document.getElementById("maxPrice");
  const applyBtn = document.getElementById("applyFilters");

  function updateView() {
    let list = all.slice();
    const cat = categorySelect?.value || "";
    const min = minEl?.value ? parseFloat(minEl.value) : null;
    const max = maxEl?.value ? parseFloat(maxEl.value) : null;

    if (cat) list = list.filter(i => i.category === cat);
    list = applyPriceFilter(list, min, max);
    list.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

    renderItems(container, list);
  }

  applyBtn?.addEventListener("click", updateView);
  updateView();
}

async function runCategory(cat) {
  const container = document.getElementById("item-container");
  if (!container) return;

  container.innerHTML = "Even laden...";
  let all = await fetchAllItems();
  let list = all.filter(i => i.category === cat);

  // prijsfilters
  const minEl = document.getElementById("minPrice");
  const maxEl = document.getElementById("maxPrice");
  const applyBtn = document.getElementById("applyPriceFilter");

  function updateView() {
    const min = minEl?.value ? parseFloat(minEl.value) : null;
    const max = maxEl?.value ? parseFloat(maxEl.value) : null;
    let filtered = applyPriceFilter(list, min, max);
    filtered.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    renderItems(container, filtered);
  }

  applyBtn?.addEventListener("click", updateView);
  updateView();
}

// ------- Router op basis van flags die we in HTML zetten -------
if (window.HOME_PAGE) {
  runHome();
} else if (window.ALL_ITEMS_PAGE) {
  runAllItems();
} else if (window.CURRENT_CATEGORY) {
  runCategory(window.CURRENT_CATEGORY);
}
