// Service worker: nodig om het beheer als app te installeren (en zo in het Android-deelmenu te komen).
// Bewust zonder cache: elke pagina komt gewoon van internet, dus na een update zie je meteen de nieuwe versie.
// Alleen als je offline bent, krijg je een korte melding in plaats van de foutpagina van de browser.

const OFFLINE = `<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Geen internet</title><body style="font:16px/1.5 system-ui,sans-serif;padding:24px;background:#f5f6f1;color:#1a221d">
<h1 style="font-size:22px">Geen internetverbinding</h1><p>De verlanglijst heeft internet nodig. Controleer je verbinding en probeer het opnieuw.</p></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;   // alles behalve pagina's: de browser doet het zelf
  event.respondWith((async () => {
    try {
      return (await event.preloadResponse) || (await fetch(event.request));
    } catch {
      return new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
  })());
});
