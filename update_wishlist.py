import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import os

# Bestanden
JSON_FILE = "wishlist.json"
URLS_FILE = "new_urls.txt"

# Maak JSON bestand aan als het niet bestaat
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

# Shorten URL functie (optioneel)
def shorten_url(url):
    # Hier kan een URL shortener API toegevoegd worden
    return url

# Duplicate check
def is_duplicate(wishlist, category, link):
    return any(item["link"] == link for item in wishlist.get(category, []))

# Functie per site
def get_product_info(url):
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    title = "placeholder"
    price = 0.0

    try:
        r = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(r.text, 'html.parser')

        # Bol.com
        if "bol.com" in url:
            json_ld = soup.find('script', type='application/ld+json')
            if json_ld:
                data = json.loads(json_ld.string)
                title = data.get('name', 'placeholder')
                price = float(data.get('offers', {}).get('price', 0.0))

        # Amazon
        elif "amazon." in url:
            title_tag = soup.find(id="productTitle")
            title = title_tag.text.strip() if title_tag else "placeholder"
            price_tag = soup.find(id="priceblock_ourprice") or soup.find(id="priceblock_dealprice")
            if price_tag:
                price_text = price_tag.text.strip().replace('€', '').replace(',', '.')
                try:
                    price = float(price_text)
                except:
                    price = 0.0

        # Radbag.nl, ditverzinjeniet.nl, platenzaak.nl
        else:
            title_tag = soup.find('title')
            title = title_tag.text.strip() if title_tag else "placeholder"
            price_tag = soup.find(class_='promo-price') or soup.find(class_='sales-price')
            if price_tag:
                price_text = price_tag.text.strip().replace('€','').replace(',','.')
                try:
                    price = float(price_text)
                except:
                    price = 0.0

    except Exception as e:
        print(f"Fout bij ophalen {url}: {e}")

    return {
        "title": title,
        "price": price,
        "link": shorten_url(url),
        "favorite": False,
        "dateAdded": datetime.today().strftime('%Y-%m-%d')
    }

# Lees URL's
with open(URLS_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Laad JSON
with open(JSON_FILE, 'r', encoding='utf-8') as f:
    wishlist = json.load(f)

# Voeg items toe
for line in lines:
    line = line.strip()
    if not line or ',' not in line:
        continue
    category, url = line.split(',', 1)
    if category not in wishlist:
        wishlist[category] = []

    if not is_duplicate(wishlist, category, url):
        item = get_product_info(url)
        wishlist[category].append(item)
        print(f"Toegevoegd: {item['title']} in categorie {category}")
    else:
        print(f"Duplicaat overgeslagen: {url}")

# Sla JSON op
with open(JSON_FILE, 'w', encoding='utf-8') as f:
    json.dump(wishlist, f, indent=2, ensure_ascii=False)

print("Wishlist bijgewerkt!")


