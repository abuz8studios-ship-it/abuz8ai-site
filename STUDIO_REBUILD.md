# Website rebuild — conversion spine (2026-08-22)

## What shipped
One company site. One promise. One live offer.

- `index.html` — company homepage (crew + system + honest rescue). Store is **not** sold as LIVE.
- `crew.html` — product page for the agent team. Waitlist for the kit.
- `hq.html` — public roster. Honest $0 / checkout off.
- `playbook.html` — the sellable system, free until Stripe + PDF exist. `/system` → playbook.
- `contact.html` — company nav (no Store CTA).
- `rescue.html` — company links, glow blobs removed.

Palette lock: `--lapis #0a1628` `--gold #c9a84c` `--green-bright #2fbf8f`. No neon. No 3D orb.

## What we did not do
- Did not flip to Vite + Three.js (would 404 ~1,400 URLs).
- Did not turn store checkout on (empty deliverables).
- Did not invent a Stripe payment link. Ahmad still creates `buy.stripe.com/...`.

## Money path
Today: email → rescue $1,500.
Next dollar: Ahmad pastes a Stripe payment link; we put it on `/rescue`.
Later: playbook PDF + crew install kit.
