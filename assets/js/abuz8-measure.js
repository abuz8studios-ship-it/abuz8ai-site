/* ABUZ8 first-party measurement — 2026-07-29
 *
 * Sends a pageview, plus store clicks and checkout starts, to /api/e on this
 * same origin. No cookie, no stored id, no third party. Nothing here can
 * identify a returning visitor, by design: the site sells privacy, so it does
 * not get to make an exception for itself.
 *
 * Fails silent and never blocks a purchase - if the beacon throws, the click
 * proceeds regardless. A tracker that can break checkout is worse than no
 * tracker, and this codebase has already shipped one measurement layer that
 * reported success on failure.
 */
(function () {
  'use strict';
  var ENDPOINT = '/api/e';

  function send(kind, product) {
    var payload = {
      kind: kind,
      path: location.pathname,
      referrer: document.referrer || null,
      product: product || null
    };
    try {
      var body = JSON.stringify(payload);
      // keepalive so the request survives the navigation a buy click causes.
      if (window.fetch) {
        fetch(ENDPOINT, {
          method: 'POST', body: body, keepalive: true,
          headers: { 'Content-Type': 'application/json' }
        })['catch'](function () {});
      } else if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      }
    } catch (e) { /* measurement must never surface an error to the visitor */ }
  }

  // Honour Do Not Track. Cheap to respect, and consistent with the pitch.
  var dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1' ||
            navigator.msDoNotTrack === '1';
  if (dnt) return;

  send('pageview');

  // Commercial intent. Capture phase so it still fires if a handler upstream
  // calls stopPropagation, and it never preventDefaults the navigation.
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/buy\.stripe\.com/.test(href)) {
      send('checkout_start', a.getAttribute('data-sku') || document.title.slice(0, 60));
    } else if (/^\/(store|products)/.test(href)) {
      send('store_click', a.getAttribute('data-sku') || null);
    } else if (/\/api\/download|\.zip($|\?)/.test(href)) {
      send('download', a.getAttribute('data-sku') || null);
    }
  }, true);
})();
