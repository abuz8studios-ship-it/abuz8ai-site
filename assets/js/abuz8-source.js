/* Referrer chip: if you arrived from HF / OpenRouter / Ollama / GitHub, say so and keep the live link back. */
(function () {
  'use strict';
  var r = document.referrer || '';
  var host = '';
  try { host = new URL(r).hostname.replace(/^www\./, ''); } catch (e) { return; }
  var known = {
    'huggingface.co': {
      name: 'Hugging Face',
      page: '/huggingface.html',
      note: 'This board is live from their public API. We credit the authors and link out.'
    },
    'openrouter.ai': {
      name: 'OpenRouter',
      page: '/models.html',
      note: 'Prices and context on /models come from OpenRouter. We aggregate, we do not copy weights.'
    },
    'ollama.com': {
      name: 'Ollama',
      page: '/huggingface.html#tab=panel-local',
      note: 'The local tab lists live GGUF files you can run with Ollama, llama.cpp, or LM Studio.'
    },
    'github.com': {
      name: 'GitHub',
      page: '/github.html',
      note: 'Trending repos are parsed from GitHub itself and linked to the original repos.'
    }
  };
  var k = known[host];
  if (!k) return;
  if (document.getElementById('abuz8-source-bar')) return;
  var style = document.createElement('style');
  style.textContent =
    '#abuz8-source-bar{position:relative;z-index:40;background:rgba(14,159,110,.10);border-bottom:1px solid var(--border,rgba(232,212,139,.22));padding:10px 24px;font-size:13px;color:var(--dim,#9aa6b2);line-height:1.5}' +
    '#abuz8-source-bar strong{color:var(--cream,#f5f0e8)}' +
    '#abuz8-source-bar a{color:var(--green-bright,#2fbf8f);margin-left:8px}';
  document.head.appendChild(style);
  var bar = document.createElement('div');
  bar.id = 'abuz8-source-bar';
  bar.setAttribute('role', 'status');
  bar.innerHTML =
    '<strong>You arrived from ' + k.name + '.</strong> ' + k.note +
    ' <a href="' + k.page + '">Stay on the live board</a>' +
    ' <a href="' + r + '" rel="noopener noreferrer">Back to ' + k.name + '</a>';
  var nav = document.querySelector('.abuz8-nav');
  if (nav && nav.parentNode) nav.parentNode.insertBefore(bar, nav.nextSibling);
  else document.body.insertBefore(bar, document.body.firstChild);
})();
