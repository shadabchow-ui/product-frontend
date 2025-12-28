import json
from pathlib import Path

PRODUCTS_DIR = Path("/Applications/product/public/products")
INDEX_PATH = PRODUCTS_DIR / "_category_index_normalized.json"

index = json.loads(INDEX_PATH.read_text())

# reset index
for k in index:
    index[k] = []

def categories_for_product(slug: str):
    s = slug.lower()
    cats = set()

    # ---------- DRESSES ----------
    if "dress" in s:
        cats.add("women-clothing-dresses")

        if "maxi" in s:
            cats.add("clothing-dresses-casual")
        if "cocktail" in s:
            cats.add("clothing-dresses-cocktail")
        if "formal" in s or "evening" in s:
            cats.add("clothing-dresses-formal")
        if "work" in s or "office" in s:
            cats.add("clothing-dresses-work")
        if "wedding" in s or "bridal" in s:
            cats.add("clothing-dresses-wedding-dresses")

    # ---------- SWEATERS ----------
    if "sweater" in s or "pullover" in s or "cardigan" in s:
        cats.add("women-clothing-sweaters")
        if "cardigan" in s:
            cats.add("clothing-sweaters-cardigans")
        if "pullover" in s:
            cats.add("clothing-sweaters-pullovers")
        if "vest" in s:
            cats.add("clothing-sweaters-vests")

    # ---------- LINGERIE / SLEEP ----------
    if any(x in s for x in ["lingerie", "sleep", "nightgown", "robe", "pajama"]):
        cats.add("lingerie-sleep-lounge-lingerie-lingerie-sets")

        if "nightgown" in s or "sleepdress" in s:
            cats.add("lingerie-sleep-lounge-sleep-lounge-nightgowns-sleepshirts")
        if "robe" in s:
            cats.add("lingerie-sleep-lounge-sleep-lounge-robes")
        if "set" in s:
            cats.add("lingerie-sleep-lounge-sleep-lounge-sets")

    # ---------- BRAS ----------
    if "bra" in s:
        cats.add("lingerie-bras-everyday-bras")
        if "sports" in s:
            cats.add("lingerie-bras-sports-bras")

    # ---------- PANTIES ----------
    if any(x in s for x in ["panty", "brief", "thong", "bikini"]):
        cats.add("lingerie-panties-briefs")
        if "thong" in s:
            cats.add("lingerie-panties-g-strings-thongs")
        if "bikini" in s:
            cats.add("lingerie-panties-bikinis")
        if "boyshort" in s:
            cats.add("lingerie-panties-boy-shorts")

    # ---------- OUTERWEAR ----------
    if "jacket" in s or "coat" in s:
        cats.add("clothing-coats-jackets-vests-casual-jackets")
        if "fleece" in s:
            cats.add("women-jackets-fleece-jackets")
        if "fur" in s:
            cats.add("clothing-coats-jackets-vests-fur-faux-fur")
        if "pea" in s or "wool" in s:
            cats.add("clothing-coats-jackets-vests-wool-pea-coats")

    return cats

# populate
for p in PRODUCTS_DIR.glob("*.json"):
    if p.name.startswith("_"):
        continue

    slug = p.stem
    for cat in categories_for_product(slug):
        if cat in index:
            index[cat].append(slug)

# write back
INDEX_PATH.write_text(
    json.dumps(index, indent=2, sort_keys=True)
)

print("✅ Category index populated")
for k, v in index.items():
    if v:
        print(f"{k}: {len(v)} products")


