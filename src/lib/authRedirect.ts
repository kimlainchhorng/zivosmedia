import { ZIVO_CHAT_HOME_PATH, isZivoChatHost } from "@/config/zivoChatDomain";
import { ZIVO_DRIVER_HOME_PATH, isZivoDriverHost } from "@/config/zivoDriverDomain";
import {
  AUTO_REPAIR_DASHBOARD_PATH,
  AUTO_REPAIR_STORE_ID,
  isAutoRepairSoftwareHost,
  isZivoMediaHost,
} from "@/config/autoRepairDomain";

type RedirectLocation = {
  hash?: string;
  pathname?: string;
  search?: string;
} | null | undefined;

const AUTH_ROUTES = ["/login", "/verify-otp", "/auth-callback"];
const TRUSTED_ZIVO_AUTH_HOSTS = new Set([
  "zivosmedia.com",
  "www.zivosmedia.com",
  "zivoschat.com",
  "www.zivoschat.com",
  "zivosoftware.com",
  "www.zivosoftware.com",
  "zivodriver.com",
  "www.zivodriver.com",
  "zivostravel.com",
  "www.zivostravel.com",
  "zivochat.com",
  "www.zivochat.com",
  "zivopay.com",
  "www.zivopay.com",
  "zivomarket.com",
  "www.zivomarket.com",
]);

const WORKSPACE_REDIRECTS: Record<string, string> = {
  "/business": "/business/dashboard",
};

const isLegacySoftwareMediaDashboardUrl = (url: URL) =>
  isZivoMediaHost(url.hostname) &&
  url.pathname === `/admin/stores/${AUTO_REPAIR_STORE_ID}`;

const normalizeRedirectTarget = (value: string, currentHost?: string | null) => {
  if (
    isAutoRepairSoftwareHost(currentHost) &&
    (value === "/business" || value === "/business/dashboard")
  ) {
    return AUTO_REPAIR_DASHBOARD_PATH;
  }

  return WORKSPACE_REDIRECTS[value] ?? value;
};

const isTrustedZivoAuthHost = (hostname: string) =>
  TRUSTED_ZIVO_AUTH_HOSTS.has(hostname.toLowerCase());

const authFallbackForHost = (hostname: string) =>
  isZivoChatHost(hostname) ? ZIVO_CHAT_HOME_PATH : isZivoDriverHost(hostname) ? ZIVO_DRIVER_HOME_PATH : "/";

export const getSafeRedirectTargetForHost = (
  value?: string | null,
  currentHostname?: string | null,
) => {
  const currentHost = (
    currentHostname ??
    (typeof window !== "undefined" ? window.location.hostname : "")
  ).toLowerCase();
  const fallbackTarget = authFallbackForHost(currentHost);
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return fallbackTarget;
  }

  let safeValue = normalizedValue;

  if (/^https?:\/\//i.test(normalizedValue)) {
    try {
      const url = new URL(normalizedValue);

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
        if (isZivoChatHost(currentHost)) {
          return ZIVO_CHAT_HOME_PATH;
        }

        if (isZivoDriverHost(currentHost)) {
          return ZIVO_DRIVER_HOME_PATH;
        }

        if (isAutoRepairSoftwareHost(currentHost) && isLegacySoftwareMediaDashboardUrl(url)) {
          return `${url.pathname}${url.search}${url.hash}`;
        }

        return url.toString();
      }

      safeValue = `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return fallbackTarget;
    }
  }

  // Browsers normalize backslashes to forward slashes for http(s), so "/\evil.com" parses
  // as the authority //evil.com (an off-origin target) once assigned to window.location.
  // Collapse backslashes before the protocol-relative gate so these leading-authority
  // bypasses are rejected exactly like "//".
  const leadingAuthorityProbe = safeValue.replace(/\\/g, "/");
  if (!leadingAuthorityProbe.startsWith("/") || leadingAuthorityProbe.startsWith("//")) {
    return fallbackTarget;
  }

  const isAuthRoute = AUTH_ROUTES.some(
    (route) =>
      safeValue === route ||
      safeValue.startsWith(`${route}?`) ||
      safeValue.startsWith(`${route}#`),
  );

  return isAuthRoute ? fallbackTarget : normalizeRedirectTarget(safeValue, currentHost);
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

// Preserve the optional `product` / `intent` / handoff-id context hints that a
// product app or Zivo-Admin attaches to a ZIVO ID login link, carrying them onto
// the post-auth redirect so the destination app receives them. The handoff id is
// written under both `handoff_id` (product apps) and `handoff` (this app's return
// bar). Existing params are never overwritten.
export const withProductContext = (
  target: string,
  product?: string | null,
  intent?: string | null,
  handoffId?: string | null,
) => {
  if (!product && !intent && !handoffId) {
    return target;
  }

  try {
    const isAbsolute = /^https?:\/\//i.test(target);
    const url = new URL(target, isAbsolute ? undefined : "https://placeholder.local");

    if (product && !url.searchParams.has("product")) {
      url.searchParams.set("product", product);
    }
    if (intent && !url.searchParams.has("intent")) {
      url.searchParams.set("intent", intent);
    }
    if (handoffId) {
      if (!url.searchParams.has("handoff_id")) {
        url.searchParams.set("handoff_id", handoffId);
      }
      if (!url.searchParams.has("handoff")) {
        url.searchParams.set("handoff", handoffId);
      }
    }

    return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return target;
  }
};
