/* ABUZ8 cinema — hero parallax, board reveals, section rhythm.
   IntersectionObserver only. No scroll listener. Reduced-motion: content visible, no drift. */
(function () {
  'use strict';

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var hero = document.querySelector('.hero');
  var boards = document.getElementById('boards');

  if (hero && !reduce) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        var p = Math.min(1, window.scrollY / max);
        hero.style.opacity = String(Math.max(0, 1 - p * 2.2));
        hero.style.transform = 'translateY(' + String(p * -70) + 'px)';
      });
    }, { passive: true });
  }

  if (!('IntersectionObserver' in window) || reduce) return;

  /* Boards + cards rise once, staggered by index. */
  var cards = document.querySelectorAll('#boards .card, #boards .tab-panel, .home-section .card, .mission-strip, .final-cta');
  cards.forEach(function (el, i) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(26px)';
    el.style.transition = 'opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)';
    el.style.transitionDelay = String(Math.min(i % 8, 7) * 55) + 'ms';
  });

  var seen = new WeakSet();
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting && !seen.has(en.target)) {
        seen.add(en.target);
        en.target.style.opacity = '1';
        en.target.style.transform = 'none';
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  cards.forEach(function (el) { io.observe(el); });

  /* Section eyebrows breathe in, once. */
  var brows = document.querySelectorAll('.home-section .eyebrow, .final-cta .eyebrow');
  var io2 = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.style.transition = 'opacity .9s ease';
        en.target.style.opacity = '1';
        io2.unobserve(en.target);
      }
    });
  }, { threshold: 0.4 });
  brows.forEach(function (b) { b.style.opacity = '0.35'; io2.observe(b); });
})();
