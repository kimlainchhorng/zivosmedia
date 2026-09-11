/** Keep OAuth, shared links, installed apps and sibling domains on the full router. */
export function isPublicHomeEntry(url: URL, installed: boolean): boolean {
  return !installed
    && ['zivosmedia.com', 'www.zivosmedia.com', 'localhost', '127.0.0.1'].includes(url.hostname)
    && url.pathname === '/'
    && !url.hash
    && !['p', 'code', 'error', 'error_description', 'access_token', 'refresh_token'].some(key => url.searchParams.has(key));
}
