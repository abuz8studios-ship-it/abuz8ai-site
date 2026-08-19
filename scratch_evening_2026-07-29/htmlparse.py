import sys, io, os
from html.parser import HTMLParser
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
SITE = r"E:\ABU\abuz8ai-site"
NEW = os.path.join(SITE, "scratch_evening_2026-07-29", "index_new.html")
s = open(NEW, encoding='utf-8').read()

VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
stack = []
errs = []
class P(HTMLParser):
    def handle_starttag(self, tag, attrs):
        if tag not in VOID: stack.append(tag)
    def handle_endtag(self, tag):
        if tag in VOID: return
        # pop to matching (lenient: allow implicit closes)
        if tag in stack:
            while stack and stack[-1] != tag: stack.pop()
            if stack: stack.pop()
        else:
            errs.append("stray </%s>" % tag)
p = P(convert_charrefs=True)
p.feed(s)
print("unclosed at EOF:", stack[-6:] if stack else "(none)")
print("stray end tags :", len(errs), errs[:5])
print("script tags open:", s.count('<script'), "close:", s.count('</script>'))
print("style open:", s.count('<style'), "close:", s.count('</style>'))
print("div open:", s.count('<div'), "div close:", s.count('</div>'))
print("PARSE OK (no crash), residual stack depth:", len(stack))
