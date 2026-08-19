# -*- coding: utf-8 -*-
import json, os
scr="/sessions/quirky-festive-thompson/mnt/ABU/abuz8ai-site/scratch_morning_2026-07-30"
add = sorted(set(json.load(open(os.path.join(scr,"classified.json")))["netnew"]))

# name + blurb + category, authored by hand (concise, hub tone, honest).
# category keys map to existing <h2> sections in tools.html.
T = {
 # --- Image & Video Studio ---
 "ai-video-with-sound": ("AI Video With Sound","Generate video and its audio track in one pass.","studio"),
 "ai-video-ugc": ("AI Video UGC","Creator-style UGC clips for ads and social.","studio"),
 # --- Business & Strategy ---
 "ai-acquisition-memo": ("AI Acquisition Memo","Board-ready acquisition memo with valuation and synergies.","biz"),
 "ai-ma-due-diligence": ("AI M&A Due Diligence","Six-dimension diligence scoring for a target.","biz"),
 "ai-book-summary": ("AI Book Summary","Key ideas from any book in minutes.","biz"),
 "ai-debate-argument-generator": ("AI Debate Argument Generator","Structured arguments for either side of a motion.","biz"),
 # --- Writing & Marketing / Agencies ---
 "ai-sdr-agent": ("AI SDR Agent","Autonomous outbound prospecting and follow-up.","biz"),
 "ai-content-agency": ("AI Content Agency","Daily content generation, run by agents.","biz"),
 "ai-chatbot-agency": ("AI Chatbot Agency","Deploy branded Zait support chatbots.","biz"),
 "ai-seo-agency": ("AI SEO Agency","Automated SEO reports and on-page fixes.","biz"),
 "ai-design-agency": ("AI Design Agency","Local-GPU design production, on demand.","biz"),
 "ai-workflow-audit": ("AI Workflow Automation Audit","Find and cost the automations you're missing.","biz"),
 "ai-website-rebuild": ("AI Website Rebuild Service","AI-generated rebuild of an existing site.","biz"),
 "ai-white-label": ("White Label AI Tools","Resell these tools under your own brand.","biz"),
 "ai-roast-my-website": ("AI Roast My Website","Brutally honest, actionable site feedback.","biz"),
 # --- Developer Tools ---
 "ai-curl-builder": ("AI cURL Command Builder","Build cURL requests visually, copy-ready.","dev"),
 "ai-webhook-tester": ("AI Webhook Tester","Build, send, and inspect webhooks live.","dev"),
 "ai-dockerfile-generator": ("AI Dockerfile Generator","Production-ready Dockerfiles for any stack.","dev"),
 "ai-gitignore-generator": ("AI .gitignore Generator","Perfect .gitignore for your language and tools.","dev"),
 "ai-prompt-injection-tester": ("AI Prompt Injection Tester","Probe an LLM app for jailbreaks and leaks.","dev"),
 "ai-model-license-checker": ("AI Model License Checker","Can you use Llama, FLUX, SDXL commercially? Check.","dev"),
 # --- AI Cost & Planning calculators (Developer Tools) ---
 "ai-token-counter": ("AI Token Counter","Count tokens and estimate LLM cost across models.","dev"),
 "ai-agent-cost-calculator": ("AI Agent Cost Calculator","What an autonomous agent run really costs.","dev"),
 "ai-vram-calculator": ("Local LLM VRAM Calculator","Will this model fit on your GPU? Find out.","dev"),
 "ai-inference-speed-calculator": ("LLM Inference Speed Calculator","Estimate tokens/sec for a model on your hardware.","dev"),
 "ai-context-window-planner": ("AI Context Window Planner","Visualize token allocation across a context window.","dev"),
 "ai-llm-price-comparison": ("LLM API Price Comparison","Cost per 1M tokens across GPT, Claude, Gemini and more.","dev"),
 "ai-embedding-cost-calculator": ("AI Embedding Cost Calculator","Compare embedding pricing, dimensions and cost.","dev"),
 "ai-rag-cost-calculator": ("RAG Cost Calculator","What embeddings plus a vector DB really cost.","dev"),
 "ai-batch-api-savings-calculator": ("Batch API Savings Calculator","What async batch processing saves you.","dev"),
 "ai-prompt-caching-calculator": ("Prompt Caching Savings Calculator","What prompt caching really saves per call.","dev"),
 "ai-self-host-calculator": ("Self-Host vs Cloud Calculator","When owning a GPU beats paying per token.","dev"),
 "ai-fine-tune-vs-rag": ("Fine-Tune vs RAG vs Prompting","Which approach your LLM problem actually needs.","dev"),
 # --- Free Utilities ---
 "base64-encoder": ("Base64 Encoder / Decoder","Encode and decode Base64, both ways.","util"),
 "case-converter": ("Case Converter","camelCase, snake_case, Title Case and more.","util"),
 "hash-generator": ("Hash Generator","SHA-256, SHA-512, SHA-1 in your browser.","util"),
 "http-status-codes": ("HTTP Status Code Reference","Every status code with a plain-English meaning.","util"),
 "image-compressor": ("Image Compressor","Compress JPG, PNG and WebP, no upload.","util"),
 "jwt-decoder": ("JWT Decoder","Decode and inspect JSON Web Tokens.","util"),
 "lorem-ipsum-generator": ("Lorem Ipsum Generator","Placeholder paragraphs, words and custom text.","util"),
 "markdown-preview": ("Markdown Preview & Editor","Live Markdown rendering as you type.","util"),
 "meta-tag-generator": ("Meta Tag Generator","SEO and Open Graph meta tags, instantly.","util"),
 "password-generator": ("Password & Passphrase Generator","Strong, secure passwords and passphrases.","util"),
 "schema-markup-generator": ("Schema Markup Generator","JSON-LD structured data for 12+ schema types.","util"),
 "sql-formatter": ("SQL Formatter","Format and beautify SQL queries.","util"),
 "text-diff": ("Text Diff Checker","Compare two texts or code blocks line by line.","util"),
 "timestamp-converter": ("Unix Timestamp Converter","Epoch to human date and back.","util"),
 "uuid-generator": ("UUID Generator","Generate UUID v4 / v1, one or many.","util"),
 "word-counter": ("Word Counter & Readability","Word, character counts and readability score.","util"),
 "xml-sitemap-generator": ("XML Sitemap Generator","Build a valid sitemap.xml in seconds.","util"),
 "ai-robots-txt-generator": ("AI Robots.txt Generator","Block GPTBot, ClaudeBot and 25+ AI crawlers.","util"),
 "ai-landing-page-builder": ("AI Landing Page Builder","Launch a landing page in minutes.","util"),
 # --- Life & Learning ---
 "ai-horoscope-generator": ("AI Horoscope Generator","Daily horoscope and star-sign readings.","life"),
 "ai-eulogy-writer": ("AI Eulogy Writer","A heartfelt eulogy, when words are hard.","life"),
}

# sanity: every add slug is mapped
missing_map = [s for s in add if s not in T]
assert not missing_map, ("UNMAPPED: "+", ".join(missing_map))

# HTML-escape helper matching site convention (&#x27; for apostrophe)
def esc(s):
    return (s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
             .replace('"',"&quot;").replace("'","&#x27;"))

def card(slug):
    name,blurb,_ = T[slug]
    return (f'      <a class="tool" href="/tools/{slug}.html">\n'
            f'        <div class="tool-name">{esc(name)}</div>\n'
            f'        <div class="tool-blurb">{esc(blurb)}</div>\n'
            f'        <span class="tool-go">Open &#8594;</span>\n'
            f'      </a>')

groups={"studio":[],"biz":[],"dev":[],"util":[],"life":[]}
for s in add: groups[T[s][2]].append(card(s))

for k,v in groups.items():
    open(os.path.join(scr,f"cards_{k}.html"),"w").write("\n".join(v)+"\n")
    print(f"{k}: {len(v)} cards")
print("TOTAL cards:", sum(len(v) for v in groups.values()))
