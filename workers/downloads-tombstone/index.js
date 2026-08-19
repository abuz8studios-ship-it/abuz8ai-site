/**
 * downloads-pdfs-tombstone — added 2026-06-12 03:00 EDT
 * --------------------------------------------------------
 * WHY THIS EXISTS: the old /downloads/pdfs/ library (50 PDFs incl. copyrighted
 * third-party books + personal documents) was removed from the Pages deployment
 * on 2026-06-10, but Cloudflare Pages' internal CDN cache kept serving the files
 * on abuz8ai.com for up to 7 days (s-maxage=604800) — and zone purge_everything
 * cannot reach Pages' internal cache (verified: zone MISS still returned the PDF
 * with its old Age header).
 *
 * A zone Worker route runs BEFORE all caches, so this makes the path dead NOW.
 * Paid PDFs are served by the stripe-fulfillment worker from R2 (signed URLs) —
 * nothing legitimate links here (grep-verified 2026-06-10).
 *
 * SAFE TO DELETE after 2026-06-17 (when the 7-day s-maxage entries expire),
 * but harmless to keep as a permanent tombstone.
 */
export default {
  fetch() {
    return new Response("Gone", {
      status: 410,
      headers: { "cache-control": "no-store" },
    });
  },
};
