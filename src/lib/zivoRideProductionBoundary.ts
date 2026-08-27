export const ZIVO_RIDE_PRODUCTION_ORIGIN = "https://ride.zivosmedia.com";

const ZIVOSMEDIA_AUTHORIZE_ORIGINS = new Set([
  "https://zivosmedia.com",
  "https://www.zivosmedia.com",
]);

const LOCAL_RIDE_ORIGINS = new Set([
  "http://localhost:5177",
  "http://127.0.0.1:5177",
]);

const LOCAL_ZIVOSMEDIA_ORIGINS = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
]);

type BoundaryOptions = {
  allowLocalDevelopment?: boolean;
};

/**
 * Maps the exact local Zivosmedia parent to the matching canonical Ride dev
 * origin. This remains separate from deploy-time configuration so a local
 * preview can never weaken the production origin allowlist.
 */
export function resolveLocalRideAppBaseUrl(
  parentOrigin: string,
  options: BoundaryOptions = {},
): URL | null {
  if (!options.allowLocalDevelopment) return null;

  try {
    const parent = new URL(parentOrigin);
    if (
      parent.username ||
      parent.password ||
      !LOCAL_ZIVOSMEDIA_ORIGINS.has(parent.origin)
    ) {
      return null;
    }

    const candidate = new URL(parent.origin);
    candidate.port = "5177";
    return resolveRideAppBaseUrl(candidate.origin, options);
  } catch {
    return null;
  }
}

/**
 * Mirrors the parent/child pairs admitted by the Ride app's frame-ancestors
 * policy. Known-incompatible pairs must never mount an iframe because browsers
 * replace it with an opaque error document that still fires `load`.
 */
export function canEmbedRideApp(
  parentOrigin: string,
  rideAppUrl: string | URL,
  options: BoundaryOptions = {},
): boolean {
  try {
    const parent = new URL(parentOrigin).origin;
    const ride = new URL(rideAppUrl).origin;

    if (ride === ZIVO_RIDE_PRODUCTION_ORIGIN) {
      return ZIVOSMEDIA_AUTHORIZE_ORIGINS.has(parent);
    }

    return Boolean(
      options.allowLocalDevelopment &&
      LOCAL_ZIVOSMEDIA_ORIGINS.has(parent) &&
      LOCAL_RIDE_ORIGINS.has(ride),
    );
  } catch {
    return false;
  }
}

/**
 * Resolves the configured Ride iframe base without turning deploy-time config
 * into an arbitrary cross-origin embed. Production accepts only the canonical
 * dedicated Ride origin; the app is not basename-aware for reverse proxies.
 */
export function resolveRideAppBaseUrl(
  configuredUrl: string | null | undefined,
  options: BoundaryOptions = {},
): URL | null {
  const rawUrl =
    configuredUrl?.trim() ||
    (options.allowLocalDevelopment ? "http://localhost:5177" : "");

  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.username || url.password || url.search || url.hash) return null;

    if (options.allowLocalDevelopment && LOCAL_RIDE_ORIGINS.has(url.origin)) {
      return url;
    }

    if (url.protocol !== "https:" || url.port) return null;
    return url.origin === ZIVO_RIDE_PRODUCTION_ORIGIN ? url : null;
  } catch {
    return null;
  }
}

/**
 * Accepts only the central Zivosmedia authorize endpoint (or the exact local
 * development origin). The caller still validates event.source + event.origin.
 */
export function getRideAuthorizeUrl(
  message: unknown,
  options: BoundaryOptions = {},
): URL | null {
  if (!message || typeof message !== "object") return null;

  const candidate = message as { type?: unknown; url?: unknown };
  if (
    candidate.type !== "zivo-ride:authorize" ||
    typeof candidate.url !== "string"
  ) {
    return null;
  }

  try {
    const url = new URL(candidate.url);
    const allowedOrigin =
      ZIVOSMEDIA_AUTHORIZE_ORIGINS.has(url.origin) ||
      (options.allowLocalDevelopment &&
        LOCAL_ZIVOSMEDIA_ORIGINS.has(url.origin));

    const appKey = url.searchParams.get("app_key");
    const redirectUri = url.searchParams.get("redirect_uri");
    const state = url.searchParams.get("state");
    const challenge = url.searchParams.get("code_challenge");
    const challengeMethod = url.searchParams.get("code_challenge_method");

    if (
      !allowedOrigin ||
      url.username ||
      url.password ||
      url.pathname !== "/auth/zivosmedia/authorize" ||
      url.hash ||
      appKey !== "zivo_ride" ||
      !redirectUri ||
      !state ||
      state.length > 256 ||
      !challenge ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(challenge) ||
      challengeMethod !== "S256"
    ) {
      return null;
    }

    const redirect = new URL(redirectUri);
    const allowedRedirectOrigin =
      redirect.origin === ZIVO_RIDE_PRODUCTION_ORIGIN ||
      (options.allowLocalDevelopment &&
        LOCAL_RIDE_ORIGINS.has(redirect.origin));
    if (
      !allowedRedirectOrigin ||
      redirect.username ||
      redirect.password ||
      redirect.pathname !== "/auth/callback" ||
      redirect.searchParams.get("source") !== "zivosmedia" ||
      redirect.hash
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}
