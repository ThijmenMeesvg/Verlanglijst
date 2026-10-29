# Verlanglijst

Mijn persoonlijke verlanglijst als website. Familie en vrienden zoeken iets uit en klikken op **Ik geef dit**; iedereen ziet dan meteen dat het geregeld is, zodat er niets dubbel gekocht wordt.

**Live:** https://thijmenmeesvg.github.io/Verlanglijst/
**Beheer:** https://thijmenmeesvg.github.io/Verlanglijst/admin.html

Gewone HTML, CSS en JavaScript, zonder framework en zonder bouwstap. De gegevens staan in een Firebase Realtime Database; de site draait op GitHub Pages.

## Wat kan het

**Voor bezoekers**
- Alle wensen op één pagina, met favorieten als compacte rij bovenaan; op desktop staan de eerste cadeaus direct in beeld.
- Zoeken, filteren op categorie en prijs, sorteren. De filters staan in de adresbalk, dus je kunt bijv. `…/?cat=boeken` doorsturen.
- ‘Ik geef dit’ met bevestiging. Iedereen ziet het direct (live), en wie het koos kan het binnen 24 uur op hetzelfde apparaat terugdraaien.
- Werkt op telefoon (twee kolommen, extra filters achter de knop ‘Filters’), tablet en computer, en in licht en donker thema.

**Voor mij (beheer, inloggen met Google)**
- Toevoegen: link plakken, ‘Gegevens ophalen’ vult naam, foto en vaak de prijs in. Trackingcodes (utm, gclid, …) worden automatisch uit links gehaald. Dubbele links worden gemeld.
- Notitie per item (‘maat L, liefst groen’), favorieten, en drie lijsten: openbaar, cadeaus voor anderen, en voor mezelf. Items verwijder je direct (met ‘ongedaan maken’) of zet je in het archief om ze te bewaren.
- Per item ‘Bewerken’ en een ster voor favoriet; de rest (gegeven, link, archiveren, verwijderen) zit in het ⋯-menu.
- ‘Namen opschonen’ (Instellingen) stelt nettere namen voor en meldt dubbele namen; jij kiest wat je overneemt.
- Verrassingsmodus: verbergt op jouw apparaat, in het beheer én op de lijst zelf, wat al gegeven wordt.
- Bladwijzer ‘Op mijn verlanglijst’: vanuit elke webwinkel met één klik toevoegen (zie Instellingen in het beheer).
- Links bewaren om later te bekijken.

## Mappen

| Pad | Wat |
|---|---|
| `index.html` | De openbare verlanglijst |
| `admin.html` | Beheerpagina |
| `404.html` | Pagina voor adressen die niet bestaan |
| `alle-items.html`, `backend.html`, `prive.html` | Doorverwijzingen, zodat oude links blijven werken |
| `css/` | `base.css` (kleuren, letters, knoppen, gedeelde onderdelen), `tag.css` (de kaart van één wens), `public.css`, `admin.css` |
| `js/config.js` | Firebase-instellingen, categorieën, lijsten en prijsfilters: hier pas je dingen aan |
| `js/lib/` | Gedeelde code: `store.js` (alle database- en inlogtoegang), `util.js` (escapen, prijzen, links, filteren), `migrate.js` (oude → nieuwe indeling), `ui.js` (meldingen, vensters), `confetti.js`, `demo-data.js` (verzonnen voorbeelddata) |
| `js/public/` | De verlanglijst: kaarten tekenen, filters, ‘Ik geef dit’ |
| `js/admin/` | Het beheer, per onderdeel: formulier, itemlijst, links, instellingen, overstap, gegevens ophalen |
| `assets/` | Favicon en de voorbeeldafbeelding voor WhatsApp |
| `database.rules.json` | De beveiligingsregels van de database (bron van waarheid, zie hieronder) |
| `tests/` | Automatische controles voor prijzen, links en de overstap |

## Lokaal draaien

Omdat de site JavaScript-modules gebruikt, moet hij via een (simpele) webserver geopend worden, niet als bestand:

```sh
python3 -m http.server 8000
```

Open daarna http://localhost:8000/?demo. Met `?demo` achter het adres (ook bij `admin.html?demo`) gebruikt de site verzonnen voorbeelddata in het geheugen: je kunt alles uitproberen zonder de echte lijst aan te raken. Zonder `?demo` leest hij de echte database.

## Tests

Vereist Node.js 18 of nieuwer, geen packages:

```sh
node --test tests/*.test.mjs
```

## Publiceren

GitHub Pages publiceert de `main`-branch automatisch. Wijzigingen gaan via een pull request naar `main`; een paar minuten na het samenvoegen staan ze live.

