/**
 * Cloudflare Pages Function: /api/hackathon-log
 * Returns revenue log entries for the hackathon demo
 */

export async function onRequestGet({ env }) {
  // Read from KV or return empty array
  const logs = [];

  // In production, read from KV
  // For now, return sample data
  const sampleData = {
    logs: [],
    total_revenue: 0,
    transaction_count: 0,
    status: "running",
    webhook_url: "https://abuz8ai.com/api/stripe/webhook",
    poller_status: "active"
  };

  return new Response(JSON.stringify(sampleData), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache"
    }
  });
}

export async function onRequestPost({ env, request }) {
  const body = await request.json();
  
  // Handle webhook events
  if (body.type === "checkout.session.completed") {
    const session = body.data?.object;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: "charge",
      event: "checkout.session.completed",
      charge_id: session?.payment_intent,
      customer: session?.customer,
      amount_usd: (session?.amount_total || 0) / 100,
      status: session?.status
    };

    // Write to KV
    // await env.HACKATHON_LOG.put(`log_${Date.now()}`, JSON.stringify(logEntry));
    
    return new Response(JSON.stringify({ success: true, entry: logEntry }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  return new Response(JSON.stringify({ error: "Invalid event type" }), {
    status: 400,
    headers: { "Content-Type": "application/json" }
  });
}
