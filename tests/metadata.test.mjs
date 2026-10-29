import test from "node:test";
import assert from "node:assert/strict";
import { findProduct } from "../js/admin/metadata.js";

const product = { "@type": "Product", name: "Sony HT-S40R", offers: { "@type": "Offer", price: 272 } };
const crumbs = { "@type": "BreadcrumbList" };

test("findProduct: blokken die al uitgepakt zijn (zo geeft Microlink ze terug)", () => {
  assert.equal(findProduct([crumbs, product]).name, "Sony HT-S40R");
});

test("findProduct: blokken als tekst, met of zonder script-tag", () => {
  assert.equal(findProduct([JSON.stringify(crumbs), `<script type="application/ld+json">${JSON.stringify(product)}</script>`]).offers.price, 272);
});

test("findProduct: product in een @graph, en niets bij onzin", () => {
  assert.equal(findProduct({ "@graph": [crumbs, product] }).name, "Sony HT-S40R");
  assert.equal(findProduct(["geen json", crumbs]), null);
  assert.equal(findProduct(undefined), null);
});
