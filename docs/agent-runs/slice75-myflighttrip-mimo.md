# MiMo run — 2026-06-14T07:18:47.735Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/MyFlightTripPage.tsx (303 lines, "Flight Details" — /my-trips/flights/:bookingId; a traveler's flight booking detail view; REAL Supabase: useEffect one-shot fetch (supabase as any).from("flight_bookings").select("*").eq("id", bookingId).single(); useState booking/loading/copied/reviewSheetOpen; useParams bookingId; copyBookingRef (navigator.clipboard + toast + 1.5s copied reset); handleShare (openShareToChat deep-link); embeds ReviewsSummary/ReviewsList/ReviewSubmissionSheet components + ZivoMobileNav). Layout: sticky header (raw icon Back + "Flight Details" title + Shield icon); booking-reference card (copy-ref raw button + status badge); flight-info card (departure/arrival/flight/aircraft); passengers card; price card; reviews block; actions row (shadcn outline Share + Back-to-Trips Buttons).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): RAW interactive controls = (1) L109 header Back raw <button> (icon-only ArrowLeft, onClick navigate(-1), className "h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition", ALREADY active:scale-95 + bare `transition` [Tailwind's `transition` covers transform], NO hover, NO focus/aria-label); (2) L144 copy-booking-ref raw <button> (onClick copyBookingRef, visible content = booking_reference digits + Copy/Check icon child, className "flex items-center gap-1.5 mt-1 group", NO transition/scale/focus on the BUTTON itself; the Copy icon CHILD has its own group-hover:text-primary transition-colors, NO aria-label). SHADCN (SKIP — ship tokens): Share Button L271 (variant outline h-11), Back-to-Trips Button L279 (variant outline h-11), Skeleton. COMPONENTS (own internals, SKIP): ReviewsSummary/ReviewsList/ReviewSubmissionSheet, ZivoMobileNav, SEOHead. Status badge / Plane / Shield / CheckCircle / Users icons decorative.

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. Transition rule: transition-transform when scale is the SOLE animated property (no hover on the element); transition-all when a hover bg/color/border animates alongside the scale. FLIP RULE: ADDING a NEW CSS scale to a transition-colors/no-transition control that ALSO has hover color/bg/border ON ITSELF → FLIP. DON'T-CHURN: control ALREADY has press + transition → ring (+aria) ONLY. aria-label for icon-only OR when visible text doesn't convey the action (copy button visible text = the ref digits). OUTWARD ring-ring default on neutral surfaces. shadcn Button SKIP.

EDITS APPLIED (validate exact):
(A) L109 Back <button> — **ADD aria-label="Back"** (icon-only, no visible text) + APPEND "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (DON'T-CHURN ring-ONLY — ALREADY active:scale-95 + bare `transition` covers transform; NO 2nd scale; **NO flip** — no hover on the element, bare `transition` already animates transform; OUTWARD ring-ring on neutral sticky header bg-background/95).
(B) L144 copy-ref <button> — **ADD aria-label="Copy booking reference"** (visible content is the ref digits, not the action) + APPEND "transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (inline chip/text-link tier [0.97]; the button itself had NO transition/scale → add a NEW scale; **transition-transform NOT transition-all** — scale is the SOLE animated property ON THE BUTTON [no hover on the button; the group-hover color change lives on the child Copy icon which keeps its OWN transition-colors, independent]; OUTWARD ring-ring on neutral booking-ref card bg-muted/20).

QUESTIONS:
(1) (A) Back: aria-label="Back" + ring-ONLY correct (already active:scale-95 + bare transition)? NO flip correct (no hover on the element; bare `transition` already covers transform)? OUTWARD ring-ring?
(2) (B) copy-ref: aria-label="Copy booking reference" warranted (visible text = ref digits)? transition-transform (NOT transition-all) correct since the BUTTON has no hover [the group-hover:text-primary is on the child Copy icon with its own transition-colors]? [0.97] inline tier + OUTWARD ring-ring?
(3) Inventory exhaustive (2 raw buttons edited; shadcn Share/Back-to-Trips SKIP; Reviews components + ZivoMobileNav own internals; badge/icons decorative)?
(4) Owner flags (logic/out of scope, FLAG not fix): (a) copyBookingRef uses navigator.clipboard.writeText with no .catch() (pre-existing — silent throw on insecure context); (b) booking fetch is (supabase as any) one-shot useEffect (not react-query — pre-existing pattern); (c) no error/not-found UI when booking is null after load (renders null — pre-existing UX gap); anything else?
(5) Responsive 375/768/1280: sticky header (Back + title + Shield); cards (ref/flight 3-col departure-arrival/passengers/price); actions row (2 shadcn outline Buttons flex-1). Any crush @375 (the flight-info 3-col layout departure | Plane | arrival)? sub-44px tap targets to FLAG (Back h-9 ~36px; copy-ref inline; shadcn Buttons h-11 44px ✓)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/MyFlightTripPage.tsx

---

## Validation: MyFlightTripPage.tsx — 2 raw controls, both edits correct

---

### (1) Plan

