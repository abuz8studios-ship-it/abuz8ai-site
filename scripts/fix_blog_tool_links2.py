import os, re
SITE = r"E:\ABU\abuz8ai-site"
BLOG = os.path.join(SITE, "blog")
FB = "ai-waiting-list-page"
# (wrong_current_target, keyword_in_anchor_lowercase) -> correct target
rules = [
    ("ai-board-deck-generator", "ad copy", "ai-ad-copy"),
    ("ai-okr-generator", "book", "ai-book-summary"),
    ("cron-generator", "cartoon", "ai-cartoon"),
    ("ai-roast-my-website", "chatbot", "ai-chatbot-agency"),
    ("ai-email-signature", "email", "ai-cold-dm-templates"),
    ("ai-hashtag-generator", "headshot", "ai-headshot"),
    ("ai-bio-writer", "email", "ai-cold-dm-templates"),
    ("ai-slogan-generator", "meta", "ai-seo-meta"),
    ("ai-slogan-generator", "seo", "ai-seo-meta"),
    ("ai-pr-description-generator", "product description", FB),
    ("ai-pr-description-generator", "caption", "ai-social-caption"),
    ("ai-sql-generator", "subtitle", FB),
    ("ai-terms-of-service-generator", "speech", FB),
    ("ai-terms-of-service-generator", "voice", FB),
    ("ai-budget-planner", "workout", "ai-workout-generator"),
    ("ai-job-description-writer", "script", FB),
    ("ai-hashtag-generator", "extract", FB),
]
apat = re.compile(r'(<a\b[^>]*href=")/tools/([A-Za-z0-9_-]+)\.html([^"]*)("[^>]*>)(.*?)(</a>)', re.S)
tag = re.compile(r"<[^>]+>")
fixes = {}
for fn in sorted(os.listdir(BLOG)):
    if not fn.endswith(".html"): continue
    p = os.path.join(BLOG, fn)
    txt = open(p, encoding="utf-8").read()
    def repl(m):
        slug = m.group(2)
        anchor = tag.sub(" ", m.group(5)).lower()
        for wrong, kw, right in rules:
            if slug == wrong and kw in anchor and right != slug:
                fixes.setdefault((fn, slug, right, kw), 0)
                fixes[(fn, slug, right, kw)] += 1
                return f'{m.group(1)}/tools/{right}.html{m.group(3)}{m.group(4)}{m.group(5)}{m.group(6)}'
        return m.group(0)
    new = apat.sub(repl, txt)
    if new != txt:
        open(p, "w", encoding="utf-8", newline="").write(new)
print("=== CORRECTIONS ===")
for (fn, wrong, right, kw), n in sorted(fixes.items()):
    print(f"{fn}: {wrong} -> {right} (kw={kw}) x{n}")
print(f"total corrections: {sum(fixes.values())} in {len({k[0] for k in fixes})} files")
