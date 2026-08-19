// ABUZ8 AI Tools Worker — Cloudflare Workers AI (text generation)
// Runs on Cloudflare's edge (env.AI binding) — NO local GPU, no external key.
// Specialized prompts give best quality for top tools; a generic handler makes
// EVERY text tool produce real, tailored AI output (no template theater).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MODEL = '@cf/meta/llama-3.1-8b-instruct';

// Tools that need longer output (documents, posts, decks).
const LONG_TOOLS = new Set([
  'blog-writer', 'cover-letter', 'contract-templates', 'privacy-policy-generator',
  'terms-of-service-generator', 'presentation-maker', 'pitch-deck-review',
  'board-deck-generator', 'fundraising-deck', 'meeting-notes', 'acquisition-memo',
  'ma-due-diligence', 'gtm-strategy', 'case-study', 'job-description-writer',
]);

// High-quality specialized prompts for the most-used tools.
const TOOL_PROMPTS = {
  'bio-writer': (d) => `Write 3 professional bios for ${d.name || 'a professional'}, who is a ${d.role || 'professional'}. Key facts: ${d.achievements || 'experienced professional'}. Platform: ${d.platform || 'LinkedIn'}. Tone: ${d.tone || 'Professional'}.

For each bio, write it as a complete paragraph. Label them Version 1, Version 2, Version 3. Keep each 50-150 words depending on platform. For Twitter/X keep under 160 characters per version.`,

  'slogan-generator': (d) => `Generate 10 catchy slogans/taglines for "${d.brand || 'a brand'}". They do: ${d.description || 'business services'}. Style: ${d.style || 'Bold & Direct'}. Industry: ${d.industry || 'Technology'}.

Number each 1-10. Make them memorable, punchy, varied. Mix short (3-5 words) and medium (6-10 words) lengths.`,

  'hashtag-generator': (d) => `Generate ${d.count || '20'} optimized hashtags for this ${d.platform || 'Instagram'} post: "${d.content || 'social media post'}".

Organize into 3 categories:
TRENDING (high volume, broad reach):
NICHE (targeted, lower competition):
BRANDED (unique, ownable):

Format each with the # symbol. Make them relevant and platform-appropriate.`,

  'email-subject': (d) => {
    const subjects = d.subjects || ['Test subject line'];
    return `Analyze these email subject lines for a ${d.emailType || 'Newsletter'} targeting ${d.audience || 'B2B Professionals'}:

${subjects.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

For EACH: Open Rate Score (1-10), Spam Risk (Low/Medium/High), Emotional Trigger, Improved Version, and why it works. Then rank best to worst.`;
  },

  'ad-copy': (d) => `Write 5 high-converting ad copy variations for "${d.product || 'a product'}" targeting "${d.audience || 'professionals'}". Platform: ${d.platform || 'Facebook / Instagram'}.

For each: Headline (max 40 chars), Primary Text (2-3 sentences: hook + value + CTA), Description (1 sentence). Use PAS, AIDA, BAB frameworks. Punchy and conversion-focused.`,

  'resume-builder': (d) => `You are an expert resume writer. Create a professional, ATS-optimized resume from this experience:

${d.experience || 'No experience provided.'}

Sections: PROFESSIONAL SUMMARY (3-4 sentences), EXPERIENCE (recent first, bullets with action verbs + metrics), SKILLS (grouped), EDUCATION (if mentioned). Strong action verbs (Led, Drove, Architected, Scaled). Quantified achievements. ATS-friendly (no tables/columns). Professional tone.`,

  'seo-meta': (d) => `Generate SEO-optimized meta tags for a page about "${d.keyword || 'topic'}".

Page summary: ${d.content || 'A web page about this topic.'}

Provide: 1) Meta Title (50-60 chars, keyword-first), 2) Meta Description (150-160 chars + CTA), 3) OG Title, 4) OG Description, 5) 3 Alt Titles, 6) 3 Alt Descriptions, 7) Suggested H1, 8) 5 related keywords. Show character count in parentheses for each.`,

  'blog-writer': (d) => `Write a complete, publish-ready ${d.type || 'how-to'} blog post.

Topic: ${d.topic || 'the subject'}
Audience: ${d.audience || 'professionals'}
Primary keyword (use naturally, including in the title and first paragraph): ${d.keyword || d.kw || ''}
Secondary keyword: ${d.keywords2 || d.kw2 || 'none'}
Key points to cover: ${d.points || 'cover the topic thoroughly'}
Target length: about ${d.targetWords || 800} words. Tone: ${d.tone || 'authoritative'}.

Write a real, specific, valuable post (not generic filler). Use an H1 title, H2 section headings, short paragraphs, and a strong intro + conclusion. Format in clean HTML using <h1>, <h2>, <p>, <ul>, <li> tags only.`,

  'cover-letter': (d) => `Write a tailored, professional cover letter.

Candidate: ${d.name || 'the candidate'}
Role applying for: ${d.role || d.job || 'the position'}
Company: ${d.company || 'the company'}
Background / experience: ${d.experience || d.background || 'relevant experience'}
Why this company / motivation: ${d.why || 'a strong fit'}

3-4 paragraphs, confident but not arrogant, specific to the role and company, ends with a clear call to action. No generic filler.`,

  'cold-dm-templates': (d) => `Write 5 cold outreach DM/message templates.

Selling / offering: ${d.offer || d.product || 'a service'}
Target: ${d.audience || d.target || 'the prospect'}
Channel: ${d.channel || d.platform || 'LinkedIn'}
Goal: ${d.goal || 'book a call'}

Each template: short (under 80 words), personalized opener, one clear value point, soft CTA. Vary the angle (pain-point, social proof, curiosity, direct, referral). Number them 1-5 with a one-line label for each angle.`,

  // Returns STRUCTURED JSON (the page parses cards) — must be valid JSON, no prose.
  'flashcard-maker': (d) => `Create exactly ${d.numberOfCards || d.count || 8} study flashcards from this material. Difficulty: ${d.difficulty || 'medium'}.

Material:
${d.notes || d.content || d.topic || 'the topic'}

Return ONLY a valid JSON array and nothing else — no markdown, no code fences, no commentary before or after. Each element is an object with exactly two string keys: "front" (a clear question/prompt) and "back" (the concise answer). Example format: [{"front":"Question?","back":"Answer."}]`,
};

