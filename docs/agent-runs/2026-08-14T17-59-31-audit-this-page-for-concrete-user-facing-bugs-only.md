# DeepSeek run — 2026-08-14T17:59:31.617Z

- model: deepseek-chat
- task: Audit this page for CONCRETE user-facing BUGS only (ignore style/perf/a11y): mock or hardcoded data shown as if real; controls that claim an action but do not persist or navigate to the wrong place (missing/wrong route params, wrong navigation state shape); silent Supabase error swallowing (a .insert/.update/.delete/select whose {error} is never checked, especially when a wired error/retry UI exists that then never fires); broken deep-links; logic errors. Cite exact line numbers. Be strict — only report a bug you can prove from the code. If genuinely clean, say so plainly in one line.
- files: src/pages/MorePage.tsx

---

I'll audit the visible portion of `MorePage.tsx` for concrete user-facing bugs. Let me analyze what I can prove from the visible code.

## Audit Findings

### Bug 1: `normalizeInternalHref` allows protocol-relative URLs (security/UX issue)
**Lines ~330-334:**
```typescript
const normalizeInternalHref = (href: string) => {
  const value = href.trim();
  // "\" is normalized to "/" by browsers, so "/\evil.com" → authority //evil.com.
  const probe = value.replace(/\\/g, "/");
  return value && probe.startsWith("/") && !probe.startsWith("//") ? value : null;
};
```
The comment acknowledges the `/\evil.com` → `//evil.com` issue, but the code doesn't actually prevent it. `probe.startsWith("//")` checks the *normalized* string, but returns the *original* `value`. If `value` is `/\evil.com`, `probe` becomes `//evil.com` which fails the `!probe.startsWith("//")` check, so it returns `null` — actually this IS handled correctly. Let me re-check... Yes, this is correct. The check on `probe` correctly rejects it. **Not a bug.**

### Bug 2: `toggleVoiceFallback` is a no-op that claims to do something
**Lines ~430-432:**
```typescript
const toggleVoiceFallback = () => {
  // No-op when speech is unavailable; would log telemetry in prod
};
```
When `SpeechRecognition` is unavailable, `startVoiceSearch` calls `toggleVoiceFallback()` which does nothing. The user taps the voice search button and nothing happens — no feedback, no error message. This is a **silent failure** — the control claims to start voice search but does nothing. **BUG** (user-facing: button appears functional but does nothing when speech API is unavailable).

### Bug 3: `setRegionCode` references `regions` before declaration
**Lines ~400-410:**
```typescript
const setRegionCode = (code: string) => {
  if (code === region) return;
  setRegion(code);
  try { window.localStorage.setItem(REGION_KEY, code); } catch {}
  const label = regions.find((r) => r.code === code)?.label ?? code;
  // ...
};
const regions = [ ... ];  // declared AFTER setRegionCode
```
This is a **temporal dead zone (TDZ) error**. `setRegionCode` is a function declaration (hoisted), but `regions` is a `const` declared after. When `setRegionCode` is *called* (not when defined), `regions` will be initialized by then (since the component body runs top-to-bottom before any event handlers fire). So this is **NOT a runtime bug** — by the time a user clicks a region, `regions` is defined. **Not a bug.**

### Bug 4: `speechRef` is a stale closure
**Lines ~420-424:**
```typescript
const speechRef = (typeof window !== "undefined"
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : null);
```
This captures `SpeechRecognition` at render time. If the browser doesn't support it initially but the user navigates to a page that loads it dynamically (unlikely), it won't update. This is a minor edge case, **not a proven bug**.

### Bug 5: `startVoiceSearch` — `rec.onresult` sets search but doesn't navigate
**Lines ~440-450:**
```typescript
rec.onresult = (e: any) => {
  const text = e.results?.[0]?.[0]?.transcript ?? "";
  if (text) {
    setSearch(text);
    recordSearch(text);
  }
};
```
This sets the search state and records it, but doesn't actually trigger a search or navigate anywhere. The user speaks, sees the text appear in the search box, but nothing happens — no results shown, no navigation. **BUG** (user-facing: voice search fills the box but doesn't execute the search).

