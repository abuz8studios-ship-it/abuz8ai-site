# ABUZ8 — Cloudflare Pages Functions

End-to-end paid AI tool delivery: form input → Stripe checkout → on payment, generate + email buyer.

## Files

- `stripe-checkout.js` — `POST /api/stripe-checkout` — creates a Stripe Checkout session, stuffs form data into session metadata, returns the redirect URL.
- `stripe-webhook.js` — `POST /api/stripe-webhook` — receives `checkout.session.completed`, verifies HMAC, calls the existing `https://ai-tools.wireconn1.workers.dev` for generation, emails the buyer via Resend.

## Required env vars (Cloudflare Pages > Project > Settings > Environment Variables)

| Var | Where to get it |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard > Developers > API Keys (use `sk_live_...` for production) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard > Developers > Webhooks > endpoint > Signing secret (`whsec_...`) |
| `RESEND_API_KEY` | resend.com > API Keys (free tier: 100 emails/day, 3,000/month, no card) |
| `FROM_EMAIL` | Verified sender address, e.g. `delivery@abuz8ai.com` (verify domain in Resend first) |

Set all 4. The webhook will return 500 if `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` are missing.

## Stripe webhook setup (one-time)

1. Stripe Dashboard > Developers > Webhooks > **+ Add endpoint**
2. Endpoint URL: `https://abuz8ai.com/api/stripe-webhook`
3. Events: select **`checkout.session.completed`**
4. Save → copy the **Signing secret** (starts with `whsec_`) into `STRIPE_WEBHOOK_SECRET`

## Resend setup (one-time)

1. resend.com → sign up (free)
2. Domains → add `abuz8ai.com` → add the DNS records they show (DKIM + SPF, lives in Cloudflare DNS)
3. API Keys → create one with "Sending access" → copy into `RESEND_API_KEY`

## Smoke test

After deploy:

```bash
# 1. Test the checkout endpoint creates a session
curl -X POST https://abuz8ai.com/api/stripe-checkout \
  -H "Content-Type: application/json" \
  -d '{"tool":"resume-builder","tool_input":{"experience":"Senior PM 10y SaaS"},"price_id":"price_1TWSZd1r1N62QJj7vL44APjV"}'
# Expected: { "url": "https://checkout.stripe.com/...", "session_id": "cs_..." }

# 2. Open the URL, pay with Stripe test card 4242 4242 4242 4242 / any future date / any CVC
# 3. Check Cloudflare Pages > Functions > Real-time Logs — you should see [delivery] tool=resume-builder ...
# 4. Buyer email inbox: should receive the rendered resume within 5-10 seconds
```

## Test product (already created)

- Product: `prod_UVTWAk8AqFA5TV` — "AI Resume — Premium Email Delivery"
- Price: `price_1TWSZd1r1N62QJj7vL44APjV` — $9.00 USD one-time
- Checkout URL is generated dynamically per request (not a fixed payment link) so we can pass per-buyer metadata.

## Adding more tools to the same flow

To wire any of the other 99 tools:

1. Make sure `https://ai-tools.wireconn1.workers.dev` accepts `{ tool: "<name>", data: {...} }` for it.
2. Create a Stripe Product + Price for the paid version.
3. Add a button on the tool's HTML page that calls `/api/stripe-checkout` with `tool: "<name>"` and the price_id.
4. The webhook handler already routes by `metadata.tool` — no code changes needed.

## Failure modes the webhook handles

- Bad signature → 400 (Stripe retries)
- Missing email → 200, logs warning, no email sent
- Generation worker down → email body will contain raw error string
- Resend not configured → logs warning, no email sent (purchase still succeeds, you can manually fulfill from logs)
