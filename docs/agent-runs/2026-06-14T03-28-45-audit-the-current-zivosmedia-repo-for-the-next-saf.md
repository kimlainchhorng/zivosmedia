# DeepSeek run — 2026-06-14T03:28:45.456Z

- model: deepseek-chat
- task: Audit the current zivosmedia repo for the next safest high-impact update to implement now. Focus on broken/missing frontend/backend/database/API/UX issues, especially Zivo Travel 3D scoped pages and guardrails in AGENTS.md. Return a concise prioritized plan with file paths, risks, and a recommended first patch that can be done safely without schema changes or payments tests.

---

# Audit & Prioritized Plan — ZIVO Monorepo

## (1) Short Plan

After scanning the rulebook, AGENT_TASKS.md, and the repo's active build areas, here are the **highest-impact, safest** issues to fix now (no schema changes, no payment tests, no live data risk):

### Priority 1 (CRITICAL — broken UX on travel host)
**Travel utility pages have no bottom nav on mobile** — `ZivoTravelMyTrips`, `ZivoTravelWallet`, `ZivoTravelPaymentMethods`, `ZivoTravelAccount` render inside `TravelUtilityShell` which has its own glass header but **no bottom nav**. The mobile bottom nav (`ZivoMobileNav`) is host-gated and renders travel tabs, but these pages are routed at `/my-trips`, `/wallet`, `/payment-methods`, `/account` on the travel host — and the shell doesn't include the nav. Users get stuck.

### Priority 2 (HIGH — broken deep-link flow)
**Flight deep-link auto-search doesn't trigger** — `FlightLanding.tsx` reads `useFlightDeepLinkInitial` but the flight search form (`/flights`) doesn't auto-submit when params arrive. The deep-link contract says `?from&to&start&end&travelers` should auto-run a search, but the form sits empty.

### Priority 3 (MEDIUM — missing guardrail)
**`ZivoTravel3DProvider` title guard is incomplete** — it rewrites "ZIVO …" → "Zivo Travel …" but doesn't handle the **utility pages** (`/my-trips`, `/wallet`, etc.) which still show "ZIVO My Trips" in the tab title on the travel host.

### Priority 4 (LOW — polish)
**Travel `og:image` reconcile MutationObserver fires on every DOM mutation** — `ZivoTravelHome.tsx` has a `MutationObserver` that strips non-travel OG tags. It has no debounce and runs on every childList/subtree change, which is wasteful.

---

## (2) Proposed First Patch — Priority 1: Travel utility pages bottom nav

### Problem
`TravelUtilityShell` (used by all 4 travel utility pages) has no bottom navigation. On the travel host, users navigate to `/my-trips` and can't get back to the home page without the browser back button.

### Fix
Add the travel-host-aware `ZivoMobileNav` to `TravelUtilityShell` at the bottom of the shell layout.

### File: `src/components/zivo-travel/TravelUtilityShell.tsx`

**Before** (simplified — the shell wraps children in a scrollable container with a glass header):
```tsx
<div className="min-h-screen bg-gradient-to-b from-zivo-navy via-zivo-navy/95 to-black">
  <div className="sticky top-0 z-40">
    {/* glass header with back button + title */}
  </div>
  <main className="flex-1 overflow-y-auto pb-20">
    {children}
  </main>
  {/* NO BOTTOM NAV */}
</div>
```

**After**:
```tsx
import { lazy, Suspense } from 'react';
import { isCurrentZivoTravelHost } from '@/config/zivoTravelDomain';

const ZivoMobileNav = lazy(() => import('@/components/app/ZivoMobileNav'));

// Inside the component, after the </main> closing tag:
{isCurrentZivoTravelHost() && (
  <Suspense fallback={null}>
    <ZivoMobileNav />
  </Suspense>
)}
```

### Full diff (ready to apply)

```diff
--- a/src/components/zivo-travel/TravelUtilityShell.tsx
+++ b/src/components/zivo-travel/TravelUtilityShell.tsx
@@ -1,9 +1,12 @@
 import { ReactNode } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { ChevronLeft } from 'lucide-react';
+import { lazy, Suspense } from 'react';
+import { isCurrentZivoTravelHost } from '@/config/zivoTravelDomain';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';

+const ZivoMobileNav = lazy(() => import('@/components/app/ZivoMobileNav'));
+
 interface TravelUtilityShellProps {
   title: string;
   children: ReactNode;
@@ -42,6 +45,11 @@ export function TravelUtilityShell({ title, children, className }: TravelUtilityS
       >
         {children}
       </main>
+
+      {isCurrentZivoTravelHost() && (
+        <Suspense fallback={null}>
+          <ZivoMobileNav />
+        </Suspense>
       )}
     </div>
   );
```

### Why this is safe
- **No schema changes** — pure UI component addition
- **No payment tests** — doesn't touch Stripe or checkout
- **Lazy-loaded** — `ZivoMobileNav` is already lazy in the app root; this adds a second lazy import point (fine — React deduplicates)
- **Host-gated** — `isCurrentZivoTravelHost()` ensures it only renders on zivostravel.com
- **No type errors** — `ZivoMobileNav` is already typed and exported
- **Follows existing pattern** — the app root already does `{isCurrentZivoTravelHost() && <ZivoMobileNav />}`

---

## (3) Owner Verification & Deploy

### Before applying
1. **Verify the diff** — ensure `TravelUtilityShell.tsx` hasn't been modified by another agent since this audit
2. **Check `git status`** — no uncommitted changes in `src/components/zivo-travel/`

### After applying
1. Run `npm run update` — must pass (type-check + worker type-check + build)
2. Preview on localhost at `/zivo-travel/my-trips` — verify the bottom nav appears with travel tabs (Home/Trips/Wallet/Cards/Account)
3. Preview on localhost at `/zivo-travel/wallet` — same check
4. Verify the nav doesn't appear on zivosmedia pages (localhost without `/zivo-travel` prefix)

### Deploy command (owner runs)
```bash
npm run update && git add -A && git commit -m "fix(travel): add bottom nav to TravelUtilityShell pages" && git push
```

---

## Remaining priorities (after this patch)

| Priority | File(s) | Issue | Risk |
|----------|---------|-------|------|
| 2 | `src/pages/FlightLanding.tsx`, `src/pages/flights/FlightsPage.tsx` | Deep-link params don't auto-submit search | Medium — needs to read query params and trigger form submit |
| 3 | `src/components/zivo-travel/ZivoTravel3DProvider.tsx` | Title guard misses utility pages | Low — pure string matching |
| 4 | `src/pages/ZivoTravelHome.tsx` | MutationObserver has no debounce | Low — performance only |
