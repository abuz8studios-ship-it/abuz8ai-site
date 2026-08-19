/**
 * ABUZ8 Zait Chat Widget — Drop-in embed
 * Usage: <script src="/zait-widget.js" defer></script>
 * Connects to /api/chat (Pages Function → Qadir Core)
 * Design: ABUZ8 design system — lapis + gold + turq
 * ABUZ8 LLC — 2026
 */
(function () {
  'use strict';
  if (document.getElementById('zait-widget-root')) return; // already mounted

  /* ── CSS ─────────────────────────────────────────── */
  const css = `
    :root {
      --zw-lapis:   #0a1628;
      --zw-lapis2:  #0f2040;
      --zw-lapis3:  #163060;
      --zw-gold:    #c9a84c;
      --zw-gold2:   #e8d48b;
      --zw-turq:    #0e9f6e;
      --zw-turq2:   #2fbf8f;
      --zw-cream:   #f5f0e8;
      --zw-text:    #e8e4d8;
      --zw-dim:     #8a9aaa;
      --zw-border:  #1a2e50;
      --zw-radius:  14px;
      --zw-shadow:  0 8px 40px rgba(0,0,0,.55);
    }
    #zait-btn {
      position: fixed; bottom: 28px; right: 28px; z-index: 99990;
      width: 62px; height: 62px; border-radius: 50%;
      background: var(--zw-gold); border: none; cursor: pointer;
      box-shadow: 0 4px 24px rgba(201,168,76,.45);
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s, box-shadow .2s;
    }
    #zait-btn:hover { transform: scale(1.07); box-shadow: 0 6px 32px rgba(201,168,76,.65); }
    #zait-btn svg { width: 28px; height: 28px; fill: var(--zw-lapis); }
    #zait-btn.open svg.icon-chat { display: none; }
    #zait-btn:not(.open) svg.icon-close { display: none; }
    #zait-panel {
      position: fixed; bottom: 102px; right: 28px; z-index: 99989;
      width: 370px; max-width: calc(100vw - 40px);
      background: var(--zw-lapis2); border: 1px solid var(--zw-border);
      border-radius: var(--zw-radius); box-shadow: var(--zw-shadow);
      display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; transform: translateY(16px) scale(.97);
      pointer-events: none;
      transition: opacity .22s ease, transform .22s ease;
    }
    #zait-panel.open {
      opacity: 1; transform: translateY(0) scale(1); pointer-events: all;
    }
    #zait-header {
      background: var(--zw-lapis); padding: 14px 18px;
      display: flex; align-items: center; gap: 11px;
      border-bottom: 1px solid var(--zw-border);
    }
    .zait-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg, var(--zw-turq), var(--zw-turq2));
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .zait-meta { flex: 1; }
    .zait-name { font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: 700; color: var(--zw-cream); }
    .zait-status { font-family: Inter, sans-serif; font-size: 11px; color: var(--zw-turq2); margin-top: 2px; }
    .zait-status::before { content: '●'; margin-right: 4px; }
    #zait-messages {
      flex: 1; overflow-y: auto; padding: 16px; max-height: 340px;
      display: flex; flex-direction: column; gap: 12px;
      font-family: Inter, sans-serif; font-size: 14px;
      scrollbar-width: thin; scrollbar-color: var(--zw-border) transparent;
    }
    .zm { display: flex; flex-direction: column; max-width: 86%; }
    .zm.user { align-self: flex-end; align-items: flex-end; }
    .zm.bot  { align-self: flex-start; }
    .zm-bubble {
      padding: 9px 14px; border-radius: 12px; line-height: 1.5; word-break: break-word;
    }
    .zm.user .zm-bubble { background: var(--zw-lapis3); color: var(--zw-gold2); border-bottom-right-radius: 4px; }
    .zm.bot  .zm-bubble { background: var(--zw-lapis);  color: var(--zw-text);  border-bottom-left-radius: 4px; }
    .zm-time { font-size: 10px; color: var(--zw-dim); margin-top: 3px; padding: 0 2px; }
    .zm-typing .zm-bubble { display: flex; gap: 5px; align-items: center; }
    .zm-typing .zm-bubble span {
      width: 7px; height: 7px; border-radius: 50%; background: var(--zw-turq2);
      animation: zait-bounce 1.1s infinite ease-in-out;
    }
    .zm-typing .zm-bubble span:nth-child(2) { animation-delay: .18s; }
    .zm-typing .zm-bubble span:nth-child(3) { animation-delay: .36s; }
    @keyframes zait-bounce { 0%,80%,100%{transform:scale(.6)} 40%{transform:scale(1)} }
    #zait-input-row {
      display: flex; gap: 8px; padding: 12px 14px;
      border-top: 1px solid var(--zw-border); background: var(--zw-lapis);
    }
    #zait-input {
      flex: 1; background: var(--zw-lapis2); border: 1px solid var(--zw-border);
      border-radius: 8px; padding: 9px 12px; color: var(--zw-text);
      font-family: Inter, sans-serif; font-size: 14px; outline: none;
      transition: border-color .2s;
    }
    #zait-input:focus { border-color: var(--zw-gold); }
    #zait-input::placeholder { color: var(--zw-dim); }
    #zait-send {
      width: 40px; height: 40px; border-radius: 8px;
      background: var(--zw-gold); border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .2s, transform .15s; flex-shrink: 0;
    }
    #zait-send:hover { background: var(--zw-gold2); transform: scale(1.05); }
    #zait-send:disabled { opacity: .4; cursor: not-allowed; transform: none; }
    #zait-send svg { width: 18px; height: 18px; fill: var(--zw-lapis); }
    .zait-branding {
      text-align: center; padding: 6px; font-family: Inter, sans-serif;
      font-size: 10px; color: var(--zw-dim);
      background: var(--zw-lapis); border-top: 1px solid var(--zw-border);
    }
    .zait-branding a { color: var(--zw-gold); text-decoration: none; }
    @media (max-width: 440px) {
      #zait-panel { right: 12px; bottom: 90px; width: calc(100vw - 24px); }
      #zait-btn   { right: 16px; bottom: 16px; }
    }
  `;

  /* ── Inject CSS ───────────────────────────────────── */
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── HTML ─────────────────────────────────────────── */
  const root = document.createElement('div');
  root.id = 'zait-widget-root';
  root.innerHTML = `
    <button id="zait-btn" aria-label="Chat with Zait">
      <svg class="icon-chat" viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
      <svg class="icon-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </button>
    <div id="zait-panel" role="dialog" aria-label="Chat with Zait">
      <div id="zait-header">
        <div class="zait-avatar">⚡</div>
        <div class="zait-meta">
          <div class="zait-name">Zait — ABUZ8 AI</div>
          <div class="zait-status" id="zait-status-text">Online</div>
        </div>
      </div>
      <div id="zait-messages" aria-live="polite"></div>
      <div id="zait-input-row">
        <input id="zait-input" type="text" placeholder="Ask me anything…" maxlength="500" autocomplete="off"/>
        <button id="zait-send" aria-label="Send">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div class="zait-branding">Powered by <a href="https://abuz8ai.com" target="_blank">ABUZ8</a></div>
    </div>
  `;
  document.body.appendChild(root);

  /* ── State ────────────────────────────────────────── */
  const btn       = document.getElementById('zait-btn');
  const panel     = document.getElementById('zait-panel');
  const msgs      = document.getElementById('zait-messages');
  const input     = document.getElementById('zait-input');
  const sendBtn   = document.getElementById('zait-send');
  const statusTxt = document.getElementById('zait-status-text');
  const SESSION   = 'zs-' + Math.random().toString(36).slice(2, 10);
  let isOpen = false;
  let isBusy = false;
  let greeted = false;

  /* ── Helpers ──────────────────────────────────────── */
  function ts() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function addMsg(role, text) {
    const el = document.createElement('div');
    el.className = 'zm ' + role;
    el.innerHTML = `<div class="zm-bubble">${escHtml(text)}</div><div class="zm-time">${ts()}</div>`;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'zm bot zm-typing';
    el.id = 'zait-typing';
    el.innerHTML = '<div class="zm-bubble"><span></span><span></span><span></span></div>';
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('zait-typing');
    if (el) el.remove();
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── API ──────────────────────────────────────────── */
  async function sendToZait(message) {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, session_id: SESSION }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.reply || "Got it — I'll look into that.";
      }
    } catch (_e) { /* handled below */ }
    return "I'm having trouble connecting right now. Email ahmad@abuz8ai.com or check abuz8ai.com/store.";
  }

  /* ── Send flow ────────────────────────────────────── */
  async function handleSend() {
    const msg = input.value.trim();
    if (!msg || isBusy) return;
    isBusy = true;
    input.value = '';
    sendBtn.disabled = true;
    statusTxt.textContent = 'Thinking…';

    addMsg('user', msg);
    showTyping();

    const reply = await sendToZait(msg);
    hideTyping();
    addMsg('bot', reply);

    isBusy = false;
    sendBtn.disabled = false;
    statusTxt.textContent = 'Online';
    input.focus();
  }

  /* ── Toggle ───────────────────────────────────────── */
  function togglePanel() {
    isOpen = !isOpen;
    btn.classList.toggle('open', isOpen);
    panel.classList.toggle('open', isOpen);
    if (isOpen) {
      input.focus();
      if (!greeted) {
        greeted = true;
        setTimeout(() => {
          addMsg('bot', 'Hey — I\'m Zait, ABUZ8\'s AI. Ask me about QADIR OS, the tools, or anything on the site. What can I help with?');
        }, 300);
      }
    }
  }

  /* ── Events ───────────────────────────────────────── */
  btn.addEventListener('click', togglePanel);
  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (isOpen && !root.contains(e.target)) togglePanel();
  }, { passive: true });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) togglePanel();
  });

})();
