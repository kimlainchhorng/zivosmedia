# zivosmedia pass 9 — real fresh-class bug found (legacy `billing_interval` "quarter"/"week" crashes the creator subscribe sheet) but it lives in a PEER-MODIFIED file → deferred; clean-file remainder is dead/low-impact

**Date:** 2026-06-16
**Scope:** zivosmedia only
**Outcome:** Deferred — I found a genuine, reachable, user-facing **crash** (fresh
class for this repo), but its only high-impact site is in a **peer-modified**
file (`src/components/creator/CreatorTiersSubscribe.tsx`), which is off-limits
this pass. The portions that live in a **clean** file (`src/lib/tierFormat.ts`)
do not qualify: the one function that would render "undefined" is **never called
in production** (dead path), and the function that *is* called degrades only
silently. Per marathon discipline (never edit peer-modified files; the fix must
be in code that's actually imported/used, not dead code; don't manufacture a
partial change just to have one), no edit was made. Baseline gate re-verified
GREEN.

## Baseline (gate = `npm run build` / `vite build`)
- `npm run build` → **BUILD EXIT 0** (precache 18 entries / 2585.66 KiB; `dist/sw.js` emitted). Green before and after (no change).

## The finding (verified, real, fresh class) — legacy billing interval → `undefined.toLowerCase()` crash
Creator subscription **tiers** carry a `billing_interval`. The canonical type is
five values:

```ts
// src/lib/tierFormat.ts
export type BillingInterval = "month" | "3_months" | "6_months" | "year" | "lifetime";
export const INTERVAL_LABEL: Record<BillingInterval, string> = { month:"month", "3_months":"3 months", "6_months":"6 months", year:"year", lifetime:"lifetime" };
```

But **legacy data carries values outside that union** — concretely `"quarter"`
and `"week"`. Proof is in the codebase itself: a *sibling* feature reading the
same data explicitly special-cases them (the `as string` casts only exist
because the value can be outside the type):

```ts
// src/pages/account/AccountSubscriptionsPage.tsx:127-128  (monthlySpend calc)
if ((interval as string) === "quarter" || interval === "3_months") return sum + Math.round(cents / 3);
if ((interval as string) === "week") return sum + Math.round(cents * 4.33);
```

The crash site is the creator **subscribe sheet**, which indexes the label map
**directly** and calls a method on the result:

```ts
// src/components/creator/CreatorTiersSubscribe.tsx:139 and :279
const intervalLabel = tier.is_free ? "" : `/ ${INTERVAL_LABEL[interval].toLowerCase()}`;
//                                            ^^^^^^^^^^^^^^^^^^^^^^^^^  undefined for "quarter"/"week"
// → TypeError: Cannot read properties of undefined (reading 'toLowerCase')
```

For any creator whose tier has a legacy `"quarter"`/`"week"` interval,
`INTERVAL_LABEL["quarter"]` is `undefined`, and `.toLowerCase()` throws — the
subscribe sheet (a **monetization** surface) white-screens / hits the error
boundary. This is a **distinct, previously-unflagged class** for zivosmedia
(prior passes: pass 6 CSV newline/formula, pass 7 vehicle-CSV-date-UTC, pass 8
ICS escaping — none touched enum/object-map-miss rendering).

