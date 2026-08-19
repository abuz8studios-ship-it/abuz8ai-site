import sys, io, os, re, json, html, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SITE = r"E:\ABU\abuz8ai-site"
BLOG = os.path.join(SITE, "blog")
POSTS = os.path.join(SITE, "scratch_evening_2026-07-29", "posts.json")
OUT = os.path.join(SITE, "scratch_evening_2026-07-29", "index_new.html")

rows = json.load(open(POSTS, encoding='utf-8'))

# sort key: explicit date desc, else mtime desc. Build a comparable epoch.
def sortkey(r):
    if r["date"]:
        try:
            d = datetime.date.fromisoformat(r["date"])
            return d.toordinal() * 100000 + 50000  # dated posts anchored at noon-ordinal
        except Exception:
            pass
    # mtime fallback -> ordinal-ish
    return int(r["mtime"] // 86400) * 100000

rows.sort(key=sortkey, reverse=True)

def disp_date(r):
    if r["date"]:
        try:
            return datetime.date.fromisoformat(r["date"]).strftime("%B %-d, %Y")
        except Exception:
            pass
    return datetime.date.fromtimestamp(r["mtime"]).strftime("%B %-d, %Y")

# python on windows: %-d not supported -> emulate
def fmt(d):
    return f"{d.strftime('%B')} {d.day}, {d.year}"

def disp_date2(r):
    if r["date"]:
        try: return fmt(datetime.date.fromisoformat(r["date"]))
        except Exception: pass
    return fmt(datetime.date.fromtimestamp(r["mtime"]))

def esc(t):
    # match the site's own &#x27; convention for apostrophes; escape &,<,>," and '
    t = html.escape(t, quote=True)  # & < > " '
    t = t.replace("&#x27;", "&#x27;")  # already
    return t

print("posts to render:", len(rows))
print("newest:", rows[0]["slug"], disp_date2(rows[0]))
print("oldest:", rows[-1]["slug"], disp_date2(rows[-1]))
json.dump([{**r, "disp": disp_date2(r)} for r in rows],
          open(os.path.join(SITE,"scratch_evening_2026-07-29","posts_sorted.json"),"w",encoding='utf-8'))
print("wrote posts_sorted.json")
