# How to actually send the ABUZ8 emails (built 2026-08-02)

You already have the two pieces people think they need to go buy:
- **List** = your Cloudflare D1 `waitlist` table (live). As of 2026-08-02 it has **1 real signup** (cryptodeh@gmail.com); the other rows were internal link-checker/audit tests and are auto-filtered.
- **ESP** = **Resend**, which `functions/api/waitlist.js` is already coded for (it emails Ahmad on each new signup). Resend IS the email service. You do not need Mailchimp or a purchased list.

## The ONE thing only you can do (account ownership)
1. Make a free Resend account at https://resend.com (3,000 emails/mo free).
2. Add the domain `abuz8ai.com` and paste the DKIM/SPF DNS records it gives you into Cloudflare DNS (you own the zone).
3. Create an API key.
4. Give it to the site so the per-signup notifier turns on too:
   `cd E:\ABU\abuz8ai-site && npx wrangler pages secret put RESEND_API_KEY --project-name=abuz8ai`

## Then sending is one command (already built + tested)
```
cd E:\ABU\abuz8ai-site
# DRY RUN first (shows recipients, sends nothing):
node send-broadcast.mjs --template=email-templates/weekly-2026-08-02.html --subject="ABUZ8 Weekly"
# LIVE (needs RESEND_API_KEY in the env, or --key=...):
$env:RESEND_API_KEY="re_your_key"; node send-broadcast.mjs --template=email-templates/weekly-2026-08-02.html --subject="ABUZ8 Weekly" --send
# safest: test to yourself first with --only=you@you.com --send
```

## Compliance — already handled
- Every email carries a working one-click unsubscribe: `/api/unsubscribe` (deployed + tested live 2026-08-02, records opt-outs to a D1 `suppressions` table).
- The broadcaster skips anyone in `suppressions` and auto-filters test/audit addresses.
- `List-Unsubscribe` header is set (RFC 8058 one-click).

## Files
- `send-broadcast.mjs` — the sender (dry-run by default).
- `functions/api/unsubscribe.js` — the opt-out endpoint (LIVE).
- `email-templates/{welcome,weekly,product-launch}-2026-08-02.html` — the content.
