import sys, io, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
SITE = r"E:\ABU\abuz8ai-site"
BLOG = os.path.join(SITE, "blog")
LIVE = os.path.join(BLOG, "index.html")
s = open(LIVE, encoding='utf-8').read()
anchors = re.findall(r'<a href="/blog/([^"#?]+?)\.html" class="post"', s)
print("LIVE index.html size:", len(s))
print("LIVE anchor cards   :", len(anchors))
print("LIVE distinct slugs :", len(set(anchors)))
print("LIVE ends </html>   :", s.rstrip().endswith("</html>"))
print("LIVE has pager      :", 'id="pager"' in s)
print("LIVE has search     :", 'id="blog-search"' in s)
missing = [sl for sl in set(anchors) if not os.path.exists(os.path.join(BLOG, sl + ".html"))]
print("LIVE hrefs w/o file :", len(missing))
# confirm newest + a deep-archive post both present
for probe in ["how-ai-agents-work","ai-agent-roi","free-ai-headshot-generator","agentic-loop-explained","sovereign-ai-stack"]:
    print("  present:", probe, ('/blog/'+probe+'.html" class="post"') in s)
# backup exists?
print("backup exists       :", os.path.exists(os.path.join(BLOG,"index.html.bak-2026-07-29-fullarchive")))
