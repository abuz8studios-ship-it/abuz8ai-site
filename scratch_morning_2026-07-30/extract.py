import re, json, os, html
site = "/sessions/quirky-festive-thompson/mnt/ABU/abuz8ai-site"
scr = os.path.join(site, "scratch_morning_2026-07-30")
missing = [l.strip() for l in open(os.path.join(scr,"missing.txt")) if l.strip()]
linked = set(l.strip() for l in open(os.path.join(scr,"linked.txt")) if l.strip())

def grab(slug):
    fp = os.path.join(site,"tools",slug+".html")
    try:
        t = open(fp, encoding="utf-8", errors="replace").read()
    except FileNotFoundError:
        return None
    title = ""
    m = re.search(r"<title>(.*?)</title>", t, re.S|re.I)
    if m: title = html.unescape(m.group(1)).strip()
    desc = ""
    m = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', t, re.S|re.I)
    if not m:
        m = re.search(r'<meta[^>]+content=["\'](.*?)["\'][^>]+name=["\']description["\']', t, re.S|re.I)
    if m: desc = html.unescape(m.group(1)).strip()
    # h1
    h1=""
    m = re.search(r"<h1[^>]*>(.*?)</h1>", t, re.S|re.I)
    if m: h1 = re.sub(r"<[^>]+>","",html.unescape(m.group(1))).strip()
    return {"slug":slug,"title":title,"desc":desc,"h1":h1,"bytes":len(t)}

out=[]
for s in missing:
    d = grab(s)
    if d: out.append(d)

json.dump(out, open(os.path.join(scr,"meta.json"),"w"), indent=1)
print("extracted", len(out), "of", len(missing))
# print compact table for eyeballing
for d in out:
    title = d["title"].replace(" — ABUZ8 AI","").replace(" | ABUZ8","").strip()
    print(f'{d["slug"]:38} | {title[:60]}')