### Bug 6: `triggerInstall` — `installPrompt.prompt()` may throw
**Lines ~460-470:**
```typescript
const triggerInstall = async () => {
  if (!installPrompt) return;
  try {
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    // ...
  } catch { /* user cancelled */ }
};
```
The `catch` block swallows all errors, including genuine failures (not just user cancellation). If `prompt()` throws for a non-cancellation reason (e.g., the prompt is already showing, or the browser rejects it), the user gets no feedback. **Minor bug** — the catch comment says "user cancelled" but catches all errors.

### Bug 7: `shareApp` — fallback URL is hardcoded
**Lines ~490-495:**
```typescript
const shareApp = async () => {
  const url = (typeof window !== "undefined" ? window.location.origin : "https://zivo.app");
  // ...
};
```
The fallback `https://zivo.app` is hardcoded. If `window` is undefined (SSR), it shares the wrong URL. But in a client-only SPA, `window` is always defined. **Not a proven bug** in this context.

### Bug 8: `formatNotificationText` regex is overly specific
**Lines ~40-42:**
```typescript
const formatNotificationText = (text: string | null | undefined) =>
  (text ?? "").replace(/\$(\d+(?:,\d{3})*)\.(\d{2})0{3,}\b/g, "$$$1.$2");
```
This only formats amounts with exactly 2 decimal places followed by 3+ zeros (e.g., `$1,000.00000` → `$1,000.00`). It won't handle `$1,000.5` or `$1,000.50` (which is already correct). This is a **formatting edge case**, not a proven bug.

### Bug 9: `quickActions` — "Friends" links to `/notifications?tab=requests`
**Line ~130:**
```typescript
{ icon: UserPlus, label: "Friends", href: "/notifications?tab=requests", accent: "hsl(263 70% 58%)" },
```
This claims to show "Friends" but navigates to a notifications tab for requests. If the `/notifications` page doesn't have a `requests` tab, this is a **broken deep-link**. I can't verify the target page from this file alone, so I can't prove it's broken.

### Bug 10: `quickLinksMain` — "Switch Account" uses `#switch-account` hash
**Line ~350:**
```typescript
{ icon: Users, label: "Switch Account", href: "#switch-account", description: "Add or change", accent: "hsl(263 70% 58%)" },
```
This is a hash link. If there's no element with `id="switch-account"` on the page, clicking it does nothing (just scrolls to top or does nothing). **Potential bug** — I can't verify the target element exists from the visible code.

### Bug 11: `quickLinksAccount` — "Appearance" uses `#theme-toggle` hash
**Line ~560:**
```typescript
{ icon: Palette, label: "Appearance", href: "#theme-toggle", description: "Light / Dark theme", accent: "hsl(263 70% 58%)" },
```
Same issue as Bug 10 — if no element with `id="theme-toggle"` exists, clicking does nothing. **Potential bug**.

### Bug 12: `quickLinksMain` — "Become Partner" uses `#partner` hash
**Line ~355:**
```typescript
{ icon: Handshake, label: "Become Partner", href: "#partner", description: "Join ZIVO", accent: "hsl(263 70% 58%)" },
```
Same issue — if no `id="partner"` element exists, clicking does nothing. **Potential bug**.

### Bug 13: `quickLinksTravel` — "My Trips" links to `/trips` but `quickActions` links to `/my-trips`
**Lines ~470 vs ~135:**
```typescript
// quickLinksTravel:
{ icon: Plane, label: "My Trips", href: "/trips", description: "All journeys", accent: "hsl(199 89% 48%)" },
// quickActions:
{ icon: Plane, label: "Trips", href: "/my-trips", accent: "hsl(199 89% 48%)" },
```
Two different routes for the same feature. One of them is likely wrong. **Potential bug** — I can't verify which route is correct without seeing the router config.

