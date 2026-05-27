type RedirectLocation = {
  hash?: string;
  pathname?: string;
  search?: string;
} | null | undefined;

const AUTH_ROUTES = ["/login", "/verify-otp", "/auth-callback"];

export const getSafeRedirectTarget = (value?: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  const normalizedValue = value.trim();
  const isAuthRoute = AUTH_ROUTES.some(
    (route) =>
      normalizedValue === route ||
      normalizedValue.startsWith(`${route}?`) ||
      normalizedValue.startsWith(`${route}#`),
  );

  return isAuthRoute ? "/" : normalizedValue;
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