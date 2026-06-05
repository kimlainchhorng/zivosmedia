type RedirectLocation = {
  hash?: string;
  pathname?: string;
  search?: string;
} | null | undefined;

const AUTH_ROUTES = ["/login", "/verify-otp", "/auth-callback"];
const TRUSTED_ZIVO_AUTH_HOSTS = new Set([
  "zivosmedia.com",
  "www.zivosmedia.com",
  "zivosoftware.com",
  "www.zivosoftware.com",
]);

const WORKSPACE_REDIRECTS: Record<string, string> = {
  "/business": "/business/dashboard",
};

const normalizeRedirectTarget = (value: string) => {
  return WORKSPACE_REDIRECTS[value] ?? value;
};

const isTrustedZivoAuthHost = (hostname: string) =>
  TRUSTED_ZIVO_AUTH_HOSTS.has(hostname.toLowerCase());

export const getSafeRedirectTargetForHost = (
  value?: string | null,
  currentHostname?: string | null,
) => {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return "/";
  }

  let safeValue = normalizedValue;

  if (/^https?:\/\//i.test(normalizedValue)) {
    try {
      const url = new URL(normalizedValue);
      const currentHost = (
        currentHostname ??
        (typeof window !== "undefined" ? window.location.hostname : "")
      ).toLowerCase();

      if (!currentHost) {
        return "/";
      }

      const targetHost = url.hostname.toLowerCase();
      const isSameHost = targetHost === currentHost;
      const isTrustedZivoBridge =
        isTrustedZivoAuthHost(currentHost) &&
        isTrustedZivoAuthHost(targetHost) &&
        targetHost !== currentHost;

      if (!isSameHost && !isTrustedZivoBridge) {
        return "/";
      }

      if (isTrustedZivoBridge) {
        return url.toString();
      }

      safeValue = `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return "/";
    }
  }

  if (!safeValue.startsWith("/") || safeValue.startsWith("//")) {
    return "/";
  }

  const isAuthRoute = AUTH_ROUTES.some(
    (route) =>
      safeValue === route ||
      safeValue.startsWith(`${route}?`) ||
      safeValue.startsWith(`${route}#`),
  );

  return isAuthRoute ? "/" : normalizeRedirectTarget(safeValue);
};

export const getSafeRedirectTarget = (value?: string | null) =>
  getSafeRedirectTargetForHost(
    value,
    typeof window !== "undefined" ? window.location.hostname : "",
  );

export const isExternalRedirectTarget = (value?: string | null) =>
  /^https?:\/\//i.test(value || "");

export const getRedirectFromLocation = (location?: RedirectLocation) => {
  if (!location?.pathname) {
    return "/";
  }

  return getSafeRedirectTarget(
    `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`,
  );
};

export const withRedirectParam = (path: string, redirectTo?: string | null) => {
  const safeRedirect = getSafeRedirectTarget(redirectTo);

  if (safeRedirect === "/") {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}redirect=${encodeURIComponent(safeRedirect)}`;
};
