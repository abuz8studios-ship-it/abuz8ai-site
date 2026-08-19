(function () {
  "use strict";

  var endpoint = "/api/behavior";
  var sentScrollDepths = {};

  function sessionId() {
    var key = "abuz8_behavior_sid";
    var existing = localStorage.getItem(key);
    if (existing) return existing;
    var id = "sid_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, id);
    return id;
  }

  function cleanText(value, max) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max || 140);
  }

  function pathOnly(value) {
    try {
      return new URL(value, location.href).pathname;
    } catch (e) {
      return location.pathname;
    }
  }

  function nearestSection(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.id) return "#" + node.id;
      if (node.className && typeof node.className === "string") {
        var cls = node.className.split(/\s+/).find(function (name) {
          return /hero|section|tools|pricing|store|feature|cta|download|gpu/i.test(name);
        });
        if (cls) return "." + cls;
      }
      node = node.parentElement;
    }
    return null;
  }

  function inferTool() {
    var m = location.pathname.match(/\/tools\/([^/?#]+)\.html$/i);
    if (m) return m[1];
    if (/gpu|comfy|video|image|upscale|headshot|cartoon/i.test(location.pathname + " " + document.title)) {
      return cleanText(document.title.split("—")[0].split("|")[0], 80).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    }
    return null;
  }

  function classifyClick(el) {
    var text = cleanText(el.innerText || el.value || el.getAttribute("aria-label") || el.title, 120).toLowerCase();
    var href = (el.href || el.getAttribute("href") || "").toLowerCase();
    var type = "click";

    // Plain navigation links (tool cards, "OPEN →") are NOT generate actions — measured
    // 2026-07-20: card links on /tools were logging as gpu_generate_click. Real generate
    // controls are <button>/<input>, not <a href>.
    var isNavLink = el.tagName === "A" && !!(el.getAttribute("href") || "").length;
    if (!isNavLink && /generate|render|gpu|comfy|upscale|video|image/.test(text + " " + href)) type = "gpu_generate_click";
    if (/waitlist|notify|early access|join/.test(text + " " + href)) type = "waitlist_intent";
    if (/checkout|stripe|buy|purchase|subscribe|start now|order/.test(text + " " + href)) type = "checkout_intent";
    if (/download|zip|pdf|pack|blueprint/.test(text + " " + href)) type = "download_intent";
    if (/book|request|contact|demo|work with me|agent pack|store/.test(text + " " + href)) type = "cta_click";

    return type;
  }

  function send(eventType, payload) {
    var data = Object.assign(
      {
        event_type: eventType,
        ts: Date.now(),
        session_id: sessionId(),
        path: location.pathname,
        title: document.title,
        referrer: document.referrer || null,
        tool: inferTool(),
      },
      payload || {}
    );
    var body = JSON.stringify(data);

    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon(endpoint, blob)) return;
      } catch (e) {}
    }

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      keepalive: true,
    }).catch(function () {});
  }

  function wireClicks() {
    document.addEventListener(
      "click",
      function (e) {
        var el = e.target.closest("a,button,[role='button'],input[type='submit']");
        if (!el) return;
        var type = classifyClick(el);
        send(type, {
          target_text: cleanText(el.innerText || el.value || el.getAttribute("aria-label") || el.title, 120),
          target_href: el.href || el.getAttribute("href") || null,
          section: nearestSection(el),
          meta: {
            outbound: !!(el.href && !el.href.startsWith(location.origin) && !el.href.startsWith("/")),
            page_target: el.href ? pathOnly(el.href) : null,
          },
        });
      },
      true
    );

    document.addEventListener(
      "submit",
      function (e) {
        send("form_submit", {
          target_text: cleanText(e.target.id || e.target.name || e.target.action || "form", 120),
          target_href: e.target.action || null,
          section: nearestSection(e.target),
        });
      },
      true
    );
  }

  function wireScroll() {
    function checkDepth() {
      var doc = document.documentElement;
      var scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      var depth = Math.round((window.scrollY / scrollable) * 100);
      [50, 75, 90].forEach(function (mark) {
        if (depth >= mark && !sentScrollDepths[mark]) {
          sentScrollDepths[mark] = true;
          send("scroll_depth", { meta: { depth: mark } });
        }
      });
    }
    window.addEventListener("scroll", throttle(checkDepth, 750), { passive: true });
    setTimeout(checkDepth, 1200);
  }

  function wireGpuSignals() {
    // Fire ONLY on real /tools/ pages. The old body-text regex matched hero copy on "/",
    // "/blog/", "/agent-board" etc. and inflated gpu_tool_view ~3x (measured 2026-07-20:
    // 454 events, most off-tool). Path gate = the honest signal.
    if (/^\/tools\//.test(location.pathname)) {
      send("gpu_tool_view", { meta: { title: document.title } });
    }

    var originalShowOfflineModal = window.showOfflineModal;
    if (typeof originalShowOfflineModal === "function") {
      window.showOfflineModal = function () {
        send("gpu_offline_modal", { meta: { reason: "gpu_server_offline" } });
        return originalShowOfflineModal.apply(this, arguments);
      };
    }
  }

  function throttle(fn, wait) {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn();
      }
    };
  }

  window.abuz8Track = send;

  document.addEventListener("DOMContentLoaded", function () {
    send("page_view");
    wireClicks();
    wireScroll();
    wireGpuSignals();
  });
})();
