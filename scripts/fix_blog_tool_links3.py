import os, re
BLOG = r"E:\ABU\abuz8ai-site\blog"
# revert collateral: (file, current_wrong, anchor_keyword, correct)
rules = {
 "ai-agent-for-contractors.html": [("ai-cold-dm-templates","signature","ai-email-signature")],
 "ai-email-signature-generator.html": [("ai-cold-dm-templates","signature","ai-email-signature")],
 "ai-agent-for-hr.html": [("ai-waiting-list-page","description","ai-job-description-writer")],
 "ai-agent-for-staffing-agencies.html": [("ai-waiting-list-page","description","ai-job-description-writer")],
 "ai-job-description-writer.html": [("ai-waiting-list-page","description","ai-job-description-writer")],
 "ai-resume-builder-ats-friendly.html": [("ai-waiting-list-page","description","ai-job-description-writer")],
}
apat = re.compile(r'(<a\b[^>]*href=")/tools/([A-Za-z0-9_-]+)\.html([^"]*)("[^>]*>)(.*?)(</a>)', re.S)
tag = re.compile(r"<[^>]+>")
for fn, rl in rules.items():
    p = os.path.join(BLOG, fn)
    txt = open(p, encoding="utf-8").read()
    n = [0]
    def repl(m):
        slug = m.group(2); anchor = tag.sub(" ", m.group(5)).lower()
        for wrong, kw, right in rl:
            if slug == wrong and kw in anchor:
                n[0] += 1
                return f'{m.group(1)}/tools/{right}.html{m.group(3)}{m.group(4)}{m.group(5)}{m.group(6)}'
        return m.group(0)
    new = apat.sub(repl, txt)
    if new != txt:
        open(p, "w", encoding="utf-8", newline="").write(new)
    print(fn, "reverted:", n[0])
