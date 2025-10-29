import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime

# Bestanden
json_file = "wishlist.json"
urls_file = "new_urls.txt"

# Functie om product info op te halen
def get_product_info(url):
    r = requests.get(url)
    soup = BeautifulSoup(r.text, 'html.parser')

    # Simpele titel: <title> van de pagina
    title = soup.find('title').text.strip()

    # Voor prijs: probeer Bol.com class, anders 0
    try:
        price_tag = soup.find(class_='promo-price') or soup.find(class_='sales-price')  # aanpasbaar per site
        price_text = price_tag.text.strip()
        price = float(price_text.replace('€','').replace(',','.'))
    except:
        price = 0.0

    return {
        "title": title,
        "price": price,
        "link": url,
        "favorite": False,
        "dateAdded": datetime.today().strftime('%Y-%m-%d')
    }

# URL's en categorieën inlezen
with open(urls_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# JSON inladen
with open(json_file, 'r', encoding='utf-8') as f:
    wishlist = json.load(f)

# Voor elke URL: toevoegen aan juiste categorie
for line in lines:
    line = line.strip()
    if not line: 
        continue
    category, url = line.split(',', 1)
    item = get_product_info(url)
    if category not in wishlist:
        wishlist[category] = []
    wishlist[category].append(item)

# JSON opslaan
with open(json_file, 'w', encoding='utf-8') as f:
    json.dump(wishlist, f, indent=2, ensure_ascii=False)

print("Wishlist bijgewerkt!")
