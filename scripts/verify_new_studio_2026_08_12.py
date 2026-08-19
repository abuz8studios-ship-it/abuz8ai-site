import json, time, urllib.request, uuid, os

BASE = "http://127.0.0.1:8188"

def post_json(path, obj):
    data = json.dumps(obj).encode("utf-8")
    req = urllib.request.Request(BASE + path, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def get_json(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as r:
        return json.loads(r.read())

def wait_done(prompt_id, timeout=180):
    t0 = time.time()
    while time.time() - t0 < timeout:
        h = get_json("/history/" + prompt_id)
        if prompt_id in h:
            return h[prompt_id]
        time.sleep(1)
    raise TimeoutError("prompt did not finish in time")

def run(name, workflow):
    cid = str(uuid.uuid4())
    r = post_json("/prompt", {"prompt": workflow, "client_id": cid})
    if "prompt_id" not in r:
        print(f"[{name}] SUBMIT FAILED: {r}")
        return False
    pid = r["prompt_id"]
    t0 = time.time()
    try:
        h = wait_done(pid)
    except TimeoutError:
        print(f"[{name}] TIMEOUT")
        return False
    elapsed = time.time() - t0
    status = h.get("status", {})
    if status.get("status_str") == "error" or "error" in json.dumps(status).lower() and status.get("completed") is False:
        print(f"[{name}] FAILED status={status}")
        return False
    outputs = h.get("outputs", {})
    imgs = []
    for node_out in outputs.values():
        for im in node_out.get("images", []):
            imgs.append(im["filename"])
    ok = len(imgs) > 0
    print(f"[{name}] {'OK' if ok else 'NO IMAGES'} · {elapsed:.1f}s · images={imgs}")
    return ok

# --- Background remover: needs a real uploaded image on disk. Use an existing input file. ---
info = get_json("/object_info")
li = info.get("LoadImage", {}).get("input", {}).get("required", {}).get("image", [[]])[0]
sample_image = li[0] if li else None
print("Using sample input image:", sample_image)

bg_wf = {
    "1": {"class_type": "LoadImage", "inputs": {"image": sample_image}},
    "2": {"class_type": "RemBGSession+", "inputs": {"model": "isnet-general-use: general purpose", "providers": "CPU"}},
    "3": {"class_type": "ImageRemoveBackground+", "inputs": {"rembg_session": ["2", 0], "image": ["1", 0]}},
    "4": {"class_type": "SaveImage", "inputs": {"filename_prefix": "abuz8_verify_bgremove", "images": ["3", 0]}}
}
run("background-remover-pro", bg_wf)

ck = info.get("CheckpointLoaderSimple", {}).get("input", {}).get("required", {}).get("ckpt_name", [[]])[0]
print("All checkpoints:", ck)
ckpt_name = None
for c in ck:
    cl = c.lower()
    if "xl" in cl and "flux" not in cl:
        ckpt_name = c
        break
if not ckpt_name and ck:
    ckpt_name = ck[0]
print("Using checkpoint:", ckpt_name)

qr_wf = {
    "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": ckpt_name}},
    "2": {"class_type": "CLIPTextEncode", "inputs": {"text": "intricate scannable qr code art, organic mosaic of flowers and leaves, vibrant colors", "clip": ["1", 1]}},
    "3": {"class_type": "CLIPTextEncode", "inputs": {"text": "text, watermark, blurry, low quality, deformed", "clip": ["1", 1]}},
    "4": {"class_type": "EmptyLatentImage", "inputs": {"width": 768, "height": 768, "batch_size": 1}},
    "5": {"class_type": "Qr Code (mtb)", "inputs": {"url": "https://abuz8ai.com", "width": 768, "height": 768, "error_correct": "H", "box_size": 10, "border": 4, "invert": False}},
    "6": {"class_type": "ControlNetLoader", "inputs": {"control_net_name": "canny_sdxl.safetensors"}},
    "7": {"class_type": "ControlNetApply", "inputs": {"conditioning": ["2", 0], "control_net": ["6", 0], "image": ["5", 0], "strength": 0.85}},
    "8": {"class_type": "KSampler", "inputs": {"seed": 42, "steps": 20, "cfg": 7.5, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1.0, "model": ["1", 0], "positive": ["7", 0], "negative": ["3", 0], "latent_image": ["4", 0]}},
    "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["1", 2]}},
    "10": {"class_type": "SaveImage", "inputs": {"filename_prefix": "abuz8_verify_qrart", "images": ["9", 0]}}
}
run("qr-art-pro", qr_wf)
