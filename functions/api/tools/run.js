// ABUZ8 — /api/tools/run  (Cloudflare Pages Function)
// Route: POST /api/tools/run
//
// THE HONEST ROUTER — every tool that returns a result here runs REAL AI.
// No fake spinners. No fake progress bars that end in waitlists.
//
// IMAGE TOOLS  → Cloudflare Workers AI (SDXL / SD-1.5-img2img)
// TEXT TOOLS   → Cloudflare Workers AI (Llama 3.1 8B)
// VIDEO/LIPSYNC/QR/UPSCALER → honest error + waitlist flag (requires local GPU pipeline)
//
// Response shapes:
//   Image success:  { ok: true,  image_url: "data:image/png;base64,..." }
//   Text success:   { ok: true,  output: "..." }
//   Needs waitlist: { ok: false, error: "...", waitlist: true }
//   Bad request:    { ok: false, error: "..." }  (4xx)

const CORS = {
  "Access-Control-Allow-Origin": "*",
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

// ─── Tool classification ────────────────────────────────────────────────────

// Tools that produce images via Workers AI SDXL (text-to-image, no reference photo)
const IMAGE_T2I_TOOLS = new Set([
  "comfyui_generate", "comfyui_studio", "comfyui_anime",
  "comfyui_logo", "comfyui_thumbnail", "comfyui_qr", // fallback for qr if no ControlNet
  "make_cartoon", "make_character_reference",
]);

// Tools that do image-to-image (need the uploaded photo for best results)
const IMAGE_I2I_TOOLS = new Set([
  "comfyui_img2img", "comfyui_fun_inpaint",
  "comfyui_consistent_character",
]);

// Tools we genuinely cannot run via Workers AI — they need the local ComfyUI pipeline.
// comfyui_fun_control = QR art (requires ControlNet — without it the output is not a real QR code)
// comfyui_upscale     = 4x upscaling (SDXL img2img cannot upscale, only restyle)
const LOCAL_ONLY_TOOLS = new Set([
  "comfyui_video", "comfyui_vace", "comfyui_image_to_video", "comfyui_ltx_t2v",
  "comfyui_ltx_av_t2v", "comfyui_ltx23_t2v", "comfyui_ltx23_i2v",
  "comfyui_image_to_video_v22", "comfyui_video_v22",
  "comfyui_stitch_long", "render_long", "render_shot",
  "avatar_speak", "comfyui_lipsync", "comfyui_music", "comfyui_sfx",
  "score_clip", "storyboard_breakdown",
  "comfyui_fun_control",  // QR art needs ControlNet QR Monster — SDXL cannot produce scannable QR codes
  "comfyui_upscale",      // True 4x upscaling requires dedicated upscaler model, not img2img
]);

// LLM / text tools — all go through Llama 3.1
function isTextTool(tool) {
  return !IMAGE_T2I_TOOLS.has(tool) && !IMAGE_I2I_TOOLS.has(tool) && !LOCAL_ONLY_TOOLS.has(tool);
}

// ─── Anime / style → SDXL prompt mapping ───────────────────────────────────
const STYLE_PROMPTS = {
  // Anime styles
  ghibli:      "studio ghibli anime style, painterly watercolor, lush nature, soft warm lighting, hand-drawn, Hayao Miyazaki aesthetic, highly detailed background",
  shonen:      "shonen anime style, dynamic action pose, bold clean linework, cel shading, vibrant colors, manga aesthetic, dramatic lighting, high energy",
  cyberpunk:   "cyberpunk anime style, neon signs, rainy dark city, holographic displays, electric blue and purple lighting, Akira aesthetic, ultra detailed",
  chibi:       "cute chibi anime style, large round eyes, small body, pastel colors, soft shading, adorable kawaii expression, white background",
  manhwa:      "korean manhwa webtoon style, clean polished linework, soft gradient coloring, expressive eyes, romantic lighting, high quality digital illustration",
  vintage:     "1980s retro anime style, cel animation, film grain texture, muted warm palette, old school manga aesthetic, classic OVA look",
  darkfantasy: "dark fantasy anime art, dramatic chiaroscuro lighting, epic atmosphere, rich dark colors, highly detailed, cinematic, shadow and light contrast",
  sliceoflife: "slice of life anime style, warm sunlight, cozy everyday scene, soft pastel colors, gentle shading, cheerful and relaxing mood",
  // Headshot / portrait
  headshot:    "professional AI headshot, studio portrait, soft studio lighting, neutral background, sharp focus, photorealistic, business professional",
  // Room redesign
  modern:      "modern interior design, clean lines, scandinavian style, natural light, minimal decor, high quality architectural render",
  luxury:      "luxury interior design, high-end materials, dramatic lighting, sophisticated color palette, architectural visualization",
  cozy:        "cozy interior design, warm lighting, rustic elements, comfortable furniture, inviting atmosphere, soft colors",
  // Logo / brand
  logo:        "professional logo design, clean vector style, minimal geometric shapes, bold typography, brand identity, white background, sharp edges",
  // Product photo
  product:     "professional product photography, studio lighting, clean background, sharp focus, commercial quality, 4k resolution",
  // Cartoon
  cartoon:     "cartoon illustration style, bold outlines, flat colors, fun and playful, character design, professional animation quality",
  // Default fallback
  default:     "high quality digital art, detailed, professional, vibrant colors, sharp focus",
};

function buildImagePrompt(tool, style, userPrompt) {
  const styleKey = style || "default";
  const base = STYLE_PROMPTS[styleKey] || STYLE_PROMPTS.default;

  if (userPrompt && userPrompt.trim()) {
    return `${userPrompt.trim()}, ${base}`;
  }

  // Tool-specific default prompts when user gives nothing
  const toolDefaults = {
    comfyui_anime: `anime character portrait, ${base}`,
    comfyui_generate: `stunning digital artwork, ${base}`,
    comfyui_studio: `creative artistic composition, ${base}`,
    make_cartoon: `cartoon character, ${base}`,
    comfyui_consistent_character: `detailed character portrait, professional headshot, ${base}`,
    comfyui_img2img: base,
    comfyui_fun_inpaint: base,
    comfyui_fun_control: base,
    make_character_reference: `character reference sheet, full body, ${base}`,
    comfyui_logo: `professional logo, ${base}`,
    comfyui_thumbnail: `eye-catching thumbnail design, ${base}`,
  };

  return toolDefaults[tool] || `${base}`;
}

// ─── Text tool → system prompt mapping ─────────────────────────────────────
function buildTextSystemPrompt(tool) {
  const prompts = {
    llm_resume:         "You are an expert resume writer. Create professional, ATS-optimized resume content. Be specific, use action verbs, quantify achievements where possible.",
    llm_cover_letter:   "You are an expert cover letter writer. Create compelling, personalized cover letters that match the role and company culture. Be concise and impactful.",
    llm_blog:           "You are an expert content writer and SEO specialist. Write engaging, well-structured blog posts with proper headings, clear arguments, and actionable insights.",
    llm_ad_copy:        "You are a master copywriter (David Ogilvy, Gary Halbert school). Write persuasive ad copy that converts. Use AIDA framework. Be specific, emotional, benefit-driven.",
    llm_seo_meta:       "You are an SEO expert. Write optimized meta titles (50-60 chars) and descriptions (150-160 chars) that are compelling and keyword-rich.",
    llm_bio:            "You are a professional bio writer. Create concise, compelling professional bios in third person. Highlight expertise, achievements, and personality.",
    llm_email_subject:  "You are an email marketing expert. Generate high-converting email subject lines (30-50 chars). Use curiosity, urgency, and personalization.",
    llm_hashtag:        "You are a social media expert. Generate relevant, trending hashtags for maximum reach. Mix popular and niche hashtags.",
    llm_caption:        "You are a social media content creator. Write engaging captions that stop the scroll. Use hooks, emotion, and a clear CTA.",
    llm_slogan:         "You are a brand strategist and copywriter. Create memorable, punchy slogans that capture the brand essence in 5-8 words.",
    llm_contract:       "You are a legal document specialist. Create clear, professional contract templates with proper legal structure. Note: this is a template, not legal advice.",
    llm_privacy:        "You are a privacy policy specialist. Create comprehensive, GDPR/CCPA-compliant privacy policy templates. Note: template only, not legal advice.",
    llm_tos:            "You are a legal document specialist. Create clear Terms of Service templates. Note: template only, not legal advice.",
    llm_cold_dm:        "You are a sales copywriter and outreach expert. Write personalized, non-spammy cold DM templates that get responses.",
    llm_pitch_review:   "You are a venture capitalist and pitch deck expert. Review pitch deck content and provide specific, actionable feedback on narrative, clarity, and investor appeal.",
    llm_swot:           "You are a strategic business analyst. Conduct thorough SWOT analyses with specific, actionable insights for each quadrant.",
    llm_startup:        "You are a startup advisor and former VC. Validate startup ideas with critical thinking — identify real problems, market size, competition, and critical assumptions.",
    llm_persona:        "You are a UX researcher and marketing strategist. Create detailed, realistic customer personas with demographics, psychographics, pain points, and behaviors.",
    llm_meeting_notes:  "You are an executive assistant. Convert rough meeting notes into clean, structured summaries with key decisions, action items, and owners.",
    llm_presentation:   "You are a presentation designer and storytelling expert. Create clear, compelling slide outlines with logical flow and persuasive narrative.",
  };
  return prompts[tool] || "You are a helpful AI assistant for ABUZ8 AI tools. Deliver high-quality, professional output that provides real value. Be specific, actionable, and concise.";
}

// ─── Convert ArrayBuffer / ReadableStream to base64 ────────────────────────
async function toBase64(imageData) {
  let bytes;
  if (imageData instanceof ArrayBuffer) {
    bytes = new Uint8Array(imageData);
  } else if (imageData instanceof ReadableStream) {
    const chunks = [];
    const reader = imageData.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    bytes = new Uint8Array(total);
    let off = 0;
    for (const chunk of chunks) { bytes.set(chunk, off); off += chunk.length; }
  } else {
    // Assume it's already bytes-like
    bytes = new Uint8Array(imageData);
  }

  // base64 encode in chunks to avoid stack overflow
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// ─── Main handler ───────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  if (!env.AI) {
    return json({ ok: false, error: "AI binding not configured", waitlist: true }, 503);
  }

  // Parse request — accept both JSON and multipart FormData
  let tool = "", style = "", userPrompt = "", steps = 20, strength = 0.75;
  let imageBytes = null; // raw bytes if a photo was uploaded

  const ct = request.headers.get("Content-Type") || "";

  if (ct.includes("application/json")) {
    try {
      const body = await request.json();
      tool     = String(body.tool     || "").trim();
      style    = String(body.style    || "").trim();
      userPrompt = String(body.prompt || "").trim();
      steps    = Math.min(parseInt(body.steps    || 20), 20); // Workers AI cap
      strength = Math.min(Math.max(parseFloat(body.strength || 0.75), 0.1), 1.0);
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }
  } else if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
    try {
      const fd = await request.formData();
      tool     = String(fd.get("tool")     || "").trim();
      style    = String(fd.get("style")    || "").trim();
      userPrompt = String(fd.get("prompt") || "").trim();
      steps    = Math.min(parseInt(fd.get("steps") || 20), 20);
      strength = Math.min(Math.max(parseFloat(fd.get("strength") || 0.75), 0.1), 1.0);

      const imgFile = fd.get("image");
      if (imgFile && imgFile instanceof File && imgFile.size > 0) {
        const buf = await imgFile.arrayBuffer();
        imageBytes = new Uint8Array(buf);
      }
    } catch {
      return json({ ok: false, error: "Failed to parse form data" }, 400);
    }
  } else {
    // Try JSON as fallback
    try {
      const body = await request.json();
      tool     = String(body.tool     || "").trim();
      style    = String(body.style    || "").trim();
      userPrompt = String(body.prompt || "").trim();
      steps    = Math.min(parseInt(body.steps    || 20), 20);
      strength = Math.min(Math.max(parseFloat(body.strength || 0.75), 0.1), 1.0);
    } catch {
      return json({ ok: false, error: "Unsupported content type" }, 415);
    }
  }

  if (!tool) {
    return json({ ok: false, error: "tool parameter required" }, 400);
  }

  // ── LOCAL ONLY: honestly tell the client these need the GPU pipeline ──────
  if (LOCAL_ONLY_TOOLS.has(tool)) {
    return json({
      ok: false,
      error: "This tool requires the QADIR OS local GPU pipeline (video, lipsync, and music generation are not yet available via cloud). Join the early access waitlist to be first when it ships.",
      waitlist: true,
    }, 503);
  }

  // ── IMAGE GENERATION ───────────────────────────────────────────────────────
  if (IMAGE_T2I_TOOLS.has(tool) || IMAGE_I2I_TOOLS.has(tool)) {
    const prompt = buildImagePrompt(tool, style, userPrompt);
    const negativePrompt = "blurry, low quality, watermark, text overlay, ugly, deformed, nsfw, bad anatomy";

    try {
      let imageData;

      // If we have an uploaded image AND it's an img2img tool — use img2img model
      if (imageBytes && imageBytes.length > 0 && IMAGE_I2I_TOOLS.has(tool)) {
        // Convert to base64 string for the model
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < imageBytes.length; i += chunkSize) {
          binary += String.fromCharCode(...imageBytes.subarray(i, i + chunkSize));
        }
        const imgB64 = btoa(binary);

        imageData = await env.AI.run("@cf/runwayml/stable-diffusion-v1-5-img2img", {
          prompt,
          image: imgB64,
          strength: strength,
          num_steps: steps,
          guidance: 7.5,
        });
      } else if (imageBytes && imageBytes.length > 0) {
        // Has image but using a T2I tool — run img2img anyway for better coherence
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < imageBytes.length; i += chunkSize) {
          binary += String.fromCharCode(...imageBytes.subarray(i, i + chunkSize));
        }
        const imgB64 = btoa(binary);

        imageData = await env.AI.run("@cf/runwayml/stable-diffusion-v1-5-img2img", {
          prompt,
          image: imgB64,
          strength: Math.min(strength, 0.85), // preserve more of the source
          num_steps: steps,
          guidance: 7.5,
        });
      } else {
        // Pure text-to-image
        imageData = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
          prompt,
          negative_prompt: negativePrompt,
          num_steps: steps,
          width: 1024,
          height: 1024,
          guidance: 7.5,
        });
      }

      const b64 = await toBase64(imageData);
      return json({ ok: true, image_url: `data:image/png;base64,${b64}` });

    } catch (err) {
      console.error("[tools/run] image generation error:", err);
      // If Workers AI fails, return honest error (not a fake waitlist)
      return json({ ok: false, error: "Image generation failed — the AI model returned an error. Please try again." }, 500);
    }
  }

  // ── TEXT GENERATION ────────────────────────────────────────────────────────
  if (isTextTool(tool)) {
    const systemPrompt = buildTextSystemPrompt(tool);

    if (!userPrompt) {
      return json({ ok: false, error: "A text prompt or description is required for this tool." }, 400);
    }

    try {
      const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        max_tokens: 2048,
        temperature: 0.75,
      });

      const output = result.response || result.text || "";
      if (!output.trim()) {
        return json({ ok: false, error: "AI returned an empty response. Try rephrasing your prompt." }, 500);
      }

      return json({ ok: true, output });

    } catch (err) {
      console.error("[tools/run] text generation error:", err);
      return json({ ok: false, error: "Text generation failed. Please try again." }, 500);
    }
  }

  // Should not reach here — but be explicit
  return json({
    ok: false,
    error: `Unknown tool: ${tool}. If you believe this is an error, contact support.`,
    waitlist: false,
  }, 400);
}
