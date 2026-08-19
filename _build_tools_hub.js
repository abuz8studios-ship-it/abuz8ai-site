// ABUZ8 — generate tools.html hub from a curated, deduped catalog.
// Run: node _build_tools_hub.js   (writes tools.html). 2026-05-20.
const fs = require('fs');
const path = require('path');
const TOOLS_DIR = path.join(__dirname, 'tools');

// Curated catalog. Each entry: [file, label, blurb]. We link the BEST version
// (pro over stub) and drop duplicates. Categories group them cinematically.
const CAT = [
  ["Image & Video Studio", "Local-GPU creative tools. Powered by ComfyUI on our own hardware.", [
    ["ai-headshot-pro.html","AI Headshot Generator","Studio-grade professional headshots from your selfies."],
    ["ai-room-redesign-pro.html","AI Room Redesign","Reimagine any space in a new style, photoreal."],
    ["ai-video-generator-pro.html","AI Video Generator","Cinematic text-to-video and image-to-video clips."],
    ["ai-image-upscaler-pro.html","AI Image Upscaler","Upscale 2x–8x with UltraSharp / RealESRGAN."],
    ["ai-background-remover-pro.html","AI Background Remover","Clean cutouts and transparent PNGs."],
    ["ai-logo-generator-pro.html","AI Logo Generator","SDXL brand marks and logo concepts."],
    ["ai-anime-art-generator.html","AI Anime Art","Anime / manhwa style illustration."],
    ["ai-cartoon.html","AI Cartoon & Avatar","Turn a photo into a cartoon or avatar."],
    ["ai-consistent-character.html","AI Consistent Character","Same character across unlimited scenes."],
    ["ai-product-photos.html","AI Product Photos","Studio product shots from a plain photo."],
    ["ai-qr-art-generator.html","AI QR Art Generator","Artistic, scannable QR codes."],
    ["ai-face-swap.html","AI Face Swap","Swap faces cleanly between images."],
    ["ai-image-inpainting.html","AI Image Inpainting","Erase or replace parts of an image."],
    ["ai-style-transfer.html","AI Style Transfer","Repaint a photo in any visual style."],
    ["ai-thumbnail-maker.html","AI Thumbnail Maker","High-CTR video thumbnails."],
    ["ai-lipsync.html","AI Lipsync / Talking Head","Make a still photo speak with lip sync."],
    ["ai-video-to-video.html","AI Video-to-Video","Restyle and re-pose existing footage."],
    ["ai-long-video-stitcher.html","AI Long Video Stitcher","Stitch clips into long-form films."],
    ["ai-music-generator.html","AI Music Generator","Original music beds, royalty-free."],
    ["ai-sound-effects.html","AI Sound Effects","Generate SFX on demand."],
  ]],
  ["Writing & Marketing", "Draft faster. Local LLMs do the heavy lifting.", [
    ["ai-resume-builder.html","AI Resume & CV Builder","Tailored, ATS-friendly resumes."],
    ["ai-cover-letter.html","AI Cover Letter Writer","Role-specific cover letters."],
    ["ai-blog-writer.html","AI Blog Writer","Long-form, SEO-aware blog drafts."],
    ["ai-ad-copy.html","AI Ad Copy Generator","Conversion-focused ad variations."],
    ["ai-seo-meta.html","AI SEO Meta Generator","Titles and meta descriptions that rank."],
    ["ai-social-caption.html","AI Social Caption","Captions tuned per platform."],
    ["ai-hashtag-generator.html","AI Hashtag Generator","Relevant, reach-boosting hashtags."],
    ["ai-bio-writer.html","AI Bio Writer","Crisp profile bios in your voice."],
    ["ai-slogan-generator.html","AI Slogan Generator","Memorable taglines and slogans."],
    ["ai-cold-dm-templates.html","AI Cold DM Templates","Outreach that doesn't feel like spam."],
    ["ai-email-subject-tester.html","AI Email Subject Tester","Score and improve subject lines."],
    ["ai-email-signature.html","AI Email Signature","Clean, branded HTML signatures."],
  ]],
  ["Business & Strategy", "Board-room grade documents, drafted in minutes.", [
    ["ai-pitch-deck-review.html","AI Pitch Deck Reviewer","Honest, investor-lens feedback."],
    ["ai-fundraising-deck.html","AI Fundraising Deck","VC-ready pitch structure."],
    ["ai-board-deck-generator.html","AI Board Deck Generator","Clean board update decks."],
    ["ai-gtm-strategy.html","AI GTM Strategy","ICP, channels, messaging, timeline."],
    ["ai-pricing-strategy.html","AI Pricing Strategy","Tiers, unit economics, psychology."],
    ["ai-swot-analyzer.html","AI SWOT Analyzer","Structured SWOT in seconds."],
    ["ai-startup-validator.html","AI Startup Validator","Pressure-test an idea."],
    ["ai-competitor-analyzer.html","AI Competitor Analyzer","Map the competitive landscape."],
    ["ai-okr-generator.html","AI OKR Generator","Company and team OKR cascade."],
    ["ai-org-chart-builder.html","AI Org Chart Builder","Headcount plan and org chart."],
    ["ai-job-description-writer.html","AI Job Description Writer","Bias-checked, benchmarked JDs."],
    ["ai-crisis-comms-writer.html","AI Crisis Comms Writer","Calm, clear crisis messaging."],
    ["ai-persona-generator.html","AI Persona Generator","Detailed buyer personas."],
    ["ai-presentation-maker.html","AI Presentation Maker","Slide outlines and content."],
    ["ai-meeting-notes.html","AI Meeting Notes","Action items from raw notes."],
    ["ai-invoice-generator.html","AI Invoice Generator","Professional invoices, instant PDF."],
    ["ai-pricing-calculator.html","AI Pricing Calculator","Price your offer with confidence."],
  ]],
  ["Developer Tools", "For the people who actually ship.", [
    ["ai-api-tester.html","AI API Tester","Fire requests, inspect responses."],
    ["ai-sql-generator.html","AI SQL Generator","Natural language → dialect-correct SQL."],
    ["ai-code-review.html","AI Code Review","Spot bugs, smells, and risks."],
    ["ai-unit-test-generator.html","AI Unit Test Generator","Jest / pytest / Go test scaffolds."],
    ["ai-dependency-auditor.html","AI Dependency Auditor","Surface known CVEs in your deps."],
    ["ai-env-generator.html","AI ENV Generator","Generate .env across formats."],
    ["ai-error-explainer.html","AI Error Explainer","Plain-English error diagnosis."],
    ["ai-pr-description-generator.html","AI PR Description","Clear pull-request write-ups."],
    ["ai-commit-message-generator.html","AI Commit Messages","Conventional, readable commits."],
    ["ai-architecture-reviewer.html","AI Architecture Reviewer","Score a design across 5 dimensions."],
    ["ai-load-tester.html","AI Load Tester","Lightweight in-browser load tests."],
    ["ai-changelog-generator.html","AI Changelog Generator","Turn commits into a changelog."],
    ["ai-code-documentation.html","AI Code Documentation","Auto-document a codebase."],
    ["html-entities.html","HTML Entity Encoder / Decoder","Escape &amp; unescape HTML entities, both ways."],
    ["json-to-yaml.html","JSON &#8644; YAML Converter","Convert JSON to YAML and back, type-safe."],
    ["url-encoder.html","URL Encoder / Decoder","Percent-encode and decode URLs and query strings."],
  ]],
  ["Free Utilities", "No login. No gate. Runs in your browser.", [
    ["json-formatter.html","JSON Formatter","Format, validate, beautify JSON."],
    ["csv-to-json.html","CSV &#8644; JSON Converter","Convert CSV to JSON and back. RFC 4180, in your browser."],
    ["regex-tester.html","Regex Tester","Test and debug regex live."],
    ["css-gradient-generator.html","CSS Gradient Generator","Build gradients with live CSS."],
    ["color-palette-generator.html","Color Palette Generator","Harmonious 5-color palettes."],
    ["color-contrast-checker.html","Color Contrast Checker","WCAG AA/AAA contrast checks."],
    ["cron-generator.html","Cron Expression Generator","Build cron schedules visually."],
    ["ai-font-pairing.html","Font Pairing Tool","Pair Google Fonts beautifully."],
    ["ai-link-in-bio.html","Link in Bio Builder","A clean link-in-bio page."],
    ["ai-form-builder.html","Form Builder","Build embeddable forms."],
    ["ai-waiting-list-page.html","Waiting List Page","Generate a waitlist landing page."],
    ["ai-testimonial-widget.html","Testimonial Widget","Embeddable testimonial blocks."],
    ["ai-feedback-widget.html","Feedback Widget","Collect feedback with a webhook."],
    ["ai-privacy-policy-generator.html","Privacy Policy Generator","Draft a privacy policy."],
    ["ai-terms-of-service-generator.html","Terms of Service Generator","Draft terms of service."],
    ["ai-contract-templates.html","Contract Templates","Common contract starters."],
  ]],
  ["Life & Learning", "Useful, honest, free.", [
    ["ai-recipe-generator.html","AI Recipe Generator","Recipes from what you have."],
    ["ai-meal-planner.html","AI Meal Planner","Weekly meal plans."],
    ["ai-workout-generator.html","AI Workout Generator","Personalized workout plans."],
    ["ai-travel-planner.html","AI Travel Planner","Day-by-day itineraries."],
    ["ai-budget-planner.html","AI Budget Planner","Simple personal budgets."],
    ["ai-habit-tracker.html","AI Habit Tracker","Track and build habits."],
    ["ai-flashcard-maker.html","AI Flashcard Maker","Study flashcards from notes."],
    ["ai-baby-name-generator.html","AI Baby Name Generator","Name ideas with meanings."],
    ["ai-wedding-planner.html","AI Wedding Planner","Plan the big day."],
    ["ai-dream-journal.html","AI Dream Journal","Log and reflect on dreams."],
  ]],
];

