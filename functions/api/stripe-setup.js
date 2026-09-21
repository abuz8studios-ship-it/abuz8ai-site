/**
 * One-shot / admin: GET /api/stripe-setup
 * Ensures the Life Hub Stripe webhook listens for subscription delete/update.
 * Auth: header X-Cron-Secret === env.CRON_SECRET
 * ABUZ8 LLC — 2026 · support@abuz8ai.com
 */

const WANT = [
  "checkout.session.completed",
  "customer.subscription.deleted",
  "customer.subscription.updated",
];
const TARGET = "https://abuz8ai.com/api/stripe-webhook";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.CRON_SECRET || request.headers.get("X-Cron-Secret") !== env.CRON_SECRET) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  if (!env.STRIPE_SECRET_KEY) return json({ ok: false, error: "no stripe key" }, 503);

  const headers = {
    Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const list = await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=20", { headers });
  const listed = await list.json();
  if (!list.ok) return json({ ok: false, error: "list_failed", detail: listed }, 502);

  const endpoints = listed.data || [];
  let ep = endpoints.find((e) => (e.url || "").replace(/\/$/, "") === TARGET.replace(/\/$/, ""));
  if (!ep) {
    ep = endpoints.find((e) => (e.url || "").includes("abuz8ai.com") && (e.url || "").includes("stripe-webhook"));
  }

  const params = new URLSearchParams();
  WANT.forEach((ev, i) => params.set(`enabled_events[${i}]`, ev));

  if (ep) {
    const have = new Set(ep.enabled_events || []);
    if (WANT.every((e) => have.has(e) || have.has("*"))) {
      return json({ ok: true, action: "already", id: ep.id, url: ep.url, events: ep.enabled_events });
    }
    const r = await fetch(`https://api.stripe.com/v1/webhook_endpoints/${ep.id}`, {
      method: "POST",
      headers,
      body: params.toString(),
    });
    const data = await r.json();
    if (!r.ok) return json({ ok: false, error: "update_failed", detail: data }, 502);
    return json({ ok: true, action: "updated", id: data.id, events: data.enabled_events });
  }

  params.set("url", TARGET);
  const r = await fetch("https://api.stripe.com/v1/webhook_endpoints", {
    method: "POST",
    headers,
    body: params.toString(),
  });
  const data = await r.json();
  if (!r.ok) return json({ ok: false, error: "create_failed", detail: data }, 502);
  return json({
    ok: true,
    action: "created",
    id: data.id,
    note: "New endpoint. Put data.secret into Pages as STRIPE_WEBHOOK_SECRET (not returned here).",
  });
}
