# -*- coding: utf-8 -*-
# Body-verify the 7 posts + sitemap are LIVE (not homepage shell). One retry/page.
import sys, io, time, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="ignore")

SLUGS = ["plumbers","electricians","roofers","landscapers",
         "auto-repair-shops","pest-control","cleaning-services"]
# distinctive phrase expected in each post body (from og:title, lowercased)
NEEDLE = {
    "plumbers": "answer every call",
    "electricians": "keep the judgment",
    "roofers": "storm leads",
    "landscapers": "keep the crew moving",
    "auto-repair-shops": "fill the bays",
    "pest-control": "recurring accounts",
    "cleaning-services": "rebook it",
}

def fetch(url):
    req = urllib.request.Request(url, headers={
        "Cache-Control": "no-cache", "Pragma": "no-cache",
        "User-Agent": "abuz8-verify/1.0",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.read().decode("utf-8", "ignore")

print("=== BODY-VERIFY 7 POSTS (live) ===")
ok = 0
for s in SLUGS:
    url = f"https://abuz8ai.com/blog/ai-agent-for-{s}.html?cb={int(time.time())}"
    good = False
    for attempt in (1, 2):
        try:
            st, body = fetch(url)
            has = NEEDLE[s] in body.lower()
            size = len(body)
            shell = (30000 < size < 60000) and ("ai spaceport" in body.lower() and not has)
            if st == 200 and has:
                print(f"[LIVE] {s}: 200, {size}B, phrase OK (try {attempt})")
                good = True; break
            else:
                print(f"[..] {s}: st={st} {size}B phrase={has} shell~{shell} (try {attempt})")
        except Exception as e:
            print(f"[ERR] {s}: {e} (try {attempt})")
        if attempt == 1:
            time.sleep(50)
    if good: ok += 1
print(f"POSTS LIVE: {ok}/7")

# sitemap loc count live
try:
    st, sm = fetch(f"https://abuz8ai.com/sitemap.xml?cb={int(time.time())}")
    n = sm.count("<loc>")
    present = sum(1 for s in SLUGS if f"ai-agent-for-{s}<" in sm or f"ai-agent-for-{s}</loc>" in sm)
    print(f"SITEMAP live: status {st}, {n} locs, {present}/7 new slugs present")
except Exception as e:
    print("SITEMAP live ERR:", e)
print("DONE.")
