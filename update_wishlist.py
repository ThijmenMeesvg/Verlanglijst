import json
import requests
from bs4 import BeautifulSoup
import pyshorteners
from datetime import datetime
from urllib.parse import urlparse

# Bestanden
json_file = "wishlist.json"
url_file = "urls.txt"

# Functie om URL te verkorten
def shorten_url(url):
    s = pyshorteners.Shortener()
    return s.tinyurl.short(url)

# Detecteer webshop en gebruik de juiste scraper
def get_product_info(url):
    domain = urlparse(url).netloc.lower()
    if "bol.com" in domain:
        return scrape_bol(url)
    elif "coolblue.nl" in domain:
        return scrape_coolblue(url)
    elif "amazon.nl" in domain or "amazon.com" in domain:
        return scrape_amazon(url)
    else:
        print(f"Webshop {domain} wordt nog niet ondersteund.")
        return None

# Scraper voor Bol.com
def scrape_bol(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    title_tag = soup.find('h1', {'class': 'product-title'})
    price_tag = soup.find('meta', {'itemprop': 'price'})
    title = title_tag.text.strip() if tit_
