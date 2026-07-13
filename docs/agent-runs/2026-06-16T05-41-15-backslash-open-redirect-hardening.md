# Backslash open-redirect hardening (cross-repo) — 2026-06-16T05:41:15Z

- actor: Claude (applying verified-safe fixes; DeepSeek advisory — and overruled, see below)
- class: open-redirect / same-origin redirect-sanitizer bypass
- repos touched: zivosmedia, ZIVO-CHAT, zivodriver

## The bug

Redirect/return-path sanitizers across the ZIVO apps gate protocol-relative URLs with
`!value.startsWith("/") || value.startsWith("//")`. That blocks `//evil.com` but **not** the
backslash variant `/\evil.com`. Browsers (and the WHATWG URL parser) treat `\` as `/` for
http(s), so `/\evil.com` and `/\/evil.com` resolve to **authority `evil.com`**. Proof:

```
node> new URL("/\\evil.com", "https://good.com").href   // => https://evil.com/
node> new URL("/\\/evil.com", "https://good.com").href  // => https://evil.com/
node> new URL("/foo\\bar", "https://good.com").href      // => https://good.com/foo/bar  (same-origin, safe)
```

So a value that passes the guard becomes an off-origin redirect **if assigned to
`window.location`**. In the current code the live consumers all gate `window.location.assign()`
behind `isExternalRedirectTarget()` (http(s)-only) or route through React Router `navigate()`
(which blocks cross-origin pushState), so this is **defense-in-depth, not a live exploit today**.
But the sanitizers' documented contract is "return a safe same-origin target," and a future caller
without that second gate would be exposed. Hardened uniformly.

Note: DeepSeek (deepseek-reasoner) reviewed this and concluded "No real bypass — stays same-origin."
That was wrong; the Node repro above disproves it. Advisor output was verified against the real
parser before acting — the fix stands on the empirical result, not the advisor.

## The fix

Collapse backslashes into a probe string used only for the protocol-relative gate; return the
original value unchanged. This rejects `/\…` leading-authority bypasses while leaving legitimate
same-origin paths (including a stray mid-path backslash) untouched — it can only ever reject *more*,
never accept more.

```js
const probe = value.replace(/\\/g, "/");
if (!probe.startsWith("/") || probe.startsWith("//")) return <reject>;
```

Files hardened (6):
- zivosmedia/src/lib/authRedirect.ts — `getSafeRedirectTargetForHost` (+ regression test)
- ZIVO-CHAT/src/lib/authRedirect.ts — `getSafeRedirectTargetForHost`
- ZIVO-CHAT/src/lib/connectedWorkflow.ts — `sanitizeRelativePath`
- ZIVO-CHAT/src/lib/nativeDeepLinks.ts — `pathFromNativeOpenUrl`
- zivodriver/src/lib/connectedWorkflow.ts — `sanitizeRelativePath`
- zivodriver/src/pages/driver/DriverAIHelp.tsx — inline `returnTo` guard

Deliberately NOT changed:
- ZIVO-CHAT/src/lib/openExternalUrl.ts — `startsWith("//")` there intentionally upgrades a
  protocol-relative URL to https to OPEN an external link; not an open-redirect guard.
- zivostravel, zivosoftware — no redirect sanitizer of this class exists.

## Verification

- zivosmedia: `authRedirect.test.ts` 18/18 PASS (added cases: `//evil.com`, `/\evil.com`,
  `/\/evil.com` → "/"; `/foo\bar` → preserved). `npm run type-check` green.
- ZIVO-CHAT: `npm run type-check` green. Full `vitest run` = 106 pass / 1 fail, where the single
  failure is a pre-existing, unrelated stale test (`ChatComposerHub.test.tsx` queries a
  `"Message..."` placeholder the committed component no longer renders) — flagged separately, not
  caused by this change.
- zivodriver: `npx tsc --noEmit` green.

No production-credential, Stripe, or deploy actions taken. All changes are minimal, additive guards.

## Second wave — inline `startsWith("/")` guards (same bug class)

Swept all 6 repos for redirect/return-path params gated by a hand-rolled
`startsWith("/")` check (i.e. NOT routed through a central sanitizer), since those
carry the identical backslash gap. Three more real fixes, all same collapse-probe pattern:

