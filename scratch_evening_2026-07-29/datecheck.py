import sys, io, os, json, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
SITE = r"E:\ABU\abuz8ai-site"
rows = json.load(open(os.path.join(SITE, "scratch_evening_2026-07-29", "posts.json"), encoding='utf-8'))

nodate = [r for r in rows if not r["date"]]
print("posts without JSON-LD date:", len(nodate))
for r in nodate[:15]:
    md = datetime.date.fromtimestamp(r["mtime"]).isoformat()
    print(f"  {r['slug'][:45]:45s} mtime={md}")

# date range of those WITH dates
dated = sorted([r["date"] for r in rows if r["date"]])
print("dated range:", dated[0], "->", dated[-1])
