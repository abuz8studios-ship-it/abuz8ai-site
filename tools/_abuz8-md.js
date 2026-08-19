// ABUZ8 shared Markdown -> HTML renderer for AI tool output.
// The brain returns markdown; pages call ABUZ8md(text) before innerHTML so
// output displays cleanly (headings, bold, lists) instead of raw ** symbols.
(function () {
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function inline(s) {
    s = esc(s);
    s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>');
    s = s.replace(/`([^`]+?)`/g, '<code style="background:rgba(0,0,0,.2);padding:1px 5px;border-radius:4px;">$1</code>');
    return s;
  }
  window.ABUZ8md = function (src) {
    if (src == null) return '';
    src = String(src).trim();
    // Already HTML (brain returned tags)? pass through untouched.
    if (/^\s*</.test(src) && /<\/(h[1-6]|p|ul|ol|li|div|table|pre|strong|em)>/i.test(src)) return src;
    var parts = src.split('```');
    var html = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        html += '<pre style="background:rgba(0,0,0,.28);padding:12px;border-radius:8px;overflow:auto;white-space:pre-wrap;"><code>' +
          esc(parts[i].replace(/^[a-zA-Z0-9]*\n/, '')) + '</code></pre>';
        continue;
      }
      var lines = parts[i].split('\n');
      var inList = false, listTag = '';
      for (var l = 0; l < lines.length; l++) {
        var t = lines[l].trim();
        if (!t) { if (inList) { html += '</' + listTag + '>'; inList = false; } continue; }
        var hm = t.match(/^(#{1,6})\s+(.*)$/);
        if (hm) {
          if (inList) { html += '</' + listTag + '>'; inList = false; }
          var lvl = Math.min(hm[1].length + 1, 5);
          html += '<h' + lvl + ' style="margin:14px 0 6px;line-height:1.3;">' + inline(hm[2]) + '</h' + lvl + '>';
          continue;
        }
        var um = t.match(/^[-*•]\s+(.*)$/);
        var om = t.match(/^\d+[.)]\s+(.*)$/);
        if (um || om) {
          var want = om ? 'ol' : 'ul';
          if (inList && listTag !== want) { html += '</' + listTag + '>'; inList = false; }
          if (!inList) { html += '<' + want + ' style="margin:6px 0 6px 22px;">'; inList = true; listTag = want; }
          html += '<li style="margin:3px 0;">' + inline((um || om)[1]) + '</li>';
          continue;
        }
        if (inList) { html += '</' + listTag + '>'; inList = false; }
        html += '<p style="margin:8px 0;line-height:1.6;">' + inline(t) + '</p>';
      }
      if (inList) { html += '</' + listTag + '>'; }
    }
    return html;
  };
})();
