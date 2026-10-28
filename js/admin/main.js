// Startpunt van de beheerpagina: inloggen, tabbladen en live gegevens doorgeven aan de onderdelen.
import { FIREBASE_CONSOLE } from "../config.js";
import { isDemo, onAuth, signIn, signOut, subscribeAdmin } from "../lib/store.js";
import { showDemoBanner, showToast } from "../lib/ui.js";
import { createItemForm } from "./item-form.js";
import { createItemTable } from "./item-table.js";
import { createLinks } from "./links.js";
import { createSettings } from "./settings.js";

const gates = ["gate-loading", "gate-signin", "gate-setup", "app"].map((id) => document.getElementById(id));
const show = (id) => gates.forEach((el) => (el.hidden = el.id !== id));

if (isDemo()) showDemoBanner();

// ---------- Inloggen ----------

document.getElementById("sign-in").addEventListener("click", async () => {
  const error = document.getElementById("sign-in-error");
  error.textContent = "";
  try {
    await signIn();
  } catch (err) {
    error.textContent =
      err?.code === "auth/unauthorized-domain"
        ? "Dit webadres mag nog niet inloggen. Voeg het toe in de Firebase Console onder Authentication → Settings → Authorized domains."
        : err?.code === "auth/popup-closed-by-user"
          ? "Het inlogvenster werd gesloten. Probeer het nog eens."
          : `Inloggen lukte niet (${err?.code || err?.message}).`;
  }
});

document.getElementById("sign-out").addEventListener("click", async () => {
  await signOut();
  location.reload();
});

document.getElementById("copy-uid").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(document.getElementById("uid").textContent);
    showToast("Gebruikers-ID gekopieerd.");
  } catch {
    showToast("Kopiëren lukte niet. Selecteer de code en kopieer hem zelf.", { error: true });
  }
});
document.getElementById("console-link").href = `${FIREBASE_CONSOLE}/database`;

// ---------- Tabbladen ----------

const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab, { focus = false } = {}) {
  for (const t of tabs) {
    const selected = t === tab;
    t.setAttribute("aria-selected", String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
  }
  if (focus) tab.focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step) selectTab(tabs[(i + step + tabs.length) % tabs.length], { focus: true });
  });
});
selectTab(tabs[0]);

// ---------- Beheer starten ----------

let started = false;

function startApp() {
  if (started) return;
  started = true;
  show("app");

  const table = createItemTable(document.getElementById("item-table"));
  const addForm = createItemForm({ mode: "add", allItems: () => table.allItems() });
  document.getElementById("add-form").append(addForm);

  const links = createLinks(document.getElementById("links"), {
    onAddAsItem: (url) => {
      selectTab(document.getElementById("tab-add"));
      addForm.prefill(url);
    }
  });
  const settings = createSettings(document.getElementById("settings"), { onSurpriseChange: () => table.refresh() });

  subscribeAdmin(
    (state) => {
      table.update(state);
      links.update(state.tempLinks);
      settings.update(state);
      const active = Object.entries(state.lists).filter(([id]) => id !== "archief").reduce((n, [, l]) => n + l.length, 0);
      document.getElementById("items-count").textContent = active;
      document.getElementById("links-count").textContent = state.tempLinks.length || "";
    },
    () => showToast("De gegevens konden niet geladen worden. Kloppen de databaseregels?", { error: true, duration: 15000 })
  );

  // Geopend via de bladwijzer: …/admin.html?url=<productlink>
  const sharedUrl = new URLSearchParams(location.search).get("url");
  if (sharedUrl) {
    addForm.prefill(sharedUrl);
    history.replaceState(null, "", location.pathname + (isDemo() ? "?demo" : ""));
  }
}

onAuth(({ user, isAdmin }) => {
  const userBox = document.getElementById("user");
  userBox.hidden = !user;
  document.getElementById("user-name").textContent = user ? user.displayName || user.email || "" : "";
  if (!user) return show("gate-signin");
  if (!isAdmin) {
    document.getElementById("uid").textContent = user.uid;
    return show("gate-setup");
  }
  startApp();
}).catch(() => {
  show("gate-signin");
  document.getElementById("sign-in-error").textContent = "Inloggen kon niet geladen worden. Controleer je internetverbinding.";
});
