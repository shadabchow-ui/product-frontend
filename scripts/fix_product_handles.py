import json
import re
from pathlib import Path

PRODUCTS_DIR = Path("/Applications/product/static/products")

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")[:90]

def read_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8", errors="ignore"))

def write_json(p: Path, data):
    p.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

def main():
    seen_slugs = set()
    rename_map = {}

    products = []
    for path in PRODUCTS_DIR.glob("*.json"):
        if path.name.startswith("_"):
            continue
        data = read_json(path)
        products.append((path, data))

    for path, data in products:
        title = (data.get("title") or "").strip()
        asin = (data.get("asin") or "").strip()

        if not title or not asin:
            continue

        base_slug = slugify(title)
        slug = base_slug

        # Handle collisions deterministically
        if slug in seen_slugs:
            slug = f"{base_slug}-{asin.lower()}"

        seen_slugs.add(slug)

        # Update internal fields
        data["handle"] = slug
        data["slug"] = slug

        new_path = PRODUCTS_DIR / f"{slug}.json"

        # Extra safety: never overwrite another product
        if new_path.exists() and new_path != path:
            slug = f"{base_slug}-{asin.lower()}"
            data["handle"] = slug
            data["slug"] = slug
            new_path = PRODUCTS_DIR / f"{slug}.json"

        write_json(new_path, data)

        if new_path != path:
            rename_map[path] = new_path

    # Remove old filenames after successful writes
    for old_path, new_path in rename_map.items():
        if old_path.exists():
            old_path.unlink()
            print(f"✅ {old_path.name} → {new_path.name}")

    print(f"\n✅ Processed {len(products)} products")
    print(f"✅ Renamed {len(rename_map)} files (collision-safe)")

if __name__ == "__main__":
    main()
