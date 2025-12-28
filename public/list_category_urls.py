import json
from pathlib import Path

SRC = Path("products/_category_index_normalized.json")
data = json.loads(SRC.read_text(encoding="utf-8"))

urls = [f"/c/{v['slug']}" for v in data.values()]
urls = sorted(urls)

print("Total category URLs:", len(urls))
print("\n".join(urls))
