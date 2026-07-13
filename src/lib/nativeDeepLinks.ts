const APP_URL_SCHEMES = new Set(["com.zivo.chat:", "com.zivo.app:", "com.myzivo.app:", "com.hizovo.app:"]);
const TRUSTED_APP_LINK_HOSTS = new Set([
  "zivosmedia.com",
  "www.zivosmedia.com",
  "zivosmedia.com",
  "www.zivosmedia.com",
  "myzivo.lovable.app",
  "zivo.app",
  "www.zivo.app",
]);

export function pathFromNativeOpenUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    let path: string | null = null;

    if (APP_URL_SCHEMES.has(url.protocol)) {
      const hostPath = url.hostname ? `/${url.hostname}` : "";
      path = `${hostPath}${url.pathname}${url.search}${url.hash}`;
    } else if ((url.protocol === "https:" || url.protocol === "http:") && TRUSTED_APP_LINK_HOSTS.has(url.hostname)) {
      path = `${url.pathname}${url.search}${url.hash}`;
    }

    if (!path) return null;
    // Collapse backslashes first: URL parsers/browsers treat "\" as "/", so "/\evil.com"
    // would resolve to the authority //evil.com (off-origin) once navigated.
    const probe = path.replace(/\\/g, "/");
    if (!probe.startsWith("/") || probe.startsWith("//")) return null;
    return path;
  } catch {
    return null;
  }
}
