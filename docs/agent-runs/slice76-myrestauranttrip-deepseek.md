# DeepSeek run — 2026-06-14T07:23:44.678Z

- model: deepseek-chat
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/MyRestaurantTripPage.tsx (334 lines, "Restaurant Reservation" — /my-trips/restaurants/:bookingId; a traveler's restaurant-reservation detail view; REAL Supabase one-shot useEffect fetch (supabase as any).from("restaurant_reservations").select(...restaurant:restaurants(...)).eq("id", bookingId).single(); useState booking/loading/copied/reviewSheetOpen; useParams bookingId; copyBookingRef (navigator.clipboard + toast + 1.5s copied reset); handleShare (openShareToChat deep-link); embeds ReviewsSummary/ReviewsList/ReviewSubmissionSheet + ZivoMobileNav). STRUCTURALLY IDENTICAL to MyFlightTripPage (already passed three-way convergence). Layout: sticky header (raw icon Back + "Restaurant Reservation" title + Shield); reservation-number card (copy-ref raw button + status badge); restaurant card (image/name/cuisine/address); date&time card; party-size card; special-requests card; price card; reviews block; actions row (shadcn outline Share + Back-to-Trips Buttons).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

RAW interactive controls = (1) L116 header Back raw <button> (icon-only ArrowLeft, onClick navigate(-1), className "h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition", ALREADY active:scale-95 + bare `transition`, NO hover, NO focus/aria-label); (2) L151 copy-reservation-ref raw <button> (onClick copyBookingRef, visible content = reservation_number digits + Copy/Check icon child, className "flex items-center gap-1.5 mt-1 group", NO transition/scale/focus on the BUTTON; the Copy icon CHILD has its own group-hover:text-primary transition-colors, NO aria-label). SHADCN (SKIP): Share Button L302 (variant outline h-11), Back-to-Trips Button L310 (variant outline h-11), Skeleton. COMPONENTS (own internals, SKIP): ReviewsSummary/ReviewsList/ReviewSubmissionSheet, ZivoMobileNav, SEOHead. Status badge / restaurant image / MapPin / Calendar / Users / CheckCircle / Shield icons decorative.

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. Transition rule: transition-transform when scale is the SOLE animated property (no hover on the element); transition-all when a hover bg/color/border animates alongside the scale. FLIP RULE: ADDING a NEW CSS scale to a transition-colors/no-transition control that ALSO has hover color/bg/border ON ITSELF -> FLIP. DON'T-CHURN: control ALREADY has press + transition -> ring (+aria) ONLY. aria-label for icon-only OR when visible text doesn't convey the action (copy button visible text = the reservation digits). OUTWARD ring-ring default on neutral surfaces. shadcn Button SKIP.

EDITS APPLIED (validate exact):
(A) L116 Back <button> — ADD aria-label="Back" (icon-only, no visible text) + APPEND "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (DON'T-CHURN ring-ONLY — ALREADY active:scale-95 + bare `transition` covers transform; NO 2nd scale; NO flip — no hover on the element; OUTWARD ring-ring on neutral sticky header bg-background/95).
(B) L151 copy-ref <button> — ADD aria-label="Copy reservation number" (visible content is the reservation digits, not the action) + APPEND "transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (inline chip/text-link tier [0.97]; the button itself had NO transition/scale -> add a NEW scale; transition-transform NOT transition-all — scale is the SOLE animated property ON THE BUTTON [no hover on the button; the group-hover color change lives on the child Copy icon which keeps its OWN transition-colors, independent]; OUTWARD ring-ring on neutral reservation-ref card bg-muted/20).

QUESTIONS:
(1) (A) Back: aria-label="Back" + ring-ONLY correct? NO flip correct? OUTWARD ring-ring?
(2) (B) copy-ref: aria-label="Copy reservation number" warranted (visible text = reservation digits)? transition-transform (NOT transition-all) correct since the BUTTON has no hover [the group-hover:text-primary is on the child Copy icon with its own transition-colors]? [0.97] inline tier + OUTWARD ring-ring?
(3) Inventory exhaustive (2 raw buttons edited; shadcn Share/Back-to-Trips SKIP; Reviews components + ZivoMobileNav own internals; badge/image/icons decorative)?
(4) Owner flags (logic/out of scope, FLAG not fix): (a) copyBookingRef navigator.clipboard.writeText no .catch(); (b) booking fetch is (supabase as any) one-shot useEffect (not react-query); (c) no error/not-found UI when booking is null after load (renders null); (d) setTimeout in copyBookingRef not cleaned up on unmount; anything else?
(5) Responsive 375/768/1280: sticky header; cards; actions row (2 shadcn outline Buttons flex-1). Any crush @375? sub-44px tap targets to FLAG (Back h-9 ~36px; copy-ref inline; shadcn Buttons h-11 44px)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/MyRestaurantTripPage.tsx

---

## Plan

Apply the same two-edits pattern from `MyFlightTripPage` (Slice 103) to `MyRestaurantTripPage`:

1. **L116 Back button** — `aria-label="Back"` + ring-ONLY (keep existing `active:scale-95` + bare `transition`, no flip, outward `ring-ring`)
2. **L151 copy-ref button** — `aria-label="Copy reservation number"` + `transition-transform active:scale-[0.97]` + ring (no flip — child Copy icon owns its `transition-colors`)

## Proposed Diff

```diff
--- a/src/pages/MyRestaurantTripPage.tsx
+++ b/src/pages/MyRestaurantTripPage.tsx
@@ -113,7 +113,7 @@ export default function MyRestaurantTripPage() {
         <button type="button"
           onClick={() => navigate(-1)}
           aria-label="Back"
-          className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition"
+          className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
         >
           <ArrowLeft className="w-4 h-4" />
         </button>
@@ -148,7 +148,7 @@ export default function MyRestaurantTripPage() {
                 <div>
                   <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Reservation Number</p>
-                  <button type="button" onClick={copyBookingRef} className="flex items-center gap-1.5 mt-1 group">
+                  <button type="button" onClick={copyBookingRef} aria-label="Copy reservation number" className="flex items-center gap-1.5 mt-1 group transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     <p className="text-[15px] font-mono font-bold text-foreground">
                       {booking.reservation_number}
                     </p>
```

## Verification

**Q1 — Back button (A):** ✅ Correct. `aria-label="Back"` for icon-only. Ring-ONLY (keep `active:scale-95` + bare `transition` — no flip since no hover on element). OUTWARD `ring-ring` on neutral `bg-background/95` sticky header.

**Q2 — Copy-ref button (B):** ✅ Correct. `aria-label="Copy reservation number"` warranted (visible text = reservation digits, not the action). `transition-transform` (NOT `transition-all`) correct — the button itself has no hover; the `group-hover:text-primary` color change lives on the child Copy icon which keeps its own `transition-colors`. `[0.97]` inline chip tier. OUTWARD `ring-ring` on neutral `bg-muted/20` card.

**Q3 — Inventory:** ✅ Exhaustive. Exactly 2 raw buttons edited. shadcn Share/Back-to-Trips `Button`s skipped (ship own tokens). `ReviewsSummary`/`ReviewsList`/`ReviewSubmissionSheet` + `ZivoMobileNav` + `SEOHead` skipped (own internals). Status badge, restaurant image, MapPin/Calendar/Users/CheckCircle/Shield icons decorative.

**Q4 — Owner flags (logic/out of scope):**
- (a) `copyBookingRef` `navigator.clipboard.writeText` with **no `.catch()`** — silent throw on insecure context
- (b) booking fetch is `(supabase as any)` one-shot `useEffect` (not react-query, no refetch/cache/error-retry)
- (c) **no error/not-found UI** when `booking` is `null` after load — renders `null` (pre-existing UX gap)
- (d) `setTimeout` in `copyBookingRef` (1.5s `copied` reset) **not cleared on unmount** — stray-timer warning risk
- (e) **No additional flags** — structurally identical to `MyFlightTripPage`

**Q5 — Responsive 375/768/1280:** ✅ Clean. Sticky header (Back `h-9 w-9` + truncating title + Shield), reservation-number card (`flex justify-between`: ref+copy on left, status badge right), restaurant card (image `h-40` + name/cuisine/address), date card, party-size card, special-requests card, price card, and actions row (2 shadcn outline `flex-1 h-11` Buttons) all lay out without overflow within `max-w-lg mx-auto px-4`; `pb-32` clears `ZivoMobileNav`.

**Sub-44px tap targets (FLAG — repo-wide compact patterns, NOT introduced):** header Back `h-9 w-9` (36px), copy-ref inline button (text-height, ~20px); shadcn Share/Back-to-Trips Buttons are `h-11` (44px ✓). Consistent with repo's compact header/inline scale; flagged for owner-wide tap-target sweep.

## Owner Must

1. Apply the diff above
2. Run `npm run update` (must pass — 0 TS errors, worker types, production build)
3. Commit and deploy when ready
