#!/usr/bin/env python3
"""
website-to-data-jnas.py

CLI script that takes a website URL and converts it into a JSON item suitable
for inclusion in a `data.jnas` file (a JSON array).

Features:
- Fetches the page and extracts title, description, OpenGraph image and favicon.
- Produces a JSON object with sensible fields: id, url, title, description,
  image, favicon, host, added, tags.
- Can print the JSON to stdout or append it into an output file (default: data.jnas).

Usage examples:
  python website-to-data-jnas.py https://example.com
  python website-to-data-jnas.py https://example.com --outfile data.jnas --append

Requirements: requests, beautifulsoup4
Install: pip install requests beautifulsoup4
"""

import argparse
import json
import sys
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from datetime import datetime
import re


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text or "item"


def fetch_page(url: str, timeout: int = 10) -> requests.Response:
    headers = {
        "User-Agent": "website-to-data-jnas/1.0 (+https://example.com)"
    }
    r = requests.get(url, headers=headers, timeout=timeout)
    r.raise_for_status()
    return r


def extract_metadata(html: str, base_url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    # Title
    title = None
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    # Description (prefer OG description)
    description = None
    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        description = og_desc["content"].strip()
    else:
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            description = meta_desc["content"].strip()

    # Open Graph image
    image = None
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        image = urljoin(base_url, og_image["content"].strip())

    # Favicon: look for rel icons, fallback to /favicon.ico
    favicon = None
    icon_link = soup.find("link", rel=lambda r: r and "icon" in r.lower())
    if icon_link and icon_link.get("href"):
        favicon = urljoin(base_url, icon_link["href"].strip())
    else:
        parsed = urlparse(base_url)
        favicon = f"{parsed.scheme}://{parsed.netloc}/favicon.ico"

    return {
        "title": title,
        "description": description,
        "image": image,
        "favicon": favicon,
    }


def build_item(url: str, meta: dict) -> dict:
    parsed = urlparse(url)
    host = parsed.netloc
    title = meta.get("title") or url
    item_id = slugify(title + " " + host)

    item = {
        "id": item_id,
        "url": url,
        "title": title,
        "description": meta.get("description"),
        "image": meta.get("image"),
        "favicon": meta.get("favicon"),
        "host": host,
        "added": datetime.utcnow().isoformat() + "Z",
        "tags": [],
        "source_type": "website",
    }
    return item


def append_to_file(item: dict, outfile: str):
    try:
        with open(outfile, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                raise ValueError("Output file does not contain a JSON array")
    except FileNotFoundError:
        data = []
    except json.JSONDecodeError:
        # If file exists but is invalid JSON, raise so user can fix it
        raise

    data.append(item)
    with open(outfile, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    p = argparse.ArgumentParser(description="Convert a website URL into a data.jnas JSON item")
    p.add_argument("url", help="The website URL to convert")
    p.add_argument("--outfile", default="data.jnas", help="Output file (default: data.jnas)")
    p.add_argument("--append", action="store_true", help="Append the item into the outfile (expects JSON array)")
    p.add_argument("--timeout", type=int, default=10, help="HTTP request timeout seconds")

    args = p.parse_args()

    try:
        resp = fetch_page(args.url, timeout=args.timeout)
    except Exception as e:
        print(f"Error fetching URL: {e}", file=sys.stderr)
        sys.exit(2)

    meta = extract_metadata(resp.text, resp.url)
    item = build_item(resp.url, meta)

    if args.append:
        try:
            append_to_file(item, args.outfile)
            print(f"Appended item with id '{item['id']}' to {args.outfile}")
        except Exception as e:
            print(f"Error writing to file: {e}", file=sys.stderr)
            sys.exit(3)
    else:
        # Print JSON to stdout
        print(json.dumps(item, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
