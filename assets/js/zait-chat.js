(function() {
  const WORKER_URL = 'https://ai-tools.wireconn1.workers.dev';
  const WAITLIST_URL = 'https://waiting-list.wireconn1.workers.dev';

  // Smart FAQ — instant answers, no API call needed
  const FAQ = {
    'pricing|cost|how much|price|pay': 'Most tools have a free tier you can use right now. Premium features and higher-quality outputs are available through early access. Check the <a href="/store.html">Store</a> for details.',
    'free|no cost': 'Yes! We have 5 completely free tools (color palette, gradient generator, contrast checker, JSON formatter, regex tester) plus free tiers on all AI tools. Try them at <a href="/tools.html">Tools</a>.',
    'waiting list|early access|sign up|join': 'Want early access to premium features? Drop your email and I\'ll add you. Which tool are you interested in?',
    'contact|talk to|human|support|help': 'I handle most questions here. For enterprise inquiries ($50K+), I can connect you with our founder. Otherwise, ask me anything about our tools and services.',
    'what is abuz8|about|who are you': 'ABUZ8 AI builds sovereign AI tools that run on your own hardware. 25+ tools for creative work — headshots, video, music, logos, and more. No cloud dependency, no subscriptions locking you in.',
    'qadir|agent|os|operating system': 'QADIR OS is our sovereign agentic operating system — it routes between local and cloud AI models, learns your workflows, and executes tasks autonomously. Currently in active development with early access available.',
    'headshot|portrait|photo': 'Our AI Headshot Generator creates professional headshots from a single photo. Try it: <a href="/tools/ai-headshot-generator.html">AI Headshots</a>',
    'video|clip|footage': 'The AI Video Generator creates cinematic clips from text prompts using LTX-2 and Wan 2.2 models. Try it: <a href="/tools/ai-video-generator.html">Video Generator</a>',
    'music|audio|sound|sfx': 'Generate royalty-free music tracks and sound effects with AI. Choose genre, mood, and duration. Try it: <a href="/tools/ai-music-generator.html">Music Generator</a>',
    'logo|brand|icon': 'Our AI Logo Generator creates professional logos from your description. Try it: <a href="/tools/ai-logo-generator.html">Logo Generator</a>',
    'resume|cv|job': 'The AI Resume Builder creates ATS-optimized resumes from your experience. Try it: <a href="/tools/ai-resume-builder.html">Resume Builder</a>',
    'face swap|swap face': 'AI Face Swap lets you seamlessly swap faces between photos. Try it: <a href="/tools/ai-face-swap.html">Face Swap</a>',
    'background|remove bg|remover': 'AI Background Remover cleanly extracts subjects from any photo. Try it: <a href="/tools/ai-background-remover.html">Background Remover</a>',
    'upscale|enhance|resolution': 'AI Image Upscaler enhances images to 4x resolution using UltraSharp models. Try it: <a href="/tools/ai-image-upscaler.html">Image Upscaler</a>',
    'cartoon|avatar|anime': 'Turn any photo into a cartoon or anime-style avatar. Try it: <a href="/tools/ai-cartoon-avatar.html">Cartoon Maker</a>',
    'qr|qr code': 'Create artistic QR codes that actually work with AI styling. Try it: <a href="/tools/ai-qr-art-generator.html">QR Art Generator</a>',
    'thumbnail': 'AI Thumbnail Maker creates eye-catching thumbnails for YouTube, social media, and more. Try it: <a href="/tools/ai-thumbnail-maker.html">Thumbnail Maker</a>',
    'room|interior|redesign': 'AI Room Redesign transforms room photos into new styles. Try it: <a href="/tools/ai-room-redesign.html">Room Redesign</a>',
    'product photo': 'AI Product Photo Generator creates professional product shots. Try it: <a href="/tools/ai-product-photo.html">Product Photos</a>',
    'lipsync|lip sync|talking head|talk': 'AI Lipsync makes any portrait photo talk with realistic lip movements. Try it: <a href="/tools/ai-lipsync.html">Lipsync Generator</a>',
    'seo|meta tag': 'Our SEO Meta Generator creates optimized title tags and descriptions. Try it: <a href="/tools/seo-meta-generator.html">SEO Meta Gen</a>',
    'bio|biography': 'AI Bio Writer generates professional bios for LinkedIn, Twitter, and more. Try it: <a href="/tools/bio-writer.html">Bio Writer</a>',
    'slogan|tagline': 'Generate catchy slogans and taglines for your brand. Try it: <a href="/tools/slogan-generator.html">Slogan Generator</a>',
    'hashtag': 'Get optimized hashtags organized by reach category. Try it: <a href="/tools/hashtag-generator.html">Hashtag Generator</a>',
    'email subject|subject line': 'Test and optimize your email subject lines. Try it: <a href="/tools/email-subject-tester.html">Email Subject Tester</a>',
    'ad copy|ads|advertising': 'Generate high-converting ad copy for any platform. Try it: <a href="/tools/ad-copy-generator.html">Ad Copy Generator</a>',
    'hello|hi|hey|salam|yo|sup': null // handled specially
  };

  // Waiting list email capture state
  let awaitingEmail = false;
  let awaitingProduct = '';

  const chatHtml = `
    <div id="zait-chat-toggle" class="zait-chat-toggle" aria-label="Chat with Zait AI">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
    </div>
    <div id="zait-chat-window" class="zait-chat-window">
      <div class="zait-chat-header">
        <div class="zait-chat-avatar">Z</div>
        <div class="zait-chat-title">
          <strong>Zait — AI Assistant</strong>
          <span>ABUZ8 AI</span>
        </div>
        <button onclick="toggleZaitChat()" style="background:transparent; border:none; color:#8a9aaa; cursor:pointer; font-size:20px;">&times;</button>
      </div>
      <div id="zait-chat-messages" class="zait-chat-messages">
        <div class="zait-msg zait-msg-agent">Hey! I'm Zait. I can help you find the right AI tool, answer questions, or get you on the early access list. What are you looking for?</div>
      </div>
      <div class="zait-quick-actions" id="zait-quick-actions">
        <button onclick="zaitQuick('Show me all tools')">All Tools</button>
        <button onclick="zaitQuick('What\\'s free?')">Free Tools</button>
        <button onclick="zaitQuick('Join early access')">Early Access</button>
        <button onclick="zaitQuick('Tell me about QADIR OS')">QADIR OS</button>
      </div>
      <form id="zait-chat-form" class="zait-chat-input">
        <input type="text" id="zait-msg-input" placeholder="Ask me anything..." autocomplete="off">
        <button type="submit">&rarr;</button>
      </form>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', chatHtml);

  const toggle = document.getElementById('zait-chat-toggle');
  const windowEl = document.getElementById('zait-chat-window');
  const form = document.getElementById('zait-chat-form');
  const input = document.getElementById('zait-msg-input');
  const messages = document.getElementById('zait-chat-messages');

  toggle.onclick = toggleZaitChat;

  window.toggleZaitChat = function() {
    const isVisible = windowEl.style.display === 'flex';
    windowEl.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) input.focus();
  };

  window.zaitQuick = function(msg) {
    input.value = msg;
    form.dispatchEvent(new Event('submit'));
    document.getElementById('zait-quick-actions').style.display = 'none';
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;

    addMessage(msg, 'user');
    input.value = '';

    // Handle email capture flow
    if (awaitingEmail) {
      if (msg.includes('@') && msg.includes('.')) {
        awaitingEmail = false;
        addMessage('Adding you to the list...', 'agent');
        try {
          await fetch(WAITLIST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: msg, product_id: awaitingProduct || 'general', source: 'zait-chat' })
          });
          addMessage('You\'re in! We\'ll notify you as soon as premium features go live. Anything else I can help with?', 'agent');
          if (typeof gtag === 'function') gtag('event', 'waiting_list_signup', { product: awaitingProduct || 'general', source: 'zait-chat' });
        } catch(err) {
          addMessage('Had trouble adding you. Try the signup form on the tool page instead.', 'agent');
        }
        awaitingProduct = '';
        return;
      } else {
        addMessage('That doesn\'t look like a valid email. Could you try again?', 'agent');
        return;
      }
    }

    // Check FAQ first
    const lower = msg.toLowerCase();

    // Greetings
    if (/^(hello|hi|hey|salam|yo|sup|what'?s up|howdy)/i.test(lower)) {
      addMessage('Hey! Good to have you here. What can I help you with? I know all 25+ AI tools inside and out.', 'agent');
      return;
    }

    // Check FAQ patterns
    for (const [pattern, answer] of Object.entries(FAQ)) {
      if (answer === null) continue;
      const regex = new RegExp(pattern, 'i');
      if (regex.test(lower)) {
        addMessageHTML(answer, 'agent');

        // If they asked about waiting list, trigger email capture
        if (pattern.includes('waiting list') || pattern.includes('early access')) {
          awaitingEmail = true;
          awaitingProduct = 'general';
          setTimeout(() => addMessage('Just drop your email here and I\'ll add you:', 'agent'), 800);
        }
        return;
      }
    }

    // Check if asking to join/signup for a specific tool
    if (/join|sign ?up|get access|try|want/i.test(lower)) {
      awaitingEmail = true;
      awaitingProduct = lower.includes('video') ? 'ai-video' : lower.includes('music') ? 'ai-music' : lower.includes('headshot') ? 'ai-headshot' : 'general';
      addMessage('I\'d love to get you set up! Drop your email and I\'ll add you to the early access list:', 'agent');
      return;
    }

    // All tools listing
    if (/all tools|every tool|what tools|show me|what do you have|what can/i.test(lower)) {
      addMessageHTML('We have 25+ AI tools across these categories:<br><br>' +
        '<b>Image:</b> Headshots, Logos, Product Photos, Background Remover, Upscaler, Cartoon/Avatar, Face Swap, QR Art, Thumbnails, Room Redesign<br><br>' +
        '<b>Video & Audio:</b> Video Generator, Music/SFX Generator, Lipsync/Talking Head<br><br>' +
        '<b>Text:</b> Resume Builder, Bio Writer, Slogan Generator, Hashtag Generator, Email Subject Tester, Ad Copy, SEO Meta<br><br>' +
        '<b>Dev Tools (Free):</b> Color Palette, Gradient Generator, Contrast Checker, JSON Formatter, Regex Tester<br><br>' +
        'Browse them all: <a href="/tools.html">Tool Hub</a>', 'agent');
      return;
    }

    // Fallback — use AI Worker for general questions
    addMessage('Let me think about that...', 'agent', true);
    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'bio-writer',
          data: {
            name: 'Zait',
            role: 'AI assistant for ABUZ8 AI tools platform',
            achievements: 'Answer this user question helpfully and concisely (2-3 sentences max). User asked: ' + msg,
            platform: 'chat',
            tone: 'Friendly and direct'
          }
        })
      });
      const data = await response.json();
      // Remove the thinking message
      const thinking = messages.querySelector('.zait-thinking');
      if (thinking) thinking.remove();

      if (data.result) {
        // Extract a reasonable response (first sentence or two)
        const clean = data.result.split('\n').filter(l => l.trim()).slice(0, 3).join(' ').substring(0, 300);
        addMessage(clean || 'I\'m not sure about that one. Could you try rephrasing, or check our <a href="/tools.html">Tools page</a>?', 'agent');
      } else {
        addMessage('I\'m not sure about that. You can browse all our tools at <a href="/tools.html">the Tool Hub</a>, or ask me about a specific tool.', 'agent');
      }
    } catch (err) {
      const thinking = messages.querySelector('.zait-thinking');
      if (thinking) thinking.remove();
      addMessage('I\'m having a connection hiccup. Try browsing our <a href="/tools.html">Tool Hub</a> directly, or ask me something specific about a tool.', 'agent');
    }
  };

  function addMessage(text, side, isThinking) {
    const div = document.createElement('div');
    div.className = `zait-msg zait-msg-${side}`;
    if (isThinking) div.classList.add('zait-thinking');
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function addMessageHTML(html, side) {
    const div = document.createElement('div');
    div.className = `zait-msg zait-msg-${side}`;
    div.innerHTML = html;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
})();
