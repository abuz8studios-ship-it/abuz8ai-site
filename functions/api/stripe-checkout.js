// ABUZ8 — server-side Stripe checkout
// Route: POST /api/stripe-checkout
//
// Two doors:
//   1) SERVICES — operator work (Rescue). Uses price_data. No ZIP. No hollow SKU.
//   2) ALLOWLIST — digital price IDs only after a real R2 artifact exists.
//
// Store SKUs stay off unless they are on ALLOWLIST.

const STRIPE_API = "https://api.stripe.com/v1";

const SERVICES = {
  "hermes-unstick": {
    name: "Hermes Unstick — 60-minute live session",
    description: "One stuck Hermes/OpenClaw desk. Cron, tools, or silent skip. Operator on the call. Not a $1,500 autopsy.",
    amount_cents: 9900,
    success_url: "https://abuz8ai.com/thank-you.html?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://abuz8ai.com/session",
  },
  "pm-rescue": {
    name: "PM Workflow Rescue — 48-hour autopsy",
    description: "Fixed-scope diagnostic. Operator-delivered. One project. Not sold on the homepage.",
    amount_cents: 150000,
    success_url: "https://abuz8ai.com/thank-you.html?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://abuz8ai.com/contact",
  },
};

/**
 * REVOKED 2026-07-29: agent-generated $19–$57 ZIPs were empty.
 * Re-add a price ID only after the file is verified in R2.
 */
const ALLOWLIST = [
  "price_1Tgixh1r1N62QJj76DDnFtrI", // Sovereign AI Stack ($97)
  "price_1TgixN1r1N62QJj7GuXd7beN", // AI Automation Blueprint ($97)
  "price_1Tgj1L1r1N62QJj7csb5TjRk", // ComfyUI 77 Workflows ($27)
];

const CORS = {
  "Access-Control-Allow-Origin": "https://abuz8ai.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  try {
    let bodyIn = {};
    try {
      bodyIn = await request.json();
    } catch (_) {
      return json({ error: "invalid_json" }, 400);
    }

    const tool = String(bodyIn.tool || "").trim();
    const price_id = String(bodyIn.price_id || "").trim();
    const service = SERVICES[tool];

    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: "stripe_not_configured" }, 500);
    }

    // Life Hub SaaS — recurring. Amount from env.HUB_AMOUNT_CENTS (default 900 = $9).
    // Optional STRIPE_HUB_PRICE_ID if a Price was created in the Stripe dashboard.
    if (tool === "life-hub") {
      const cents = parseInt(env.HUB_AMOUNT_CENTS || "900", 10);
      const paramsHub = new URLSearchParams({
        mode: "subscription",
        "line_items[0][quantity]": "1",
        success_url: "https://abuz8ai.com/desk.html?upgraded=1",
        cancel_url: "https://abuz8ai.com/desk.html",
        "metadata[kind]": "hub",
        "metadata[tool]": "life-hub",
        "subscription_data[metadata][kind]": "hub",
      });
      if (env.STRIPE_HUB_PRICE_ID) {
        paramsHub.set("line_items[0][price]", env.STRIPE_HUB_PRICE_ID);
      } else {
        paramsHub.set("line_items[0][price_data][currency]", "usd");
        paramsHub.set("line_items[0][price_data][unit_amount]", String(Number.isFinite(cents) ? cents : 900));
        paramsHub.set("line_items[0][price_data][recurring][interval]", "month");
        paramsHub.set("line_items[0][price_data][product_data][name]", "ABUZ8 Life Hub");
        paramsHub.set("line_items[0][price_data][product_data][description]", "Hosted life system: connections, agents, cached boards. Async. No calls.");
      }
      const rHub = await fetch(`${STRIPE_API}/checkout/sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: paramsHub.toString(),
      });
      const sessionHub = await rHub.json();
      if (!rHub.ok) return json({ error: "stripe", detail: sessionHub }, 500);
      return json({ url: sessionHub.url, session_id: sessionHub.id });
    }

    const params = new URLSearchParams({
      mode: "payment",
      "line_items[0][quantity]": "1",
      customer_creation: "always",
    });

    if (service) {
      params.set("line_items[0][price_data][currency]", "usd");
      params.set("line_items[0][price_data][unit_amount]", String(service.amount_cents));
      params.set("line_items[0][price_data][product_data][name]", service.name);
      params.set("line_items[0][price_data][product_data][description]", service.description);
      params.set("success_url", service.success_url);
      params.set("cancel_url", service.cancel_url);
      params.set("metadata[tool]", tool);
      params.set("metadata[kind]", "service");
      params.set("payment_intent_data[metadata][tool]", tool);
      params.set("payment_intent_data[description]", service.name);
    } else {
      if (!tool || !price_id) {
        return json({ error: "tool_and_price_id_required" }, 400);
      }
      if (!ALLOWLIST.includes(price_id)) {
        return json(
          { error: "price_not_allowlisted", message: "This product is not for sale." },
          403
        );
      }
      const inputJSON = JSON.stringify(bodyIn.tool_input || {}).slice(0, 480);
      params.set("line_items[0][price]", price_id);
      params.set("success_url", "https://abuz8ai.com/thank-you.html?session_id={CHECKOUT_SESSION_ID}");
      params.set("cancel_url", "https://abuz8ai.com/tools.html");
      params.set("metadata[tool]", tool);
      params.set("metadata[kind]", "digital");
      params.set("metadata[tool_input]", inputJSON);
      params.set("payment_intent_data[metadata][tool]", tool);
    }

    const r = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const session = await r.json();
    if (!r.ok) {
      return json({ error: "stripe", detail: session }, 500);
    }
    return json({ url: session.url, session_id: session.id });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}