// Verify every linked file actually exists; drop (and report) any that don't.
let missing = [];
let total = 0;
for (const [, , items] of CAT) {
  for (const it of items) {
    total++;
    if (!fs.existsSync(path.join(TOOLS_DIR, it[0]))) missing.push(it[0]);
  }
}
if (missing.length) {
  console.error("MISSING FILES (will not link):\n  " + missing.join("\n  "));
}

function cards(items){
  return items.filter(it => fs.existsSync(path.join(TOOLS_DIR, it[0]))).map(it =>
    `      <a class="tool" href="/tools/${it[0]}">
        <div class="tool-name">${it[1]}</div>
        <div class="tool-blurb">${it[2]}</div>
        <span class="tool-go">Open →</span>
      </a>`).join("\n");
}

const liveCount = CAT.reduce((n,[, ,items]) => n + items.filter(it => fs.existsSync(path.join(TOOLS_DIR, it[0]))).length, 0);

const sections = CAT.map(([title, sub, items]) => `
    <section class="cat">
      <div class="cat-head">
        <h2>${title}</h2>
        <p>${sub}</p>
      </div>
      <div class="grid">
${cards(items)}
      </div>
    </section>`).join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>All Tools — ABUZ8 AI</title>
<meta name="description" content="${liveCount} AI tools, free to use. Image and video studio on local GPUs, writing and marketing, business strategy, developer utilities, and more. Honest tools, real value.">
<link rel="canonical" href="https://abuz8ai.com/tools.html">
<meta property="og:title" content="All Tools — ABUZ8 AI">
<meta property="og:description" content="${liveCount} honest AI tools, free to use. Built on local GPUs.">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{--lapis:#0a1628;--lapis-2:#0d1a30;--lapis-3:#111f38;--gold:#c9a84c;--gold-2:#e6c879;--turq:#1a8a7a;--turq-2:#2bb39e;--cream:#f5f0e8;--text:#e8e4d8;--dim:#8a9aaa;--border:#1a2e50}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:var(--lapis);color:var(--text);font-family:'Inter',sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
a{text-decoration:none;color:var(--gold)}
.wrap{max-width:1180px;margin:0 auto;padding:28px 24px 80px}
.nav{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:18px;margin-bottom:8px}
.brand{font-family:'Playfair Display',serif;font-size:20px;color:var(--cream);letter-spacing:.5px}
.brand .acc{color:var(--gold)}
.nav-links a{color:var(--dim);font-size:12px;letter-spacing:1.5px;text-transform:uppercase;margin-left:20px}
.nav-links a:hover{color:var(--gold)}
.hero{padding:48px 0 24px;border-bottom:1px solid var(--border);margin-bottom:8px}
.hero .eyebrow{color:var(--turq-2);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;margin-bottom:14px}
.hero h1{font-family:'Playfair Display',serif;font-size:clamp(2.2rem,5vw,3.6rem);color:var(--cream);font-weight:900;line-height:1.05;margin-bottom:16px}
.hero h1 .g{color:var(--gold)}
.hero p{color:var(--dim);font-size:18px;font-weight:300;max-width:620px}
.hero .count{display:inline-block;margin-top:18px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--turq-2);border:1px solid var(--border);border-radius:999px;padding:6px 16px;letter-spacing:1px}
.search-wrap{margin:28px 0 8px}
.search{width:100%;max-width:480px;padding:13px 16px;background:var(--lapis-2);border:1px solid var(--border);border-radius:12px;color:var(--text);font-family:inherit;font-size:15px}
.search:focus{outline:none;border-color:var(--gold)}
.cat{margin-top:44px}
.cat-head h2{font-family:'Playfair Display',serif;font-size:26px;color:var(--cream);font-weight:700}
.cat-head p{color:var(--dim);font-size:13px;margin:4px 0 18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.tool{display:flex;flex-direction:column;background:var(--lapis-2);border:1px solid var(--border);border-radius:14px;padding:18px 18px 16px;transition:border-color .2s, transform .2s, box-shadow .2s;min-height:118px}
.tool:hover{border-color:var(--gold);transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,0,0,.35)}
.tool-name{font-size:15px;font-weight:700;color:var(--cream);margin-bottom:6px}
.tool-blurb{font-size:13px;color:var(--dim);flex:1;line-height:1.5}
.tool-go{margin-top:12px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--turq-2);font-weight:600}
.tool:hover .tool-go{color:var(--gold)}
.empty{display:none;color:var(--dim);font-style:italic;padding:24px 0}
.foot{margin-top:64px;padding-top:24px;border-top:1px solid var(--border);font-size:12px;color:var(--dim);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
.foot a{color:var(--gold)}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>
</head>
<body>
<div class="wrap">
  <nav class="nav">
    <div class="brand">ABUZ8 <span class="acc">·</span> Spaceport</div>
    <div class="nav-links">
      <a href="/index.html">Home</a>
      <a href="/agents.html">Agents</a>
      <a href="/store.html">Store</a>
      <a href="/status.html">Status</a>
    </div>
  </nav>

  <header class="hero">
    <div class="eyebrow">The Toolbox</div>
    <h1>Real tools.<br><span class="g">Honest value.</span> No gate.</h1>
    <p>Every tool here is something we actually built and use. The image and video studio runs on our own local GPUs. The utilities run right in your browser. Pick one and go.</p>
    <div class="count mono">${liveCount} tools live</div>
    <div class="search-wrap">
      <input id="search" class="search" type="search" placeholder="Search tools… (e.g. headshot, sql, resume)" aria-label="Search tools">
    </div>
  </header>

${sections}

  <div class="empty" id="empty">No tools match that search.</div>

  <footer class="foot">
    <div>© 2026 ABUZ8 · Every tool here is real and free to try.</div>
    <div><a href="/index.html">Home</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </footer>
</div>

<script>
(function(){
  var q = document.getElementById('search');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.tool'));
  var cats = Array.prototype.slice.call(document.querySelectorAll('.cat'));
  var empty = document.getElementById('empty');
  q.addEventListener('input', function(){
    var v = q.value.trim().toLowerCase();
    var anyVisible = false;
    cards.forEach(function(c){
      var hit = c.textContent.toLowerCase().indexOf(v) >= 0;
      c.style.display = hit ? '' : 'none';
      if(hit) anyVisible = true;
    });
    cats.forEach(function(cat){
      var vis = cat.querySelectorAll('.tool:not([style*="none"])').length;
      cat.style.display = vis ? '' : 'none';
    });
    empty.style.display = anyVisible ? 'none' : 'block';
  });
})();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'tools.html'), html, 'utf8');
console.log("WROTE tools.html | linked tools = " + liveCount + " | missing = " + missing.length);
// hub build complete

