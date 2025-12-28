import os, json, re

PRODUCTS_DIR = "/Applications/product/public/products"
OUT_PATH = os.path.join(PRODUCTS_DIR, "search_index.json")

def norm(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]+", " ", (s or "").lower())).strip()

index = []

for fn in os.listdir(PRODUCTS_DIR):
    if not fn.endswith(".json"):
        continue
    if fn == "search_index.json":
        continue

    path = os.path.join(PRODUCTS_DIR, fn)
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        continue

    # normalize into list of dicts
    if isinstance(data, dict):
        products = [data]
    elif isinstance(data, list):
        products = [x for x in data if isinstance(x, dict)]
    else:
        continue

    for p in products:
        title = p.get("title")
        if not title or not isinstance(title, str):
            continue

        slug = p.get("slug") or p.get("handle") or p.get("asin") or fn.replace(".json", "")

        bullets = p.get("bullet_points")
        if not isinstance(bullets, list):
            bullets = []

        searchable = norm(" ".join([
            title,
            p.get("brand", "") or "",
            p.get("category", "") or "",
            " ".join([b for b in bullets if isinstance(b, str)])
        ]))

        index.append({
            "slug": slug,
            "title": title,
            "brand": p.get("brand"),
            "category": p.get("category"),
            "searchable": searchable,
        })

with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False)

print(f"✅ search_index.json written with {len(index)} products")