- zivosmedia/src/lib/crossDomainSSO.ts — `sanitizeNextPath` (SSO `next` param → `window.location.href`).
- zivosmedia/src/lib/nativeDeepLinks.ts — `pathFromNativeOpenUrl` (native universal-link path).
- zivosoftware/src/pages/Auth.tsx — inline `redirectTo` guard (→ `navigate()` + embedded in
  `onboardingDest`). This one was **worse**: it had no `//` check at all, so it accepted both
  `//evil.com` and `/\evil.com`. The fix adds the missing protocol-relative block *and* the
  backslash collapse.

Ruled out (not this bug class):
- zivostravel/src/main.tsx — `withBookingReference` is a URL-decoration helper that returns
  `url.pathname` (host stripped); adversarial input yields a host-less path. Not vulnerable.
- ZIVO-CHAT/src/lib/openExternalUrl.ts — see above; intentional protocol-relative→https upgrade.

Verification (second wave):
- zivosmedia: `npm run type-check` green; `authRedirect.test.ts` 18/18 PASS (unchanged — the new
  files share the proven pattern; no dedicated tests exist for them).
- zivosoftware: `npx tsc --noEmit` EXIT=0.
- zivosoftware/src/pages/Auth.tsx was under concurrent peer-agent edits (`M`); only the two-line
  `redirectTo` guard was touched, nothing committed.

## Third wave — navigation sinks (`navigate()` + `window.location.href`)

Widened the sweep from sanitizer *functions* to the actual navigation *sinks* (anything that
feeds a user/payload-derived string into `navigate()` or `window.location.href`). Found 8 more,
including the **most material sink of the whole sweep**:

- zivosmedia/src/hooks/usePushNotifications.ts — `if (actionUrl.startsWith("/")) window.location.href = actionUrl`
  (line ~530). This is a **real `window.location.href` assignment**, not a router `navigate()`, and
  it gated only on `startsWith("/")` — missing BOTH the `//` and backslash checks. A push payload
  whose `action_url` was `//evil.com` or `/\evil.com` would have driven a genuine off-origin
  redirect (not merely defense-in-depth). `action_url` is server-constructed by the send-push
  edge function today, so not known-exploitable, but this is the one spot where the guard gap met
  a true full-navigation sink. Restructured to navigate only when the collapsed probe is
  same-origin, else fall through to the type switch.
- ZIVO-CHAT/src/hooks/usePushNotifications.ts — identical `window.location.href` sink, same fix.
- zivosmedia/src/components/notifications/ChatBellPopover.tsx — `navigate(action_url)` guarded only by `startsWith("/")`.
- ZIVO-CHAT/src/components/notifications/ChatBellPopover.tsx — same.
- zivosmedia/src/pages/CoinPurchaseSuccess.tsx — `return_to` param → `navigate()` (had `//`, missing `\`).
- zivosmedia/src/pages/account/WalletPage.tsx — sessionStorage `wallet-return-to` → `navigate()` (had `//`, missing `\`).
- zivosmedia/src/pages/MorePage.tsx — `normalizeInternalHref` sanitizer (had `//`, missing `\`).
- zivosoftware/src/pages/BusinessSetup.tsx — `redirect` param → `navigate(dest)`; like its sibling
  Auth.tsx it had **no `//` check at all** — fix adds both guards.

Reviewed and left as-is (not sinks of this class): `animatedStickerMap.ts`,
`normalizeSupabaseMediaUrl.ts`, `imageProxyService.ts`, `ZivoChatSupportButton.tsx` (path
normalizers / proxy helpers, no navigation), and `usePushNotifications.ts` line ~515
(`startsWith("/chat")` — a literal prefix that cannot become `//`).

Verification (third wave): `npm run type-check` green in zivosmedia and ZIVO-CHAT;
`npx tsc --noEmit` EXIT=0 in zivosoftware; zivosmedia `authRedirect.test.ts` still 18/18.

Cross-repo total this session: **17 files hardened** across 4 repos — zivosmedia ×8, ZIVO-CHAT ×5,
zivodriver ×2, zivosoftware ×2. One real full-navigation sink (push `action_url` →
`window.location.href`); the rest are defense-in-depth (router `navigate()` blocks cross-origin
pushState) but bring every guard up to the same "collapse backslashes, reject `//`" contract.
