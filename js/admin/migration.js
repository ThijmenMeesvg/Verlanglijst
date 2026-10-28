// Overstap van de oude database-indeling naar de nieuwe, en daarna het opruimen van de oude mappen.
// Eerst een overzicht, dan pas schrijven. Items die al in de nieuwe indeling staan worden overgeslagen,
// dus opnieuw overzetten overschrijft nooit iets wat je daarna hebt aangepast.
import { LEGACY_NODES, planMigration } from "../lib/migrate.js";
import { applyUpdates, readLegacy } from "../lib/store.js";
import { confirmDialog, showToast } from "../lib/ui.js";
import { escapeHtml } from "../lib/util.js";

/**
 * @param {HTMLElement} root
 * @param {{ existingIds: () => Set<string> }} options
 */
export function createMigration(root, { existingIds }) {
  root.innerHTML = `
    <h2>Overstap van de oude database</h2>
    <p>Zet je items uit de oude indeling (een map per categorie) over naar de nieuwe, beveiligde indeling. Items die al overgezet zijn, worden overgeslagen.</p>
    <button type="button" class="btn" id="m-check">Oude gegevens controleren</button>
    <div class="migration-report" id="m-report" aria-live="polite"></div>`;

  const report = root.querySelector("#m-report");
  let plan = null;

  root.querySelector("#m-check").addEventListener("click", check);

  async function check() {
    report.innerHTML = `<p>Bezig met lezen…</p>`;
    let legacy;
    try {
      legacy = await readLegacy();
    } catch (err) {
      report.innerHTML = `<p class="item-form__error">Lezen lukte niet: ${escapeHtml(err.message)}</p>`;
      return;
    }
    const hasLegacy = LEGACY_NODES.some((name) => legacy[name]);
    if (!hasLegacy) {
      report.innerHTML = `<p>Geen oude gegevens gevonden. Er is niets meer over te zetten of op te ruimen.</p>`;
      return;
    }

    plan = planMigration(legacy, Date.now(), existingIds());
    const r = plan.report;
    if (!r.total && !r.tempLinks) {
      report.innerHTML = `
        <p><strong>Alles is overgezet.</strong> ${r.skipped} items staan al in de nieuwe indeling.</p>
        <p>De oude mappen (Boeken, Muziek, …, Cadeaus, Voor Thijmen, tempLinks en de oude kopie v2) zijn nu niet meer nodig. Opruimen maakt de database overzichtelijk en haalt de laatste oude, openbaar leesbare gegevens weg.</p>
        <button type="button" class="btn btn--danger" id="m-cleanup">Oude mappen opruimen</button>`;
      root.querySelector("#m-cleanup").addEventListener("click", cleanup);
      return;
    }

    const list = (items) => items.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
    report.innerHTML = `
      <p><strong>${r.total} items</strong> om over te zetten:</p>
      <ul class="plain-list">${Object.entries(r.perDestination).map(([k, n]) => `<li>${escapeHtml(k)}: ${n}</li>`).join("")}</ul>
      ${r.skipped ? `<p>${r.skipped} items staan al in de nieuwe indeling en blijven zoals ze zijn.</p>` : ""}
      <p>Daarbij wordt dit opgeruimd:</p>
      <ul class="plain-list">
        <li>${r.linksCleaned} links zonder trackingcodes</li>
        <li>${r.claims} items die al als gegeven stonden, blijven gegeven</li>
        ${r.tempLinks ? `<li>${r.tempLinks} bewaarde links gaan mee</li>` : ""}
      </ul>
      ${r.titlesChanged.length ? `<details><summary>${r.titlesChanged.length} namen worden aangepast</summary><ul class="plain-list">${list(r.titlesChanged.map((t) => `${t.from} → ${t.to}`))}</ul></details>` : ""}
      ${r.unknownPrices.length ? `<details><summary>${r.unknownPrices.length} items zonder prijs (komen op ‘Prijs onbekend’)</summary><ul class="plain-list">${list(r.unknownPrices)}</ul></details>` : ""}
      ${r.noImage.length ? `<details><summary>${r.noImage.length} items zonder foto</summary><ul class="plain-list">${list(r.noImage)}</ul></details>` : ""}
      ${r.unknownNodes.length ? `<p>Onbekende mappen, items gaan naar ‘Overig’: ${escapeHtml(r.unknownNodes.join(", "))}</p>` : ""}
      <button type="button" class="btn btn--primary" id="m-run">Overzetten</button>`;
    root.querySelector("#m-run").addEventListener("click", run);
  }

  async function run() {
    const ok = await confirmDialog({
      title: "Items overzetten?",
      body: [`${plan.report.total} items worden in de nieuwe indeling gezet.`, "De oude gegevens blijven staan tot je ze zelf opruimt."],
      confirmLabel: "Overzetten"
    });
    if (!ok) return;
    try {
      await applyUpdates(plan.updates);
      showToast("Overstap gelukt.");
      // Even wachten tot de live gegevens binnen zijn, dan opnieuw controleren: dat toont de opruimknop.
      setTimeout(check, 1200);
    } catch (err) {
      report.insertAdjacentHTML("beforeend", `<p class="item-form__error">Overzetten lukte niet: ${escapeHtml(err.message)}. Er is niets veranderd.</p>`);
    }
  }

  async function cleanup() {
    const ok = await confirmDialog({
      title: "Oude mappen definitief verwijderen?",
      body: [
        `Dit verwijdert ${LEGACY_NODES.join(", ")} uit de database.`,
        "Al je items staan in de nieuwe indeling, dus er gaat niets verloren. Dit kun je niet ongedaan maken; wil je een reservekopie, exporteer de database dan eerst in de Firebase Console (Realtime Database → ⋮ → Export JSON)."
      ],
      confirmLabel: "Definitief opruimen",
      danger: true
    });
    if (!ok) return;
    try {
      await applyUpdates(Object.fromEntries(LEGACY_NODES.map((name) => [name, null])));
      report.innerHTML = `<p><strong>Opgeruimd.</strong> De database bevat nu alleen nog de nieuwe indeling.</p>`;
      showToast("Oude mappen verwijderd.");
    } catch (err) {
      showToast(`Opruimen lukte niet: ${err.message}`, { error: true });
    }
  }
}
