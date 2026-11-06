// Instellingen: verrassingsmodus, toevoegen vanuit een winkel (delen, opdracht, bladwijzer), teksten en handige links.
import { FIREBASE_CONSOLE, TEXT_FIELDS } from "../config.js";
import { saveSettings } from "../lib/store.js";
import { showToast, explainError } from "../lib/ui.js";
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
    <section class="settings-block">
      <h2>Verrassingsmodus</h2>
      <p>Zet dit aan als je niet wilt zien wat anderen al voor je kopen. Op dit apparaat zie je dan nergens meer wat al gegeven wordt, ook niet op de openbare lijst. Bezoekers merken er niets van.</p>
      <label class="check"><input type="checkbox" id="s-surprise"> Verrassingsmodus aan</label>
    </section>

    <section class="settings-block">
      <h2>Toevoegen vanuit elke webwinkel</h2>
      <p>Zie je iets wat je wilt hebben? Stuur de link vanuit de winkel naar je verlanglijst. Het beheer opent dan met de link al ingevuld en haalt naam, foto en prijs op. Jij kiest alleen nog de categorie en klikt op Toevoegen.</p>

      <details class="howto" id="s-howto-android">
        <summary>Android: via ‘Delen’</summary>
        <ol>
          <li>Open deze beheerpagina in Chrome en log in.</li>
          <li>Installeer de app: <button type="button" class="btn btn--small" id="s-install" hidden>Installeer als app</button><span id="s-install-manual">tik op ⋮ en kies <strong>App installeren</strong> of <strong>Toevoegen aan startscherm</strong>.</span></li>
          <li>Tik in een webwinkel op <strong>Delen</strong> en kies <strong>Verlanglijst</strong>.</li>
        </ol>
      </details>

      <details class="howto" id="s-howto-ios">
        <summary>iPhone: via een opdracht</summary>
        <p>Een iPhone laat websites niet in het deelmenu verschijnen. Met de app Opdrachten (Shortcuts) lukt het wel, en dat stel je één keer in:</p>
        <ol>
          <li>Open <strong>Opdrachten</strong>, tik op <strong>+</strong> en geef de opdracht de naam <em>Op mijn verlanglijst</em>.</li>
          <li>Tik op het <strong>ⓘ</strong>-icoon en zet <strong>Toon in deelpaneel</strong> aan. Kies bij de invoer alleen <strong>URL's</strong>.</li>
          <li>Voeg de actie <strong>Tekst</strong> toe, plak dit adres en zet direct erachter de variabele <strong>Opdrachtinvoer</strong>:
            <div class="copy-row"><code id="s-ios-url"></code><button type="button" class="btn btn--small" id="s-copy-ios">Kopiëren</button></div>
          </li>
          <li>Voeg de actie <strong>Open URL's</strong> toe. Klaar: in Safari staat <em>Op mijn verlanglijst</em> nu onder <strong>Delen</strong>.</li>
        </ol>
      </details>

      <details class="howto" id="s-howto-desktop">
        <summary>Computer: via een bladwijzer</summary>
        <p>Sleep deze knop naar je bladwijzerbalk. Klik er in een webwinkel op, dan opent deze pagina met de link al ingevuld.</p>
        <p><a class="btn" id="s-bookmarklet" href="#">＋ Op mijn verlanglijst</a></p>
        <p class="field__hint">Lukt slepen niet? Kopieer de code, maak een bladwijzer van een willekeurige pagina en zet deze code op de plek van het adres.</p>
        <button type="button" class="btn btn--small" id="s-copy-bookmarklet">Code kopiëren</button>
      </details>
    </section>

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
      showToast(`Opslaan lukte niet: ${explainError(err)}`, { error: true });
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

  // iPhone-opdracht: het beheeradres waar de opdracht de link achter plakt (mag onge-encodeerd, zie main.js).
  root.querySelector("#s-ios-url").textContent = `${adminUrl}?url=`;
  root.querySelector("#s-copy-ios").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(`${adminUrl}?url=`); showToast("Adres gekopieerd. Plak het in de actie Tekst."); }
    catch { showToast("Kopiëren lukte niet. Selecteer het adres en kopieer het zelf.", { error: true }); }
  });

  // Het uitleg-blok dat bij dit apparaat past, staat alvast open.
  const ua = navigator.userAgent;
  const howto = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "ios" : /Android/.test(ua) ? "android" : "desktop";
  root.querySelector(`#s-howto-${howto}`).open = true;

  // Chrome/Edge: echte installeerknop in plaats van uitleg over het menu.
  const installBtn = root.querySelector("#s-install");
  const showInstall = (prompt) => {
    installBtn.hidden = false;
    root.querySelector("#s-install-manual").hidden = true;
    installBtn.onclick = async () => {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") { installBtn.hidden = true; showToast("Geïnstalleerd. Je vindt Verlanglijst nu bij Delen."); }
    };
  };
  if (window.__installPrompt) showInstall(window.__installPrompt);
  window.addEventListener("verlanglijst-installable", (e) => showInstall(e.detail));

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
