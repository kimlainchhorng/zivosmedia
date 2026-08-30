export const ZIVO_CHAT_HOSTS = new Set([
  "zivoschat.com",
  "www.zivoschat.com",
]);

export const ZIVO_CHAT_ORIGIN = "https://zivoschat.com";

export const ZIVO_CHAT_HOME_PATH = "/chat";

const ZIVO_CHAT_STANDALONE_PATHS = new Set([
  "/chat-themes",
  "/chat-media",
  "/chat-wallpapers",
]);

export const isZivoChatHost = (hostname?: string | null) =>
  ZIVO_CHAT_HOSTS.has((hostname || "").toLowerCase());

export const isZivoChatPath = (pathname?: string | null) => {
  const path = pathname || "";
  return (
    path === ZIVO_CHAT_HOME_PATH ||
    path.startsWith(`${ZIVO_CHAT_HOME_PATH}/`) ||
    path === "/connect/chat" ||
    path.startsWith("/connect/chat/") ||
    path.startsWith("/direct/t/") ||
    ZIVO_CHAT_STANDALONE_PATHS.has(path)
  );
};

/** Build an absolute URL into the dedicated ZIVO Chat app (zivoschat.com). */
export const zivoChatUrl = (path: string = ZIVO_CHAT_HOME_PATH): string => {
  const p = !path || path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${ZIVO_CHAT_ORIGIN}${p}`;
};

/**
 * Which surface a user gets for standalone chat.
 *
 * ZIVO Chat is a real separate app (com.zivo.chat, iOS + Android) and we still
 * want to offer it. But the super-app must not REQUIRE a download to read your
 * messages: both surfaces sit on the same Supabase project, so the same threads
 * are readable here. Default is therefore "in-app"; a user who prefers the
 * dedicated app can opt in and then gets forwarded automatically.
 */
export type ZivoChatSurface = "in-app" | "dedicated-app";

const CHAT_SURFACE_KEY = "zivo_chat_surface";

export const getZivoChatSurface = (): ZivoChatSurface => {
  if (typeof window === "undefined") return "in-app";
  try {
    return window.localStorage.getItem(CHAT_SURFACE_KEY) === "dedicated-app"
      ? "dedicated-app"
      : "in-app";
  } catch {
    // Private mode / blocked storage: fall back to the surface that always works.
    return "in-app";
  }
};

export const setZivoChatSurface = (surface: ZivoChatSurface): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAT_SURFACE_KEY, surface);
  } catch {
    /* preference is a convenience; ignore storage failures */
  }
};

/**
 * Standalone chat surfaces that ALSO exist in the dedicated ZIVO Chat app.
 * Used to decide whether the "open in ZIVO Chat" handoff applies to a route.
 * Deliberately EXCLUDES:
 *  - `/connect/chat` — the SSO handoff issuer page, which must stay in the super-app.
 *  - Embedded contextual chat owned by other features (e.g. the in-ride/delivery
 *    chat at `/delivery/track/:id/chat`, plus support/lodging/store chat widgets
 *    that are components rather than standalone `/chat` routes).
 */
export const isStandaloneChatRoute = (pathname?: string | null): boolean => {
  const path = pathname || "";
  if (path === "/connect/chat" || path.startsWith("/connect/chat/")) return false;
  if (
    path.startsWith("/chat-themes") ||
    path.startsWith("/chat-media") ||
    path.startsWith("/chat-wallpapers")
  ) {
    return true;
  }
  if (path === "/chat" || path.startsWith("/chat/")) return true;
  if (path === "/direct" || path.startsWith("/direct/")) return true;
  if (path === "/channels" || path.startsWith("/channels/")) return true;
  if (/^\/c\/[^/]+/.test(path)) return true;
  return false;
};
