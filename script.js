// Globale functie om items te tonen
function displayItems(items) {
  const container = document.getElementById("item-container");
  container.innerHTML = "";

  items.forEach(item => {
    const div = document.createElement("div");
    div.classList.add("item");
    if (item.favorite) div.classList.add("favorite");

    div.innerHTML = `
      <h3>${item.title}</h3>
      <p>€${item.price.toFixed(2)}</p>
      ${item.link ? `<a href="${item.link}" target="_blank">Bekijk product</a>` : ""}
    `;

    container.appendChild(div);
  });
}

// Functie om items te laden en te filteren
function loadItems(options = {}) {
  fetch('data.json')
    .then(response => response.json())
    .then(data => {
      let items = data;

      // Filter op categorie
      if (options.category) {
        items = items.filter(i => i.category === options.category);
      }

      // Filter op favorites
      if (options.favoritesOnly) {
        items = items.filter(i => i.favorite);
      }

      // Filter op prijsrange
      if (options.priceRange) {
        if (options.priceRange.min !== undefined) {
          items = items.filter(i => i.price >= options.priceRange.min);
        }
        if (options.priceRange.max !== undefined) {
          items = items.filter(i => i.price <= options.priceRange.max);
        }
      }

      // Filter op prijsBelow (voor Onder €15)
      if (options.priceBelow !== undefined) {
        items = items.filter(i => i.price <= options.priceBelow);
      }

      displayItems(items);
    });
}

// Filterbalk functionaliteit
document.addEventListener("DOMContentLoaded", () => {
  const applyButton = document.getElementById("applyPriceFilter");
  if (!applyButton) return; // Alleen uitvoeren als filterbalk aanwezig is

  applyButton.addEventListener("click", () => {
    const min = parseFloat(document.getElementById("minPrice").value);
    const max = parseFloat(document.getElementById("maxPrice").value);

    const priceFilter = {};
    if (!isNaN(min)) priceFilter.min = min;
    if (!isNaN(max)) priceFilter.max = max;

    // currentCategory moet op elke pagina als variabele aanwezig zijn
    loadItems({
      category: window.currentCategory,
      priceRange: priceFilter
    });
  });
});

