import json
from pathlib import Path
import re

# Correct paths
BASE = Path(__file__).parent
SRC = BASE / "products" / "_category_index.json"
DST = BASE / "products" / "_category_index_normalized.json"

def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[,&]", "", s)
    s = re.sub(r"\s+", "-", s)
    return s.strip("-")

data = json.loads(SRC.read_text(encoding="utf-8"))

out = {}

for full_path, items in data.items():
    parts = [p.strip() for p in full_path.split(">")]

    # Drop Amazon root bucket
    clean = [p for p in parts if p != "Clothing, Shoes & Jewelry"]

    leaf = clean[-1]
    context = clean[-3:-1]  # e.g. Women > Dresses

    slug = slugify(" ".join(context + [leaf]))

    out[slug] = {
        "slug": slug,
        "title": leaf,
        "breadcrumb": clean,
        "count": len(items),
        "items": items,
    }

DST.write_text(json.dumps(out, indent=2), encoding="utf-8")

print(f"✅ Wrote {DST} with {len(out)} categories")

