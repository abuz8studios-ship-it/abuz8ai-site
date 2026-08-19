/* ABUZ8 Tools — shared footer with internal links to matching blog guides.
   Include at the bottom of every tool page: <script src="/tools/_tools-shared.js" defer></script>
   Created 2026-06-05 for AdSense rebuild. */

(function(){
  // Cinematic ambient layer — matches abuz8-theme.css
  // Slow-drift orbs + dark gradient; seizure-safe (>=9s cycles, no flashing)
  var css = document.createElement('style');
  css.textContent = '@keyframes abz-orb{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-28px) scale(1.07)}}@media(prefers-reduced-motion:reduce){.abz-orb{animation:none !important}}';
  document.head.appendChild(css);
  document.body.style.background = 'radial-gradient(1100px 700px at 85% -10%,rgba(38,97,156,.28),transparent 60%),radial-gradient(900px 600px at -10% 15%,rgba(14,159,110,.14),transparent 55%),radial-gradient(1000px 800px at 50% 115%,rgba(201,168,76,.10),transparent 60%),linear-gradient(180deg,#0c1b33 0%,#0a1628 34%,#081120 100%)';
  document.body.style.backgroundAttachment = 'fixed';
  document.body.style.minHeight = '100vh';
  var o1 = document.createElement('div');
  o1.className = 'abz-orb';
  o1.style.cssText = 'position:fixed;border-radius:50%;filter:blur(110px);pointer-events:none;z-index:0;width:520px;height:520px;top:-120px;right:-120px;background:radial-gradient(circle,rgba(14,159,110,.25),transparent 70%);animation:abz-orb 9s ease-in-out infinite';
  var o2 = document.createElement('div');
  o2.className = 'abz-orb';
  o2.style.cssText = 'position:fixed;border-radius:50%;filter:blur(110px);pointer-events:none;z-index:0;width:420px;height:420px;bottom:-80px;left:-120px;background:radial-gradient(circle,rgba(201,168,76,.4),transparent 70%);animation:abz-orb 12s ease-in-out infinite 3s';
  document.body.appendChild(o1);
  document.body.appendChild(o2);

  // Map tool slugs to their matching blog guide
  const toolToGuide = {
    'ai-background-remover': '/blog/ai-background-remover-free',
    'ai-headshot': '/blog/free-ai-headshot-generator',
    'ai-resume-builder': '/blog/ai-resume-builder-free',
    'ai-logo-generator': '/blog/free-ai-logo-generator',
    'ai-video-generator': '/blog/ai-video-generator-online',
    'ai-music-generator': '/blog/free-ai-music-generator',
    'ai-cartoon': '/blog/ai-cartoon-generator',
    'ai-face-swap': '/blog/ai-face-swap-free',
    'ai-qr-art': '/blog/free-ai-qr-code-art-generator',
    'ai-lipsync': '/blog/ai-lipsync-talking-photo',
    'ai-image-upscaler': '/blog/ai-image-upscaler-free-online',
    'ai-style-transfer': '/blog/ai-style-transfer-photo-art',
    'ai-sound-effects': '/blog/ai-sound-effects-generator',
    'ai-thumbnail-maker': '/blog/ai-thumbnail-maker',
    'ai-room-redesign': '/blog/ai-room-redesign-tool-free',
    'json-formatter': '/blog/json-formatter-online',
    'color-contrast-checker': '/blog/color-contrast-checker',
    'css-gradient-generator': '/blog/css-gradient-generator',
    'cron-generator': '/blog/cron-expression-generator',
    'regex-tester': '/blog/ai-regex-tester',
    'ai-sdr-agent': '/blog/ai-sdr-agent-free',
    'ai-anime-art': '/blog/ai-anime-art-generator-manhwa'
  };

  const slug = location.pathname.replace('/tools/','').replace(/\.html$/,'').replace(/\/$/,'');
  const guideUrl = toolToGuide[slug];
  
  // Build footer HTML
  const body = document.body;
  const footer = document.createElement('div');
  footer.style.cssText = 'max-width:760px;margin:40px auto;padding:0 24px 60px;';
  
  let html = '';
  if (guideUrl) {
    html += '<div style="background:#0d1a30;border:1px solid #1a2e50;border-left:3px solid #c9a84c;border-radius:8px;padding:20px 24px;margin-bottom:30px;">';
    html += '<p style="color:#e8e4d8;font-size:15px;margin:0;">📖 <strong>Read the full guide:</strong> <a href="' + guideUrl + '" style="color:#2fbf8f;">' + document.title.split('—')[0].trim() + ' — Complete Guide</a></p>';
    html += '</div>';
  }
  
  // ABUZ8 store CTA — closes the tools→store conversion leak (added 2026-06-11)
  html += '<div style="text-align:center;margin-bottom:24px;">';
  html += '<a href="/store" style="display:inline-block;background:#c9a84c;color:#0a1628;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:8px;">⚡ Get the full AI suite — Early Access</a>';
  html += '</div>';
  html += '<div style="border-top:1px solid #1a2e50;padding-top:20px;text-align:center;">';
  html += '<div style="display:flex;justify-content:center;gap:20px;flex-wrap:wrap;margin-bottom:12px;">';
  html += '<a href="/" style="color:#8a9aaa;font-size:12px;">Home</a>';
  html += '<a href="/tools" style="color:#8a9aaa;font-size:12px;">All Tools</a>';
  html += '<a href="/blog/" style="color:#8a9aaa;font-size:12px;">Guides</a>';
  html += '<a href="/trending" style="color:#8a9aaa;font-size:12px;">Trending</a>';
  html += '<a href="/about" style="color:#8a9aaa;font-size:12px;">About</a>';
  html += '<a href="/privacy" style="color:#8a9aaa;font-size:12px;">Privacy</a>';
  html += '<a href="/terms" style="color:#8a9aaa;font-size:12px;">Terms</a>';
  html += '<a href="/refund" style="color:#8a9aaa;font-size:12px;">Refund</a>';
  html += '<a href="/license" style="color:#8a9aaa;font-size:12px;">License</a>';
  html += '</div>';
  html += '<p style="color:#556070;font-size:12px;">&copy; 2026 ABUZ8 LLC &middot; <a href="/" style="color:#0e9f6e;">abuz8ai.com</a></p>';
  html += '</div>';
  
  footer.innerHTML = html;
  body.insertBefore(footer, body.querySelector('script[src*="dfy-banner"]') || body.lastChild);
})();
