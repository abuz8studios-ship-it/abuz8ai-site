import json, time, urllib.request, subprocess, os

def probe():
    try:
        r = urllib.request.urlopen("http://127.0.0.1:8188/system_stats", timeout=4)
        return json.load(r)
    except Exception as e:
        return None

st = None
for i in range(40):
    st = probe()
    if st: break
    time.sleep(6)
    print(f"  waiting… {(i+1)*6}s", flush=True)

if not st:
    print("ComfyUI DID NOT COME UP in 240s")
    lg = r"E:\ABU\abuz8ai-site\scripts\comfy_boot_eve.log"
    if os.path.exists(lg):
        print("--- last 30 log lines ---")
        print("\n".join(open(lg, encoding="utf-8", errors="replace").read().splitlines()[-30:]))
    raise SystemExit(1)

print("ComfyUI UP")
print("  version:", st.get("system", {}).get("comfyui_version"))
d = (st.get("devices") or [{}])[0]
print("  device:", d.get("name"), "| vram_total:", round(d.get("vram_total", 0)/1073741824, 1), "GB")

oi = json.load(urllib.request.urlopen("http://127.0.0.1:8188/object_info", timeout=60))
print("  nodes:", len(oi))
for node, field in [("CheckpointLoaderSimple","ckpt_name"),
                    ("UpscaleModelLoader","model_name"),
                    ("LoraLoader","lora_name")]:
    try:
        v = oi[node]["input"]["required"][field][0]
        print(f"  {node}.{field} ({len(v)}): {v}")
    except Exception as e:
        print(f"  {node}: unavailable ({e})")

print("  has ImageScaleBy:", "ImageScaleBy" in oi)
print("  has ImageUpscaleWithModel:", "ImageUpscaleWithModel" in oi)
print("  has LoadImage:", "LoadImage" in oi)
