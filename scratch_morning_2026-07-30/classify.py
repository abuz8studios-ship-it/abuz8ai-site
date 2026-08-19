import json, os, re
scr = "/sessions/quirky-festive-thompson/mnt/ABU/abuz8ai-site/scratch_morning_2026-07-30"
meta = {d["slug"]:d for d in json.load(open(os.path.join(scr,"meta.json")))}
linked = set(l.strip() for l in open(os.path.join(scr,"linked.txt")) if l.strip())

def fam(slug):
    # strip trailing variant markers to get a family key
    s = slug
    s = re.sub(r'-(pro|generator|maker|art|avatar|builder)s?$','',s)
    # normalize plural
    s = re.sub(r'(character)s$', r'\1', s)
    return s

# Build family -> set of linked slugs
linked_fams = {}
for l in linked:
    linked_fams.setdefault(fam(l), set()).add(l)

# For each missing slug: is its family already represented on the hub?
dup, netnew = [], []
for s in sorted(meta):
    f = fam(s)
    # direct family overlap OR base name overlap
    already = False
    for lf, lslugs in linked_fams.items():
        if lf == f or f in lf or lf in f:
            already = True; break
    (dup if already else netnew).append((s,f))

print("=== LIKELY DUPLICATE of an already-linked tool (",len(dup),") — will NOT add ===")
for s,f in dup: print(f"  {s:34} (family: {f})")
print()
print("=== GENUINELY NEW / UNREPRESENTED (",len(netnew),") — CANDIDATES to add ===")
for s,f in netnew:
    t = meta[s]["title"].split("—")[0].split("|")[0].split(" - ")[0].strip()
    print(f"  {s:34} | {t[:55]}")
json.dump({"dup":[s for s,_ in dup],"netnew":[s for s,_ in netnew]}, open(os.path.join(scr,"classified.json"),"w"), indent=1)
