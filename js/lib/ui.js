// Kleine gedeelde UI-onderdelen: melding onderin en een bevestigingsvenster.
// Elementen worden met textContent gevuld, zodat tekst uit de database nooit als HTML uitgevoerd wordt.

let toastTimer = null;

/**
 * Toont een melding onderin. Optioneel met één actieknop (bijv. "Ongedaan maken").
 * @param {string} message
 * @param {{ actionLabel?: string, onAction?: () => void, error?: boolean, duration?: number }} [options]
 */
export function showToast(message, { actionLabel, onAction, error = false, duration = 6000 } = {}) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.append(toast);
  }
  toast.replaceChildren();
  toast.classList.toggle("toast--error", error);

  const text = document.createElement("span");
  text.textContent = message;
  toast.append(text);

  if (actionLabel && onAction) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--small";
    btn.textContent = actionLabel;
    btn.addEventListener("click", () => { hideToast(); onAction(); });
    toast.append(btn);
  }

  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, duration);
}

export function hideToast() {
  const toast = document.getElementById("toast");
  if (toast) toast.hidden = true;
}

/**
 * Bevestigingsvenster met <dialog>. Geeft true terug bij "ja".
 * @param {{ title: string, body?: string|string[], confirmLabel: string, cancelLabel?: string, danger?: boolean }} options
 */
export function confirmDialog({ title, body = [], confirmLabel, cancelLabel = "Annuleren", danger = false }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "dialog";

    const h = document.createElement("h2");
    h.textContent = title;
    dialog.append(h);
    for (const line of [].concat(body)) {
      const p = document.createElement("p");
      p.textContent = line;
      dialog.append(p);
    }

    const actions = document.createElement("div");
    actions.className = "dialog__actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn";
    cancel.textContent = cancelLabel;
    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = danger ? "btn btn--danger" : "btn btn--primary";
    ok.textContent = confirmLabel;
    actions.append(cancel, ok);
    dialog.append(actions);

    const close = (result) => { dialog.close(); dialog.remove(); resolve(result); };
    cancel.addEventListener("click", () => close(false));
    ok.addEventListener("click", () => close(true));
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(false); });

    document.body.append(dialog);
    dialog.showModal();
    ok.focus();
  });
}
