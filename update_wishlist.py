import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import os
import re

JSON_FILE = "wishlist.json"
URLS_FILE = "new_urls.txt"

# --- JSON aanmaken als het niet bestaat ---
if not os.path.exists(JSON_FILE):
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            "Boeken": [],
            "Muziek": [],
            "Spelletjes": [],
            "Kleding & Accesoires": [],
            "Uitzet": [],
            "Sport & Buiten": [],
            "Overig": []
        }, f, indent=2, ensure_ascii=False)


# --- Functies ---
def shorten_url(url: str) -> str:
    """Probeer een korte bol.com-link te maken via ap.lc (fallback naar originele)"""
    if "bol.com" in url:
        try:
            r = requests.post("https://ap.lc/api/shorten", json={"url": url}, timeout=10)
            if r.ok:
                data = r.json()
                if "shortlink" in data:
                    return data["shortlink"]
        except Exception:
            pass
    return url


def clean_price(text: str) -> float:
    """Converteer tekst naar een float-waarde"""
    text = text.replace("€", "").replace(",", ".").strip()
    match = re.search(r"\d+(\.\d+)?", text)
    return float(match.group(0)) if match else 0.0


def get_product_info(url: str) -> dict:
    """Haal titel en prijs op van bekende winkels"""
    title = "Onbekend product"
    price = 0.0

    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        r = requests.get(url, timeout=15, headers=headers)
        soup = BeautifulSoup(r.text, "html.parser")

        # --- bol.com ---
        if "bol.com" in url:
            t = soup.find("span", {"data-test": "title"}) or soup.find("h1")
            p = soup.find("meta", {"itemprop": "price"}) or soup.find(class_="promo-price")
            if t:
                title = t.get_text(strip=True)
            if p and p.get("content"):
                price = float(p["content"])
            elif p:
                price = clean_price(p.get_text())

        # --- amazon.nl / amazon.com ---
        elif "amazon." in url:
            t = soup.find(id="productTitle")
            p = soup.find(class_="a-price-whole")
            if t:
                title = t.get_text(strip=True)
            if p:
                price = clean_price(p.get_text())

        # --- ditverzinjeniet.nl ---
        elif "ditverzinjeniet.nl" in url:
            t = soup.find("h1", class_="product_title")
            p = soup.find("span", class_="woocommerce-Price-amount")
            if t:
                title = t.get_text(strip=True)
            if p:
                price = clean_price(p.get_text())

        # --- radbag.nl ---
        elif "radbag.nl" in url:
            t = soup.find("h1", class_="product-title")
            p = soup.find("span", class_="price-item")
            if t:
                title = t.get_text(strip=True)
            if p:
                price = clean_price(p.get_text())

        # --- platenzaak.nl ---
        elif "platenzaak.nl" in url:
            t = soup.find("h1", class_="product_title")
            p = soup.find("span", class_="woocommerce-Price-amount")
            if t:
                title = t.get_text(strip=True)
            if p:
                price = clean_price(p.get_text())

        # --- fallback ---
        else:
            t = soup.find("title")
            if t:
                title = t.get_text(strip=True).split("|")[0].strip()

    except Exception as e:
        print(f"Fout bij ophalen {url}: {e}")

    return {
        "title": title,
        "price": price,
        "link": shorten_url(url),
        "favorite": False,
        "dateAdded": datetime.today().strftime("%Y-%m-%d")
    }


# --- Verwerk URLs ---
if not os.path.exists(URLS_FILE):
    print("Geen new_urls.txt gevonden.")
    exit()

with open(URLS_FILE, "r", encoding="utf-8") as f:
    lines = [line.strip() for line in f.readlines() if line.strip()]

with open(JSON_FILE, "r", encoding="utf-8") as f:
    wishlist = json.load(f)

added = 0
for line in lines:
    if "," not in line:
        continue
    category, url = [x.strip() for x in line.split(",", 1)]
    item = get_product_info(url)

    if category not in wishlist:
        wishlist[category] = []

    # Duplicaten voorkomen
    if any(existing["link"] == item["link"] for existing in wishlist[category]):
        print(f"Overgeslagen (duplicaat): {item['title']}")
        continue

    wishlist[category].append(item)
    print(f"Toegevoegd: {item['title']} in categorie {category}")
    added += 1

# Opslaan
with open(JSON_FILE, "w", encoding="utf-8") as f:
    json.dump(wishlist, f, indent=2, ensure_ascii=False)

# Leegmaken van new_urls.txt
open(URLS_FILE, "w").close()

print(f"Wishlist bijgewerkt! ({added} nieuw item{'s' if added != 1 else ''})")


