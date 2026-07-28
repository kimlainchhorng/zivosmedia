const VEHICLE_TYPES = new Set(["economy", "comfort", "premium", "xl"]);
const EMBED_SESSION_RE = /^[A-Za-z0-9_-]{32,128}$/;
const UUID_PATH = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
const UUID_RE = new RegExp(`^${UUID_PATH}$`);
const HOST_TRACKING_PATH_RE = new RegExp(`^/rides/track/(${UUID_PATH})$`);
const TRIP_ID_QUERY_KEYS = ["trip_id", "tripId", "job_id", "jobId", "order_id", "orderId", "ride_request_id"];
const HOME_QUERY_KEYS = new Set([
  "pickup", "pickupLat", "pickupLng", "destination", "destLat", "destLng",
  "multi", "vehicle", "from", "stops",
]);
const MULTI_STOP_QUERY_KEYS = new Set(["from", "stops"]);

function cleanText(value: unknown, maxLength = 240): string | undefined {
  if (typeof value !== "string") return undefined;
  // Intentional C0-control stripping for untrusted query text.
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function tripIdFromQuery(params: URLSearchParams): string | null {
  for (const key of TRIP_ID_QUERY_KEYS) {
    const value = params.get(key);
    if (value && UUID_RE.test(value)) return value;
  }
  return null;
}

/** Host routes that are intentionally owned by the standalone customer app. */
export function canonicalRidePath(hostPathname: string, hostSearch = ""): string {
  const trackingMatch = hostPathname.match(HOST_TRACKING_PATH_RE);
  if (trackingMatch?.[1]) return `/tracking/${trackingMatch[1]}`;
  if (hostPathname === "/ride-quotes") return "/history";
  if (hostPathname === "/rides/hub") {
    const params = new URLSearchParams(hostSearch);
    const requestedTab = params.get("tab");
    if (requestedTab === "history") return "/history";
    const tripId = tripIdFromQuery(params);
    if (requestedTab === "tracking" && tripId) return `/tracking/${tripId}`;
    if (requestedTab === "rate" && tripId) return `/rate/${tripId}`;
  }
  return hostPathname === "/rides/multi-stop" ? "/multi-stop" : "/";
}

/**
 * React Router state cannot cross an iframe or survive the top-level SSO
 * round-trip. Promote the small, supported booking subset into URL parameters.
 */
export function applyRideLaunchState(
  params: URLSearchParams,
  state: unknown,
): URLSearchParams {
  if (!state || typeof state !== "object") return params;
  const launch = state as Record<string, unknown>;

  if (!params.has("destination")) {
    const destination = cleanText(launch.initialDestinationAddress);
    if (destination) params.set("destination", destination);
  }

  if (!params.has("vehicle")) {
    const vehicle = cleanText(launch.vehicleType, 20)?.toLowerCase();
    if (vehicle && VEHICLE_TYPES.has(vehicle)) params.set("vehicle", vehicle);
  }

  return params;
}

function isAllowedRidePath(pathname: string): boolean {
  return pathname === "/" ||
    pathname === "/history" ||
    pathname === "/account" ||
    pathname === "/multi-stop" ||
    new RegExp(`^/tracking/${UUID_PATH}$`).test(pathname) ||
    new RegExp(`^/receipt/${UUID_PATH}$`).test(pathname) ||
    new RegExp(`^/rate/${UUID_PATH}$`).test(pathname);
}

function queryKeysFor(pathname: string): Set<string> {
  if (pathname === "/") return HOME_QUERY_KEYS;
  if (pathname === "/multi-stop") return MULTI_STOP_QUERY_KEYS;
  if (pathname.startsWith("/tracking/")) return new Set(["multi"]);
  return new Set();
}

function canonicalizeSearch(url: URL, allowedKeys: Set<string>) {
  for (const key of [...url.searchParams.keys()]) {
    if (!allowedKeys.has(key)) {
      url.searchParams.delete(key);
      continue;
    }
    const firstValue = url.searchParams.get(key);
    url.searchParams.delete(key);
    if (firstValue !== null) url.searchParams.set(key, firstValue);
  }
}

export function sanitizeCanonicalRidePath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.length > 1600) return null;
  try {
    const url = new URL(value, "https://ride.invalid");
    if (url.origin !== "https://ride.invalid" || !isAllowedRidePath(url.pathname)) return null;
    canonicalizeSearch(url, queryKeysFor(url.pathname));
    url.hash = "";
    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ""}`;
  } catch {
    return null;
  }
}

/**
 * Derive one idempotent iframe path. A synchronized `ride_path` is
 * authoritative; outer launch values fill only keys that the child path does
 * not already own.
 */
export function deriveCanonicalRideFramePath(
  hostPathname: string,
  hostSearch: string,
  state?: unknown,
): string {
  const incomingQuery = applyRideLaunchState(new URLSearchParams(hostSearch), state);
  const syncedPath = sanitizeCanonicalRidePath(incomingQuery.get("ride_path"));
  incomingQuery.delete("ride_path");

  const childUrl = new URL(syncedPath ?? canonicalRidePath(hostPathname, hostSearch), "https://ride.invalid");
  const allowedKeys = queryKeysFor(childUrl.pathname);
  for (const key of allowedKeys) {
    if (childUrl.searchParams.has(key)) continue;
    const value = incomingQuery.get(key);
    if (value !== null) childUrl.searchParams.set(key, value);
  }

  return sanitizeCanonicalRidePath(`${childUrl.pathname}${childUrl.search}`) ?? canonicalRidePath(hostPathname, hostSearch);
}

/** Keep the parent URL canonical without losing a multi-stop → booking jump. */
export function updateCanonicalRideHostPath(currentHref: string, childPath: string): string | null {
  const path = sanitizeCanonicalRidePath(childPath);
  if (!path) return null;

  try {
    const hostUrl = new URL(currentHref);
    const childUrl = new URL(path, "https://ride.invalid");
    const defaultPath = canonicalRidePath(hostUrl.pathname);

    for (const key of [...hostUrl.searchParams.keys()]) hostUrl.searchParams.delete(key);
    hostUrl.hash = "";

    if (childUrl.pathname === defaultPath) {
      for (const key of queryKeysFor(childUrl.pathname)) {
        const value = childUrl.searchParams.get(key);
        if (value !== null) hostUrl.searchParams.set(key, value);
      }
    } else {
      hostUrl.searchParams.set("ride_path", path);
    }

    return `${hostUrl.pathname}${hostUrl.search}${hostUrl.hash}`;
  } catch {
    return null;
  }
}

export function getRideNavigationPath(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const candidate = message as { type?: unknown; path?: unknown };
  if (candidate.type !== "zivo-ride:navigate" || typeof candidate.path !== "string") return null;
  return sanitizeCanonicalRidePath(candidate.path);
}

/** Accept an account handoff only for the iframe generation owned by this parent user. */
export function isRideManageAccountRequest(
  message: unknown,
  currentEmbedSession: string | null,
): boolean {
  if (!currentEmbedSession || !EMBED_SESSION_RE.test(currentEmbedSession)) return false;
  if (!message || typeof message !== "object") return false;
  const candidate = message as { type?: unknown; embed_session?: unknown };
  return candidate.type === "zivo-ride:manage-account" &&
    candidate.embed_session === currentEmbedSession;
}
