import io, sys, os, subprocess, urllib.request, socket, ssl
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def hr(t): print("\n==== %s ====" % t)

hr("DISK SITEMAP")
sm = r"E:\ABU\abuz8ai-site\sitemap.xml"
disk_locs = 0
if os.path.exists(sm):
    with open(sm, encoding='utf-8') as f:
        disk_locs = f.read().count("<loc>")
print("disk sitemap.xml locs:", disk_locs)

tools_dir = r"E:\ABU\abuz8ai-site\tools"
blog_dir = r"E:\ABU\abuz8ai-site\blog"
def count_html(d):
    if not os.path.isdir(d): return -1
    return sum(1 for x in os.listdir(d) if x.endswith(".html") and ".bak" not in x and "-old" not in x)
print("disk tools *.html:", count_html(tools_dir))
print("disk blog  *.html:", count_html(blog_dir))

hr("LIVE SITEMAP")
ctx = ssl.create_default_context()
def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0","Cache-Control":"no-cache"})
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
        return r.status, r.read()
try:
    st, body = fetch("https://abuz8ai.com/sitemap.xml?cb=%d" % os.getpid())
    live_locs = body.decode("utf-8","ignore").count("<loc>")
    print("live sitemap status:", st, "locs:", live_locs)
    print("GAP (disk - live):", disk_locs - live_locs)
except Exception as e:
    print("live sitemap ERR:", e)

hr("BODY PROBE")
try:
    st, home = fetch("https://abuz8ai.com/?cb=%d" % os.getpid())
    shell_len = len(home)
    print("homepage shell bytes:", shell_len)
except Exception as e:
    shell_len = 0; print("home ERR:", e)

probes = [
    "https://abuz8ai.com/tools.html",
    "https://abuz8ai.com/blog/",
    "https://abuz8ai.com/store.html",
    "https://abuz8ai.com/pricing.html",
    "https://abuz8ai.com/qadir.html",
]
for u in probes:
    try:
        st, b = fetch(u + ("?cb=%d" % os.getpid()))
        tag = "SHELL?" if abs(len(b)-shell_len) < 200 else "REAL"
        print("%-45s %s %8d %s" % (u, st, len(b), tag))
    except Exception as e:
        print("%-45s ERR %s" % (u, e))

hr("PORTS")
for name, port in [("QADIR_CORE",8900),("ComfyUI",8188),("Ollama",11434),("Postiz",4200),("Zait",18789),("Bridge",7734),("Ornith",8011)]:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.settimeout(0.6)
    up = s.connect_ex(("127.0.0.1", port)) == 0
    s.close()
    print("%-12s :%-6d %s" % (name, port, "UP" if up else "DOWN"))

hr("WRANGLER WHOAMI")
try:
    p = subprocess.run(["npx","wrangler","whoami"], cwd=r"E:\ABU\abuz8ai-site",
                       capture_output=True, text=True, timeout=90, shell=True)
    out = (p.stdout or "") + (p.stderr or "")
    for line in out.splitlines():
        if any(k in line.lower() for k in ["account","email","oauth","token","scope","pages","logged","you are"]):
            print(line.strip()[:120])
    print("AUTHED" if ("pages" in out.lower() or "logged in" in out.lower() or "you are" in out.lower()) else "UNCLEAR")
except Exception as e:
    print("whoami ERR:", e)

print("\nDONE")
