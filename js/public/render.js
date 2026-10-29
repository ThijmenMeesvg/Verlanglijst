// Maakt de HTML voor één wens (een cadeaulabel). Alle tekst gaat door escapeHtml.
import { categoryById, domId, escapeHtml, formatPrice, safeUrl, shopName } from "../lib/util.js";

/** De knop of tekst onderaan een wens: ‘Ik geef dit’, ‘Jij geeft dit’ of ‘Iemand anders geeft dit al’. */
function renderAction(item, { claimed, mine, canUndo, surprise }) {
  const title = escapeHtml(item.title);
  const id = escapeHtml(item.id);
  if (surprise) return "";
  if (claimed && mine) {
    return `<p class="tag__mine">Jij geeft dit.${
      canUndo ? ` <button type="button" class="link-button" data-unclaim="${id}" aria-label="Ongedaan maken: ${title}">Ongedaan maken</button>` : ""
    }</p>`;
  }
  if (claimed) return `<p class="tag__taken">Iemand anders geeft dit al.</p>`;
  return `<button type="button" class="btn tag__give" data-claim="${id}" aria-label="Ik geef dit: ${title}">Ik geef dit</button>`;
}

/**
 * Compacte favoriet: foto, naam en prijs naast elkaar, met de knop rechts.
 * Favorieten worden alleen getoond zolang ze nog niet gegeven worden.
 */
export function renderFavorite(item, state) {
  const cat = categoryById(item.category);
  const link = safeUrl(item.link);
  const image = safeUrl(item.image, { upgrade: true });
  const title = escapeHtml(item.title);
  return `
    <article class="fav">
      <div class="fav__media" data-emoji="${escapeHtml(cat.emoji)}">
        ${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}
      </div>
      <div class="fav__body">
        <h3 class="fav__title">${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${title}<span class="visually-hidden"> (opent ${escapeHtml(shopName(link)) || "de winkel"} in een nieuw tabblad)</span></a>` : title}</h3>
        <p class="fav__price${item.price ? "" : " is-unknown"}">${escapeHtml(formatPrice(item.price))}</p>
      </div>
      ${renderAction(item, { ...state, claimed: false })}
    </article>`;
}

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

  const media = image
    ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
    : "";

  if (surprise) claimed = false;
  const action = renderAction(item, { claimed, mine, canUndo, surprise });

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
