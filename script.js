document.addEventListener("DOMContentLoaded", () => {

  async function loadItems(options = {}) {
    const container = document.getElementById("item-container");
    if (!container) return;
    container.innerHTML = "Even laden...";

    try {
      const response = await fetch('data.json');
      let items = await response.json();

      // Filter op categorie
      if (options.category) {
        items = items.filter(i => i.category === options.category);
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
          <div class="item">
            <a href="${i.link}" target="_blank">${i.title}</a>
            <p>€${i.price}</p>
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

  // Als categoriepagina
  if (typeof currentCategory !== "undefined") {
    loadItems({ category: currentCategory });
    setupPriceFilter(currentCategory);
  }

  // Als homepage
  if (typeof homePage !== "undefined") {
    loadItems({ sortBy: "dateAdded", limit: 12 });
  }

});

// Voor homepagina: laatste toegevoegd, limiet bijv. 12
if (typeof homePage !== "undefined") {
  loadItems({ sortBy: "dateAdded", limit: 12 });
}

