document.addEventListener("DOMContentLoaded", () => {

  // =======================
  // Firebase configuratie
  // =======================
  const firebaseConfig = {
    apiKey: "JOUW_API_KEY",
    authDomain: "JOUW_PROJECT.firebaseapp.com",
    databaseURL: "https://JOUW_PROJECT.firebaseio.com",
    projectId: "JOUW_PROJECT",
    storageBucket: "JOUW_PROJECT.appspot.com",
    messagingSenderId: "JOUW_ID",
    appId: "JOUW_APP_ID"
  };

  const app = firebase.initializeApp(firebaseConfig);
  const database = firebase.database();

  // =======================
  // Items laden
  // =======================
  async function loadItems(options = {}) {
    const container = document.getElementById("item-container");
    if (!container) return;
    container.innerHTML = "Even laden...";

    try {
      let allItems = [];

      // Bepaal categorieën om op te halen
      const categories = options.category
        ? [options.category]
        : Object.keys(await database.ref().get().then(snap => snap.val()) || {});

      for (const category of categories) {
        const snapshot = await database.ref(category).get();
        const items = snapshot.val();
        if (!items) continue;
        allItems.push(...Object.entries(items).map(([key, item]) => ({ ...item, category, key })));
      }

      let filteredItems = allItems;

      // Filter op categorie
      if (options.category) filteredItems = filteredItems.filter(i => i.category === options.category);

      // Filter op prijs
      if (options.minPrice != null) filteredItems = filteredItems.filter(i => i.price >= options.minPrice);
      if (options.maxPrice != null) filteredItems = filteredItems.filter(i => i.price <= options.maxPrice);

      // Homepage favorieten
      if (typeof homePage !== "undefined") {
        const favorites = allItems.filter(i => i.favorite === true);
        if (favorites.length > 0) {
          filteredItems = favorites.sort(() => 0.5 - Math.random()).slice(0, 3);
        } else {
          filteredItems = allItems.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).slice(0, 3);
        }
      }

      // Sorteer op datum toegevoegd
      if (options.sortBy === "dateAdded" && typeof homePage === "undefined") {
        filteredItems.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
      }

      // Limit
      if (options.limit && typeof homePage === "undefined") {
        filteredItems = filteredItems.slice(0, options.limit);
      }

      // Toon items
      if (filteredItems.length === 0) {
        container.innerHTML = "<p>Geen items gevonden.</p>";
      } else {
        container.innerHTML = filteredItems.map(i => `
          <div class="preview-card${i.favorite ? " favorite" : ""} ${i.done ? "done" : ""}" data-key="${i.key}" data-category="${i.category}">
            ${i.image ? `<img src="${i.image}" alt="${i.title}">` : ""}
            <div>
              <h3>${i.title}</h3>
              <p>💶 €${i.price.toFixed(2)}</p>
              <a href="${i.link}" target="_blank" style="color:#2563eb;">Bekijk product</a>
              ${i.category ? `<p style="font-size:0.9rem;color:#555;margin-top:.4rem;">Categorie: ${i.category}</p>` : ""}
              <button class="strike-btn">${i.done ? "✔️" : "Markeer"}</button>
            </div>
          </div>
        `).join("");
      }

      setupStrikeButtons();

    } catch (error) {
      console.error(error);
      container.innerHTML = `<p>Fout bij het laden van de items.</p>`;
    }
  }

  // =======================
  // Items afstrepen
  // =======================
  function setupStrikeButtons() {
    document.querySelectorAll(".strike-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const card = e.target.closest(".preview-card");
        const key = card.dataset.key;
        const category = card.dataset.category;

        const itemRef = database.ref(`${category}/${key}`);
        const snapshot = await itemRef.get();
        const current = snapshot.val();
        const newDone = !current.done;

        await itemRef.update({ done: newDone });

        // Update visueel
        if (newDone) {
          card.classList.add("done");
          btn.textContent = "✔️";
        } else {
          card.classList.remove("done");
          btn.textContent = "Markeer";
        }
      });
    });
  }

  // =======================
  // Prijsfilter instellen
  // =======================
  function setupPriceFilter(category) {
    const btn = document.getElementById("applyPriceFilter");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const min = parseFloat(document.getElementById("minPrice").value);
      const max = parseFloat(document.getElementById("maxPrice").value);

      loadItems({
        category: category,
        minPrice: isNaN(min) ? null : min,
        maxPrice: isNaN(max) ? null : max
      });
    });
  }

  // =======================
  // Paginalogica
  // =======================
  if (typeof currentCategory !== "undefined") {
    loadItems({ category: currentCategory });
    setupPriceFilter(currentCategory);
  }

  if (typeof homePage !== "undefined") {
    loadItems();
  }

});
