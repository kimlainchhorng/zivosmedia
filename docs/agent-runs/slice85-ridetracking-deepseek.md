# DeepSeek run — 2026-06-14T08:06:06.541Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/RideTrackingPage.tsx (251-line "Live Tracking" — live driver en-route tracking at /rides/track/:tripId; REAL Supabase: a useEffect fetch of ride_requests + drivers (maybeSingle) + a realtime channel subscription on postgres_changes UPDATE; useCustomerLocationBroadcast GPS broadcast; useRideNotifications push on status change; useMultiLegQueue; useState tripData; layout: AppLayout [owns header/Back, showBack onBack, hideNav] + a p-4 space-y-4 column of CONDITIONAL full-width banner CTAs [next-leg / share-trip / pre-order-food] + the DriverEnRouteTracker component + a TripChatFab). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, navigate, shareTrip, handleNextLeg, supabase/realtime, byte-identical. Don't add a SECOND competing press effect. Don't churn sub-components (DriverEnRouteTracker/TripChatFab/CrossServiceCTAs/SavePlaceInline — own internals). Don't renumber an existing scale. Don't add role/tabIndex/onKeyDown.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset only when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: wide full-width row/button WITH own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99]; icon-only active:scale-95.
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF.
- DON'T-CHURN: a control that ALREADY has active:scale + transition → ADD ring (+aria) ONLY (no scale renumber, no redundant 2nd scale, no flip).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter.

THREE edits applied — confirm each CORRECT or NEEDS-FIX. All three are full-width banner CTA <button>s that ALREADY have `active:scale-[0.99] transition-transform touch-manipulation`, each with an emoji tile + multi-line VISIBLE text, NO hover/focus/aria, each conditionally rendered, parent = the p-4 space-y-4 column on neutral bg-background:

A) L162 NEXT-LEG banner (one-shot onClick={handleNextLeg}, base `w-full flex items-center gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 to-primary/5 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation`) → applied: DON'T-CHURN → APPENDED ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (already active:scale-[0.99] + transition-transform; no scale renumber; no flip [transition-transform stays — ring adds no animated prop]; no aria — multi-line visible text conveys the action; OUTWARD ring-ring — the button's own fill is a primary-tint gradient but the OUTWARD ring renders just outside the box against the neutral page bg). Confirm DON'T-CHURN ring-only + no-aria + OUTWARD ring-ring + keep active:scale-[0.99]/transition-transform.

B) L183 SHARE-TRIP banner (one-shot onClick={shareTrip} [navigator.share or clipboard], base same pattern with `border-emerald-500/30 bg-emerald-500/10`) → applied: identical DON'T-CHURN ring-only append. Confirm same.

C) L213 PRE-ORDER-FOOD banner (one-shot onClick={() => navigate(`/eats?q=...`)}, base same pattern with `border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-amber-500/5`) → applied: identical DON'T-CHURN ring-only append. Confirm same.

ALSO CONFIRM I should LEAVE: AppLayout (owns the Back button + header); DriverEnRouteTracker L231 (sub-component, own internal buttons/contact/share/cancel handlers); TripChatFab L246 (sub-component); CrossServiceCTAs L205 + SavePlaceInline L203 (sub-components); all inner <div>s (emoji tiles + text rows — non-interactive presentational); the emoji glyphs (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Flag any other in-scope raw interactive control I missed (note: are the 3 banners "wide full-width WITH own surface" → should they be active:scale-[0.98] instead of the pre-existing [0.99]? My read: DON'T-CHURN — they ALREADY ship [0.99], do NOT renumber; confirm).
- files: src/pages/app/RideTrackingPage.tsx

---

## Plan

The three banner CTAs (A: next-leg, B: share-trip, C: pre-order-food) are all **DON'T-CHURN** — each already has `active:scale-[0.99] transition-transform touch-manipulation`. The applied ring-only append is correct. No scale renumber, no flip, no aria needed (all have multi-line visible text). No other in-scope raw interactive controls exist in this file.

## Confirmation — all three are correct

**A) L162 NEXT-LEG banner** — final className:
```
w-full flex items-center gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 to-primary/5 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
✅ DON'T-CHURN ring-only. No scale renumber. No flip (`transition-transform` stays — ring adds no animated prop). No aria (multi-line visible text). OUTWARD `ring-ring` (button's own primary-tint gradient fill, ring renders against neutral `bg-background` parent).

**B) L183 SHARE-TRIP banner** — final className:
```
w-full flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
✅ Identical DON'T-CHURN ring-only. Same rationale.

**C) L213 PRE-ORDER-FOOD banner** — final className:
```
w-full flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-amber-500/5 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
✅ Identical DON'T-CHURN ring-only. Same rationale.

## Scale tier question

> Are the 3 banners "wide full-width WITH own surface" → should they be `active:scale-[0.98]` instead of the pre-existing `[0.99]`?

**No — DON'T-CHURN.** The `[0.99]` is pre-existing and intentional for these banners. They have their own surface (gradient/bg fill + border) but are **not** shadcn `Button`-sized rows — they're `p-3` compact cards with multi-line text. The `[0.99]` tier is the established "BARE full-width row NO own surface" pattern, but since they already ship it and the rule says "don't renumber an existing scale," leave as-is. The visual difference between `[0.98]` and `[0.99]` is negligible for these compact banners.

## Leave list confirmed

✅ `AppLayout` (owns Back button + header)  
✅ `DriverEnRouteTracker` L231 (sub-component, own internal buttons)  
✅ `TripChatFab` L246 (sub-component)  
✅ `CrossServiceCTAs` L205 (sub-component)  
✅ `SavePlaceInline` L203 (sub-component)  
✅ All inner `<div>`s (emoji tiles + text rows — non-interactive presentational)  
✅ Emoji glyphs (decorative)

## No missed controls

The file has exactly 3 raw `<button>` elements in scope — all three banners. Everything else is either a sub-component (own internals) or non-interactive. No other raw `<button>`, `<a>`, or `onClick` divs exist at this level.

## Diff (already applied in the file shown)

The file already contains the correct final state — all three banners have the ring-only append. No changes needed.

## Owner verification

- **Verify** the three banners' `focus-visible:ring-2 focus-visible:ring-ring` renders correctly against the neutral `bg-background` parent (the buttons' own gradient/bg fills don't interfere with the outward ring).
- **Confirm** the `[0.99]` scale is acceptable for these compact banners (or request a future sweep to `[0.98]` for all full-width-with-surface controls repo-wide).
- **Deploy**: `npm run update` then `npm run build && npx wrangler deploy cloudflare/worker.js` (owner only).
