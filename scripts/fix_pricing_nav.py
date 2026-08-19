#!/usr/bin/env python3
"""
fix_pricing_nav.py — repair the dead `/#pricing` nav item on 12 tool pages.

STAGED 2026-08-10 by the morning shift. NOT applied autonomously: CLAUDE.md
names global nav / shared header edits as a wide-blast-radius change to defer
to Ahmad. This script exists so applying it is one command, not one session.

WHAT IS WRONG
    12 tool pages carry  <a href="/#pricing">Pricing</a>  in their nav.
    index.html has NO id="pricing" — verified 2026-08-10. The link lands the
    visitor on the homepage with nothing highlighted.

WHY /store.html IS THE RIGHT TARGET
    47 other tool pages already link to /store.html. This conforms the 12
    outliers to the existing majority pattern; it does not introduce a new
    monetisation surface.

    Dry run  : python scripts/fix_pricing_nav.py
    Apply    : python scripts/fix_pricing_nav.py --apply
    Revert   : copy each  <file>.bak-YYYY-MM-DD-pricingnav  back over <file>
"""

import datetime
import glob
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD = 'href="/#pricing"'
NEW = 'href="/store.html"'


def main():
    apply = "--apply" in sys.argv
    stamp = datetime.date.today().isoformat()

    # Sanity gates BEFORE touching anything.
    index = open(os.path.join(ROOT, "index.html"), encoding="utf-8",
                 errors="replace").read()
    if re.search(r'id=["\']pricing["\']', index, re.I):
        print("ABORT: index.html now HAS id=\"pricing\" — the link is no longer "
              "dead. Re-audit before running this.")
        return 2
    if not os.path.isfile(os.path.join(ROOT, "store.html")):
        print("ABORT: store.html does not exist — refusing to point 12 pages at it.")
        return 2

    targets = []
    for path in sorted(glob.glob(os.path.join(ROOT, "tools", "*.html"))):
        if ".bak" in path:
            continue
        src = open(path, encoding="utf-8", errors="replace").read()
        if OLD in src:
            targets.append((path, src, src.count(OLD)))

    print("dead /#pricing nav links: %d file(s)" % len(targets))
    for path, _src, n in targets:
        print("  %-52s x%d" % (os.path.relpath(path, ROOT).replace("\\", "/"), n))

    if not apply:
        print("\nDRY RUN — nothing written. Re-run with --apply to write.")
        print("Change per file: %s  ->  %s" % (OLD, NEW))
        return 0

    changed = 0
    for path, src, n in targets:
        shutil.copy2(path, "%s.bak-%s-pricingnav" % (path, stamp))
        new_src = src.replace(OLD, NEW)
        # The edit must change nothing but the href token.
        assert new_src.count("<a ") == src.count("<a ")
        assert new_src.count("</a>") == src.count("</a>")
        assert new_src.replace(NEW, OLD) == src, "edit was not href-only"
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(new_src)
        changed += 1

    # Re-verify from disk, independent of the loop above.
    remaining = sum(
        1 for p in glob.glob(os.path.join(ROOT, "tools", "*.html"))
        if ".bak" not in p
        and OLD in open(p, encoding="utf-8", errors="replace").read()
    )
    print("\nAPPLIED to %d file(s). Remaining dead /#pricing: %d" % (changed, remaining))
    print("Then deploy:")
    print("  npx wrangler pages deploy . --project-name=abuz8ai "
          "--commit-dirty=true --branch=main")
    return 0 if remaining == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
