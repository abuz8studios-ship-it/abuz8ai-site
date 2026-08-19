import os, re, sys, difflib, json
io = sys.stdout
SITE = r"E:\ABU\abuz8ai-site"
TOOLS = os.path.join(SITE, "tools")
BLOG = os.path.join(SITE, "blog")
FALLBACK = "ai-waiting-list-page"

real = {f[:-5] for f in os.listdir(TOOLS) if f.endswith(".html")}
pat = re.compile(r'href="(?:\.\./|/)tools/([A-Za-z0-9_-]+)\.html([^"]*)"')

# collect dead slugs
dead = {}
for fn in os.listdir(BLOG):
    if not fn.endswith(".html"): continue
    p = os.path.join(BLOG, fn)
    txt = open(p, encoding="utf-8").read()
    for m in pat.finditer(txt):
        slug = m.group(1)
        if slug not in real:
            dead.setdefault(slug, {"count":0, "files":set()})
            dead[slug]["count"] += 1
            dead[slug]["files"].add(fn)

def best_match(slug):
    m = difflib.get_close_matches(slug, real, n=1, cutoff=0.6)
    if m: return m[0], "fuzzy"
    # token overlap fallback
    st = set(slug.split("-"))
    best, score = None, 0.0
    for r in real:
        rt = set(r.split("-"))
        s = len(st & rt) / max(len(st | rt), 1)
        if s > score: best, score = r, s
    if best and score >= 0.5: return best, "token"
    return FALLBACK, "FALLBACK"

mapping = {s: best_match(s) for s in dead}

print("=== MAPPING ===")
for s, (t, how) in sorted(mapping.items()):
    d = dead[s]
    print(f"{s} -> {t} [{how}] x{d['count']} in {sorted(d['files'])}")

# rewrite
changed = set()
def repl(m):
    slug = m.group(1)
    if slug in mapping:
        return f'href="/tools/{mapping[slug][0]}.html{m.group(2)}"'
    return m.group(0)

for fn in os.listdir(BLOG):
    if not fn.endswith(".html"): continue
    p = os.path.join(BLOG, fn)
    txt = open(p, encoding="utf-8").read()
    new = pat.sub(repl, txt)
    if new != txt:
        open(p, "w", encoding="utf-8", newline="").write(new)
        changed.add(fn)

print(f"=== FILES CHANGED: {len(changed)} ===")

# verify
remaining = []
for fn in os.listdir(BLOG):
    if not fn.endswith(".html"): continue
    txt = open(os.path.join(BLOG, fn), encoding="utf-8").read()
    for m in pat.finditer(txt):
        if m.group(1) not in real:
            remaining.append((fn, m.group(1)))
print(f"=== REMAINING DEAD: {len(remaining)} ===")
for r in remaining: print(r)
