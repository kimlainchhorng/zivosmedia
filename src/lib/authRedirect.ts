type RedirectLocation = {
  hash?: string;
  pathname?: string;
  search?: string;
} | null | undefined;

const AUTH_ROUTES = ["/login", "/verify-otp", "/auth-callback"];

export const getSafeRedirectTarget = (value?: string | null) => {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return "/";
  }

  let safeValue = normalizedValue;

  if (/^https?:\/\//i.test(normalizedValue)) {
    try {
      const url = new URL(normalizedValue);
      const currentHost = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";

      if (!currentHost || url.hostname.toLowerCase() !== currentHost) {
        return "/";
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

  return isAuthRoute ? "/" : safeValue;
};

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
