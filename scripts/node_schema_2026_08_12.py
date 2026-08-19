import json, urllib.request

with urllib.request.urlopen("http://127.0.0.1:8188/object_info", timeout=15) as r:
    data = json.load(r)

targets = ["Qr Code (mtb)", "ControlNetLoader", "ControlNetApply",
           "RemBGSession+", "ImageRemoveBackground+", "RemoveBackground",
           "LoadImage", "SaveImage", "CheckpointLoaderSimple"]

for t in targets:
    if t not in data:
        print(f"=== {t} === NOT FOUND")
        continue
    node = data[t]
    print(f"=== {t} ===")
    print("input:", json.dumps(node.get("input", {}), indent=2)[:1200])
    print("output:", node.get("output"))
    print()
