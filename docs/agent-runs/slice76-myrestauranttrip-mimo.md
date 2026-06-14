# MiMo run — 2026-06-14T07:25:00.243Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Validation — all 5 items correct as-is

### (1) (A) Back button — ✅ exact

`aria-label="Back"` warranted (icon-only). `active:scale-95` already present IS the press → ring-ONLY, no 2nd CSS scale. Bare `transition` covers transform+colors → **NO flip** (no hover on the element). OUTWARD `ring-ring` on `bg-background/95` sticky header — correct neutral surface. Confirmed in the provided code:

```
"h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**No corrections.**

### (2) (B) Copy-ref button — ✅ exact

- `aria-label="Copy reservation number"` — warranted; visible text is the ref **digits**, not the action.
- `transition-transform` NOT `transition-all` — correct. The **button** has no hover. The `group-hover:text-primary` + `transition-colors` live on the **child Copy icon** (own independent transition). Scale is the sole animated property on the button.
- `[0.97]` inline/text-link tier — correct.
- **NO flip** — button had no `transition-colors` (child owns its own), so adding `transition-transform` + `active:scale-[0.97]` to the button is a clean new-property add, not a flip scenario.
- OUTWARD `ring-ring` on `bg-muted/20` reservation card — correct neutral surface.

```
"flex items-center gap-1.5 mt-1 group transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**No corrections.**

### (3) Inventory — ✅ exhaustive

| Control | Verdict |
|---|---|
| L116 Back raw `<button>` | ✅ edited (A) |
| L151 copy-ref raw `<button>` | ✅ edited (B) |
| L302 shadcn Share `<Button>` | SKIP — own tokens |
| L310 shadcn Back-to-Trips `<Button>` | SKIP — own tokens |
| `Skeleton` | SKIP — non-interactive |
| `ReviewsSummary` / `ReviewsList` / `ReviewSubmissionSheet` | SKIP — own internals |
| `ZivoMobileNav` | SKIP — own internals |
| `SEOHead` | SKIP — non-visual |
| Status badge `<div>`, restaurant `<img>`, all Lucide icons | SKIP — decorative/media |

**2 raw buttons covered. Nothing missed.**

### (4) Owner flags — ✅ the 4 listed + one more

- **(a)** `navigator.clipboard.writeText` no `.catch()` — silent throw on insecure context. Pre-existing.
- **(b)** `(supabase as any)` one-shot `useEffect`, not react-query — no refetch/cache/retry. Pre-existing.
- **(c)** No error/not-found UI when `booking` is null after load — renders `null`. Pre-existing UX gap.
- **(d)** `setTimeout` in `copyBookingRef` (1.5s `copied` reset) not cleared on unmount — stray timer risk. Pre-existing.
- **(e)** NEW: Share button L302 is **not disabled** when `booking?.restaurant` is null — `handleShare` silently early-returns, but the button is still tappable (no-op toast). Minor UX gap; pre-existing logic.

**All 5 are pre-existing logic; flag, don't fix.**

### (5) Responsive + tap targets — ✅ clean

**375/768/1280:** `max-w-lg mx-auto px-4` centered column. Sticky header (Back `h-9 w-9` + truncating `text-base` title + Shield icon) fits. Cards stack vertically (`space-y-4`). Actions row: two shadcn `flex-1 h-11 rounded-2xl` outline Buttons fit side-by-side at 375 (`~160px` each). `pb-32` clears `ZivoMobileNav`. No crush.

**Sub-44px FLAG (repo-wide, not introduced):**
| Control | Size | Note |
|---|---|---|
| Back button | `h-9 w-9` (36px) | Below 44px |
| Copy-ref inline button | ~20px text height | Below 44px |
| Shadcn Share/Back-to-Trips | `h-11` (44px ✓) | Meets guideline |

---

## Summary

**Both edits (A + B) are textbook correct. Three-way convergence trivially holds — this is structurally identical to `MyFlightTripPage` (Slice 103), already validated.** The file as provided is final.

**Proposed diff: none needed** — the provided code already contains both edits exactly as specified.

**Owner action:** verify `npm run update` passes (it should — display-only className + aria changes on a leaf page), then commit.

**Hard-rule guard (confirm on the working-tree diff):**
- `−`/`+` className edits: **2** (A, B)
- `aria-label` added: **2** (A "Back", B "Copy reservation number")
- `focus-visible:ring` total: **2**, `ring-ring`: **2** (both OUTWARD), `ring-inset`: 0, `ring-white/70`: 0
- `aria-pressed`: 0, `aria-expanded`: 0
- `active:scale-[0.97]`: 1 new (B), `active:scale-95` kept: 1 (A, unchanged)
- FLIPs: **0** (A bare `transition` no-flip; B `transition-transform` new, child owns `transition-colors`)
- `transition-colors` removed: **0**
- Logic lines touched: **0**
