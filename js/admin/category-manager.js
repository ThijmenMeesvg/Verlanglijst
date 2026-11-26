// Tabblad ‘Categorieën’: zelf categorieën aanmaken, hernoemen, een emoji geven, ordenen en verwijderen.
// Elke wijziging slaat meteen de hele lijst op (in de volgorde zoals hij hier staat).
import { CATEGORY_LIMITS, OVERIG, PATHS } from "../config.js";
import { categoryOf, getCategories } from "../lib/categories.js";
import { archiveUpdates, saveCategories } from "../lib/store.js";
import { confirmDialog, explainError, showToast } from "../lib/ui.js";
import { escapeHtml, newId } from "../lib/util.js";

/**
 * @param {HTMLElement} root
 * @param {{ allItems: () => object[], claims: () => object, onShowItems: (catId: string) => void }} options
 */
export function createCategoryManager(root, { allItems, claims, onShowItems }) {
  root.innerHTML = `
    <p class="cat-intro">Deze categorieën zien bezoekers als filterknopjes. Een wens zonder categorie valt vanzelf onder ‘Overig’. Welke categorie een item heeft, pas je aan bij <strong>Items</strong>.</p>
    <ul class="cat-list" id="c-list"></ul>
    <form class="cat-add" id="c-add" novalidate>
      <h2>Nieuwe categorie</h2>
      <div class="cat-add__fields">
        <div class="field">
          <label class="field__label" for="c-new-emoji">Emoji</label>
          <input class="input cat-emoji" id="c-new-emoji" maxlength="${CATEGORY_LIMITS.emoji}" placeholder="🍳" autocomplete="off">
        </div>
        <div class="field">
          <label class="field__label" for="c-new-label">Naam</label>
          <input class="input" id="c-new-label" maxlength="${CATEGORY_LIMITS.label}" placeholder="Bijv. Kookspullen" autocomplete="off" required>
        </div>
        <button type="submit" class="btn btn--primary">Toevoegen</button>
      </div>
      <p class="item-form__error" id="c-error" role="alert"></p>
    </form>`;

  const listEl = root.querySelector("#c-list");
  const addForm = root.querySelector("#c-add");
  const errorEl = root.querySelector("#c-error");

  /** Items per categorie, zonder het archief (dat telt niet mee). */
  function itemsIn(catId) {
    return allItems().filter((i) => i.listId !== "archief" && categoryOf(i) === catId);
  }

  function countLabel(n) {
    return `${n} ${n === 1 ? "item" : "items"}`;
  }

  function render() {
    const cats = getCategories();
    // Niet opnieuw tekenen terwijl je in een naamveld typt: dan raak je je cursor kwijt.
    const active = document.activeElement;
    if (active && listEl.contains(active) && active.matches("input")) return;

    const rows = cats.map((c, i) => {
      const n = itemsIn(c.id).length;
      return `
        <li class="cat-row" data-id="${escapeHtml(c.id)}">
          <label class="visually-hidden" for="c-emoji-${i}">Emoji van ${escapeHtml(c.label)}</label>
          <input class="input cat-emoji" id="c-emoji-${i}" data-field="emoji" maxlength="${CATEGORY_LIMITS.emoji}" value="${escapeHtml(c.emoji)}" autocomplete="off">
          <label class="visually-hidden" for="c-label-${i}">Naam</label>
          <input class="input" id="c-label-${i}" data-field="label" maxlength="${CATEGORY_LIMITS.label}" value="${escapeHtml(c.label)}" autocomplete="off">
          <button type="button" class="link-button cat-row__count" data-act="show">${countLabel(n)}</button>
          <div class="cat-row__actions">
            <button type="button" class="btn btn--small btn--icon" data-act="up" aria-label="Omhoog: ${escapeHtml(c.label)}" title="Omhoog"${i === 0 ? " disabled" : ""}>↑</button>
            <button type="button" class="btn btn--small btn--icon" data-act="down" aria-label="Omlaag: ${escapeHtml(c.label)}" title="Omlaag"${i === cats.length - 1 ? " disabled" : ""}>↓</button>
            <button type="button" class="btn btn--small btn--danger" data-act="delete">Verwijderen</button>
          </div>
        </li>`;
    });
    const overigCount = itemsIn(OVERIG.id).length;
    rows.push(`
      <li class="cat-row cat-row--fixed" data-id="${OVERIG.id}">
        <span class="cat-emoji cat-emoji--fixed" aria-hidden="true">${OVERIG.emoji}</span>
        <span class="cat-row__name">${OVERIG.label} <span class="cat-row__hint">vaste categorie voor alles zonder categorie</span></span>
        <button type="button" class="link-button cat-row__count" data-act="show">${countLabel(overigCount)}</button>
        <div class="cat-row__actions"></div>
      </li>`);
    if (!cats.length) rows.unshift(`<li class="notice"><p>Nog geen eigen categorieën. Maak hieronder je eerste aan.</p></li>`);
    listEl.innerHTML = rows.join("");
  }

  async function save(list, extra, message) {
    try {
      await saveCategories(list, extra);
      if (message) showToast(message);
      return true;
    } catch (err) {
      showToast(`Dat lukte niet: ${explainError(err)}`, { error: true });
      return false;
    }
  }

  // Naam of emoji gewijzigd: opslaan zodra je het veld verlaat (of op Enter drukt).
  listEl.addEventListener("change", async (e) => {
    const input = e.target.closest("[data-field]");
    if (!input) return;
    const id = input.closest(".cat-row").dataset.id;
    const value = input.value.trim();
    if (input.dataset.field === "label" && !value) {
      showToast("Een categorie heeft een naam nodig.", { error: true });
      input.value = getCategories().find((c) => c.id === id)?.label || "";
      return;
    }
    if (input.dataset.field === "label" && isDuplicate(value, id)) {
      showToast(`Er is al een categorie ‘${value}’.`, { error: true });
      input.value = getCategories().find((c) => c.id === id)?.label || "";
      return;
    }
    const list = getCategories().map((c) => (c.id === id ? { ...c, [input.dataset.field]: value || "🏷️" } : c));
    await save(list);
    input.blur();
    render();
  });
  listEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("[data-field]")) { e.preventDefault(); e.target.blur(); }
  });
  listEl.addEventListener("focusout", () => setTimeout(() => { if (!listEl.contains(document.activeElement)) render(); }, 0));

  listEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.closest(".cat-row").dataset.id;
    const act = btn.dataset.act;
    if (act === "show") { onShowItems(id); return; }

    const list = [...getCategories()];
    const index = list.findIndex((c) => c.id === id);
    if (index < 0) return;

    if (act === "up" || act === "down") {
      const to = act === "up" ? index - 1 : index + 1;
      if (to < 0 || to >= list.length) return;
      [list[index], list[to]] = [list[to], list[index]];
      if (await save(list)) {
        render();
        listEl.querySelector(`.cat-row[data-id="${CSS.escape(id)}"] [data-act="${act}"]:not(:disabled)`)?.focus()
          || listEl.querySelector(`.cat-row[data-id="${CSS.escape(id)}"] [data-act]`)?.focus();
      }
    }
    if (act === "delete") await remove(list[index]);
  });

  async function remove(cat) {
    const items = itemsIn(cat.id);
    const rest = getCategories().filter((c) => c.id !== cat.id);

    if (!items.length) {
      const ok = await confirmDialog({ title: `‘${cat.label}’ verwijderen?`, body: "Er zitten geen items in deze categorie.", confirmLabel: "Verwijderen", danger: true });
      if (ok) await save(rest, {}, `‘${cat.label}’ is verwijderd.`);
      render();
      return;
    }

    const choice = await choiceDialog({
      title: `‘${cat.label}’ verwijderen?`,
      body: `Er ${items.length === 1 ? "zit nog 1 item" : `zitten nog ${items.length} items`} in deze categorie. Wat moet daarmee gebeuren?`,
      options: [
        { value: "move", label: `${items.length === 1 ? "Item" : "Items"} naar Overig`, primary: true },
        { value: "archive", label: `${items.length === 1 ? "Item" : `Alle ${items.length} items`} ook weghalen`, danger: true }
      ]
    });

    if (choice === "move") {
      const updates = {};
      for (const item of items) updates[`${itemPath(item)}/category`] = OVERIG.id;
      await save(rest, updates, `‘${cat.label}’ is verwijderd. ${countLabel(items.length)} staan nu onder Overig.`);
    }
    if (choice === "archive") {
      const ok = await confirmDialog({
        title: `Weet je het zeker?`,
        body: [
          `${countLabel(items.length)} uit ‘${cat.label}’ verdwijnen van je lijst${items.some((i) => i.listId === "public") ? " (ook voor bezoekers)" : ""}.`,
          "Ze gaan naar het archief. Daar kun je ze nog terugzetten of definitief verwijderen."
        ],
        confirmLabel: `${countLabel(items.length)} weghalen`,
        danger: true
      });
      if (ok) {
        const c = claims();
        const entries = items.map((item) => ({ item, claimed: item.listId === "public" ? Boolean(c[item.id]) : item.done === true }));
        await save(rest, archiveUpdates(entries), `‘${cat.label}’ is verwijderd en ${countLabel(items.length)} staan in het archief.`);
      }
    }
    render();
  }

  function isDuplicate(label, exceptId) {
    const key = label.toLocaleLowerCase("nl-NL");
    return [...getCategories(), OVERIG].some((c) => c.id !== exceptId && c.label.toLocaleLowerCase("nl-NL") === key);
  }

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    const emojiInput = addForm.querySelector("#c-new-emoji");
    const labelInput = addForm.querySelector("#c-new-label");
    const label = labelInput.value.trim();
    if (!label) { errorEl.textContent = "Geef de categorie een naam."; labelInput.focus(); return; }
    if (isDuplicate(label)) { errorEl.textContent = `Er is al een categorie ‘${label}’.`; labelInput.focus(); return; }
    const cat = { id: `c${newId().slice(1)}`, label, emoji: emojiInput.value.trim() || "🏷️" };
    if (await save([...getCategories(), cat], {}, `‘${label}’ is toegevoegd.`)) {
      emojiInput.value = labelInput.value = "";
      emojiInput.focus();
    }
    render();
  });

  return { update: render };
}

