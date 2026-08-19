# -*- coding: utf-8 -*-
"""Verify the EXACT ai-style-transfer-pro page graph against the live engine.

Mirrors the page's buildWorkflow byte-for-byte in structure: LoadImage ->
ImageScale(lanczos, crop center) -> VAEEncode -> RepeatLatentBatch ->
KSampler(cfg 7.0, dpmpp_2m/karras, denoise 0.62) -> VAEDecode -> SaveImage.
Tests BOTH an SD1.5-family checkpoint (the picker's likely default) and
sd_xl_base_1.0 (also in the picker), plus batch=2 via RepeatLatentBatch.
"""
import json, time, urllib.request, uuid

BASE = "http://127.0.0.1:8188"

def post_json(path, obj):
    data = json.dumps(obj).encode("utf-8")
    req = urllib.request.Request(BASE + path, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def get_json(path):
    with urllib.request.urlopen(BASE + path, timeout=60) as r:
        return json.loads(r.read())

def wait_done(prompt_id, timeout=300):
    t0 = time.time()
    while time.time() - t0 < timeout:
        h = get_json("/history/" + prompt_id)
        if prompt_id in h:
            return h[prompt_id]
        time.sleep(1)
    raise TimeoutError("prompt did not finish")

def run(name, wf):
    r = post_json("/prompt", {"prompt": wf, "client_id": str(uuid.uuid4())})
    if "prompt_id" not in r:
        print(f"[{name}] SUBMIT FAILED: {json.dumps(r)[:600]}")
        return False
    t0 = time.time()
    try:
        h = wait_done(r["prompt_id"])
    except TimeoutError:
        print(f"[{name}] TIMEOUT"); return False
    el = time.time() - t0
    st = h.get("status", {})
    if st.get("status_str") == "error":
        print(f"[{name}] FAILED: {json.dumps(st)[:600]}"); return False
    imgs = [im["filename"] for o in h.get("outputs", {}).values() for im in o.get("images", [])]
    print(f"[{name}] {'OK' if imgs else 'NO IMAGES'} · {el:.1f}s · {imgs}")
    return bool(imgs)

def graph(ckpt, image, size, batch, steps, seed, pos):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": ckpt}},
        "2": {"class_type": "LoadImage", "inputs": {"image": image}},
        "3": {"class_type": "ImageScale", "inputs": {"image": ["2", 0], "upscale_method": "lanczos", "width": size, "height": size, "crop": "center"}},
        "4": {"class_type": "VAEEncode", "inputs": {"pixels": ["3", 0], "vae": ["1", 2]}},
        "5": {"class_type": "RepeatLatentBatch", "inputs": {"samples": ["4", 0], "amount": batch}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": pos, "clip": ["1", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": "text, watermark, blurry, low quality, deformed", "clip": ["1", 1]}},
        "8": {"class_type": "KSampler", "inputs": {"seed": seed, "steps": steps, "cfg": 7.0,
              "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 0.62,
              "model": ["1", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["1", 2]}},
        "10": {"class_type": "SaveImage", "inputs": {"filename_prefix": "abuz8_verify_styletx", "images": ["9", 0]}},
    }

if __name__ == "__main__":
    info = get_json("/object_info/LoadImage")
    li = info["LoadImage"]["input"]["required"]["image"][0]
    sample = li[0] if li else None
    print("sample input image:", sample)

    ck_info = get_json("/object_info/CheckpointLoaderSimple")
    raw = ck_info["CheckpointLoaderSimple"]["input"]["required"]["ckpt_name"]
    cks = raw[0] if isinstance(raw[0], list) else raw[1].get("options", raw[1].get("values", []))
    print("checkpoints:", cks)

    sd15 = next((c for c in cks if "xl" not in c.lower() and not any(
        k in c.lower() for k in ("video", "wan", "audio", "ltx", "svd", "3d", "hunyuan", "flux"))), None)
    xl = next((c for c in cks if "sd_xl" in c.lower()), None)
    pos = "masterpiece, best quality, classical oil painting, visible brush strokes, canvas texture"

    ok = True
    if sd15:
        ok &= run(f"styletx sd15 ({sd15}) 512 b1", graph(sd15, sample, 512, 1, 24, 12345, pos))
        ok &= run(f"styletx sd15 ({sd15}) 768 b2", graph(sd15, sample, 768, 2, 24, 98765, pos))
    if xl:
        ok &= run(f"styletx sdxl ({xl}) 1024 b1", graph(xl, sample, 1024, 1, 24, 4242, pos))
    print("RESULT:", "ALL OK" if ok else "FAILURES PRESENT")
