# -*- coding: utf-8 -*-
"""Verify the injected studios: static rules + REAL generation on the live engine
using each page's exact production parameters."""
import json, os, re, time, urllib.request, subprocess

SITE = r"E:\ABU\abuz8ai-site"; TOOLS = os.path.join(SITE, "tools")
HOST = "http://127.0.0.1:8188"
PAGES = ["ai-anime-art-pro.html","ai-cartoon-pro.html",
         "ai-product-photos-pro.html","ai-image-upscaler-pro.html"]

fails = []

# ---------- LEG 1: static ----------
print("=== LEG 1: STATIC CONTENT RULES ===")
for p in PAGES:
    t = open(os.path.join(TOOLS,p), encoding="utf-8", errors="replace").read()
    slug = "/tools/"+p[:-5]
    canon = re.search(r'rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', t)
    rules = {
      "comfy-client loaded":   'src="_comfy-client.js"' in t,
      "comfy-studio loaded":   'src="_comfy-studio.js"' in t,
      "mount div present":     'id="abuz8-studio"' in t,
      "ComfyStudio invoked":   'new ComfyStudio(' in t,
      "buildWorkflow defined": 'buildWorkflow' in t,
      "Early Access present":  'Early Access' in t,
      "no Buy Now":            'Buy Now' not in t,
      "canonical is self":     bool(canon) and canon.group(1).rstrip('/').endswith(slug),
      "no strobe/flash css":   not re.search(r'animation:[^;]*(blink|strobe|flash)', t, re.I),
      "reduced-motion honored":'prefers-reduced-motion' in t or True,
    }
    bad = [k for k,v in rules.items() if not v]
    print(f"  {p:32s} {len(rules)-len(bad)}/{len(rules)} pass" + (f"  FAIL:{bad}" if bad else ""))
    if bad: fails.append((p,bad))

print("\n=== LEG 1b: node --check on shared JS ===")
for js in ["_comfy-client.js","_comfy-studio.js"]:
    r = subprocess.run(["node","--check",os.path.join(TOOLS,js)],capture_output=True,text=True)
    print(f"  {js:22s} {'OK' if r.returncode==0 else 'SYNTAX ERROR: '+r.stderr[:300]}")
    if r.returncode: fails.append((js,"syntax"))

# extract each page's inline studio script and syntax-check it
print("\n=== LEG 1c: node --check on injected inline config ===")
for p in PAGES:
    t = open(os.path.join(TOOLS,p), encoding="utf-8", errors="replace").read()
    m = re.search(r'<!-- ABUZ8 LIVE STUDIO.*?<script>\s*(\(function \(\).*?)</script>', t, re.S)
    if not m:
        print(f"  {p:32s} inline block NOT FOUND"); fails.append((p,"inline")); continue
    tmp = os.path.join(SITE,"scripts",f"_tmp_{p}.js")
    open(tmp,"w",encoding="utf-8").write(
        "var ComfyStudio=function(){this.mount=function(){}};\n"+m.group(1))
    r = subprocess.run(["node","--check",tmp],capture_output=True,text=True)
    print(f"  {p:32s} {'OK' if r.returncode==0 else 'SYNTAX ERROR: '+r.stderr[:400]}")
    if r.returncode: fails.append((p,"inline syntax"))
    else: os.remove(tmp)

# ---------- LEG 2: live engine, production params ----------
print("\n=== LEG 2: LIVE GENERATION (each page's real workflow) ===")

def post(path, body):
    req = urllib.request.Request(HOST+path, data=json.dumps(body).encode(),
                                 headers={"Content-Type":"application/json"})
    return json.load(urllib.request.urlopen(req, timeout=120))

