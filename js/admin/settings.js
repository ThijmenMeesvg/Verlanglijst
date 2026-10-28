// Instellingen: tekst op de site, verrassingsmodus, de bladwijzer en handige links.
import { FIREBASE_CONSOLE } from "../config.js";
import { saveSettings } from "../lib/store.js";
import { showToast } from "../lib/ui.js";
import { escapeHtml } from "../lib/util.js";
import { isSurpriseMode, setSurpriseMode } from "../lib/surprise.js";
import { createMigration } from "./migration.js";

/**
 * @param {HTMLElement} root
 * @param {{ onSurpriseChange: () => void }} options
 */
export function createSettings(root, { onSurpriseChange }) {
  const adminUrl = new URL("admin.html", location.href).href.replace(/\?.*$/, "");
  // De bladwijzer opent de beheerpagina met de link van de winkelpagina waar je op dat moment bent.
  const bookmarklet = `javascript:location.href=${JSON.stringify(`${adminUrl}?url=`)}+encodeURIComponent(location.href)`;

  root.innerHTML = `
    <section class="settings-block">
      <h2>Tekst bovenaan de site</h2>
      <form class="item-form" id="text-form">
        <div class="field">
          <label class="field__label" for="s-title">Titel</label>
          <input class="input" id="s-title" name="title" maxlength="100">
        </div>
        <div class="field">
          <label class="field__label" for="s-intro">Welkomsttekst</label>
          <textarea class="textarea" id="s-intro" name="intro" maxlength="1000"></textarea>
        </div>
        <div class="item-form__actions"><button type="submit" class="btn btn--primary">Tekst opslaan</button></div>
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
      await saveSettings({ title: form.elements.title.value.trim(), intro: form.elements.intro.value.trim() });
      showToast("Tekst opgeslagen.");
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

  createMigration(root.querySelector("#s-migration"));

  let textLoaded = false;
  return {
    update({ settings }) {
      // Alleen de eerste keer invullen, zodat een live update je getypte tekst niet overschrijft.
      if (textLoaded) return;
      form.elements.title.value = settings.title || "";
      form.elements.intro.value = settings.intro || "";
      textLoaded = true;
    }
  };
}
