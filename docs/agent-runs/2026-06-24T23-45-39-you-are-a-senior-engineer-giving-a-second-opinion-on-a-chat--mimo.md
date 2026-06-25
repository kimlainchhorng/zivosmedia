# MiMo advisor — You are a senior engineer giving a SECOND OPINION on a chat-migration change. Context: a React super-app (zivosmedia) is removing its in-app standalone chat and forwarding those routes to a separate app at https://zivoschat.com. Embedded contextual chats (ride/delivery, lodging-host, support, store) and the /connect/chat SSO issuer page must STAY in the super-app. The attached files are: (1) zivoChatDomain.ts = the matcher deciding which paths redirect + the URL builder; (2) ZivoChatRedirectGuard.tsx = mounts once, forwards matched routes to zivoschat.com then bounces home; (3) ConnectChat.tsx = the SSO handoff issuer that mints a single-use token and only redirects to allow-listed origins. The destination app (ZIVO-CHAT) already serves the same /chat, /chat/*, /channels, /c/:handle, /direct/t/:id, chat-themes/media/wallpapers routes. QUESTION: List concrete gaps or risks ONLY — (a) any standalone-chat path that would be MISSED (not redirected) or OVER-matched (wrongly redirected, esp. embedded chats), (b) SSO/security issues with the allow-list or token handoff, (c) deep-link/query-string formats that could land on a 404. Be terse, max 12 bullets, no praise, no restating the code.

Files: src/config/zivoChatDomain.ts, src/components/cross-app/ZivoChatRedirectGuard.tsx, src/pages/ConnectChat.tsx

## Concrete Findings

1. **P0 · Deep-link scheme mismatch**: Comment documents native handoff as `zivochat://connect/zivo` but `ALLOWED_DEEPLINK_RETURNS` is `com.zivo.chat://connect/zivo`. If the chat app actually registers `zivochat://`, every native SSO handoff silently fails (`validateReturn` → null → "not allowed" error). Confirm the registered scheme.

2. **P1 · `/channels` over-matching**: `isStandaloneChatRoute` catches `/channels` and all sub-paths. If super-app has non-chat channel routes (e.g. community/content channels), they'll be wrongly redirected. Needs tighter scoping or an explicit prefix like `/channels/chat`.

3. **P1 · `/direct` over-matching**: Same issue — catches `/direct` and everything under it. If there's a non-chat `/direct` route (e.g. direct-deposits, direct-pay), it gets redirected.

4. **P1 · `/c/:handle` over-matching**: The regex `^\/c\/[^/]+` grabs every `/c/something` path. If `/c/` serves any non-chat purpose (community profiles, creator pages), those break.

5. **P1 · Hash fragment dropped during redirect**: Guard builds `key = ${pathname}${search}` — any `location.hash` is silently stripped. Deep links like `/chat/room#unread` lose their anchor in the destination app.

6. **P1 · No user-facing fallback for failed custom-scheme open**: In ConnectChat, when `target.kind === "deeplink"` and the user is on web, `window.location.replace("com.zivo.chat://…")` fails silently if the app isn't installed. User sees a blank/errored page with no recovery path.

7. **P2 · `isZivoChatPath` vs `isStandaloneChatRoute` mismatch on sub-paths**: `isZivoChatPath` uses exact `Set.has` for `/chat-themes` etc., while `isStandaloneChatRoute` uses `startsWith`. A path like `/chat-themes/dark` returns `false` from `isZivoChatPath` but `true` from `isStandaloneChatRoute`. If any routing decision uses the first function, sub-paths leak through.

8. **P2 · `/connect/chat` reachable via both guards**: `isStandaloneChatRoute` correctly excludes it, but if the component mounts on the same `<Route>` tree as `ConnectChat`, there's a race — the guard's `navigate("/")` could fire before ConnectChat's effect runs, depending on mount order. Confirm they're on separate route branches.

9. **P2 · Dev origins in production allow-list**: `allowedOrigins()` includes `http://localhost:8082` and `http://localhost:5173` only when `import.meta.env.DEV`, but if a staging/preview build has `DEV=true` (common misconfiguration), those origins are live allow-list entries in a deployed environment.

10. **P2 · Token in query string for native deep links**: Single-use OTP is passed as `?ott=` on custom schemes. While custom schemes don't hit servers, if an intermediate (app store deep-link handler, Firebase App Links fallback) logs full URLs, the token is persisted. Acceptable if TTL is very short (<60s), but worth confirming.