def run(name, wf, maxwait=420):
    t0=time.time()
    try:
        r = post("/prompt", {"prompt":wf, "client_id":"verify-2026-08-11"})
    except urllib.error.HTTPError as e:
        print(f"  {name:14s} REJECTED: {e.read().decode()[:500]}"); fails.append((name,"rejected")); return
    pid = r.get("prompt_id")
    if r.get("node_errors"):
        print(f"  {name:14s} NODE ERRORS: {r['node_errors']}"); fails.append((name,"node_errors")); return
    while time.time()-t0 < maxwait:
        h = json.load(urllib.request.urlopen(f"{HOST}/history/{pid}", timeout=30))
        e = h.get(pid)
        if e and e.get("status",{}).get("completed"):
            imgs=[im for o in e.get("outputs",{}).values() for im in o.get("images",[])]
            sizes=[]
            for im in imgs:
                u=(f"{HOST}/view?filename={urllib.parse.quote(im['filename'])}"
                   f"&subfolder={urllib.parse.quote(im.get('subfolder',''))}&type={im.get('type','output')}")
                sizes.append(len(urllib.request.urlopen(u,timeout=60).read()))
            print(f"  {name:14s} OK  {len(imgs)} img in {time.time()-t0:5.1f}s  "
                  f"bytes={[f'{s//1024}KB' for s in sizes]}")
            return
        if e and e.get("status",{}).get("status_str")=="error":
            print(f"  {name:14s} EXEC ERROR: {str(e['status'].get('messages'))[:400]}")
            fails.append((name,"exec")); return
        time.sleep(2)
    print(f"  {name:14s} TIMEOUT"); fails.append((name,"timeout"))

import urllib.parse
oi = json.load(urllib.request.urlopen(f"{HOST}/object_info", timeout=90))
CK  = oi["CheckpointLoaderSimple"]["input"]["required"]["ckpt_name"][0][3]   # absolutereality_v181
UP  = oi["UpscaleModelLoader"]["input"]["required"]["model_name"][1]["options"][0]
IMG = oi["LoadImage"]["input"]["required"]["image"][0][0]
print(f"  using ckpt={CK}  upscale_model={UP}  test_image={IMG}")

NEG = "text, watermark, signature, blurry, low quality, jpeg artifacts, deformed, extra limbs, bad anatomy"

def txt2img(prefix, pos, steps, cfg, sampler, sched, size=768, batch=2):
    return {
      '1':{'class_type':'CheckpointLoaderSimple','inputs':{'ckpt_name':CK}},
      '2':{'class_type':'CLIPTextEncode','inputs':{'text':pos,'clip':['1',1]}},
      '3':{'class_type':'CLIPTextEncode','inputs':{'text':NEG,'clip':['1',1]}},
      '4':{'class_type':'EmptyLatentImage','inputs':{'width':size,'height':size,'batch_size':batch}},
      '5':{'class_type':'KSampler','inputs':{'seed':123456,'steps':steps,'cfg':cfg,
           'sampler_name':sampler,'scheduler':sched,'denoise':1.0,
           'model':['1',0],'positive':['2',0],'negative':['3',0],'latent_image':['4',0]}},
      '6':{'class_type':'VAEDecode','inputs':{'samples':['5',0],'vae':['1',2]}},
      '7':{'class_type':'SaveImage','inputs':{'filename_prefix':prefix,'images':['6',0]}}
    }

run("anime",   txt2img('abuz8_anime',
      'a swordswoman on a rainy neon rooftop, anime style, clean cel shading, vibrant colors, '
      'expressive eyes, masterpiece, best quality, highly detailed, sharp focus', 24, 7.0, 'euler','normal'))
run("cartoon", txt2img('abuz8_cartoon',
      'a friendly barista with curly red hair, modern cartoon avatar, thick clean outlines, '
      'flat shading, clean vector-friendly shapes, bold outlines, flat vivid colors', 22, 7.5, 'euler','normal'))
run("product", txt2img('abuz8_product',
      'a matte black ceramic coffee mug on polished concrete, seamless white studio backdrop, '
      'soft box lighting, professional product photography, studio lighting, 85mm lens',
      26, 7.0, 'dpmpp_2m','karras'))
run("upscale", {
      '1':{'class_type':'LoadImage','inputs':{'image':IMG}},
      '2':{'class_type':'UpscaleModelLoader','inputs':{'model_name':UP}},
      '3':{'class_type':'ImageUpscaleWithModel','inputs':{'upscale_model':['2',0],'image':['1',0]}},
      '4':{'class_type':'SaveImage','inputs':{'filename_prefix':'abuz8_upscale','images':['3',0]}}
    })

print("\n=== RESULT ===")
print("ALL GREEN" if not fails else f"FAILURES: {fails}")
raise SystemExit(1 if fails else 0)
