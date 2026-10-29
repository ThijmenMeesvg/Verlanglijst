// Formulier om een item toe te voegen of te bewerken, met voorbeeld zoals bezoekers het zien.
import { CATEGORIES, LIMITS, LISTS } from "../config.js";
import { cleanUrl, escapeHtml, isValidPriceText, linkKey, normalizePrice, parsePrice, safeUrl } from "../lib/util.js";
import { saveItem } from "../lib/store.js";
import { showToast } from "../lib/ui.js";
import { renderTag } from "../public/render.js";
import { fetchProductInfo } from "./metadata.js";

let formCount = 0;

/**
 * @param {object} options
 * @param {"add"|"edit"} options.mode
 * @param {object} [options.item]          bestaand item (bij bewerken), met id en listId
 * @param {() => object[]} options.allItems alle items uit alle lijsten, om dubbele links te vinden
 * @param {(id: string) => void} [options.onSaved]
 * @param {() => void} [options.onCancel]
 * @returns {HTMLFormElement}
 */
export function createItemForm({ mode, item = {}, allItems, onSaved, onCancel }) {
  const uid = `f${++formCount}`;
  const listId = item.listId || "public";
  // Archiveren gaat via de knop in de lijst (die onthoudt waar het vandaan kwam), niet via dit menu.
  const lists = LISTS.filter((l) => l.id !== "archief");
  const form = document.createElement("form");
  form.className = "item-form";
  form.noValidate = true;

  form.innerHTML = `
    <div class="field">
      <label class="field__label" for="${uid}-link">Link naar het product</label>
      <div class="item-form__fetch">
        <input class="input" id="${uid}-link" name="link" type="url" inputmode="url" autocomplete="off"
               placeholder="https://…" value="${escapeHtml(item.link || "")}" required>
        <button type="button" class="btn" data-fetch>Gegevens ophalen</button>
      </div>
      <p class="field__hint" data-fetch-status aria-live="polite">Plak een link en klik op ‘Gegevens ophalen’ voor titel, foto en prijs.</p>
    </div>

    <div class="field">
      <label class="field__label" for="${uid}-title">Naam</label>
      <input class="input" id="${uid}-title" name="title" maxlength="300" value="${escapeHtml(item.title || "")}" required>
    </div>

    <div class="item-form__row">
      <div class="field">
        <label class="field__label" for="${uid}-price">Prijs (€)</label>
        <input class="input" id="${uid}-price" name="price" inputmode="decimal" autocomplete="off"
               value="${item.price ? escapeHtml(String(item.price).replace(".", ",")) : ""}" placeholder="Bijv. 24,95">
        <p class="field__hint">Leeg laten als je het niet weet.</p>
      </div>
      <div class="field">
        <label class="field__label" for="${uid}-category">Categorie</label>
        <select class="select" id="${uid}-category" name="category">
          ${CATEGORIES.map((c) => `<option value="${c.id}"${c.id === (item.category || "overig") ? " selected" : ""}>${c.emoji} ${escapeHtml(c.label)}</option>`).join("")}
        </select>
      </div>
    </div>

    <div class="field">
      <label class="field__label" for="${uid}-image">Link naar een foto</label>
      <input class="input" id="${uid}-image" name="image" type="url" inputmode="url" autocomplete="off"
             placeholder="Wordt meestal automatisch ingevuld" value="${escapeHtml(item.image || "")}">
    </div>

    <div class="field">
      <label class="field__label" for="${uid}-note">Notitie voor de gever</label>
      <textarea class="textarea" id="${uid}-note" name="note" maxlength="500" placeholder="Bijv. maat L, liefst in het groen">${escapeHtml(item.note || "")}</textarea>
    </div>

    <div class="item-form__row">
      <div class="field">
        <label class="field__label" for="${uid}-list">Lijst</label>
        <select class="select" id="${uid}-list" name="listId">
          ${lists.map((l) => `<option value="${l.id}"${l.id === listId ? " selected" : ""}>${l.emoji} ${escapeHtml(l.label)}</option>`).join("")}
        </select>
      </div>
      <div class="item-form__checks">
        <label class="check"><input type="checkbox" name="favorite"${item.favorite ? " checked" : ""}> Favoriet</label>
        <label class="check" data-done-wrap><input type="checkbox" name="done"${item.done ? " checked" : ""}> Al gekocht</label>
      </div>
    </div>

    <p class="item-form__error" data-error role="alert"></p>

    <div class="item-form__actions">
      <button type="submit" class="btn btn--primary">${mode === "add" ? "Toevoegen" : "Wijzigingen opslaan"}</button>
      <button type="button" class="btn" data-secondary>${mode === "add" ? "Leegmaken" : "Annuleren"}</button>
    </div>

    <div class="item-form__preview">
      <p class="field__label">Zo zien bezoekers het</p>
      <div class="item-form__preview-tag" data-preview></div>
    </div>`;

  const field = (name) => form.elements.namedItem(name);
  const status = form.querySelector("[data-fetch-status]");
  const errorBox = form.querySelector("[data-error]");
  const preview = form.querySelector("[data-preview]");
  const doneWrap = form.querySelector("[data-done-wrap]");
  let confirmDuplicate = false;

  function values() {
    const priceText = field("price").value.trim();
    return {
      link: cleanUrl(field("link").value.trim()),
      title: field("title").value.trim(),
      price: priceText ? normalizePrice(parsePrice(priceText)) : null,
      priceText,
      category: field("category").value,
      image: safeUrl(field("image").value.trim(), { upgrade: true }),
      note: field("note").value.trim(),
      listId: field("listId").value,
      favorite: field("favorite").checked,
      done: field("done").checked
    };
  }

  function updatePreview() {
    const v = values();
    doneWrap.hidden = v.listId === "public";
    preview.innerHTML = renderTag(
      { id: "preview", title: v.title || "Naam van het item", link: v.link, image: v.image, price: v.price, category: v.category, favorite: v.favorite, note: v.note },
      { claimed: false, mine: false, canUndo: false, withId: false }
    );
  }

  async function fetchInfo() {
    const link = safeUrl(field("link").value.trim());
    if (!link) { status.textContent = "Vul eerst een geldige link in (beginnend met https://)."; return; }
    const button = form.querySelector("[data-fetch]");
    button.disabled = true;
    status.textContent = "Bezig met ophalen…";
    try {
      const info = await fetchProductInfo(link);
      if (info.title && !field("title").value.trim()) field("title").value = info.title.slice(0, LIMITS.title);
      if (info.image && !field("image").value.trim()) field("image").value = info.image;
      if (info.price && !field("price").value.trim()) field("price").value = String(info.price).replace(".", ",");
      const missing = [!info.title && "naam", !info.image && "foto", !info.price && "prijs"].filter(Boolean);
      status.textContent = missing.length ? `Opgehaald, behalve: ${missing.join(", ")}. Vul die zelf in.` : "Opgehaald. Controleer de gegevens even.";
    } catch (err) {
      status.textContent = `${err.message} Vul de gegevens zelf in.`;
    } finally {
      button.disabled = false;
      field("link").value = cleanUrl(field("link").value.trim());
      updatePreview();
    }
  }

  function validate(v) {
    if (!safeUrl(v.link)) return ["link", "Vul een geldige link in (beginnend met https://)."];
    if (!v.title) return ["title", "Geef het item een naam."];
    if (v.title.length > LIMITS.title) return ["title", `De naam is te lang (maximaal ${LIMITS.title} tekens).`];
    if (v.link.length > LIMITS.link) return ["link", "Deze link is te lang. Probeer een kortere link naar hetzelfde product."];
    if (v.price !== null && v.price > LIMITS.maxPrice) return ["price", "Dat bedrag is te hoog voor de lijst (maximaal € 99.999,99)."];
    if (v.image.length > LIMITS.image) return ["image", "Deze fotolink is te lang. Laat hem leeg of gebruik een kortere link."];
    if (v.priceText && (!isValidPriceText(v.priceText) || v.price === null)) return ["price", "De prijs is geen geldig bedrag. Gebruik bijv. 24,95 of laat het leeg."];
    if (field("image").value.trim() && !v.image) return ["image", "De fotolink is ongeldig. Laat hem leeg of plak een link die met https:// begint."];
    return null;
  }

  function findDuplicate(v) {
    const key = linkKey(v.link);
    return allItems().find((other) => other.id !== item.id && linkKey(other.link) === key);
  }

  form.addEventListener("input", (e) => {
    if (e.target.name === "link") confirmDuplicate = false;
    updatePreview();
  });
  form.addEventListener("change", updatePreview);
  form.querySelector("[data-fetch]").addEventListener("click", fetchInfo);
  form.querySelector("[data-secondary]").addEventListener("click", () => {
    if (mode === "add") reset();
    else onCancel?.();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.textContent = "";
    const v = values();
    const problem = validate(v);
    if (problem) {
      errorBox.textContent = problem[1];
      field(problem[0]).focus();
      return;
    }
    const dup = findDuplicate(v);
    if (dup && !confirmDuplicate) {
      const where = LISTS.find((l) => l.id === dup.listId)?.label || "een lijst";
      errorBox.textContent = `Deze link staat al in ${where}: “${dup.title}”. Klik nog een keer op opslaan als je hem toch wilt toevoegen.`;
      confirmDuplicate = true;
      return;
    }

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const id = await saveItem({
        id: item.id,
        fromListId: item.listId,
        listId: v.listId,
        data: {
          title: v.title, link: v.link, price: v.price, category: v.category, image: v.image, note: v.note,
          favorite: v.favorite, done: v.listId !== "public" && v.done, createdAt: item.createdAt
        }
      });
      showToast(mode === "add" ? `“${v.title}” is toegevoegd.` : "Wijzigingen opgeslagen.");
      if (mode === "add") reset();
      onSaved?.(id, { ...v });
    } catch (err) {
      errorBox.textContent = `Opslaan lukte niet: ${err.message}`;
    } finally {
      submit.disabled = false;
    }
  });

  function reset() {
    form.reset();
    for (const name of ["link", "title", "price", "image", "note"]) field(name).value = "";
    status.textContent = "Plak een link en klik op ‘Gegevens ophalen’ voor titel, foto en prijs.";
    errorBox.textContent = "";
    confirmDuplicate = false;
    updatePreview();
  }

  /** Vult een link in en haalt meteen de gegevens op (gebruikt door de bladwijzer). */
  form.prefill = (link) => {
    field("link").value = link;
    fetchInfo();
  };

  updatePreview();
  return form;
}
