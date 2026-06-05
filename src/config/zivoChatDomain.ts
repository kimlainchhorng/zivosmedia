export const ZIVO_CHAT_HOSTS = new Set([
  "zivoschat.com",
  "www.zivoschat.com",
]);

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
