// Eenmalige overstap van de oude database-indeling naar de nieuwe. Eerst een overzicht, dan pas schrijven.
// De oude gegevens blijven staan; opnieuw uitvoeren overschrijft alleen dezelfde items.
import { planMigration } from "../lib/migrate.js";
import { applyUpdates, readLegacy } from "../lib/store.js";
import { confirmDialog, showToast } from "../lib/ui.js";
import { escapeHtml } from "../lib/util.js";

export function createMigration(root) {
  root.innerHTML = `
    <h2>Overstap van de oude database</h2>
    <p>Zet je items uit de oude indeling (een map per categorie) over naar de nieuwe, beveiligde indeling. De oude gegevens blijven staan, dus je kunt dit veilig nog eens doen.</p>
    <button type="button" class="btn" id="m-check">Oude gegevens controleren</button>
    <div class="migration-report" id="m-report" aria-live="polite"></div>`;

  const report = root.querySelector("#m-report");
  let plan = null;

  root.querySelector("#m-check").addEventListener("click", async () => {
    report.innerHTML = `<p>Bezig met lezen…</p>`;
    try {
      plan = planMigration(await readLegacy());
    } catch (err) {
      report.innerHTML = `<p class="item-form__error">Lezen lukte niet: ${escapeHtml(err.message)}</p>`;
      return;
    }
    const r = plan.report;
    if (!r.total && !r.tempLinks) {
      report.innerHTML = `<p>Geen oude gegevens gevonden. Er is niets over te zetten.</p>`;
      return;
    }
    const list = (items) => items.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
    report.innerHTML = `
      <p><strong>${r.total} items</strong> gevonden:</p>
      <ul class="plain-list">${Object.entries(r.perDestination).map(([k, n]) => `<li>${escapeHtml(k)}: ${n}</li>`).join("")}</ul>
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
  });

  async function run() {
    const ok = await confirmDialog({
      title: "Items overzetten?",
      body: [
        `${plan.report.total} items worden in de nieuwe indeling gezet. Items die er al stonden met dezelfde sleutel worden overschreven.`,
        "De oude gegevens blijven staan."
      ],
      confirmLabel: "Overzetten"
    });
    if (!ok) return;
    try {
      await applyUpdates(plan.updates);
      report.innerHTML = `<p><strong>Klaar.</strong> Je items staan in de nieuwe indeling. Kijk op het tabblad Items en op de site of alles klopt.</p>`;
      showToast("Overstap gelukt.");
    } catch (err) {
      report.insertAdjacentHTML("beforeend", `<p class="item-form__error">Overzetten lukte niet: ${escapeHtml(err.message)}. Er is niets veranderd.</p>`);
    }
  }
}
