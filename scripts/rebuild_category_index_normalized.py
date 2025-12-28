import json
from pathlib import Path
from collections import defaultdict

PRODUCTS_DIR = Path("/Applications/product/static/products")
OUT_FILE = PRODUCTS_DIR / "_category_index_normalized.json"


def title_from_slug(slug: str) -> str:
    return slug.replace("-", " ").title()


def categorize(handle: str, data: dict) -> list[str]:
    """
    Determine category slugs for a single product.
    data is guaranteed to be a dict when this is called.
    """
    s = handle.lower()
    title = str(data.get("title", "")).lower()

    cats = set()

    def has(*words):
        return any(w in s or w in title for w in words)

    # Dresses
    if has("dress", "gown"):
        cats.add("women-clothing-dresses")
        if has("formal", "evening"):
            cats.add("clothing-dresses-formal")
        if has("cocktail"):
            cats.add("clothing-dresses-cocktail")
        if has("wedding", "bridal"):
            cats.add("clothing-dresses-wedding-dresses")
        if has("work", "office"):
            cats.add("clothing-dresses-work")
        if has("casual", "day"):
            cats.add("clothing-dresses-casual")

    # Sweaters
    if has("sweater", "pullover", "knit"):
        cats.add("women-clothing-sweaters")
        if has("cardigan"):
            cats.add("clothing-sweaters-cardigans")
        if has("vest"):
            cats.add("clothing-sweaters-vests")

    # Lingerie
    if has("lingerie", "bra", "panty", "thong"):
        if has("sports bra"):
            cats.add("lingerie-bras-sports-bras")
        elif has("bra"):
            cats.add("lingerie-bras-everyday-bras")

        if has("panty", "brief"):
            cats.add("lingerie-panties-briefs")
        if has("thong", "g-string"):
            cats.add("lingerie-panties-g-strings-thongs")

    return sorted(cats)


# ----------------------------
# Build index
# ----------------------------

index = defaultdict(lambda: {
    "slug": "",
    "title": "",
    "count": 0,
    "items": []
})

for file in PRODUCTS_DIR.glob("*.json"):

    # Skip known non-product files
    if file.name.startswith("_"):
        continue

    try:
        raw = json.loads(file.read_text())
    except Exception:
        continue

    # 🔒 CRITICAL: skip non-product JSONs
    # (arrays, indexes, search files, etc.)
    if not isinstance(raw, dict):
        continue

    handle = file.stem

    categories = categorize(handle, raw)
    if not categories:
        continue

    for cat in categories:
        index[cat]["slug"] = cat
        index[cat]["title"] = title_from_slug(cat)
        index[cat]["items"].append(handle)


# Finalize counts + dedupe
final_index = {}
for slug, data in index.items():
    items = sorted(set(data["items"]))
    if not items:
        continue

    final_index[slug] = {
        "slug": slug,
        "title": data["title"],
        "count": len(items),
        "items": items
    }

OUT_FILE.write_text(json.dumps(final_index, indent=2))
print(f"✅ Wrote {OUT_FILE} with {len(final_index)} categories")
