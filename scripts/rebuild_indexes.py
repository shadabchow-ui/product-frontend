import json
from pathlib import Path

PRODUCTS_DIR = Path("/Applications/product/static/products")

def extract_image(data):
    imgs = data.get("images")

    if isinstance(imgs, list) and imgs:
        first = imgs[0]
        if isinstance(first, dict):
            return first.get("url")
        if isinstance(first, str):
            return first

    if isinstance(imgs, dict):
        return imgs.get("url")

    if isinstance(imgs, str):
        return imgs

    return None


index = []
asin_map = {}
category_index = {}

for path in PRODUCTS_DIR.glob("*.json"):
    if path.name.startswith("_"):
        continue

    data = json.loads(path.read_text(encoding="utf-8", errors="ignore"))

    handle = data.get("handle")
    asin = data.get("asin")
    title = data.get("title")
    price = data.get("price")
    rating = data.get("rating")
    image = extract_image(data)

    category_slug = data.get("category_slug")
    category_path = data.get("category_path")

    if not handle or not asin:
        continue

    card = {
        "handle": handle,
        "asin": asin,
        "title": title,
        "price": price,
        "rating": rating,
        "image": image,
        "category_path": category_path,
    }

    index.append(card)
    asin_map[asin] = handle

    if category_slug:
        category_index.setdefault(category_slug, []).append(card)

# write index files
(PRODUCTS_DIR / "_index.json").write_text(
    json.dumps(index, indent=2, ensure_ascii=False),
    encoding="utf-8"
)

(PRODUCTS_DIR / "_asin_map.json").write_text(
    json.dumps(asin_map, indent=2, ensure_ascii=False),
    encoding="utf-8"
)

(PRODUCTS_DIR / "_category_index.json").write_text(
    json.dumps(category_index, indent=2, ensure_ascii=False),
    encoding="utf-8"
)

print(f"✅ Rebuilt indexes for {len(index)} products")
