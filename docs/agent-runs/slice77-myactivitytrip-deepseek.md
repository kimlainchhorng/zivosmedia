# DeepSeek run — 2026-06-14T07:27:14.732Z

- model: deepseek-chat
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/MyActivityTripPage.tsx (342 lines, "Activity Booking" — /my-trips/activities/:bookingId; a traveler's activity-booking detail view; REAL Supabase one-shot useEffect fetch (supabase as any).from("activity_bookings").select(...activity:activities(...)).eq("id", bookingId).single(); useState booking/loading/copied/reviewSheetOpen; useParams bookingId; copyBookingRef (navigator.clipboard + toast + 1.5s copied reset); handleShare (openShareToChat deep-link); embeds ReviewsSummary/ReviewsList/ReviewSubmissionSheet + ZivoMobileNav). STRUCTURALLY IDENTICAL to MyFlightTripPage/MyRestaurantTripPage (already passed three-way convergence). Layout: sticky header (raw icon Back + "Activity Booking" title + Shield); booking-reference card (copy-ref raw button + status badge); activity card (image/name/description/location); date&time card (+duration); participants card; special-requests card; price card; reviews block; actions row (shadcn outline Share + Back-to-Trips Buttons).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

RAW interactive controls = (1) L116 header Back raw <button> (icon-only ArrowLeft, onClick navigate(-1), className "h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition", ALREADY active:scale-95 + bare `transition`, NO hover, NO focus/aria-label); (2) L151 copy-booking-ref raw <button> (onClick copyBookingRef, visible content = booking_reference digits + Copy/Check icon child, className "flex items-center gap-1.5 mt-1 group", NO transition/scale/focus on the BUTTON; the Copy icon CHILD has its own group-hover:text-primary transition-colors, NO aria-label). SHADCN (SKIP): Share Button L310 (variant outline h-11), Back-to-Trips Button L318 (variant outline h-11), Skeleton. COMPONENTS (own internals, SKIP): ReviewsSummary/ReviewsList/ReviewSubmissionSheet, ZivoMobileNav, SEOHead. Status badge / activity image / MapPin / Calendar / Clock / Users / CheckCircle / Shield icons decorative.

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. Transition rule: transition-transform when scale is the SOLE animated property (no hover on the element); transition-all when a hover bg/color/border animates alongside the scale. FLIP RULE: ADDING a NEW CSS scale to a transition-colors/no-transition control that ALSO has hover color/bg/border ON ITSELF -> FLIP. DON'T-CHURN: control ALREADY has press + transition -> ring (+aria) ONLY. aria-label for icon-only OR when visible text doesn't convey the action (copy button visible text = the booking digits). OUTWARD ring-ring default on neutral surfaces. shadcn Button SKIP.

EDITS APPLIED (validate exact):
(A) L116 Back <button> — ADD aria-label="Back" + APPEND "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (DON'T-CHURN ring-ONLY — ALREADY active:scale-95 + bare `transition` covers transform; NO 2nd scale; NO flip — no hover on the element; OUTWARD ring-ring on neutral sticky header bg-background/95).
(B) L151 copy-ref <button> — ADD aria-label="Copy booking reference" (visible content is the booking digits, not the action) + APPEND "transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (inline chip/text-link tier [0.97]; the button itself had NO transition/scale -> add a NEW scale; transition-transform NOT transition-all — scale is the SOLE animated property ON THE BUTTON [no hover on the button; the group-hover color change lives on the child Copy icon which keeps its OWN transition-colors, independent]; OUTWARD ring-ring on neutral booking-ref card bg-muted/20).

QUESTIONS:
(1) (A) Back: aria-label="Back" + ring-ONLY correct? NO flip correct? OUTWARD ring-ring?
(2) (B) copy-ref: aria-label="Copy booking reference" warranted (visible text = booking digits)? transition-transform (NOT transition-all) correct since the BUTTON has no hover [the group-hover:text-primary is on the child Copy icon with its own transition-colors]? [0.97] inline tier + OUTWARD ring-ring?
(3) Inventory exhaustive (2 raw buttons edited; shadcn Share/Back-to-Trips SKIP; Reviews components + ZivoMobileNav own internals; badge/image/icons decorative)?
(4) Owner flags (logic/out of scope, FLAG not fix): (a) copyBookingRef navigator.clipboard.writeText no .catch(); (b) booking fetch is (supabase as any) one-shot useEffect (not react-query); (c) no error/not-found UI when booking is null after load (renders null); (d) setTimeout in copyBookingRef not cleaned up on unmount; (e) Share Button not disabled when booking.activity is null (handleShare early-returns, button still tappable no-op); anything else?
(5) Responsive 375/768/1280: sticky header; cards; actions row (2 shadcn outline Buttons flex-1). Any crush @375? sub-44px tap targets to FLAG (Back h-9 ~36px; copy-ref inline; shadcn Buttons h-11 44px)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/MyActivityTripPage.tsx

---

## Plan

This is a **structurally identical** page to `MyFlightTripPage` (Slice 103) and `MyRestaurantTripPage` (Slice 105), both already validated with three-way convergence. Two raw `<button>` controls need the same textbook edits.

## Proposed Changes

**File:** `src/pages/MyActivityTripPage.tsx`

### (A) L116 — Header Back button (DON'T-CHURN ring-ONLY)

**Before:**
```tsx
className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition"
```

**After:**
```tsx
aria-label="Back"
className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### (B) L151 — Copy booking reference button (NEW scale + transition-transform)

**Before:**
```tsx
className="flex items-center gap-1.5 mt-1 group"
```

**After:**
```tsx
aria-label="Copy booking reference"
className="flex items-center gap-1.5 mt-1 group transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

## Answers to Questions

**(1) Back button (A):** ✅ **Correct.** `aria-label="Back"` warranted (icon-only). Ring-ONLY correct — already has `active:scale-95` + bare `transition` (covers transform). No flip — no hover on the element. OUTWARD `ring-ring` correct — renders against neutral `bg-background/95` sticky header.

**(2) Copy-ref button (B):** ✅ **Correct.** `aria-label="Copy booking reference"` warranted — visible text is the booking digits, not the action. `transition-transform` (NOT `transition-all`) correct — the button itself has no hover; the `group-hover:text-primary transition-colors` lives on the child `<Copy>` icon which keeps its own independent `transition-colors`. `[0.97]` inline chip tier correct. OUTWARD `ring-ring` correct — renders against neutral `bg-muted/20` card.

**(3) Inventory:** ✅ **Exhaustive.** Exactly 2 raw `<button>` controls edited. shadcn Share/Back-to-Trips `<Button>`s skipped (own tokens). `ReviewsSummary`/`ReviewsList`/`ReviewSubmissionSheet`/`ZivoMobileNav`/`SEOHead` skipped (own internals). Status badge `<div>`, activity `<img>`, `MapPin`/`Calendar`/`Clock`/`Users`/`CheckCircle`/`Shield` icons decorative.

**(4) Owner flags (logic/out of scope):** ✅ All 5 correct. Add: **(f)** `handleShare` constructs `deepLink: /my-trips/activities/${bookingId}` — if the route pattern changes, this deep-link breaks silently (pre-existing). No other flags.

**(5) Responsive:** ✅ Clean at 375/768/1280. Sticky header (Back `h-9 w-9` + truncating title + Shield), booking-ref card (`flex justify-between`), activity card (`h-40` image + name/description/location), date&time/participants/special-requests/price cards, and actions row (2 shadcn outline `flex-1 h-11` Buttons) all lay out without overflow within `max-w-lg mx-auto px-4`. `pb-32` clears `ZivoMobileNav`. **Sub-44px FLAG:** Back `h-9` (36px), copy-ref inline button (~20px) — consistent with repo-wide compact patterns, not introduced here.

## Verify

Run `npm run update` — must pass (type-check + worker type-check + production build).
