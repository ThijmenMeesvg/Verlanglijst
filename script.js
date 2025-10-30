document.addEventListener("DOMContentLoaded", () => {

  async function loadItems(options = {}) {
    const container = document.getElementById("item-container");
    if (!container) return;
    container.innerHTML = "Even laden...";

    try {
      // Haal JSON op
      const response = await fetch('data.json');
      const itemsByCategory = await response.json();

      // Alle items in 1 array (voor homepagina en algemene filter)
      let allItems = Object.entries(itemsByCategory).flatMap(([category, items]) =>
        items.map(i => ({ ...i, category }))
      );

      let filteredItems = allItems;

      // Filter op categorie
      if (options.category) {
        filteredItems = filteredItems.filter(i => i.category === options.category);
      }

      // Filter op prijs
      if (options.minPrice != null) filteredItems = filteredItems.filter(i => i.price >= options.minPrice);
      if (options.maxPrice != null) filteredItems = filteredItems.filter(i => i.price <= options.maxPrice);

      // Sorteer op datum toegevoegd (voor homepagina)
      if (options.sortBy === "dateAdded") {
        filteredItems.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
      }

      // Limit (bijv. homepagina)
      if (options.limit) filteredItems = filteredItems.slice(0, options.limit);

      // Toon items in preview-stijl
      if (filteredItems.length === 0) {
        container.innerHTML = "<p>Geen items gevonden.</p>";
      } else {
        container.innerHTML = filteredItems.map(i => `
          <div class="preview-card${i.favorite ? " favorite" : ""}">
            ${i.image ? `<img src="${i.image}" alt="${i.title}">` : ""}
            <div>
              <h3>${i.title}</h3>
              <p>💶 €${i.price.toFixed(2)}</p>
              <a href="${i.link}" target="_blank" style="color:#2563eb;">Bekijk product</a>
              ${i.category ? `<p style="font-size:0.9rem;color:#555;margin-top:.4rem;">Categorie: ${i.category}</p>` : ""}
            </div>
          </div>
        `).join("");
      }

    } catch (error) {
      console.error(error);
      container.innerHTML = `
        <p>Fout bij het laden van de items.</p>
        <img src="https://static.vecteezy.com/system/resources/previews/048/790/049/non_2x/oops-retro-error-message-in-purple-color-with-gradient-vector.jpg" 
             alt="Foutafbeelding" 
             style="max-width:300px; display:block; margin-top:10px;">
      `;
    }
  }

  // Setup prijsfilterknop
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

  // Categoriepagina
  if (typeof currentCategory !== "undefined") {
    loadItems({ category: currentCategory });
    setupPriceFilter(currentCategory);
  }

  // Homepage
  if (typeof homePage !== "undefined") {
    loadItems({ sortBy: "dateAdded", limit: 12 });
  }

});

