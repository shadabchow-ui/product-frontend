import json
import re
from pathlib import Path
from collections import Counter

PRODUCTS_DIR = Path("/Applications/product/static/products")

# ---------- helpers ----------

def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def read_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8", errors="ignore"))

def write_json(p: Path, data):
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

def has_keywords(text: str, keywords):
    t = text.lower()
    return any(k in t for k in keywords)

# ---------- taxonomy rules ----------
# IMPORTANT:
# - Rules are evaluated TOP → BOTTOM
# - Most specific MUST come first
# - Catch-all MUST be last

TAXONOMY = [
    {
        "path": ["Women", "Dresses", "Maxi Dresses"],
        "keywords": ["maxi dress"]
    },
    {
        "path": ["Women", "Dresses", "Bodycon Dresses"],
        "keywords": ["bodycon"]
    },
    {
        "path": ["Women", "Dresses", "Evening Dresses"],
        "keywords": ["evening", "formal", "gown"]
    },
    {
        "path": ["Women", "Dresses", "Sweater Dresses"],
        "keywords": ["sweater dress", "knit dress"]
    },
    {
        "path": ["Women", "Dresses", "Mini Dresses"],
        "keywords": ["mini dress"]
    },
    {
        # catch-all (KEEP LAST)
        "path": ["Women", "Dresses"],
        "keywords": ["dress"]
    },
]

# ---------- categorization ----------

def categorize(product: dict):
    title = product.get("title", "")
    slug = product.get("handle") or product.get("slug") or ""

    # IMPORTANT:
    # We deliberately DO NOT trust Amazon breadcrumbs
    text = " ".join([title, slug])

    for rule in TAXONOMY:
        if has_keywords(text, rule["keywords"]):
            path = rule["path"]
            return {
                "category": " > ".join(path),
                "category_slug": slugify("-".join(path)),
                "category_path": path,
            }

    # fallback
    return {
        "category": "Women > Uncategorized",
        "category_slug": "women-uncategorized",
        "category_path": ["Women", "Uncategorized"],
    }

# ---------- main ----------

def main():
    updated = 0
    counts = Counter()

    for path in PRODUCTS_DIR.glob("*.json"):
        if path.name.startswith("_"):
            continue

        data = read_json(path)

        cat = categorize(data)
        data.update(cat)

        write_json(path, data)

        counts[cat["category"]] += 1
        updated += 1

    print(f"✅ Categorized {updated} products\n")

    print("Category breakdown:")
    for k, v in counts.most_common():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    main()