## Why no in-scope fix exists this pass (reachability checked, not assumed)
| Site | File | Clean? | Real impact? | Verdict |
|---|---|---|---|---|
| `INTERVAL_LABEL[interval].toLowerCase()` crash | `components/creator/CreatorTiersSubscribe.tsx:139,279` | **No — peer-modified** (`git status --short` shows ` M`) | **High (crash)** | **off-limits this pass** |
| `INTERVAL_LABEL[interval]?.toLowerCase() \|\| "month"` | `pages/account/AccountSubscriptionsPage.tsx:206` | yes | n/a | **already guarded** (`?.` + `\|\| "month"`) — correct |
| `formatTierPrice()` → `"$X.XXundefined"` | `lib/tierFormat.ts` | yes | **none — never invoked in prod** | dead path; `grep "formatTierPrice("` returns only the test. Fixing it = fixing dead code (rule: must be imported/**used**) |
| `monthlyEquivalent()` → `null` for "quarter"/"week" | `lib/tierFormat.ts` (called at CreatorTiersSubscribe.tsx:155) | yes | **low** — silently omits the "≈ $X/mo" hint; no crash, no wrong number | not net-positive enough to justify a manufactured change while the real crash is off-limits |

So the only **high-impact** locus is peer-owned, and the only **clean-file**
edits available are either dead (`formatTierPrice`) or cosmetic-negative-space
(`monthlyEquivalent` returns null). Editing `tierFormat.ts` would **not** prevent
the crash (the peer component indexes the exported map directly, bypassing the
lib functions). Manufacturing a partial lib change that doesn't fix the visible
bug violates "minimal/additive/real-user-impact / don't manufacture"; declined.

## Immediate actionable target when the peer file is clean
The moment `src/components/creator/CreatorTiersSubscribe.tsx` shows no `M` in
`git status --short`, the minimal fix is to make its two direct indexings
crash-safe (mirror the pattern AccountSubscriptionsPage already uses):

```ts
// :139 and :279 — add ?. and a fallback so a legacy interval can't throw
const intervalLabel = tier.is_free ? "" : `/ ${(INTERVAL_LABEL[interval] ?? "period").toLowerCase()}`;
```

A complementary clean-file hardening (do it in the *same* pass so it isn't a dead
change): add a `normalizeBillingInterval()` to `tierFormat.ts` that maps
`"quarter" → "3_months"` (and decides a policy for `"week"`), and route
`formatTierPrice`/`monthlyEquivalent` + the component label through it — so the
quarterly tier also regains its "≈ $X/mo" hint. That bundle is a real,
net-positive, fresh-class fix; it's just not available while the component is
peer-locked.

## What was done
- Baseline gate re-verified **GREEN** (`npm run build` → BUILD EXIT 0).
- Broad clean-file survey (~30 `src/lib` modules across analytics, money/calc,
  hotels, social, chat, security, lodging, car-rental, store, salon, flight,
  concierge). All polished or non-qualifying:
  - `hotels/smartMerge.ts` — **dead code** (no production caller; `getMergeStats`
    empty-array `matchRate` NaN / `maxSavings` -Infinity is real but unreachable).
  - `hotels/normalizeHotels.ts` — **test-only** (only its `.test.ts` imports it).
  - `admin/pnlCalculations.ts` + `admin/paymentsCalculations.ts` — `bucketKey`
    "day" uses UTC (`toISOString`) while month/week use local; that's the
    **pass-7 UTC-date class**, not fresh, and debatable/cross-file. Left as-is.
  - `taxCalc`, `flightSearchParams`, `payoutRails`, `reservationDisplay`,
    `storeHours`, `salon/availability`, `reservationTime`, `formatCount`,
    `car-rental/csv` (already formula-guarded, pass-6 class), `chat/richText`,
    `social/{mentionText,hashtags,reactions}`, `phone`, `security/rateLimiter`,
    `chat/viewOnce`, `conciergePlanner` (fuzzy UX heuristics, low impact) —
    reviewed, correct/polished, no fresh-class high-impact defect.
- The tierFormat/subscription lead chased to ground: confirmed legacy
  `"quarter"`/`"week"` are real (sibling-feature evidence), confirmed the crash
  site is peer-modified, confirmed `formatTierPrice` is uninvoked in prod,
  confirmed AccountSubscriptionsPage already guards. Net: no clean, in-scope,
  high-impact target → deferred.
- No files changed. No commit / push / deploy.

## Notes
- No commit/push/deploy (owner deploys). Local only.
- Honest-deferral precedent: zivostravel passes 5–8, Zivo-Admin pass 8.
- Pass-9 rotation: **zivosmedia ⏸ (this doc, deferred)** → next is ZIVO-CHAT
  pass 9 (gate `vite build`), then zivodriver, zivostravel, zivosoftware,
  Zivo-Admin.
