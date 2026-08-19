import json, urllib.request
oi = json.load(urllib.request.urlopen("http://127.0.0.1:8188/object_info", timeout=60))

for node, field in [("UpscaleModelLoader","model_name"),
                    ("CheckpointLoaderSimple","ckpt_name"),
                    ("LoadImage","image")]:
    try:
        raw = oi[node]["input"]["required"][field]
        print(f"--- {node}.{field}")
        print("    outer type:", type(raw).__name__, "len", len(raw))
        print("    [0] type:", type(raw[0]).__name__,
              "->", (raw[0] if not isinstance(raw[0], list) else f"list[{len(raw[0])}] {raw[0][:3]}"))
        if len(raw) > 1:
            meta = raw[1]
            print("    [1] type:", type(meta).__name__,
                  "keys:", list(meta.keys())[:8] if isinstance(meta, dict) else meta)
            if isinstance(meta, dict):
                for k in ("options","values","combo_options"):
                    if k in meta:
                        print(f"    [1].{k} =", meta[k])
    except Exception as e:
        print(node, "ERR", e)
