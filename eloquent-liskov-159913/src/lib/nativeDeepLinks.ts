const APP_URL_SCHEMES = new Set(["com.myzivo.app:", "com.hizovo.app:"]);
const TRUSTED_APP_LINK_HOSTS = new Set([
  "hizivo.com",
  "www.hizivo.com",
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

    if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
    return path;
  } catch {
    return null;
  }
}
