// ABUZ8 — server-side Stripe checkout session creator
// Route: POST /api/stripe-checkout
//
/**
 * ALLOWLIST — price IDs this endpoint may create a checkout session for.
 *
 * REVOKED 2026-07-29: the eight "agent-generated" price IDs were pulled after a
 * disk audit found their deliverables were 380–440 byte ZIPs containing nothing
 * but ABUZ8_LICENSE.txt and README.txt. A ninth (ComfyUI Workflow Master
 * Collection, $33) had no artifact on disk at all. Charging for those is the
 * exact failure the Truth-Status contract exists to prevent, and chargebacks
 * would end the Stripe account long before the revenue mattered.
 *
 * The allowlist is the last gate: even if a buy button is restored by mistake,
 * a price ID that is not listed here cannot be charged. Re-add an entry only
 * once a real artifact is verified in the R2 bucket.
 */
const ALLOWLIST = [
  'price_1Tgixh1r1N62QJj76DDnFtrI',  // Sovereign AI Stack ($97)
  'price_1TgixN1r1N62QJj7GuXd7beN',  // AI Automation Blueprint ($97)
  'price_1Tgj1L1r1N62QJj7csb5TjRk',  // ComfyUI 77 Workflows ($27)
];

const STRIPE_API = "https://api.stripe.com/v1";

export async function onRequestPost({ request, env }) {
  try {
    const { tool, tool_input, price_id } = await request.json();

    if (!tool || !price_id) {
      return new Response(JSON.stringify({ error: "tool and price_id required" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }
    if (!ALLOWLIST.includes(price_id)) {
      return new Response(JSON.stringify({ error: "price_not_allowlisted", message: "This product is not yet available for purchase." }), {
        status: 403, headers: { "Content-Type": "application/json" }
      });
    }
    if (!env.STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY env var not set" }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    const inputJSON = JSON.stringify(tool_input || {}).slice(0, 480); // Stripe metadata 500-char limit per value

    const body = new URLSearchParams({
      "mode": "payment",
      "line_items[0][price]": price_id,
      "line_items[0][quantity]": "1",
      "success_url": "https://abuz8ai.com/thank-you.html?session_id={CHECKOUT_SESSION_ID}",
      "cancel_url": "https://abuz8ai.com/tools.html",
      "customer_creation": "always",
      "payment_intent_data[metadata][tool]": tool,
      "metadata[tool]": tool,
      "metadata[tool_input]": inputJSON,
    }).toString();

    const r = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const session = await r.json();
    if (!r.ok) {
      return new Response(JSON.stringify({ error: "stripe", detail: session }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
