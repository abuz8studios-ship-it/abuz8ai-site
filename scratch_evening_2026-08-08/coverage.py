# -*- coding: utf-8 -*-
# Verify sitemap coverage claim at the NEW live total, this run. Site figures only.
import sys, io, os, re, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="ignore")
SITE = r"E:\ABU\abuz8ai-site"

sm = open(os.path.join(SITE,"sitemap.xml"),encoding="utf-8",errors="ignore").read()
locs = re.findall(r"<loc>(.*?)</loc>", sm)
# extensionless URLs -> normalize to slug for blog & tools
def slugs(prefix):
    out=set()
    for l in locs:
        m = re.search(r"/%s/([^/<]+)$"%prefix, l)
        if m: out.add(m.group(1))
    return out
sm_blog = slugs("blog")
sm_tools = slugs("tools")

disk_blog = set(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(SITE,"blog","*.html"))
                if ".bak" not in f.lower() and os.path.basename(f).lower()!="index.html")
disk_tools = set(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(SITE,"tools","*.html"))
                 if ".bak" not in f.lower())

print("sitemap total <loc>:", len(locs))
print("blog  : disk", len(disk_blog), "| sitemap", len(sm_blog),
      "| disk-not-in-sm", len(disk_blog-sm_blog), "| sm-not-on-disk", len(sm_blog-disk_blog))
print("  blog disk-not-in-sitemap sample:", sorted(disk_blog-sm_blog)[:8])
print("tools : disk", len(disk_tools), "| sitemap", len(sm_tools),
      "| disk-not-in-sm", len(disk_tools-sm_tools), "| sm-not-on-disk", len(sm_tools-disk_tools))
print("  tools disk-not-in-sitemap sample:", sorted(disk_tools-sm_tools)[:8])

# product pages
disk_prod = set(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(SITE,"products","*.html"))
                if ".bak" not in f.lower())
print("products on disk:", len(disk_prod))
print("DONE")
