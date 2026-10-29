// Verzonnen voorbeelddata voor de demo-modus (open een pagina met ?demo in de adresbalk).
// Zo kun je alles uitproberen zonder de echte database aan te raken.

const day = 86400000;
const t = (daysAgo) => Date.parse("2026-10-28") - daysAgo * day;

export const DEMO_DATA = {
  v2: {
    wishlist: {
      settings: {},
      items: {
        d01: { title: "Kookboek met streetfood uit Italië", link: "https://example.com/kookboek-italie", price: 29, category: "boeken", favorite: true, createdAt: t(3) },
        d02: { title: "Roman: De rivier", link: "https://example.com/de-rivier", price: 22.5, category: "boeken", favorite: false, createdAt: t(40) },
        d03: { title: "Kaartspel voor 2 spelers", link: "https://example.com/kaartspel", price: 12.95, category: "spellen", favorite: false, createdAt: t(12) },
        d04: { title: "Partyspel met rare vragen", link: "https://example.com/partyspel", price: 24.99, category: "spellen", favorite: true, createdAt: t(9) },
        d05: { title: "LP – een album dat ik grijs wil draaien", link: "https://example.com/lp", price: 34.99, category: "muziek", favorite: false, createdAt: t(60) },
        d06: { title: "Wollen sokken", link: "https://example.com/sokken", price: 14.99, category: "kleding", favorite: false, note: "Maat 43–46, liefst groen of bruin", createdAt: t(20) },
        d07: { title: "Pet met geborduurde hond", link: "https://example.com/pet", price: 20, category: "kleding", favorite: false, createdAt: t(25) },
        d08: { title: "Houten vloerlamp", link: "https://example.com/lamp", price: 24.99, category: "uitzet", favorite: true, createdAt: t(30) },
        d09: { title: "Vergiet in de vorm van een monster", link: "https://example.com/vergiet", price: 15.99, category: "uitzet", favorite: false, createdAt: t(80) },
        d10: { title: "Kruidenrek met 24 potjes", link: "https://example.com/kruidenrek", price: 34.15, category: "uitzet", favorite: false, createdAt: t(70) },
        d11: { title: "Pofzak voor boulderen", link: "https://example.com/pofzak", price: 38.5, category: "buiten", favorite: false, createdAt: t(50) },
        d12: { title: "Klettersteig-karabiner", link: "https://example.com/karabiner", price: 15, category: "buiten", favorite: true, createdAt: t(5) },
        d13: { title: "Accuboormachine", link: "https://example.com/boormachine", price: 215, category: "overig", favorite: true, createdAt: t(15) },
        d14: { title: "T-shirt van de scouting", link: "https://example.com/tshirt", category: "kleding", favorite: false, note: "Maat L", createdAt: t(1) },
        d15: { title: "Koptelefoon met noise cancelling", link: "https://example.com/koptelefoon", price: 200, category: "overig", favorite: true, createdAt: t(100) }
      },
      claims: {
        d15: { at: t(2) },
        d09: { at: t(4) }
      }
    },
    private: {
      cadeaus: {
        items: {
          p1: { title: "Sterrenkaart voor een vriendin", link: "https://example.com/sterrenkaart", price: 12.85, category: "overig", favorite: false, createdAt: t(10) }
        }
      },
      voorMij: {
        items: {
          p2: { title: "Campingkooktoestel", link: "https://example.com/kooktoestel", price: 19, category: "buiten", favorite: false, createdAt: t(8), done: true }
        }
      },
      tempLinks: {
        l1: { url: "https://example.com/nog-bekijken", at: t(1) }
      }
    }
  },

  // Een stukje "oude" database om de overstap in demo-modus te kunnen proberen.
  legacy: {
    Boeken: {
      b1: { title: "Voorbeeldboek | Boek | 9789000000000", link: "https://www.bol.com/nl/nl/p/voorbeeld/1/?gclid=x", price: 12.5, dateAdded: "2025-10-30", favorite: true, done: false, image: "" }
    },
    Cadeaus: {
      c1: { title: "Voorbeeldcadeau", link: "https://example.com/cadeau", price: 20, private: true, dateAdded: "2025-11-07" }
    }
  }
};
