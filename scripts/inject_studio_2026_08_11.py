# -*- coding: utf-8 -*-
"""Inject the shared ComfyStudio into canonical -pro tool pages.

Safety rules encoded here (from ERRORS.md 2026-08-11 'built into a slug that 301s away'):
  1. Refuse to edit a file whose slug is a redirect SOURCE in _redirects.
  2. Refuse to edit a file whose own <link rel=canonical> points at a different slug.
  3. Always write a .bak before touching anything.
  4. Never introduce a 'Buy Now'; the CTA stays 'Join Early Access'.
"""
import os, re, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio_configs_2026_08_11 import CONFIGS

SITE = r"E:\ABU\abuz8ai-site"
TOOLS = os.path.join(SITE, "tools")
STAMP = "2026-08-11-studio"

MOUNT_BLOCK = """
<!-- ABUZ8 LIVE STUDIO (injected {stamp}) -->
<section id="abuz8-studio-section" style="padding:56px 0 8px">
  <div style="max-width:1180px;margin:0 auto;padding:0 20px">
    <h2 style="font:800 clamp(24px,3.2vw,34px)/1.15 Playfair Display,Georgia,serif;
               color:var(--text,#e8e4d8);margin:0 0 10px">Live Studio</h2>
    <p style="font:400 15px/1.65 Inter,system-ui,sans-serif;color:var(--dim,#8a9aaa);
              max-width:70ch;margin:0 0 26px">
      This runs on <strong style="color:var(--text,#e8e4d8)">your own machine</strong>, not our servers.
      If ComfyUI is running locally on port 8188 you get the full studio below and your images
      never leave your computer. If it is not, you will see Early Access instead &mdash;
      we never show a spinner that is not doing anything.
    </p>
  </div>
  <div id="abuz8-studio"></div>
</section>
<script src="_comfy-client.js"></script>
<script src="_comfy-studio.js"></script>
<script>
(function () {{
  function boot() {{
{config}  }}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}})();
</script>
<!-- /ABUZ8 LIVE STUDIO -->
"""

def redirect_sources():
    src = set()
    for ln in open(os.path.join(SITE, "_redirects"), encoding="utf-8", errors="replace"):
        p = ln.split()
        if len(p) >= 2 and p[0].startswith("/"):
            src.add(p[0].rstrip("/"))
    return src

def main():
    reds = redirect_sources()
    ok, skipped = [], []

    for fname, cfg in CONFIGS.items():
        fp = os.path.join(TOOLS, fname)
        slug = "/tools/" + fname[:-5]

        if not os.path.exists(fp):
            skipped.append((fname, "MISSING ON DISK")); continue
        if slug in reds or slug + ".html" in reds:
            skipped.append((fname, "SLUG IS A REDIRECT SOURCE -> refuse")); continue

        t = open(fp, encoding="utf-8", errors="replace").read()

        m = re.search(r'rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', t)
        if m:
            canon = m.group(1).rstrip("/").split("abuz8ai.com")[-1]
            if canon != slug:
                skipped.append((fname, f"CANONICAL POINTS ELSEWHERE -> {canon}")); continue
        if "_comfy-studio.js" in t:
            skipped.append((fname, "already wired")); continue
        if "Buy Now" in t:
            skipped.append((fname, "contains 'Buy Now' -> refuse (CTA rule)")); continue

        bak = fp + ".bak-" + STAMP
        if not os.path.exists(bak):
            shutil.copy2(fp, bak)

        block = MOUNT_BLOCK.format(stamp=STAMP, config=cfg)
        i = t.rfind("</body>")
        if i == -1:
            skipped.append((fname, "no </body>")); continue
        new = t[:i] + block + "\n" + t[i:]
        open(fp, "w", encoding="utf-8").write(new)
        ok.append((fname, len(t), len(new)))

    print("=== INJECTED ===")
    for f, a, b in ok:
        print(f"  {f:34s} {a:7d} -> {b:7d} B  (+{b-a})")
    print("=== SKIPPED ===")
    for f, why in skipped:
        print(f"  {f:34s} {why}")
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
