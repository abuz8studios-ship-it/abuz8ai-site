/* ABUZ8 Blog — shared footer, related articles, and ad placeholders.
   Include at the bottom of every blog post: <script src="/blog/_blog-shared.js"></script>
   Created 2026-06-05 for AdSense rebuild. */

(function(){
  // Cinematic ambient layer — matches abuz8-theme.css
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

  // Related articles — curated sets by topic keyword matching
  const related = {
    'agent': [
      {url:'/blog/what-is-an-ai-agent',tag:'Fundamentals',title:'What Is an AI Agent?',desc:'The honest 2026 definition.'},
      {url:'/blog/ai-agent-vs-ai-chatbot',tag:'Comparison',title:'AI Agent vs AI Chatbot',desc:'One answers. One acts.'},
      {url:'/blog/best-ai-agent-platform-2026',tag:'Ranking',title:'Best AI Agent Platforms 2026',desc:'Tested and ranked.'},
      {url:'/blog/how-to-build-a-jarvis',tag:'Tutorial',title:'How to Build a Jarvis',desc:'Step-by-step local AI assistant.'}
    ],
    'video': [
      {url:'/blog/ai-video-generator-online',tag:'Guide',title:'AI Video Generator Online',desc:'Text-to-video tools compared.'},
      {url:'/blog/best-ai-video-models-2026',tag:'Ranking',title:'Best AI Video Models 2026',desc:'Models actually worth using.'},
      {url:'/blog/ai-long-video-generator',tag:'Advanced',title:'AI Long Video Generator',desc:'Beyond 10-second clips.'},
      {url:'/blog/ai-ugc-video-creator-free',tag:'Free Tool',title:'AI UGC Video Creator',desc:'User-generated content on autopilot.'}
    ],
    'image': [
      {url:'/blog/free-ai-image-generator-no-signup',tag:'Free',title:'Free AI Image Generator',desc:'No signup required.'},
      {url:'/blog/free-ai-headshot-generator',tag:'Guide',title:'Free AI Headshot Generator',desc:'Professional headshots from selfies.'},
      {url:'/blog/ai-background-remover-free',tag:'Free Tool',title:'AI Background Remover',desc:'Remove backgrounds instantly.'},
      {url:'/blog/ai-image-upscaler-free-online',tag:'Upscaler',title:'AI Image Upscaler Free',desc:'4K quality from any photo.'}
    ],
    'tool': [
      {url:'/blog/best-ai-tools-2026',tag:'Ranking',title:'Best AI Tools 2026',desc:'Tested and ranked honestly.'},
      {url:'/blog/best-ai-tools-for-solopreneurs-2026',tag:'Business',title:'AI Tools for Solopreneurs',desc:'The essentials for one-person businesses.'},
      {url:'/blog/ai-tools-that-run-offline',tag:'Local AI',title:'AI Tools That Run Offline',desc:'No internet, no cloud, full power.'},
      {url:'/blog/free-ai-design-tools-online-2026',tag:'Design',title:'Free AI Design Tools',desc:'Design without a designer.'}
    ],
    'default': [
      {url:'/blog/what-is-an-ai-agent',tag:'Fundamentals',title:'What Is an AI Agent?',desc:'The honest 2026 definition.'},
      {url:'/blog/best-ai-tools-2026',tag:'Ranking',title:'Best AI Tools 2026',desc:'Tested and ranked.'},
      {url:'/blog/local-ai-vs-cloud-ai',tag:'Architecture',title:'Local AI vs Cloud AI',desc:'Privacy, cost, and capability.'},
      {url:'/blog/how-to-build-a-jarvis',tag:'Tutorial',title:'How to Build a Jarvis',desc:'Your own AI assistant.'}
    ]
  };

  // Detect topic from URL or page title
  const path = location.pathname.toLowerCase();
  const title = (document.title || '').toLowerCase();
  let topic = 'default';
  if (path.includes('agent') || title.includes('agent')) topic = 'agent';
  else if (path.includes('video') || title.includes('video')) topic = 'video';
  else if (path.includes('image') || path.includes('photo') || path.includes('headshot') || title.includes('image')) topic = 'image';
  else if (path.includes('tool') || title.includes('tool')) topic = 'tool';

  // Filter out current page from related
  const articles = (related[topic] || related['default']).filter(a => a.url !== path && !path.endsWith(a.url));

  // Build related articles HTML
  const container = document.querySelector('.container');
  if (!container) return;

  // Inject STORE CTA (added 2026-06-12 — funnel blog readers to the live 29-product store)
  const storeCta = document.createElement('div');
  storeCta.setAttribute('style','margin-top:50px;padding:32px;background:linear-gradient(135deg,#0d1a30,#0f2040);border:1px solid #c9a84c;border-radius:18px;text-align:center;');
  storeCta.innerHTML =
    '<div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#2fbf8f;font-weight:600;margin-bottom:10px;">Done reading? Start building.</div>' +
    '<h3 style="color:#f5f0e8;font-family:\'Playfair Display\',serif;font-size:24px;margin:0 0 10px;">Own the toolkit, not just the tutorial</h3>' +
    '<p style="color:#8a9aaa;margin:0 0 20px;font-size:15px;">28 instant-download AI toolkits &amp; playbooks — the same local-first stack ABUZ8 runs on. Secure Stripe checkout. Tested before it\'s sold.</p>' +
    '<a href="/store.html" style="display:inline-block;padding:14px 30px;background:#c9a84c;color:#0a1628;border-radius:999px;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-size:13px;text-decoration:none;">Shop the Store &rarr;</a>';
  container.appendChild(storeCta);

  // Inject ad placeholder before related articles
  const adSlot = document.createElement('div');
  adSlot.className = 'ad-slot ad-slot-inline';
  adSlot.innerHTML = '<!-- AdSense in-article ad — activate after publisher ID approved -->';
  container.appendChild(adSlot);

  // Inject related articles
  if (articles.length > 0) {
    const relSection = document.createElement('div');
    relSection.className = 'related-articles';
    relSection.innerHTML = '<h3>Related Articles</h3><div class="related-grid">' +
      articles.slice(0, 4).map(a =>
        '<a href="' + a.url + '" class="related-card">' +
        '<div class="tag">' + a.tag + '</div>' +
        '<h4>' + a.title + '</h4>' +
        '<p>' + a.desc + '</p></a>'
      ).join('') + '</div>';
    container.appendChild(relSection);
  }

  // Inject footer with nav links
  const foot = document.createElement('div');
  foot.className = 'foot';
  foot.innerHTML =
    '<div class="blog-footer-links">' +
    '<a href="/">Home</a>' +
    '<a href="/store.html" style="color:#c9a84c;font-weight:700;">Store</a>' +
    '<a href="/tools">Free AI Tools</a>' +
    '<a href="/blog/">All Guides</a>' +
    '<a href="/trending">Trending</a>' +
    '<a href="/news">AI News</a>' +
    '<a href="/about">About</a>' +
    '<a href="/contact">Contact</a>' +
    '<a href="/privacy">Privacy</a>' +
    '<a href="/terms">Terms</a>' +
    '<a href="/disclaimer">Disclaimer</a>' +
    '</div>' +
    '<p>&copy; 2026 ABUZ8 LLC &middot; <a href="/">abuz8ai.com</a></p>';
  container.appendChild(foot);
})();