Validate the 2 edits (A = Back icon button, B = copy-ref button) against the house token tiers, ring/transition/FLIP rules, and inventory completeness. No additional changes needed — the provided code already has both edits applied correctly.

---

### (2) Proposed diff (before → after)

Since the edits are already applied in the provided code, here's the confirmed before/after for documentation:

**Edit A — L109 Back button**

```diff
- <button type="button"
-   onClick={() => navigate(-1)}
-   className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition"
- >
+ <button type="button"
+   onClick={() => navigate(-1)}
+   aria-label="Back"
+   className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
+ >
```

**Edit B — L144 copy-ref button**

```diff
- <button type="button" onClick={copyBookingRef} className="flex items-center gap-1.5 mt-1 group">
+ <button type="button" onClick={copyBookingRef} aria-label="Copy booking reference" className="flex items-center gap-1.5 mt-1 group transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

---

### (3) Answers to each question

**(1) Edit A (Back):** ✅ All correct.
- `aria-label="Back"` — icon-only, no visible text. Warranted.
- Ring-ONLY append — DON'T-CHURN: already has `active:scale-95` + bare `transition` (covers transform). No second scale.
- **NO flip** — correct. The button has **no hover** (`bg-muted/60` is static, no `hover:` class). Bare `transition` already covers the existing `active:scale-95` transform. Adding `focus-visible:ring` doesn't require a transition change (ring is box-shadow, snaps on keyboard focus).
- **OUTWARD `ring-ring`** — correct. Sits in sticky header `bg-background/95`, neutral surface.

**(2) Edit B (copy-ref):** ✅ All correct.
- `aria-label="Copy booking reference"` — warranted. Visible text = the ref digits (`booking.booking_reference`), not the action.
- `transition-transform` (NOT `transition-all`) — **correct**. The FLIP rule triggers when adding a NEW CSS scale to a control that ALSO has hover color/bg/border **on itself**. The button has **no hover on itself** — the `group-hover:text-primary` lives on the child `<Copy>` icon with its own `transition-colors`. The button's only animated property is the scale → `transition-transform` is the minimal correct transition.
- `[0.97]` inline chip/text-link tier — correct for inline text content.
- OUTWARD `ring-ring` — correct. Sits inside `bg-muted/20` booking-ref card, neutral surface.
- `group` class preserved — needed for the child Copy icon's `group-hover:text-primary`. ✅

**(3) Inventory:** ✅ Exhaustive.
- **2 raw `<button>`** — both edited (A + B).
- **2 shadcn `<Button>`** — Share + Back-to-Trips, both `variant="outline" h-11`. SKIP (ship own tokens). ✅
- **Components own internals** — `ReviewsSummary`, `ReviewsList`, `ReviewSubmissionSheet`, `ZivoMobileNav`, `SEOHead`. SKIP. ✅
- **Decorative** — status badge `<div>`, Plane/Shield/CheckCircle/Users/ArrowLeft icons, Skeleton. Not interactive. ✅

**(4) Owner flags (logic / out of scope — FLAG not fix):**

| # | Flag | Risk |
|---|------|------|
| (a) | `copyBookingRef` uses `navigator.clipboard.writeText` with no `.catch()` | Silent throw on insecure context / denied clipboard permission (pre-existing) |
| (b) | Booking fetch is `(supabase as any)` one-shot `useEffect` (not react-query) | Pre-existing pattern; no caching/stale/refetch semantics |
| (c) | No error/not-found UI when `booking` is null after load — ternary renders `null` | Pre-existing UX gap; user sees blank page on invalid ID |
| (d) | `setTimeout` in `copyBookingRef` not cleaned up on unmount | Minor — potential "setState on unmounted component" warning (pre-existing) |

**(5) Responsive 375/768/1280:** ✅ Clean.

- **Sticky header** @375: Back `h-9 w-9` (36px) + flex-1 truncate title + Shield `w-4`. Fits in `px-4` + gap-3. ✅
- **Flight info 3-col** @375: `flex justify-between` with `px-4` gives each side ~110px. Airport codes (`text-base font-bold`), city (`text-[12px]`), date (`text-sm`) — standard flight layout, fits for typical 3-letter IATA codes + short city names. Long city names may truncate but that's a pre-existing layout choice, not introduced here. ✅
- **Actions row**: 2× `flex-1 rounded-2xl h-11` shadcn buttons in `gap-2.5` — splits evenly at any width. ✅
- **Cards** all `rounded-2xl p-4` inside `max-w-lg mx-auto px-4` — clean at all breakpoints.

**Sub-44px tap targets (FLAG — repo-wide, not introduced):**
| Control | Size | Note |
|---------|------|------|
| Back button `h-9 w-9` | 36px | Below 44px guideline |
| Copy-ref button | ~24-28px (inline text) | Below 44px guideline |
| shadcn Buttons `h-11` | 44px ✓ | Meets guideline |

---

### Verification

**`npm run update` must pass** before moving to Done. The diff is 2 className-only edits + 2 aria-label additions on a single file (`src/pages/MyFlightTripPage.tsx`), 0 logic lines touched. Zero risk of type or build failure.

Both edits are **textbook correct** against the house rules. No corrections needed — the code as provided is final.
