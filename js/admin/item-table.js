// Overzicht van alle items in alle lijsten, met filters en acties per item.
import { CATEGORIES, LISTS } from "../config.js";
import { categoryById, domId, escapeHtml, filterItems, formatPrice, safeUrl, shopName, sortItems } from "../lib/util.js";
import { archiveItems, deleteItems, saveItem, setClaimAdmin, setFields } from "../lib/store.js";
import { confirmDialog, showToast } from "../lib/ui.js";
import { createItemForm } from "./item-form.js";
import { isSurpriseMode } from "../lib/surprise.js";

const listById = (id) => LISTS.find((l) => l.id === id);

/**
 * @param {HTMLElement} root
 * @param {{ onGotoMigration: () => void }} options
 */
export function createItemTable(root, { onGotoMigration }) {
  let state = { lists: {}, claims: {} };
  const filters = { list: "active", q: "", cat: "", status: "" };

  root.innerHTML = `
    <div class="table-tools">
      <label class="visually-hidden" for="t-search">Zoeken</label>
      <input class="input" id="t-search" type="search" placeholder="Zoek op naam, winkel of notitie">
      <label class="visually-hidden" for="t-list">Lijst</label>
      <select class="select" id="t-list">
        <option value="active">Alle lijsten</option>
        ${LISTS.map((l) => `<option value="${l.id}">${l.emoji} ${escapeHtml(l.label)}</option>`).join("")}
      </select>
      <label class="visually-hidden" for="t-cat">Categorie</label>
      <select class="select" id="t-cat">
        <option value="">Alle categorieën</option>
        ${CATEGORIES.map((c) => `<option value="${c.id}">${c.emoji} ${escapeHtml(c.label)}</option>`).join("")}
      </select>
      <label class="visually-hidden" for="t-status">Status</label>
      <select class="select" id="t-status"></select>
    </div>
    <div class="table-bulk" id="t-bulk"></div>
    <p class="table-summary" id="t-summary" aria-live="polite"></p>
    <ul class="rows" id="t-rows"></ul>`;

  const $ = (id) => root.querySelector(`#${id}`);
  const rowsEl = $("t-rows");

  $("t-search").addEventListener("input", (e) => { filters.q = e.target.value.trim(); render(); });
  $("t-list").addEventListener("change", (e) => { filters.list = e.target.value; render(); });
  $("t-cat").addEventListener("change", (e) => { filters.cat = e.target.value; render(); });
  $("t-status").addEventListener("change", (e) => { filters.status = e.target.value; render(); });

  function allItems() {
    return LISTS.flatMap((l) => state.lists[l.id] || []);
  }

  const isClaimed = (item) => item.listId === "public" ? Boolean(state.claims[item.id]) : item.done === true;

  function renderStatusOptions() {
    const surprise = isSurpriseMode();
    const options = [
      ["", "Elke status"],
      ["favorite", "Favorieten"],
      ["note", "Met notitie"],
      ["noprice", "Zonder prijs"],
      ["noimage", "Zonder foto"],
      ...(surprise ? [] : [["open", "Nog open"], ["claimed", "Gegeven of gekocht"]])
    ];
    if (surprise && (filters.status === "open" || filters.status === "claimed")) filters.status = "";
    $("t-status").innerHTML = options
      .map(([v, label]) => `<option value="${v}"${v === filters.status ? " selected" : ""}>${label}</option>`)
      .join("");
  }

  function visibleItems() {
    let items = allItems();
    if (filters.list === "active") items = items.filter((i) => i.listId !== "archief");
    else items = items.filter((i) => i.listId === filters.list);
    items = filterItems(items, { q: filters.q, cat: filters.cat });
    const s = filters.status;
    if (s === "favorite") items = items.filter((i) => i.favorite);
    if (s === "note") items = items.filter((i) => i.note);
    if (s === "noprice") items = items.filter((i) => !i.price);
    if (s === "noimage") items = items.filter((i) => !i.image);
    if (s === "open") items = items.filter((i) => !isClaimed(i));
    if (s === "claimed") items = items.filter(isClaimed);
    return sortItems(items, "nieuw");
  }

  function renderRow(item) {
    const surprise = isSurpriseMode();
    const list = listById(item.listId);
    const cat = categoryById(item.category);
    const claimed = isClaimed(item);
    const image = safeUrl(item.image, { upgrade: true });
    const id = escapeHtml(item.id);
    const listAttr = escapeHtml(item.listId);
    const badges = [
      `<span class="badge">${list.emoji} ${escapeHtml(list.short)}</span>`,
      item.favorite ? `<span class="badge badge--gold">★ Favoriet</span>` : "",
      claimed && !surprise ? `<span class="badge badge--moss">${item.listId === "public" ? "Wordt gegeven" : "Gekocht"}</span>` : "",
      item.note ? `<span class="badge" title="${escapeHtml(item.note)}">Notitie</span>` : ""
    ].join("");

    const actions = item.listId === "archief"
      ? `<button type="button" class="btn btn--small" data-act="restore">Terugzetten</button>
         <button type="button" class="btn btn--small btn--danger" data-act="delete">Definitief verwijderen</button>`
      : `<button type="button" class="btn btn--small" data-act="edit">Bewerken</button>
         <button type="button" class="btn btn--small" data-act="fav" aria-pressed="${item.favorite === true}">${item.favorite ? "★ Favoriet" : "☆ Favoriet"}</button>
         ${item.listId === "public" && !surprise ? `<button type="button" class="btn btn--small" data-act="claim">${claimed ? "Weer open zetten" : "Markeer als gegeven"}</button>` : ""}
         ${item.listId === "public" ? `<button type="button" class="btn btn--small" data-act="copy">Link naar item</button>` : ""}
         <button type="button" class="btn btn--small" data-act="archive">Archiveren</button>`;

    return `
      <li class="row${claimed && !surprise ? " is-claimed" : ""}" data-id="${id}" data-list="${listAttr}">
        <div class="row__thumb" data-emoji="${escapeHtml(cat.emoji)}">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</div>
        <div class="row__main">
          <a class="row__title" href="${escapeHtml(safeUrl(item.link))}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
          <p class="row__meta">${escapeHtml(formatPrice(item.price))}, ${escapeHtml(cat.label)}${shopName(item.link) ? `, ${escapeHtml(shopName(item.link))}` : ""}</p>
          <div class="row__badges">${badges}</div>
        </div>
        <div class="row__actions">${actions}</div>
      </li>`;
  }

  function render() {
    renderStatusOptions();
    const items = visibleItems();
    const claimedPublic = (state.lists.public || []).filter((i) => state.claims[i.id]);
    $("t-summary").textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;
    $("t-bulk").innerHTML =
      claimedPublic.length && !isSurpriseMode()
        ? `<button type="button" class="btn btn--small" data-act="archive-claimed">${claimedPublic.length} gegeven ${claimedPublic.length === 1 ? "item" : "items"} naar het archief</button>`
        : "";
    if (!allItems().length) {
      rowsEl.innerHTML = `<li class="notice"><p>Nog geen items. Kom je van de oude versie van de site? Zet je items dan eerst over.</p><button type="button" class="btn" data-act="goto-migration">Naar de overstap</button></li>`;
      return;
    }
    rowsEl.innerHTML = items.length
      ? items.map(renderRow).join("")
      : `<li class="notice"><p>Geen items met deze filters.</p></li>`;
  }

  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;

    if (act === "goto-migration") {
      onGotoMigration();
      return;
    }

    if (act === "archive-claimed") {
      const entries = (state.lists.public || []).filter((i) => state.claims[i.id]).map((item) => ({ item, claimed: true }));
      const ok = await confirmDialog({
        title: "Gegeven items archiveren?",
        body: `${entries.length} ${entries.length === 1 ? "item gaat" : "items gaan"} van je openbare lijst naar het archief. Je kunt ze daar terugzetten.`,
        confirmLabel: "Archiveren"
      });
      if (ok) await run(() => archiveItems(entries), "Naar het archief verplaatst.");
      return;
    }

    const rowEl = btn.closest(".row");
    const item = allItems().find((i) => i.id === rowEl?.dataset.id && i.listId === rowEl?.dataset.list);
    if (!item) return;

    if (act === "edit") openEditor(item);
    if (act === "fav") await run(() => setFields(item.listId, item.id, { favorite: !item.favorite }));
    if (act === "claim") await run(() => setClaimAdmin(item.id, !state.claims[item.id]));
    if (act === "copy") {
      const url = new URL(`./#${domId(item.id)}`, location.href).href;
      try { await navigator.clipboard.writeText(url); showToast("Link naar dit item gekopieerd."); }
      catch { showToast("Kopiëren lukte niet.", { error: true }); }
    }
    if (act === "archive") {
      const claimed = isClaimed(item);
      await run(() => archiveItems([{ item, claimed }]), `“${item.title}” staat in het archief.`, {
        actionLabel: "Ongedaan maken",
        onAction: () =>
          run(async () => {
            await restore({ ...item, listId: "archief", fromList: item.listId });
            if (claimed && item.listId === "public") await setClaimAdmin(item.id, true);
          }, "Teruggezet.")
      });
    }
    if (act === "restore") await run(() => restore(item), `“${item.title}” is teruggezet.`);
    if (act === "delete") {
      const ok = await confirmDialog({
        title: "Definitief verwijderen?",
        body: `“${item.title}” wordt voorgoed verwijderd. Dit kun je niet ongedaan maken.`,
        confirmLabel: "Verwijderen",
        danger: true
      });
      if (ok) await run(() => deleteItems([{ listId: "archief", id: item.id }]), "Verwijderd.");
    }
  });

  function restore(item) {
    const target = LISTS.some((l) => l.id === item.fromList && l.id !== "archief") ? item.fromList : "public";
    const { archivedAt, fromList, ...data } = item;
    return saveItem({ id: item.id, fromListId: "archief", listId: target, data: { ...data, done: target !== "public" && data.done } });
  }

  async function run(action, message, toastOptions) {
    try {
      await action();
      if (message) showToast(message, toastOptions);
    } catch (err) {
      showToast(`Dat lukte niet: ${err.message}`, { error: true });
    }
  }

  function openEditor(item) {
    const dialog = document.createElement("dialog");
    dialog.className = "dialog dialog--wide";
    dialog.setAttribute("aria-label", "Item bewerken");
    const heading = document.createElement("h2");
    heading.textContent = "Item bewerken";
    const close = () => { dialog.close(); dialog.remove(); };
    const form = createItemForm({ mode: "edit", item, allItems, onSaved: close, onCancel: close });
    dialog.append(heading, form);
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    document.body.append(dialog);
    dialog.showModal();
  }

  return {
    allItems,
    update(next) {
      state = next;
      render();
    },
    refresh: render
  };
}
