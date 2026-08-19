# -*- coding: utf-8 -*-
"""Verify the EXACT graph ai-qr-art-pro.html's studio config submits (2026-08-12 evening).
Mirrors buildWorkflow in studio_configs_2026_08_11.py: 1024px, steps 24, cfg 7.5,
dpmpp_2m/karras, error_correct H, strength 0.85, hardcoded SDXL + canny_sdxl."""
import json, time, urllib.request, uuid

BASE = "http://127.0.0.1:8188"

def post_json(path, obj):
    req = urllib.request.Request(BASE + path, data=json.dumps(obj).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def get_json(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as r:
        return json.loads(r.read())

NEG = ("text, watermark, signature, blurry, low quality, jpeg artifacts, "
       "deformed, extra limbs, bad anatomy")
POS = ("masterpiece, best quality, intricate scannable qr code art, "
       "organic mosaic of flowers and leaves, vibrant colors, highly detailed")

wf = {
    "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
    "2": {"class_type": "CLIPTextEncode", "inputs": {"text": POS, "clip": ["1", 1]}},
    "3": {"class_type": "CLIPTextEncode", "inputs": {"text": NEG, "clip": ["1", 1]}},
    "4": {"class_type": "EmptyLatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
    "5": {"class_type": "Qr Code (mtb)", "inputs": {"url": "https://abuz8ai.com", "width": 1024,
          "height": 1024, "error_correct": "H", "box_size": 10, "border": 4, "invert": False}},
    "6": {"class_type": "ControlNetLoader", "inputs": {"control_net_name": "canny_sdxl.safetensors"}},
    "7": {"class_type": "ControlNetApply", "inputs": {"conditioning": ["2", 0], "control_net": ["6", 0],
          "image": ["5", 0], "strength": 0.85}},
    "8": {"class_type": "KSampler", "inputs": {"seed": 98765, "steps": 24, "cfg": 7.5,
          "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1.0,
          "model": ["1", 0], "positive": ["7", 0], "negative": ["3", 0], "latent_image": ["4", 0]}},
    "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["1", 2]}},
    "10": {"class_type": "SaveImage", "inputs": {"filename_prefix": "abuz8_verify_qrart_page", "images": ["9", 0]}}
}

cid = str(uuid.uuid4())
r = post_json("/prompt", {"prompt": wf, "client_id": cid})
if "prompt_id" not in r:
    print("SUBMIT FAILED:", r)
    raise SystemExit(1)
pid = r["prompt_id"]
t0 = time.time()
while time.time() - t0 < 300:
    h = get_json("/history/" + pid)
    if pid in h:
        h = h[pid]
        break
    time.sleep(2)
else:
    print("TIMEOUT")
    raise SystemExit(1)
elapsed = time.time() - t0
status = h.get("status", {})
imgs = [im["filename"] for out in h.get("outputs", {}).values() for im in out.get("images", [])]
print("status:", status.get("status_str"), "| completed:", status.get("completed"),
      "| %.1fs" % elapsed, "| images:", imgs)
raise SystemExit(0 if imgs else 1)
