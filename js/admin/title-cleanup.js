// "Namen opschonen": stelt nettere namen voor (zonder dubbel voorvoegsel, met hoofdletter)
// en meldt dubbele namen. Er verandert pas iets als je zelf op ‘Toepassen’ klikt.
import { LISTS, PATHS } from "../config.js";
import { applyUpdates } from "../lib/store.js";
import { showToast } from "../lib/ui.js";
import { escapeHtml, findDuplicateTitles, suggestTitle } from "../lib/util.js";

const itemPath = (listId, id) => (listId === "public" ? `${PATHS.items}/${id}` : `${PATHS.privateList(listId)}/${id}`);
const listLabel = (id) => LISTS.find((l) => l.id === id)?.short || id;

/**
 * @param {HTMLElement} root
 * @param {{ allItems: () => object[] }} options
 */
export function createTitleCleanup(root, { allItems }) {
  root.innerHTML = `
    <h2>Namen opschonen</h2>
    <p>Haalt dubbele voorvoegsels weg (‘Spel -’, ‘Boek -’, ‘LP -’: de categorie staat er al onder) en begint elke naam met een hoofdletter. Je kiest zelf welke voorstellen je overneemt.</p>
    <button type="button" class="btn" id="tc-check">Namen bekijken</button>
    <div class="cleanup" id="tc-result" aria-live="polite"></div>`;

  const result = root.querySelector("#tc-result");
  root.querySelector("#tc-check").addEventListener("click", render);

  function render() {
    const items = allItems().filter((i) => i.listId !== "archief");
    const changes = items
      .map((item) => ({ item, next: suggestTitle(item.title) }))
      .filter(({ item, next }) => next !== item.title);
    const duplicates = findDuplicateTitles(items);

    if (!changes.length && !duplicates.length) {
      result.innerHTML = `<p>Alle namen zien er netjes uit.</p>`;
      return;
    }

    result.innerHTML = `
      ${changes.length ? `
        <form id="tc-form" class="cleanup__form">
          <p><strong>${changes.length} ${changes.length === 1 ? "voorstel" : "voorstellen"}</strong></p>
          <ul class="cleanup__list">
            ${changes.map(({ item, next }, i) => `
              <li>
                <label class="check cleanup__row">
                  <input type="checkbox" name="pick" value="${i}" checked>
                  <span><s>${escapeHtml(item.title)}</s> → <strong>${escapeHtml(next)}</strong></span>
                </label>
              </li>`).join("")}
          </ul>
          <button type="submit" class="btn btn--primary">Toepassen</button>
        </form>` : ""}
      ${duplicates.length ? `
        <div class="cleanup__dups">
          <p><strong>Dubbele namen</strong> (zelfde naam in dezelfde lijst). Geef ze een onderscheid via ‘Bewerken’, bijvoorbeeld kleur of maat in de naam of notitie:</p>
          <ul class="plain-list">
            ${duplicates.map((g) => `<li>${escapeHtml(g[0].title)}: ${g.length}× in ${escapeHtml(listLabel(g[0].listId))}</li>`).join("")}
          </ul>
        </div>` : ""}`;

    result.querySelector("#tc-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const picked = [...e.target.querySelectorAll('input[name="pick"]:checked')].map((c) => changes[Number(c.value)]);
      if (!picked.length) { showToast("Niets aangevinkt."); return; }
      try {
        await applyUpdates(Object.fromEntries(picked.map(({ item, next }) => [`${itemPath(item.listId, item.id)}/title`, next])));
        showToast(`${picked.length} ${picked.length === 1 ? "naam" : "namen"} aangepast.`);
        render();
      } catch (err) {
        showToast(`Aanpassen lukte niet: ${err.message}`, { error: true });
      }
    });
  }
}
