// Maakt de HTML voor één wens (een cadeaulabel). Alle tekst gaat door escapeHtml.
import { categoryById, domId, escapeHtml, formatPrice, safeUrl, shopName } from "../lib/util.js";

/**
 * @param {object} item
 * @param {{ claimed: boolean, mine: boolean, canUndo: boolean, withId?: boolean, surprise?: boolean }} state
 *   `surprise`: verrassingsmodus op Thijmens eigen apparaat, dus geen knop en geen ‘gegeven’-status.
 */
export function renderTag(item, { claimed, mine, canUndo, withId = true, surprise = false }) {
  const cat = categoryById(item.category);
  const link = safeUrl(item.link);
  const image = safeUrl(item.image, { upgrade: true });
  const shop = shopName(link);
  const title = escapeHtml(item.title);
  const id = escapeHtml(item.id);

  const media = image
    ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
    : "";

  if (surprise) claimed = false;
  let action;
  if (surprise) {
    action = "";
  } else if (claimed && mine) {
    action = `<p class="tag__mine">Jij geeft dit.${
      canUndo ? ` <button type="button" class="link-button" data-unclaim="${id}" aria-label="Ongedaan maken: ${title}">Ongedaan maken</button>` : ""
    }</p>`;
  } else if (claimed) {
    action = `<p class="tag__taken">Iemand anders geeft dit al.</p>`;
  } else {
    action = `<button type="button" class="btn btn--primary tag__give" data-claim="${id}" aria-label="Ik geef dit: ${title}">Ik geef dit</button>`;
  }

  return `
    <article class="tag${claimed ? " is-claimed" : ""}${item.favorite ? " is-favorite" : ""}"${withId ? ` id="${domId(item.id)}"` : ""}>
      <div class="tag__media" data-emoji="${escapeHtml(cat.emoji)}">
        ${media}
        ${item.favorite ? `<span class="tag__fav">★ Favoriet</span>` : ""}
        ${claimed ? `<span class="tag__stamp" aria-hidden="true">Wordt al gegeven</span>` : ""}
      </div>
      <div class="tag__body">
        <h3 class="tag__title">
          ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${title}<span class="visually-hidden"> (opent ${escapeHtml(shop) || "de winkel"} in een nieuw tabblad)</span></a>` : title}
        </h3>
        <p class="tag__meta">${escapeHtml(cat.label)}${shop ? `, bij ${escapeHtml(shop)}` : ""}</p>
        ${item.note ? `<p class="tag__note">${escapeHtml(item.note)}</p>` : ""}
        <p class="tag__price${item.price ? "" : " is-unknown"}">${escapeHtml(formatPrice(item.price))}</p>
      </div>
      ${action ? `<div class="tag__actions">${action}</div>` : ""}
    </article>`;
}
