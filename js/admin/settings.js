// Instellingen: alle teksten op de site, verrassingsmodus, de bladwijzer en handige links.
import { FIREBASE_CONSOLE, TEXT_FIELDS } from "../config.js";
import { saveSettings } from "../lib/store.js";
import { showToast } from "../lib/ui.js";
import { escapeHtml } from "../lib/util.js";
import { isSurpriseMode, setSurpriseMode } from "../lib/surprise.js";
import { createMigration } from "./migration.js";
import { createTitleCleanup } from "./title-cleanup.js";

/**
 * @param {HTMLElement} root
 * @param {{ onSurpriseChange: () => void, existingIds: () => Set<string>, allItems: () => object[] }} options
 */
export function createSettings(root, { onSurpriseChange, existingIds, allItems }) {
  // Velden per groep, opgebouwd uit TEXT_FIELDS in config.js.
  const groups = () => {
    const byGroup = new Map();
    for (const f of TEXT_FIELDS) byGroup.set(f.group, [...(byGroup.get(f.group) || []), f]);
    return [...byGroup].map(([group, fields]) => `
      <fieldset class="text-group">
        <legend>${escapeHtml(group)}</legend>
        ${fields.map((f) => `
          <div class="field">
            <label class="field__label" for="s-${f.key}">${escapeHtml(f.label)}</label>
            ${f.multiline
              ? `<textarea class="textarea" id="s-${f.key}" name="${f.key}" maxlength="${f.max}" placeholder="${escapeHtml(f.default)}"></textarea>`
              : `<input class="input" id="s-${f.key}" name="${f.key}" maxlength="${f.max}" placeholder="${escapeHtml(f.default)}">`}
          </div>`).join("")}
      </fieldset>`).join("");
  };

  const adminUrl = new URL("admin.html", location.href).href.replace(/\?.*$/, "");
  // De bladwijzer opent de beheerpagina met de link van de winkelpagina waar je op dat moment bent.
  const bookmarklet = `javascript:location.href=${JSON.stringify(`${adminUrl}?url=`)}+encodeURIComponent(location.href)`;

  root.innerHTML = `
    <section class="settings-block settings-block--wide">
      <h2>Teksten op de site</h2>
      <p>Pas hier elke tekst op de verlanglijst aan. Laat een veld leeg om de standaardtekst (grijs) te gebruiken. Bezoekers zien de nieuwe tekst meteen.</p>
      <form class="item-form" id="text-form">
        ${groups()}
        <div class="item-form__actions">
          <button type="submit" class="btn btn--primary">Teksten opslaan</button>
          <a class="btn" href="./" target="_blank" rel="noopener">Bekijk de site</a>
        </div>
      </form>
    </section>

    <section class="settings-block">
      <h2>Verrassingsmodus</h2>
      <p>Zet dit aan als je niet wilt zien wat anderen al voor je kopen. Op dit apparaat verbergen de beheerpagina en de openbare lijst dan alles over ‘gegeven’. Bezoekers merken er niets van.</p>
      <label class="check"><input type="checkbox" id="s-surprise"> Verrassingsmodus aan</label>
    </section>

    <section class="settings-block">
      <h2>Toevoegen vanuit elke webwinkel</h2>
      <p>Sleep deze knop naar je bladwijzerbalk. Zie je in een webwinkel iets wat je wilt hebben? Klik dan op de bladwijzer: deze pagina opent met de link al ingevuld en haalt de gegevens op.</p>
      <p><a class="btn" id="s-bookmarklet" href="#">＋ Op mijn verlanglijst</a></p>
      <p class="field__hint">Op een telefoon: kopieer de code, maak een bladwijzer van een willekeurige pagina en vervang daarna het adres door deze code.</p>
      <button type="button" class="btn btn--small" id="s-copy-bookmarklet">Code kopiëren</button>
    </section>

    <section class="settings-block" id="s-cleanup"></section>

    <section class="settings-block" id="s-migration"></section>

    <section class="settings-block">
      <h2>Handige links</h2>
      <ul class="plain-list">
        <li><a href="${escapeHtml(FIREBASE_CONSOLE)}" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
        <li><a href="https://github.com/ThijmenMeesvg/Verlanglijst" target="_blank" rel="noopener noreferrer">Code op GitHub</a></li>
        <li><a href="admin.html?demo">Beheer uitproberen met voorbeelddata</a> (verandert niets aan je echte lijst)</li>
      </ul>
    </section>`;

  const form = root.querySelector("#text-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await saveSettings(Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, form.elements[f.key].value])));
      showToast("Teksten opgeslagen.");
    } catch (err) {
      showToast(`Opslaan lukte niet: ${err.message}`, { error: true });
    }
  });

  const surprise = root.querySelector("#s-surprise");
  surprise.checked = isSurpriseMode();
  surprise.addEventListener("change", () => {
    setSurpriseMode(surprise.checked);
    onSurpriseChange();
  });

  // Via setAttribute, zodat de CSP het niet als script op déze pagina ziet: hij werkt pas als bladwijzer.
  const bm = root.querySelector("#s-bookmarklet");
  bm.setAttribute("href", bookmarklet);
  bm.addEventListener("click", (e) => { e.preventDefault(); showToast("Sleep deze knop naar je bladwijzerbalk."); });
  root.querySelector("#s-copy-bookmarklet").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(bookmarklet); showToast("Code gekopieerd."); }
    catch { showToast("Kopiëren lukte niet.", { error: true }); }
  });

  createTitleCleanup(root.querySelector("#s-cleanup"), { allItems });
  createMigration(root.querySelector("#s-migration"), { existingIds });

  let textLoaded = false;
  return {
    update({ settings }) {
      // Alleen de eerste keer invullen, zodat een live update je getypte tekst niet overschrijft.
      if (textLoaded) return;
      // Alleen eigen teksten invullen; een standaardtekst blijft zichtbaar als grijze voorbeeldtekst.
      for (const f of TEXT_FIELDS) {
        form.elements[f.key].value = settings[f.key] && settings[f.key] !== f.default ? settings[f.key] : "";
      }
      textLoaded = true;
    }
  };
}