function itemPath(item) {
  return item.listId === "public" ? `${PATHS.items}/${item.id}` : `${PATHS.privateList(item.listId)}/${item.id}`;
}

/**
 * Venster met meerdere keuzes. Geeft de `value` van de gekozen knop terug, of null bij Annuleren/Escape.
 * @param {{ title: string, body: string, options: { value: string, label: string, primary?: boolean, danger?: boolean }[] }} o
 */
function choiceDialog({ title, body, options }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "dialog";
    const h = document.createElement("h2");
    h.textContent = title;
    const p = document.createElement("p");
    p.textContent = body;
    const actions = document.createElement("div");
    actions.className = "dialog__actions dialog__actions--stack";
    const close = (value) => { dialog.close(); dialog.remove(); resolve(value); };
    let first = null;
    for (const o of options) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = o.primary ? "btn btn--primary" : o.danger ? "btn btn--danger" : "btn";
      b.textContent = o.label;
      b.addEventListener("click", () => close(o.value));
      actions.append(b);
      first ??= b;
    }
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn";
    cancel.textContent = "Annuleren";
    cancel.addEventListener("click", () => close(null));
    actions.append(cancel);
    dialog.append(h, p, actions);
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(null); });
    document.body.append(dialog);
    dialog.showModal();
    first?.focus();
  });
}
