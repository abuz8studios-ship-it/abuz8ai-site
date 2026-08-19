/**
 * ABUZ8 Pages Function — Internal path blocker
 * 
 * Intercepts ALL requests to /abuz8-mission-control/* and returns 404.
 * Overrides any static assets that may be lingering in Pages' asset store
 * from a prior deployment before this directory was excluded via .assetsignore.
 * 
 * Added: 2026-05-31 to permanently resolve P0 PII leak (see ERRORS.md)
 * Root cause: CF Pages incremental upload retains old assets even after .assetsignore exclusion.
 * This function fires BEFORE asset serving, making the block unconditional.
 */
export async function onRequest() {
  return new Response('Not Found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store, no-cache',
      'X-Robots-Tag': 'noindex'
    }
  });
}
