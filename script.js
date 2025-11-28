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

// ===============================
// Helpers
// ===============================
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
      <div class="preview-content">
        <h3>${i.title}</h3>
        <p>💶 €${(i.price ?? 0).toFixed(2)}</p>
        <a href="${i.link}" target="_blank" style="color:#2563eb;">Bekijk product</a>
        <p style="font-size:0.9rem;color:#bbb;margin-top:.4rem;">Categorie: ${i.category}</p>
        <button 
          class="strike-btn"
          data-key="${i.key}"
          data-category="${i.category}"
          data-title="${(i.title || "").replace(/"/g, '&quot;')}"
          ${i.done ? "disabled" : ""}
        >
          ${i.done ? "Afgestreept" : "Afstrepen"}
        </button>
      </div>
    </div>
  `).join("");

  // koppel “Afstrepen” met undo-actie
  container.querySelectorAll(".strike-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const b = e.currentTarget;
      if (b.disabled) return; // al afgestreept

      const card     = b.closest(".preview-card");
      const key      = b.dataset.key || card.dataset.key;
      const category = b.dataset.category || card.dataset.category;
      const title    = b.dataset.title || card.querySelector("h3")?.textContent || "Item";

      try {
        // Markeer als done in Firebase
        await update(ref(db, `/${category}/${key}`), { done: true });

        // UI bijwerken
        card.classList.add("done");
        b.textContent = "Afgestreept";
        b.disabled = true;

        // Undo-balk tonen voor deze actie
        showUndo(title, category, key);
      } catch (err) {
        console.error("Afstrepen mislukt:", err);
      }
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
  // Fisher-Yates shuffle
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

// ================================
// Undo-afstrepen (geldt voor deze sessie / pagina)
// ================================
let lastDoneAction = null;
let undoTimeout = null;

function ensureUndoBar() {
  let bar = document.getElementById("undoBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "undoBar";
    bar.className = "hidden";
    bar.innerHTML = `
      <span id="undoText"></span>
      <button type="button" id="undoBtn">Ongedaan maken</button>
    `;
    document.body.appendChild(bar);

    const undoBtn = bar.querySelector("#undoBtn");
    undoBtn.addEventListener("click", async () => {
      if (!lastDoneAction) return;
      try {
        const { cat, key } = lastDoneAction;
        // done weer op false zetten in Firebase
        await update(ref(db, `/${cat}/${key}`), { done: false });
      } catch (e) {
        console.error("Undo mislukt:", e);
      } finally {
        lastDoneAction = null;
        bar.classList.add("hidden");
      }
    });
  }
  return bar;
}

function showUndo(title, cat, key) {
  const bar = ensureUndoBar();
  lastDoneAction = { title, cat, key };

  const textEl = bar.querySelector("#undoText");
  textEl.textContent = `"${title}" afgestreept.`;

  bar.classList.remove("hidden");

  if (undoTimeout) clearTimeout(undoTimeout);
  // na 30 seconden verdwijnt de undo-optie
  undoTimeout = setTimeout(() => {
    lastDoneAction = null;
    bar.classList.add("hidden");
  }, 30000);
}

// ================================
// Pagina-entrypoints
// ================================
async function runHome() {
  const container = document.getElementById("item-container");
  if (!container) return;

  let items = await fetchAllItems();

  // alleen publieke items (geen private)
  items = items.filter(i => !i.private);

  // favorieten die NIET afgestreept zijn
  const favorites = items.filter(i => i.favorite && !i.done);

  // max 3 random favorieten
  const picked = shufflePick(favorites, 3);

  renderItems(container, picked);
}

async function runAllItems() {
  const container = document.getElementById("item-container");
  if (!container) return;

  container.innerHTML = "Even laden...";
  let all = (await fetchAllItems()).filter(i => !i.private);

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

    // eerst niet-afgestreept, dan afgestreept; binnen die groepen nieuwste eerst
    list.sort((a, b) => {
      if (!!a.done === !!b.done) {
        return new Date(b.dateAdded) - new Date(a.dateAdded);
      }
      return a.done ? 1 : -1; // done onderaan
    });

    renderItems(container, list);
  }

  applyBtn?.addEventListener("click", updateView);
  updateView();
}

async function runCategory(cat) {
  const container = document.getElementById("item-container");
  if (!container) return;

  container.innerHTML = "Even laden...";
  let all = (await fetchAllItems()).filter(i => !i.private);
  let list = all.filter(i => i.category === cat);

  // prijsfilters
  const minEl = document.getElementById("minPrice");
  const maxEl = document.getElementById("maxPrice");
  const applyBtn = document.getElementById("applyPriceFilter");

  function updateView() {
    const min = minEl?.value ? parseFloat(minEl.value) : null;
    const max = maxEl?.value ? parseFloat(maxEl.value) : null;
    let filtered = applyPriceFilter(list, min, max);

    filtered.sort((a, b) => {
      if (!!a.done === !!b.done) {
        return new Date(b.dateAdded) - new Date(a.dateAdded);
      }
      return a.done ? 1 : -1;
    });

    renderItems(container, filtered);
  }

  applyBtn?.addEventListener("click", updateView);
  updateView();
}

// ------- Privépagina (zonder wachtwoord, met view=cadeaus/thijmen) -------
async function runPrivatePage() {
  const container = document.getElementById("private-items");
  const titleEl   = document.getElementById("private-title");
  const descEl    = document.getElementById("private-description");
  if (!container || !titleEl || !descEl) return;

  // Lees ?view=... uit de URL
  const params = new URLSearchParams(location.search);
  const viewRaw = params.get("view") || "cadeaus"; // standaard: cadeaus
  const view = viewRaw.toLowerCase();

  let categoryName;
  if (view === "thijmen") {
    categoryName = "Voor Thijmen";
    titleEl.textContent = "Privé – Voor Thijmen";
    descEl.textContent  = "Privé-items die voor mijzelf bedoeld zijn.";
  } else {
    // alles wat niet expliciet 'thijmen' is, behandelen als cadeaus
    categoryName = "Cadeaus";
    titleEl.textContent = "Privé – Cadeaus";
    descEl.textContent  = "Cadeaus die ik voor anderen wil kopen.";
  }

  // Haal alle items op
  const allItems = await fetchAllItems();

  // Filter: alleen privé + juiste categorie
  const privateItems = allItems.filter(
    i => i.private === true && i.category === categoryName
  );

  if (!privateItems.length) {
    container.innerHTML = "<p>Geen items gevonden in deze lijst.</p>";
  } else {
    renderItems(container, privateItems);
  }
}

// ------- Router op basis van flags in HTML -------

if (window.HOME_PAGE) {
  runHome();
} else if (window.ALL_ITEMS_PAGE) {
  runAllItems();
} else if (window.CURRENT_CATEGORY) {
  runCategory(window.CURRENT_CATEGORY);
} else if (window.PRIVATE_PAGE) {
  runPrivatePage();
}
