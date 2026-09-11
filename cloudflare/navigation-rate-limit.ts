/** Public build downloads must not consume the page/API navigation allowance. */
export function isBuildAssetRead(request: Request, url: URL): boolean {
  return ['GET', 'HEAD'].includes(request.method)
    && /^\/(?:assets|fonts)\/[^?#]+\.(?:js|css|woff2?|png|jpe?g|webp|avif|svg|gif|ico)$/i.test(url.pathname);
}

/** Document requests need a usable page even before the React app can start. */
export function navigationRateLimitResponse(request: Request, url: URL, retryAfter: number): Response {
  const headers = new Headers({ 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter) });
  const document = ['GET', 'HEAD'].includes(request.method) && !url.pathname.startsWith('/api/')
    && (request.headers.get('sec-fetch-dest') === 'document' || request.headers.get('accept')?.includes('text/html'));
  if (!document) {
    headers.set('Content-Type', 'application/json');
    return new Response(request.method === 'HEAD' ? null : JSON.stringify({ error: 'Too many requests' }), { status: 429, headers });
  }
  const km = url.searchParams.get('lang') === 'km';
  const title = url.pathname === '/wallet' ? km ? 'កាបូប' : 'Wallet' : 'ZIVO';
  const message = km ? 'សូមរង់ចាំបន្តិច' : 'Please wait a moment';
  const description = km ? 'មានសំណើច្រើនពេក។ សូមរង់ចាំបន្តិច រួចព្យាយាមម្ដងទៀត។' : 'This page received too many requests. Wait a little, then try again.';
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('X-Robots-Tag', 'noindex');
  // Fixed copy and an empty retry href avoid echoing request/provider data into HTML.
  const html = `<!doctype html><html lang="${km ? 'km' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | ZIVO</title>
    ${km ? '<link rel="stylesheet" href="/fonts/noto-sans-khmer.css">' : ''}
    <style>*{box-sizing:border-box}body{margin:0;background:#f8fafc;color:#0f172a;font-family:system-ui,"Noto Sans Khmer",sans-serif}header{background:white;border-bottom:1px solid #e2e8f0;padding:20px;display:flex;gap:24px;align-items:center}h1{font-size:20px;margin:0}main{max-width:560px;margin:40px auto;padding:24px}p{line-height:1.8}a{color:inherit;display:inline-flex;align-items:center;min-height:44px}main a{border-radius:12px;background:#0f172a;color:white;padding:0 24px}</style></head><body>
    <header><a href="/?lang=${km ? 'km' : 'en'}">ZIVO</a><h1>${title}</h1></header><main role="alert"><h2>${message}</h2><p>${description}</p><a href="">${km ? 'ព្យាយាមម្ដងទៀត' : 'Retry'}</a></main></body></html>`;
  return new Response(request.method === 'HEAD' ? null : html, { status: 429, headers });
}
