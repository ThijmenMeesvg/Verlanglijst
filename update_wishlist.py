import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime

# Bestanden
JSON_FILE = "wishlist.json"
URLS_FILE = "new_urls.txt"

def shorten_url(url):
    """Optioneel: hier kun je een URL-shortener API toevoegen. Voor nu gewoon originele URL teruggeven."""
    return url

def get_product_info(url):
    """Haalt titel en prijs op van een productpagina"""
    try:
        r = requests.get(url, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')
        title = soup.find('title').text.strip()
        
        # Prijs ophalen, standaard 0.0 als niet gevonden
        price = 0.0
        price_tag = soup.find(class_='promo-price') or soup.find(class_='sales-price')
        if price_tag:
            price_text = price_tag.text.strip().replace('€','').replace(',','.')
            try:
                price = float(price_text)
            except:
                price = 0.0

    except Exception as e:
        print(f"Fout bij ophalen {url}: {e}")
        title = "Onbekend product"
        price = 0.0

    return {
        "title": title,
        "price": price,
        "link": shorten_url(url),
        "favorite": False,
        "dateAdded": datetime.today().strftime('%Y-%m-%d')
    }

# Lees URL’s + categorieën
with open(URLS_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Laad JSON
with open(JSON_FILE, 'r', encoding='utf-8') as f:
    wishlist = json.load(f)

# Voeg items toe
for line in lines:
    line = line.strip()
    if not line: 
        continue
    if ',' not in line:
        print(f"Ongeldige regel: {line}")
        continue
    category, url = line.split(',', 1)
    item = get_product_info(url)
    if category not in wishlist:
        wishlist[category] = []
    wishlist[category].append(item)
    print(f"Toegevoegd: {item['title']} in categorie {category}")

# Sla JSON op
with open(JSON_FILE, 'w', encoding='utf-8') as f:
    json.dump(wishlist, f, indent=2, ensure_ascii=False)

print("Wishlist bijgewerkt!")

