# MiMo run — 2026-06-14T07:28:09.772Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Validation — `MyActivityTripPage.tsx`

**Status: Edits already applied in working tree. All correct. File is final.**

---

### (1) (A) Back button — ✅ correct as-is

- `aria-label="Back"` — warranted (icon-only ArrowLeft, no visible text).
- Ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — correct. Existing `active:scale-95` IS the press; bare `transition` covers transform; DON'T-CHURN = no 2nd scale.
- NO flip — correct. No hover on the element; bare `transition` already covers both transform and any color if one were added (none here); nothing to flip from `transition-colors`.
- OUTWARD `ring-ring` — correct. Neutral `bg-background/95` sticky header.

### (2) (B) copy-ref button — ✅ correct as-is

- `aria-label="Copy booking reference"` — warranted. Visible content = booking_reference digits (`text-[15px] font-mono font-bold`), not the action. Copy icon child is decorative.
- `transition-transform` NOT `transition-all` — correct. Scale is the sole animated property **on the button itself**. The button has no hover (`group-hover:text-primary` is on the child Copy icon, which carries its own independent `transition-colors`). No flip applies: the flip rule triggers when adding a scale to a control that ALSO has hover color/bg/border **on itself** — here the hover is on a child, not the button.
- `active:scale-[0.97]` inline chip tier — correct.
- OUTWARD `ring-ring` — correct. Neutral booking-ref card `bg-muted/20`. The `overflow-hidden` is on the activity card image, not this button or its parent.

### (3) Inventory — ✅ exhaustive

| Control | Edit | Verdict |
|---------|------|---------|
| L116 raw `<button>` Back | A: aria-label + ring-only | ✅ edited |
| L151 raw `<button>` copy-ref | B: aria-label + transition-transform + scale-[0.97] + ring | ✅ edited |
| L310 shadcn `<Button>` Share | Ship own tokens | SKIP ✓ |
| L318 shadcn `<Button>` Back-to-Trips | Ship own tokens | SKIP ✓ |
| `ReviewsSummary`/`ReviewsList`/`ReviewSubmissionSheet` | Own internals | SKIP ✓ |
| `ZivoMobileNav` | Own internals | SKIP ✓ |
| `SEOHead` | Non-visual | SKIP ✓ |
| Status badge `<div>`, activity `<img>`, MapPin/Calendar/Clock/Users/CheckCircle/Shield/MessageCircle/DollarSign icons | Decorative | SKIP ✓ |
| Card `motion.div`s (entrance anim) | No onClick | SKIP ✓ |
| `Skeleton` | Loading placeholder | SKIP ✓ |

2 raw buttons edited. Nothing missed.

### (4) Owner flags — ✅ list is complete

All 5 pre-existing flags (a)–(e) are correctly identified. **Nothing else to flag:**

- `(supabase as any)` cast is the repo-wide pattern — same as MyFlightTripPage / MyRestaurantTripPage.
- `booking?.activity_id || bookingId` fallback in `ReviewSubmissionSheet` `serviceId` — correct behavior (uses the raw bookingId if activity relation is null).
- The `catch {}` in the fetch is a silent best-effort swallow — consistent with the sibling pages (flags under (b)/(c) cover the UX consequence).
- No stale closures, no missing deps in the `useEffect` dependency array (`[bookingId]` is correct — the fetch only depends on the param).

### (5) Responsive — ✅ clean, same as siblings

- **375**: Sticky header (Back `h-9` + truncating `text-base font-bold truncate` title + subtitle + Shield `w-4`) fits. Booking-ref card (`flex justify-between` on two columns). Activity card (`h-40` image + name/desc/location). Date/time / participants / special-requests / price cards (single-column within `max-w-lg`). Actions row (2 × shadcn outline `flex-1 h-11 rounded-2xl` = ~170px each, fits). `pb-32` clears `ZivoMobileNav`.
- **768/1280**: Widens within the centered `max-w-lg` column.
- **Sub-44px FLAG (repo-wide, NOT introduced here):** Back `h-9 w-9` (36px), copy-ref inline button (text-height ~20px). shadcn Share/Back-to-Trips `h-11` (44px ✓). Flagged for owner-wide tap-target sweep, not changed here.

---

**Verdict: All 5 questions answered — file is final. No corrections needed. Three-way convergence trivially holds (structurally identical to MyFlightTripPage/MyRestaurantTripPage, already validated). `npm run update` must pass green before moving to Done.**