De vorige versie van de site staat ongewijzigd op de branch [`v1-oud`](https://github.com/ThijmenMeesvg/Verlanglijst/tree/v1-oud).

## Eenmalige installatie

Deze stappen doe je één keer in de [Firebase Console](https://console.firebase.google.com/project/verlanglijst-12015). De site blijft de hele tijd werken: tot je overgestapt bent leest hij de oude indeling.

1. **Inlogmethoden aanzetten.** Authentication → Sign-in method:
   - **Google** → Enable → Save (voor jou, in het beheer).
   - **Anonymous** → Enable → Save (voor bezoekers: zo kan alleen wie ‘Ik geef dit’ klikte het ook terugdraaien; ze merken er niets van).
2. **Je websiteadres toestaan.** Authentication → Settings → Authorized domains → Add domain → `thijmenmeesvg.github.io`.
3. **Beveiligingsregels plaatsen.** Realtime Database → Rules. Vervang alles door de inhoud van [`database.rules.json`](database.rules.json) en klik Publish. Je privélijsten zijn vanaf nu afgeschermd.
4. **Jezelf beheerder maken.** Open `admin.html` en log in met Google. Je ziet nu ‘Bijna klaar’ met jouw gebruikers-ID. Ga in de Console naar Realtime Database → Data, voeg in de root een node `admins` toe, en daarin een sleutel met jouw gebruikers-ID en de waarde `true`. Ververs de beheerpagina.
5. **Overstappen.** In het beheer: Instellingen → Overstap → Oude gegevens controleren → Overzetten. Je kunt dit gerust nog eens doen: items die al overgezet zijn worden overgeslagen, dus latere wijzigingen blijven staan.
6. **Opruimen.** Als alles is overgezet, verschijnt in hetzelfde blok de knop ‘Oude mappen opruimen’. Die verwijdert de oude categorieën, Cadeaus, Voor Thijmen, tempLinks en de oude kopie `v2`. Wil je eerst een reservekopie: Realtime Database → ⋮ → Export JSON (en bewaar die niet in deze repo).

> Kom je van een database met de oude indeling (een map per categorie) en wil je tijdens de overstap de lijst zichtbaar houden? Zet dan tijdelijk `"Boeken": { ".read": true }` (en zo voor elke oude openbare categorie) in de regels, en haal dat na stap 6 weer weg.

**Optioneel:** beperk de Firebase API-sleutel tot je eigen website. In de [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=verlanglijst-12015) → de ‘Browser key’ → Application restrictions → Websites → voeg `https://thijmenmeesvg.github.io/*` toe. Zet tijdelijk ook `http://localhost:8000/*` erbij als je lokaal wilt testen.

## Beveiliging en privacy

**Wie mag wat** (afgedwongen door `database.rules.json`, niet door de code van de site):

| Gegevens | Waar | Lezen | Schrijven |
|---|---|---|---|
| Openbare items en de tekst bovenaan | `wishlist/items`, `wishlist/settings` | iedereen | alleen beheerder |
| ‘Ik geef dit’ | `wishlist/claims` | iedereen | een bezoeker mag een claim toevoegen (tijdstip + anoniem id, geen naam) en alleen zijn eigen claim binnen 24 uur weghalen; claims die jij in het beheer zet (en die uit de oude lijst) kunnen bezoekers niet weghalen |
| Cadeaus voor anderen, Voor mezelf, archief, bewaarde links | `private/…` | alleen beheerder | alleen beheerder |
| Wie beheerder is | `admins` | alleen je eigen regel | alleen via de Console |

**In de browser** van bezoekers wordt bewaard welke items zíj gekozen hebben (`localStorage`, om ‘ongedaan maken’ te tonen), of de confetti al getoond is (`sessionStorage`), en na hun eerste ‘Ik geef dit’ een anonieme Firebase-sessie (IndexedDB). In jouw browser ook of de verrassingsmodus aanstaat.

**Gegevens ophalen** in het beheer stuurt alleen de productlink naar [Microlink](https://microlink.io). Het gratis gebruik heeft een daglimiet; daarna vul je de gegevens zelf in.

**Verder:**
- Alle tekst uit de database wordt ge-escaped voordat hij op de pagina komt, en links moeten met `http(s)://` beginnen.
- Elke pagina heeft een Content Security Policy: scripts alleen van deze site en van Google (Firebase), geen inline scripts of styles.
- Er staan geen wachtwoorden in de code. De Firebase-configuratie in `js/config.js` is bedoeld om openbaar te zijn; de beveiligingsregels bepalen wat ermee kan.
- Firebase wordt geladen van Google’s eigen CDN in een vaste versie (10.12.2). Integrity-hashes (SRI) zijn niet mogelijk voor de manier waarop Firebase zijn modules laadt; de CSP beperkt waar scripts vandaan mogen komen.
- Database-exports bevatten je privélijsten en staan daarom in `.gitignore`.

## Bekende beperkingen

- Elke bezoeker kan ‘Ik geef dit’ op elk item klikken; alleen jij kunt dat daarna nog terugzetten (in het beheer, tabblad Items). Voor een lijst onder vrienden en familie is dat een bewuste keuze.
- ‘Gegevens ophalen’ gebruikt het gratis gebruik van Microlink, met een daglimiet. Daarna vul je naam, foto en prijs zelf in.
- Een item dat je ná de overstap definitief verwijdert, komt terug als je de overstap opnieuw uitvoert vóórdat je de oude mappen hebt opgeruimd. Ruim dus op zodra alles klopt.

## Categorieën aanpassen

Pas de lijst `CATEGORIES` aan in [`js/config.js`](js/config.js). Een `id` die al gebruikt wordt niet meer veranderen; items onthouden hun categorie via dat id.