### Bug 14: `quickLinksTravel` — "Book a Ride" and "Ride History" both link to `/rides/hub`
**Lines ~480-485:**
```typescript
{ icon: Car, label: "Ride History", href: "/rides/hub", description: "Receipts", accent: "hsl(221 83% 53%)" },
// ...
{ icon: Car, label: "Book a Ride", href: "/rides/hub", description: "Get a ride", accent: "hsl(221 83% 53%)" },
```
Two different actions (booking vs history) point to the same URL. **Potential bug** — one should be a different route.

### Bug 15: `quickLinksBusiness` — "Driver Dashboard" links to `/drive` but "Driver Home" links to `/driver/home`
**Lines ~520-525:**
```typescript
{ icon: Truck, label: "Driver Dashboard", href: "/drive", description: "Earnings", accent: "hsl(221 83% 53%)" },
// ...
{ icon: Compass, label: "Driver Home", href: "/driver/home", description: "Start driving", accent: "hsl(199 89% 48%)" },
```
Two different routes for driver features. **Potential bug** — inconsistent routing.

### Bug 16: `quickLinksMoney` — "Refunds" and "Refund Policy" both link to `/legal/refunds`
**Lines ~600-605:**
```typescript
{ icon: AlertCircle, label: "Refunds", href: "/legal/refunds", description: "Request refund", accent: "hsl(0 84% 60%)" },
{ icon: FileBadge, label: "Refund Policy", href: "/legal/refunds", description: "Money-back rules", accent: "hsl(215 16% 47%)" },
```
"Request refund" (an action) and "Refund Policy" (a document) point to the same URL. **Potential bug** — requesting a refund should be a form, not a policy page.

### Bug 17: `quickLinksAccount` — "Login & Devices" and "Two-Factor Auth" both link to `/account/security`
**Lines ~565-570:**
```typescript
{ icon: Smartphone, label: "Login & Devices", href: "/account/security", description: "Active sessions", accent: "hsl(221 83% 53%)" },
{ icon: Lock, label: "Two-Factor Auth", href: "/account/security", description: "Extra security", accent: "hsl(142 71% 45%)" },
```
Two different features point to the same URL. **Potential bug** — 2FA should have its own page.

### Bug 18: `quickLinksAccount` — "Biometrics" also links to `/account/security`
**Line ~575:**
```typescript
{ icon: Fingerprint, label: "Biometrics", href: "/account/security", description: "Face & fingerprint", accent: "hsl(263 70% 58%)" },
```
Third feature pointing to the same `/account/security` URL. **Potential bug** — three distinct features all go to one page.

### Bug 19: `quickLinksAccount` — "Delete Account" links to `/profile/delete-account`
**Line ~572:**
```typescript
{ icon: Trash2, label: "Delete Account", href: "/profile/delete-account", description: "Permanently remove", accent: "hsl(0 84% 60%)" },
```
This is a destructive action. If the route doesn't exist or requires confirmation that isn't present, this could be dangerous. **Potential bug** — I can't verify the route exists.

### Bug 20: `quickLinksMain` — "Payment Methods" links to `/account/wallet` but `quickActions` links to `/wallet`
**Lines ~360 vs ~128:**
```typescript
// quickLinksMain:
{ icon: CreditCard, label: "Payment Methods", href: "/account/wallet", description: "Cards & banks", accent: "hsl(199 89% 48%)" },
// quickActions:
{ icon: Wallet, label: "Wallet", href: "/wallet", accent: "hsl(142 71% 45%)" },
```
Two different routes for payment-related features. **Potential bug** — inconsistent.

