import sys, io, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
SITE = r"E:\ABU\abuz8ai-site"
NEW = os.path.join(SITE, "scratch_evening_2026-07-29", "index_new.html")
s = open(NEW, encoding='utf-8').read()
# non-card anchors: strip all card blocks, inspect remainder
non = re.sub(r'<a href="/blog/[^"]+?\.html" class="post"[^>]*>.*?</a>', '', s, flags=re.S)
opens = re.findall(r'<a\b[^>]*>', non)
closes = non.count('</a>')
print("non-card <a> opens:", len(opens))
print("non-card </a>     :", closes)
for o in opens:
    print("  OPEN:", o[:90])
# is the 'window.scrollTo' JS false-positive? check for '<a ' inside <script>
scr = re.search(r'<script>(.*?)</script>', s, re.S)
print("'<a ' occurs in inline JS?:", ("<a " in (scr.group(1) if scr else "")))
