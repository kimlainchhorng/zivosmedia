# MiMo advisor — Security review of a chat message link handler in a client-only Vite+React SPA. Read the attached file. Focus: is the isInternalLink substring check a real trust-boundary weakness, what is the concrete worst-case impact given navigate() is react-router in-app only (host stripped), does the proposed suffix-match fix close it, and are there any OTHER real (non-SSR) security issues. Be concrete, rank by severity, do not invent. Under 350 words.

Files: /tmp/chat-link-security.md

## Security Findings

### P0 — Substring match is a real weakness; impact is XSS via open-redirect

`hostname.includes("hizovo")` matches **attacker-controlled** domains:
- `hizovo.evil.com`
- `evil-hizovo.com`
- `steal-hizovo.example.com`

These bypass `isInternalLink === true` → `getInAppPath()` strips the host and calls `navigate("/evil-path")`. The concrete worst-case depends on what routes accept params and render user content. If any route deserializes `search` params into rendered DOM (toasts, error messages, redirect targets, embedded iframes), an attacker crafts:

```
https://hizovo.evil.com/some-route?msg=<script>...</script>
```

The host is stripped, leaving `/some-route?msg=<script>...</script>` as an in-app navigation. This is a **stored XSS vector** if any downstream component renders params unsafely, and a **phishing vector** regardless (attacker sends a link in chat that bypasses the external-link warning, training users to trust it). Even without XSS, it silently subverts the warning UX that is the primary defense against social engineering in chat.

**Fix (P0):** Replace substring checks with suffix match:
```ts
const INTERNAL_HOSTS = ["lovable.app", "hizovo.com"];
return INTERNAL_HOSTS.some(h =>
  u.hostname === h || u.hostname.endsWith("." + h)
) || u.hostname === window.location.hostname;
```
Closes the gap. `myzivo.lovable.app` and `preview-lovable.app` still match. `hizovo.evil.com` no longer does.

### P1 — No protocol validation before `navigate()`

`getInAppPath()` returns `pathname + search + hash` but the only scheme guard is the linkify regex (`https?`). A manually constructed `<a href="javascript:...">` injected via a different vector (profile bio, message edit edge case) would still yield `pathname: "javascript:..."` — though react-router's `navigate()` won't execute it, it's defense-in-depth to check `u.protocol` early.

**Fix (P1):** Add `if (!["https:", "http:"].includes(u.protocol)) return false;` at the top of `isInternalLink`.

### P2 — `getInAppPath()` fallback returns `"/"`

The `catch { return "/"; }` silently navigates home on any malformed URL. Minor UX/security smell (hides broken input). Change to returning `null` and bailing.

---

**Summary:** The substring match is a real, exploitable trust-boundary weakness (P0) enabling bypass of the external-link warning via attacker-controlled domains. The proposed suffix fix is correct and sufficient. No other high-severity issues exist beyond the protocol gap (P1).