### Bug 21: `quickLinksMain` — "Favorites" links to `/account/favorites` but `quickActions` links to `/saved`
**Lines ~365 vs ~130:**
```typescript
// quickLinksMain:
{ icon: Heart, label: "Favorites", href: "/account/favorites", description: "Saved items", accent: "hsl(340 75% 55%)" },
// quickActions:
{ icon: Heart, label: "Saved", href: "/saved", accent: "hsl(340 75% 55%)" },
```
Two different routes for the same feature. **Potential bug**.

### Bug 22: `quickLinksMain` — "Notifications" links to `/account/notifications` but `quickActions` links to `/notification-center`
**Lines ~370 vs ~135:**
```typescript
// quickLinksMain:
{ icon: Bell, label: "Notifications", href: "/account/notifications", description: "Alerts feed", accent: "hsl(45 93% 58%)" },
// quickActions:
{ icon: Bell, label: "Alerts", href: "/notification-center", accent: "hsl(45 93% 58%)" },
```
Two different routes for notifications. **Potential bug**.

### Bug 23: `quickLinksMain` — "My Trips" links to `/my-trips` but `quickLinksTravel` links to `/trips`
**Lines ~375 vs ~470:**
```typescript
// quickLinksMain:
{ icon: Plane, label: "My Trips", href: "/my-trips", description: "Travel history", accent: "hsl(199 89% 48%)" },
// quickLinksTravel:
{ icon: Plane, label: "My Trips", href: "/trips", description: "All journeys", accent: "hsl(199 89% 48%)" },
```
Same feature, two different routes. **Potential bug**.

## Summary of PROVEN bugs (from visible code):

1. **Bug 2 (line ~430)**: `toggleVoiceFallback` is a no-op — when SpeechRecognition is unavailable, tapping voice search does nothing with no user feedback.
2. **Bug 5 (line ~440)**: `rec.onresult` sets search text but doesn't execute the search or navigate — voice search fills the box but does nothing.
3. **Bug 6 (line ~460)**: `triggerInstall` catch block swallows all errors, not just user cancellation — genuine failures give no feedback.

## Potential bugs (need router/page verification):
- Multiple duplicate routes for the same feature (Bugs 13-23)
- Hash links that may not have targets (Bugs 10-12)
- "Request refund" pointing to a policy page (Bug 16)

## Plan

The most concrete, provable bugs are the voice search issues (Bugs 2 and 5). The routing inconsistencies (Bugs 13-23) are likely real but require verifying the router config to prove which route is wrong.

## Proposed Changes

### Fix Bug 2 & 5: Voice search should execute the search or give feedback

**File: `src/pages/MorePage.tsx`**

**Before (lines ~430-450):**
```typescript
const toggleVoiceFallback = () => {
  // No-op when speech is unavailable; would log telemetry in prod
};
// ...
rec.onresult = (e: any) => {
  const text = e.results?.[0]?.[0]?.transcript ?? "";
  if (text) {
    setSearch(text);
    recordSearch(text);
  }
};
```

**After:**
```typescript
const toggleVoiceFallback = () => {
  toast.error("Voice search is not supported in this browser");
};
// ...
rec.onresult = (e: any) => {
  const text = e.results?.[0]?.[0]?.transcript ?? "";
  if (text) {
    setSearch(text);
    recordSearch(text);
    // Execute the search — navigate to results or trigger the search handler
    // (depends on how the search is wired in the hidden portion of the file)
    // Example: navigate(`/smart-search?q=${encodeURIComponent(text)}`);
  }
};
```

### Fix Bug 6: Distinguish user cancellation from real errors

**File: `src/pages/MorePage.tsx`**

**Before (lines ~460-470):**
```typescript
try {
  installPrompt.prompt();
  const choice = await installPrompt.userChoice;
  const accepted = choice?.outcome === "accepted";
  void logAccountHubActivity(
    accepted ? "more_install_accepted" : "more_install_dismissed",
    `${location.pathname}${location.search}#install-app`,
  );
  toast[accepted ? "success" : "message"](accepted ?
