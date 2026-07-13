# MiMo run — 2026-06-14T08:06:39.600Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Verdict: All three edits are **CORRECT**. LEAVE list is **COMPLETE**. No missing controls.

### Per-control confirmation

| Control | DON'T-CHURN | Ring-only (no scale renumber) | No flip | No aria | Ring direction | Final className after-string |
|---|---|---|---|---|---|---|
| **A** Next-leg L162 | ✓ | ✓ | ✓ (ring adds no animated prop; `transition-transform` stays correct) | ✓ (3-line visible text) | **OUTWARD** `ring-ring` (primary-tint gradient own-fill, outward ring against neutral `bg-background`) | `…touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **B** Share-trip L183 | ✓ | ✓ | ✓ | ✓ (2-line visible text) | **OUTWARD** `ring-ring` (emerald-tint own-fill, outward against neutral page bg) | identical append |
| **C** Pre-order-food L213 | ✓ | ✓ | ✓ | ✓ (3-line visible text) | **OUTWARD** `ring-ring` (orange/amber gradient own-fill, outward against neutral page bg) | identical append |

### Scale-tier note

You're right to flag it. Per the tier definitions, "wide full-width row/button **WITH own surface**" is `active:scale-[0.98]` — and all three banners have their own surface (colored border + tinted gradient fill). So `[0.98]` is the textbook tier. **But per DON'T-CHURN, the pre-existing `[0.99]` is correctly left as-is** — no renumbering an existing scale. Confirm: **do NOT renumber**.

### LEAVE list — confirmed complete

| Item | Reason |
|---|---|
| `AppLayout` | Wrapper; owns its own Back button + header |
| `DriverEnRouteTracker` L231 | Sub-component; own internal buttons/contact/share/cancel |
| `TripChatFab` L246 | Sub-component |
| `CrossServiceCTAs` L205 | Sub-component |
| `SavePlaceInline` L203 | Sub-component |
| Inner `<div>`s (emoji tiles, text rows) | Non-interactive presentational |
| Emoji glyphs | Decorative |

### Missing controls audit

**None.** The file has exactly **3 raw `<button>` elements** (A, B, C). Everything else is either a sub-component with its own interactive internals or a non-interactive presentational `<div>`. No other in-scope raw interactive controls.

### Hard-rule guard grep

```
focus-visible:ring  = 3 (all 3 controls)
ring-ring            = 3 (all OUTWARD)
ring-inset           = 0
ring-white/70        = 0
aria-label           = 0 new
aria-pressed         = 0
active:scale-[0.99]  = 3 pre-existing, kept (NOT renumbered)
FLIPs                = 0
NEW transitions      = 0
Logic lines touched  = 0
```

**No diff needed — the working tree is already correct.** All three are textbook DON'T-CHURN ring-only appends. Verified.
