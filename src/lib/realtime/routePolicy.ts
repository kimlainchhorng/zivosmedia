/** These pages use request/response reads; live order/chat routes remain enabled. */
export function routeNeedsRealtime(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (['/', '/flights', '/flights/search', '/hotels', '/hotels/search', '/zivo-travel',
    '/jobs', '/about', '/contact', '/login', '/signup', '/forgot-password', '/reset-password'].includes(path)) return false;
  return !['/legal/', '/guides/', '/airports/'].some(prefix => path.startsWith(prefix));
}
