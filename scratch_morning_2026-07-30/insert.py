# -*- coding: utf-8 -*-
import re, os, shutil, datetime
site="/sessions/quirky-festive-thompson/mnt/ABU/abuz8ai-site"
scr=os.path.join(site,"scratch_morning_2026-07-30")
fp=os.path.join(site,"tools.html")
src=open(fp,encoding="utf-8").read()

# backup first
bak=fp+".bak-2026-07-30-hublink"
if not os.path.exists(bak):
    shutil.copyfile(fp,bak)
print("backup:",os.path.basename(bak))

before_cards = src.count('<a class="tool"')
print("cards before:", before_cards)

# category heading text -> cards file
sections = [
 ("Image & Video Studio","cards_studio.html"),
 ("Business & Strategy","cards_biz.html"),
 ("Developer Tools","cards_dev.html"),
 ("Free Utilities","cards_util.html"),
 ("Life & Learning","cards_life.html"),
]

def insert_into_section(text, h2, cards_html):
    # find the <section class="cat"> whose <h2> equals h2, then its <div class="grid"> ... closing </div>
    # locate heading
    hidx = text.find(f"<h2>{h2}</h2>")
    if hidx<0:
        # try unescaped
        raise SystemExit(f"HEADING NOT FOUND: {h2}")
    # find the grid opening after heading
    gopen = text.find('<div class="grid">', hidx)
    if gopen<0: raise SystemExit(f"grid open not found for {h2}")
    # find matching close: the grid contains only <a class=tool> blocks then </div>. Walk to the
    # first "      </div>\n    </section>" after gopen — grids close with that pattern.
    m = re.search(r'\n      </div>\n    </section>', text[gopen:])
    if not m: raise SystemExit(f"grid close not found for {h2}")
    close_at = gopen + m.start()  # position of the "\n      </div>..." (start of newline)
    ins = "\n" + cards_html.rstrip("\n")
    return text[:close_at] + ins + text[close_at:]

for h2, cf in sections:
    cards = open(os.path.join(scr,cf),encoding="utf-8").read()
    src = insert_into_section(src, h2, cards)

after_cards = src.count('<a class="tool"')
print("cards after:", after_cards, "(+%d)"%(after_cards-before_cards))
assert after_cards-before_cards==54, "card delta != 54"

# update the visible counts 91 -> 180 (three places: meta desc x2, .count div)
src2 = src.replace('91 AI tools','180 AI tools').replace('91 honest AI tools','180 honest AI tools').replace('>91 tools live<','>180 tools live<')
# report which replacements hit
for needle,rep in [('180 AI tools','meta description'),('180 honest AI tools','og:description'),('>180 tools live<','count pill')]:
    print("count updated in", rep, ":", needle in src2)
src = src2

# well-formedness: balanced <a>/</a>, <div>/</div>, <section>/</section>, ends with </html>
def cnt(s,p): return len(re.findall(p,s))
print("open <a>:",cnt(src,r'<a\b'),"close </a>:",cnt(src,r'</a>'))
print("open <section:",cnt(src,r'<section\b'),"close </section>:",cnt(src,r'</section>'))
assert src.rstrip().endswith("</html>"), "does not end with </html>"

open(fp,"w",encoding="utf-8").write(src)
print("WROTE tools.html", len(src), "bytes")
