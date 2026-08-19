# -*- coding: utf-8 -*-
import sys, io, os, re, glob, subprocess, urllib.request, ssl, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="ignore")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="ignore")

SITE = r"E:\ABU\abuz8ai-site"
def p(*a): print(*a, flush=True)

p("=== DISK TRUTH ===")
tools = [f for f in glob.glob(os.path.join(SITE,"tools","*.html"))
         if ".bak" not in os.path.basename(f).lower()
         and os.path.basename(f).lower() not in ("index.html",)]
# tools hub is tools.html at root, tool pages live in /tools/
tool_pages = [f for f in tools if os.path.basename(f).lower()!="_index.html"]
p("tool pages in /tools/*.html (excl .bak):", len(tool_pages))

blog = [f for f in glob.glob(os.path.join(SITE,"blog","*.html"))
        if ".bak" not in os.path.basename(f).lower()
        and os.path.basename(f).lower()!="index.html"]
p("blog posts /blog/*.html (excl index,bak):", len(blog))

ai_agent = [f for f in blog if os.path.basename(f).startswith("ai-agent-for-")]
p("ai-agent-for-* posts:", len(ai_agent))

# sitemap on disk
sm = os.path.join(SITE,"sitemap.xml")
disk_locs = 0
disk_slugs = set()
if os.path.exists(sm):
    t = open(sm,encoding="utf-8",errors="ignore").read()
    locs = re.findall(r"<loc>(.*?)</loc>", t)
    disk_locs = len(locs)
    for l in locs:
        m = re.search(r"/blog/([^/<]+?)\.html", l)
        if m: disk_slugs.add(m.group(1))
p("sitemap.xml disk <loc> count:", disk_locs)

# blog index cards on disk
bi = os.path.join(SITE,"blog","index.html")
if os.path.exists(bi):
    bt = open(bi,encoding="utf-8",errors="ignore").read()
    cards = re.findall(r'<a\s+href="/blog/([^"]+?)\.html"[^>]*class="post"', bt)
    p("blog/index.html cards (a href .. class=post):", len(cards))

# disk blog slugs
disk_blog_slugs = set(os.path.basename(f)[:-5] for f in blog)
# which disk posts are NOT in sitemap
missing_from_sitemap = sorted(disk_blog_slugs - disk_slugs)
p("disk blog posts NOT in disk sitemap:", len(missing_from_sitemap), missing_from_sitemap[:20])

p("\n=== LIVE STATE ===")
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
def fetch(url, cb=True):
    u = url + (("?cb=%d"%int(time.time())) if cb else "")
    req = urllib.request.Request(u, headers={"Cache-Control":"no-cache","User-Agent":"probe"})
    try:
        r = urllib.request.urlopen(req, timeout=25, context=ctx)
        return r.status, r.read()
    except Exception as e:
        return None, str(e).encode()
st, body = fetch("https://abuz8ai.com/")
p("home:", st, "bytes:", len(body) if body else 0)
shell_len = len(body) if body else 0
st2, sm_body = fetch("https://abuz8ai.com/sitemap.xml")
live_locs = len(re.findall(r"<loc>", sm_body.decode("utf-8","ignore"))) if sm_body else 0
p("live sitemap <loc>:", live_locs, " | disk sitemap:", disk_locs, " | GAP:", disk_locs-live_locs)

p("\n=== WRANGLER WHOAMI (on-box) ===")
try:
    r = subprocess.run("npx wrangler whoami", shell=True, capture_output=True, cwd=SITE, timeout=120)
    out = (r.stdout or b"").decode("utf-8","ignore") + (r.stderr or b"").decode("utf-8","ignore")
    authed = "wireconn1@gmail.com" in out or "OAuth" in out or "Account" in out
    p("whoami authed:", authed)
    for line in out.splitlines():
        if any(k in line for k in ["wireconn1","Account","email","Scope","pages"]):
            p("  ", line.strip()[:120])
except Exception as e:
    p("whoami error:", e)

p("\n=== PORTS ===")
import socket
for port in (8900,8188,11434,4200,18789,7734):
    s=socket.socket(socket.AF_INET,socket.SOCK_STREAM); s.settimeout(0.6)
    up = s.connect_ex(("127.0.0.1",port))==0; s.close()
    p("  :%d"%port, "UP" if up else "down")
p("\nDONE")
