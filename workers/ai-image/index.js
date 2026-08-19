// ABUZ8 AI Image Worker — Cloudflare Workers AI (text-to-image, Flux)
// Runs on Cloudflare's edge (env.AI binding) — NO local GPU, no external key.
// Builds an image prompt from the tool name + form data, returns a base64 data URL.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MODEL = '@cf/black-forest-labs/flux-1-schnell';

// Per-tool prompt builders → a strong text-to-image prompt.
const IMAGE_PROMPTS = {
  'logo-generator': (d) => `A clean, modern, professional vector-style logo for "${d.brand || d.name || 'a brand'}", ${d.industry || 'business'}. Style: ${d.style || 'minimal, flat, memorable'}. Colors: ${d.colors || 'tasteful palette'}. Centered on a plain white background, high contrast, no text artifacts.`,
  'anime-art-generator': (d) => `High-quality anime illustration: ${d.prompt || d.description || d.subject || 'a heroic character'}. Style: ${d.style || 'vibrant modern anime, detailed shading, dynamic lighting'}. Sharp, clean linework, cinematic composition.`,
  'product-photo': (d) => `Professional studio product photograph of ${d.product || d.subject || 'a product'}. ${d.scene ? 'Scene: ' + d.scene + '. ' : ''}Soft diffused lighting, shallow depth of field, premium e-commerce look, clean background.`,
  'product-photos': (d) => `Professional studio product photograph of ${d.product || d.subject || 'a product'}. ${d.scene ? 'Scene: ' + d.scene + '. ' : ''}Soft diffused lighting, shallow depth of field, premium e-commerce look, clean background.`,
  'room-redesign': (d) => `Photorealistic interior design render of a ${d.room || 'living room'} in ${d.style || 'modern minimalist'} style. ${d.details || ''} Natural lighting, magazine-quality, realistic materials and proportions.`,
  'thumbnail-maker': (d) => `A bold, high-CTR YouTube thumbnail background about "${d.topic || d.title || 'a video'}". Dramatic lighting, vivid saturated colors, strong focal subject, leaves space for text overlay. Eye-catching, professional.`,
  'thumbnail': (d) => `A bold, high-CTR YouTube thumbnail background about "${d.topic || d.title || 'a video'}". Dramatic lighting, vivid saturated colors, strong focal subject, leaves space for text overlay.`,
  'cartoon-avatar': (d) => `A friendly cartoon avatar portrait: ${d.description || d.subject || 'a person'}. Style: ${d.style || 'clean modern cartoon, bold outlines, flat colors'}. Centered headshot, simple background.`,
  'cartoon': (d) => `A clean cartoon illustration: ${d.description || d.subject || 'a character'}. Style: ${d.style || 'modern cartoon, bold outlines, flat vivid colors'}. Simple background.`,
  'qr-art-generator': (d) => `An artistic background pattern for a QR code about "${d.content || d.topic || 'a brand'}". Style: ${d.style || 'abstract, elegant, balanced negative space'}. NOTE: decorative background only.`,
};

function humanize(tool) {
  return String(tool || 'image').replace(/-/g, ' ').replace(/^ai /i, '').trim();
}

function buildPrompt(tool, d) {
  if (IMAGE_PROMPTS[tool]) return IMAGE_PROMPTS[tool](d || {});
  // Generic fallback: prefer an explicit prompt field, else assemble from data.
  if (d && (d.prompt || d.description)) return String(d.prompt || d.description);
  const role = humanize(tool);
  const fields = Object.entries(d || {})
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([, v]) => v).join(', ');
  return `${role}${fields ? ': ' + fields : ''}. High quality, professional, detailed.`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    try {
      const { tool, data } = await request.json();
      const prompt = buildPrompt(tool, data || {});
      const steps = Math.min(Math.max(parseInt((data && data.steps) || 4, 10) || 4, 1), 8);

      const out = await env.AI.run(MODEL, { prompt, steps });
      // flux-1-schnell returns { image: "<base64 jpeg>" }
      const b64 = out && out.image ? out.image : null;
      if (!b64) return json({ success: false, error: 'No image returned' }, 502);

      return json({ success: true, tool: tool || 'image', prompt, image: `data:image/jpeg;base64,${b64}` });
    } catch (err) {
      return json({ success: false, error: err.message || 'Image generation failed' }, 500);
    }
  },
};
