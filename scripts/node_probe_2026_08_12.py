import json, urllib.request

url = "http://127.0.0.1:8188/object_info"
try:
    with urllib.request.urlopen(url, timeout=10) as r:
        data = json.load(r)
except Exception as e:
    print("ENGINE_DOWN:", e)
    raise SystemExit(1)

keys = list(data.keys())
print("TOTAL_NODES:", len(keys))

wanted_substrings = [
    "ControlNet", "Rembg", "Segment", "BiRefNet", "RemoveBackground",
    "Inspyrenet", "BRIA", "SAM", "QRCode", "QR"
]
for sub in wanted_substrings:
    hits = [k for k in keys if sub.lower() in k.lower()]
    print(f"--- match '{sub}' ({len(hits)}) ---")
    for h in hits:
        print("  ", h)
