document.addEventListener("DOMContentLoaded", () => {

  async function loadItems(options = {}) {
    const container = document.getElementById("item-container");
    if (!container) return;
    container.innerHTML = "Even laden...";

    try {
      const response = await fetch('data.json');
      const itemsByCategory = await response.json();
      let items = [];

      // Filter op categorie
      if (options.category) {
        items = itemsByCategory.filter(i => i.category === options.category);
      } else {
        // Als geen categorie, toon alle items
        items = itemsByCategory;
      }

      // Filter op prijs
      if (options.minPrice != null) items = items.filter(i => i.price >= options.minPrice);
      if (options.maxPrice != null) items = items.filter(i => i.price <= options.maxPrice);

      // Sorteer op datum toegevoegd (voor homepagina)
      if (options.sortBy === "dateAdded") {
        items.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
      }

      // Limit (bijv. homepagina)
      if (options.limit) items = items.slice(0, options.limit);

      // Toon items
      if (items.length === 0) {
        container.innerHTML = "<p>Geen items gevonden.</p>";
      } else {
        container.innerHTML = items.map(i => `
          <div class="item${i.favorite ? " favorite" : ""}">
            <a href="${i.link}" target="_blank">${i.title}</a>
            <p>€${i.price.toFixed(2)}</p>
          </div>
        `).join("");
      }

    } catch (error) {
      console.error(error);
      container.innerHTML = "<p>Fout bij het laden van de items.</p>";
    }
  }

  // Setup filterknop
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


