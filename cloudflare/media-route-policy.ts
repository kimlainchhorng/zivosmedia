import { appRoutes } from './app-routes.generated';

const patterns = appRoutes.map(path => new RegExp('^' + path.split('/').map(segment => {
  if (segment === '*') return '.*';
  if (segment.startsWith(':')) return segment.endsWith('?') ? '[^/]*' : '[^/]+';
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}).join('/') + '/?$', 'i'));

export function isKnownMediaRoute(pathname: string) {
  return patterns.some(pattern => pattern.test(pathname));
}

export function mediaCanonicalRedirect(url: URL) {
  if (url.hostname !== 'www.zivosmedia.com') return null;
  const target = new URL(url);
  target.hostname = 'zivosmedia.com';
  return Response.redirect(target.toString(), 301);
}

export function mediaNotFound(request: Request, url: URL, response: Response) {
  if (url.hostname !== 'zivosmedia.com' || !['GET', 'HEAD'].includes(request.method) ||
      !response.headers.get('content-type')?.includes('text/html') || isKnownMediaRoute(url.pathname)) return response;
  // Preserve React's helpful NotFound screen but return its real HTTP status.
  // Machine routes and actual static assets were handled before this point.
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex');
  headers.set('Cache-Control', 'no-store');
  headers.delete('Content-Length');
  return new Response(request.method === 'HEAD' ? null : response.body, { status: 404, headers });
}