// Tools whose output must be raw JSON (no HTML formatting instruction).
const JSON_TOOLS = new Set(['flashcard-maker']);

function humanize(tool) {
  return String(tool || 'assistant').replace(/-/g, ' ').replace(/^ai /i, '').trim();
}

function genericPrompt(tool, d) {
  const role = humanize(tool);
  const fields = Object.entries(d || {})
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join('; ') : v}`)
    .join('\n');
  return `You are an expert ${role}. Produce a complete, professional, ready-to-use result based on the inputs below. Be specific and tailored to the inputs — never generic filler. Use clear formatting (headings, bullets, or numbered lists where helpful).

Inputs:
${fields || '(no specific inputs — produce a strong, useful example result)'}

Deliver the finished ${role} output now. No preamble, no disclaimers, no meta-commentary.`;
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
      if (!tool) return json({ error: 'Missing tool name' }, 400);

      const prompt = TOOL_PROMPTS[tool] ? TOOL_PROMPTS[tool](data || {}) : genericPrompt(tool, data || {});
      const max_tokens = LONG_TOOLS.has(tool) ? 3072 : 1200;
      const system = JSON_TOOLS.has(tool)
        ? 'You output ONLY valid JSON that exactly matches the requested shape. No prose, no markdown, no code fences, nothing before or after the JSON.'
        : 'You are a professional assistant. Deliver direct, high-quality, ready-to-use output tailored to the user inputs. No disclaimers or meta-commentary. Just deliver the requested content.';

      const result = await env.AI.run(MODEL, {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        max_tokens,
      });

      return json({ success: true, result: result.response, tool, model: 'llama-3.1-8b-instruct' });
    } catch (err) {
      return json({ success: false, error: err.message || 'AI generation failed' }, 500);
    }
  },
};
