// Kladblok voor links die je later nog wilt bekijken of toevoegen. Alleen zichtbaar voor de beheerder.
import { addTempLinks, deleteTempLinks } from "../lib/store.js";
import { confirmDialog, showToast } from "../lib/ui.js";
import { escapeHtml, formatDate, safeUrl, shopName } from "../lib/util.js";

/**
 * @param {HTMLElement} root
 * @param {{ onAddAsItem: (url: string) => void }} options
 */
export function createLinks(root, { onAddAsItem }) {
  let links = [];

  root.innerHTML = `
    <form class="links-form" id="links-form">
      <label class="field__label" for="links-input">Plak een of meer links (één per regel)</label>
      <textarea class="textarea" id="links-input" placeholder="https://…"></textarea>
      <div class="item-form__actions">
        <button type="submit" class="btn btn--primary">Bewaren</button>
      </div>
    </form>
    <div class="table-bulk" id="links-bulk"></div>
    <ul class="rows" id="links-rows"></ul>`;

  const input = root.querySelector("#links-input");
  const rows = root.querySelector("#links-rows");

  root.querySelector("#links-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const lines = input.value.split(/\s+/).map((l) => safeUrl(l)).filter(Boolean);
    if (!lines.length) { showToast("Geen geldige links gevonden. Links beginnen met https://.", { error: true }); return; }
    try {
      await addTempLinks(lines);
      input.value = "";
      showToast(`${lines.length} ${lines.length === 1 ? "link" : "links"} bewaard.`);
    } catch (err) {
      showToast(`Bewaren lukte niet: ${err.message}`, { error: true });
    }
  });

  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    if (btn.dataset.act === "clear") {
      const ok = await confirmDialog({ title: "Alle links wissen?", body: `${links.length} bewaarde links worden verwijderd.`, confirmLabel: "Alles wissen", danger: true });
      if (ok) await deleteTempLinks(links.map((l) => l.id)).catch((err) => showToast(err.message, { error: true }));
      return;
    }
    const link = links.find((l) => l.id === btn.closest("[data-id]")?.dataset.id);
    if (!link) return;
    if (btn.dataset.act === "add") onAddAsItem(link.url);
    if (btn.dataset.act === "delete") await deleteTempLinks([link.id]).catch((err) => showToast(err.message, { error: true }));
  });

  function render() {
    root.querySelector("#links-bulk").innerHTML = links.length > 1
      ? `<button type="button" class="btn btn--small btn--danger" data-act="clear">Alle ${links.length} links wissen</button>`
      : "";
    rows.innerHTML = links.length
      ? links.map((l) => `
          <li class="row row--link" data-id="${escapeHtml(l.id)}">
            <div class="row__main">
              <a class="row__title" href="${escapeHtml(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(shopName(l.url) || l.url)}</a>
              <p class="row__meta row__url">${escapeHtml(l.url)}</p>
              ${l.at ? `<p class="row__meta">Bewaard op ${escapeHtml(formatDate(l.at))}</p>` : ""}
            </div>
            <div class="row__actions">
              <button type="button" class="btn btn--small" data-act="add">Toevoegen als item</button>
              <button type="button" class="btn btn--small btn--danger" data-act="delete">Verwijderen</button>
            </div>
          </li>`).join("")
      : `<li class="notice"><p>Nog geen bewaarde links.</p></li>`;
  }

  return {
    update(next) {
      links = next;
      render();
    }
  };
}
