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

    // Sorteer op datum toegevoegd (homepagina)
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

// Filterfunctie voor prijsfilter
function setupPriceFilter(currentCategory) {
  const btn = document.getElementById("applyPriceFilter");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const minInput = document.getElementById("minPrice");
    const maxInput = document.getElementById("maxPrice");
    const min = parseFloat(minInput.value);
    const max = parseFloat(maxInput.value);

    loadItems({
      category: currentCategory,
      minPrice: isNaN(min) ? null : min,
      maxPrice: isNaN(max) ? null : max
    });
  });
}

// Voor categoriepagina’s
if (typeof currentCategory !== "undefined") {
  loadItems({ category: currentCategory });
  setupPriceFilter(currentCategory);
}

// Voor homepagina: laatste toegevoegd, limiet bijv. 12
if (typeof homePage !== "undefined") {
  loadItems({ sortBy: "dateAdded", limit: 12 });
}

