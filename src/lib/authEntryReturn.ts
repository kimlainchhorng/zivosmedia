import { ZIVO_MEDIA_ORIGIN } from "@/config/autoRepairDomain";
import type { ZivoAppKey } from "@/config/zivoApps";

export type AuthEntryReturnTarget = {
  href: string;
  label: string;
};

export type AuthEntryExitAction =
  | { kind: "history"; href: null; label: "Back" }
  | { kind: "internal" | "external"; href: string; label: string };

const DEFAULT_RETURN_TARGET: AuthEntryReturnTarget = {
  href: "/",
  label: "Back to Zivo",
};

const HOTEL_RETURN_QUERY_KEYS = [
  "ci",
  "co",
  "adults",
  "children",
  "rooms",
  "currency",
] as const;

const CAR_RETURN_QUERY_KEYS = [
  "pickup",
  "return",
  "pickup_date",
  "return_date",
  "currency",
] as const;

const buildPublicReturnHref = (
  pathname: string,
  source: URLSearchParams,
  keys: readonly string[],
) => {
  const next = new URLSearchParams();
  keys.forEach((key) => {
    const value = source.get(key);
    if (value) next.set(key, value);
  });
  const search = next.toString();
  return `${pathname}${search ? `?${search}` : ""}`;
};

/**
 * Maps a protected transaction route to a public page a signed-out person can
 * safely return to. Unknown, external, and auth routes deliberately fall back
 * to Home instead of pointing back at the protected route and creating a loop.
 */
export const getAuthEntryReturnTarget = (
  redirectTarget?: string | null,
): AuthEntryReturnTarget => {
  if (
    !redirectTarget ||
    !redirectTarget.startsWith("/") ||
    redirectTarget.startsWith("//") ||
    redirectTarget.includes("\\")
  ) {
    return DEFAULT_RETURN_TARGET;
  }

  let parsed: URL;
  try {
    parsed = new URL(redirectTarget, "https://zivo.invalid");
  } catch {
    return DEFAULT_RETURN_TARGET;
  }

  if (parsed.origin !== "https://zivo.invalid") {
    return DEFAULT_RETURN_TARGET;
  }

  const hotelMatch = parsed.pathname.match(
    /^\/hotel\/([a-zA-Z0-9-]+)\/(?:book|booking-confirmed)\/?$/,
  );
  if (hotelMatch) {
    return {
      href: buildPublicReturnHref(
        `/hotel/${hotelMatch[1]}`,
        parsed.searchParams,
        HOTEL_RETURN_QUERY_KEYS,
      ),
      label: "Back to hotel",
    };
  }

  const carMatch = parsed.pathname.match(
    /^\/cars\/([a-zA-Z0-9-]+)\/(?:checkout|booking-confirmed)\/?$/,
  );
  if (carMatch) {
    return {
      href: buildPublicReturnHref(
        `/cars/${carMatch[1]}`,
        parsed.searchParams,
        CAR_RETURN_QUERY_KEYS,
      ),
      label: "Back to car",
    };
  }

  return DEFAULT_RETURN_TARGET;
};

export const getAuthEntryExitAction = ({
  hostKey,
  historyIndex,
  returnTarget,
}: {
  hostKey: ZivoAppKey | null;
  historyIndex: number;
  returnTarget: AuthEntryReturnTarget;
}): AuthEntryExitAction => {
  if (hostKey === "chat") {
    return {
      kind: "external",
      href: `${ZIVO_MEDIA_ORIGIN}/`,
      label: "Back to Zivo",
    };
  }

  if (historyIndex > 0) {
    return { kind: "history", href: null, label: "Back" };
  }

  const supportsPublicTravelReturn =
    hostKey === null || hostKey === "media" || hostKey === "travel";
  if (supportsPublicTravelReturn && returnTarget.href !== "/") {
    return {
      kind: "internal",
      href: returnTarget.href,
      label: returnTarget.label,
    };
  }

  return {
    kind: "internal",
    href: "/",
    label: "Back to Zivo",
  };
};
