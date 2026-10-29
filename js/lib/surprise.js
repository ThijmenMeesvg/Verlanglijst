// Verrassingsmodus: op dit apparaat niet laten zien wat er al gegeven wordt.
// Bedoeld voor Thijmen zelf; geldt voor de beheerpagina én de openbare lijst.

const KEY = "verlanglijst-verrassingsmodus";

export function isSurpriseMode() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function setSurpriseMode(on) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* geen opslag: dan alleen deze sessie niet */ }
}
