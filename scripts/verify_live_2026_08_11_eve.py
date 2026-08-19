# -*- coding: utf-8 -*-
"""Leg 3: verify the deployed edge actually serves the new studio.
Cloudflare 403s bare urllib UA -> always use a browser UA (ERRORS.md 2026-08-11)."""
import os, urllib.request, urllib.error

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
BASE = "https://abuz8ai.com"
TOOLS = r"E:\ABU\abuz8ai-site\tools"

def get(url):
    r = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=45)
    return r.getcode(), r.read().decode("utf-8", "replace"), r.geturl()

fails = []

print("=== shared runtime files ===")
for js in ["_comfy-client.js", "_comfy-studio.js"]:
    try:
        c, b, _ = get(f"{BASE}/tools/{js}")
        disk = os.path.getsize(os.path.join(TOOLS, js))
        match = len(b.encode()) == disk
        print(f"  {js:20s} {c}  live={len(b.encode())}B disk={disk}B  match={match}")
        if c != 200 or not match: fails.append(js)
    except Exception as e:
        print(f"  {js:20s} ERROR {e}"); fails.append(js)

print("\n=== studio pages ===")
for slug in ["ai-anime-art-pro", "ai-cartoon-pro", "ai-product-photos-pro", "ai-image-upscaler-pro"]:
    try:
        c, b, final = get(f"{BASE}/tools/{slug}")
        checks = {
            "200":        c == 200,
            "studio.js":  "_comfy-studio.js" in b,
            "client.js":  "_comfy-client.js" in b,
            "mount":      'id="abuz8-studio"' in b,
            "ComfyStudio":"new ComfyStudio(" in b,
            "EarlyAccess":"Early Access" in b,
            "noBuyNow":   "Buy Now" not in b,
        }
        bad = [k for k, v in checks.items() if not v]
        print(f"  {slug:26s} {c} {len(b.encode()):7d}B  "
              f"{len(checks)-len(bad)}/{len(checks)}" + (f"  FAIL:{bad}" if bad else "  ALL PASS"))
        if bad: fails.append(slug)
    except Exception as e:
        print(f"  {slug:26s} ERROR {e}"); fails.append(slug)

print("\n=== regression: previously-shipped logo studio still intact ===")
try:
    c, b, _ = get(f"{BASE}/tools/ai-logo-generator-pro")
    ok = c == 200 and "_comfy-client.js" in b and "Early Access" in b and "Buy Now" not in b
    print(f"  ai-logo-generator-pro      {c}  intact={ok}")
    if not ok: fails.append("logo regression")
except Exception as e:
    print("  ERROR", e); fails.append("logo")

print("\n=== RESULT ===")
print("LIVE EDGE ALL GREEN" if not fails else f"FAILURES: {fails}")
raise SystemExit(1 if fails else 0)
