import sys, io, os, re, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
SITE = r"E:\ABU\abuz8ai-site"
BLOG = os.path.join(SITE, "blog")
NEW = os.path.join(SITE, "scratch_evening_2026-07-29", "index_new.html")
s = open(NEW, encoding='utf-8').read()

# real cards = anchor tags with class="post"
anchors = re.findall(r'<a href="/blog/([^"#?]+?)\.html" class="post"', s)
print("anchor cards       :", len(anchors))
print("distinct slugs     :", len(set(anchors)))
dups = [x for x in set(anchors) if anchors.count(x) > 1]
print("duplicate slugs    :", len(dups), dups[:5])

# every href resolves to a real on-disk file?
missing = [sl for sl in set(anchors) if not os.path.exists(os.path.join(BLOG, sl + ".html"))]
print("hrefs w/o disk file:", len(missing), missing[:5])

# tag balance
print("<a ... > opens     :", s.count('<a '))
print("</a> closes        :", s.count('</a>'))
print("post-title divs    :", s.count('class="post-title"'))
print("post-desc divs     :", s.count('class="post-desc"'))

# structure guards
print("ends </html>       :", s.rstrip().endswith("</html>"))
print("has <div id=post-list>:", 'id="post-list"' in s)
print("has <div id=pager> :", 'id="pager"' in s)
print("has search box     :", 'id="blog-search"' in s)
print("has prefers-reduced-motion:", 'prefers-reduced-motion' in s)
print("footer QADIR link  :", '/qadir.html' in s)
print("_blog-shared.js    :", '/blog/_blog-shared.js' in s)
print("abuz8-intent.js    :", 'abuz8-intent.js' in s)

# coverage vs disk
disk = {os.path.basename(f)[:-5] for f in os.listdir(BLOG)
        if f.endswith('.html') and f != 'index.html' and '.bak' not in f}
covered = set(anchors)
print("disk posts         :", len(disk))
print("covered            :", len(covered))
print("on disk NOT covered:", len(disk - covered), sorted(disk - covered)[:8])
print("covered NOT on disk:", len(covered - disk), sorted(covered - disk)[:8])
