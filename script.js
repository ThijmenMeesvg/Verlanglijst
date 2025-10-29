async function loadItems(options = {}) {
  const container = document.getElementById("item-container");
  container.innerHTML = "<p>Even laden...</p>";

  try {
    const res = await fetch("data.json");
    let items = await res.json();

    // Sorteer of filter op basis van wat de pagina vraagt
    if (options.category) {
      items = items.filter(i => i.category === options.category);
    }

    if (options.favoritesOnly) {
      items = items.filter(i => i.favorite);
    }

    if (options.priceBelow) {
      items = items.filter(i => i.price < options.priceBelow);
    }

    if (options.sortBy === "dateAdded") {
      items.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    }

    if (options.limit) {
      items = items.slice(0, options.limit);
    }

    // Toon items
    container.innerHTML = "";
    if (items.length === 0) {
      container.innerHTML = "<p>Geen items gevonden.</p>";
      return;
    }

    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <h3>${item.title}</h3>
        <p>€${item.price.toFixed(2)}</p>
        <a href="${item.link}" target="_blank">Bekijk product</a>
      `;
      if (item.favorite) {
        div.classList.add("favorite");
      }
      container.appendChild(div);
    });
  } catch (err) {
    container.innerHTML = "<p>Fout bij laden van data.</p>";
    console.error(err);
  }
}
