# MiMo run — 2026-06-14T08:34:07.709Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/MyTripsPage.tsx (398-line "My Trips" — unified bookings list at /app trips route; REAL data via useUnifiedTrips({services,status,limit}) over a multi-service unified-trips hook; URL-param filters via useSearchParams [serviceFilter ?service=, statusFilter ?status=]; PullToRefresh; layout: a fixed 3D bokeh background + a sticky glass header [a motion.div-wrapped Back <Link> + "My Trips" title] + a NextTripCard banner [a "View" <Link>] + a service-filter pill strip [motion.button ×5 mapped] + a status-filter tab bar [motion.button ×5 mapped inside a GlassCard3D] + a trips list [each row = a <Link to={detailPath}> wrapping a motion.div TripCard] OR loading skeletons OR an empty-state [shadcn "Explore Services" Button]). RULES: className strings + display-only attrs (aria-*) ONLY; preserve ALL logic, onClick, setServiceFilter/setStatusFilter, useSearchParams, useUnifiedTrips, Link `to` targets, byte-identical. Framer-motion whileTap/whileHover are EXISTING display-only press effects — don't add a SECOND competing CSS press (no CSS active:scale on a control that already has whileTap, OR already has a CSS active:scale). Don't churn the shadcn <Button>/<Badge>. Don't add role/tabIndex/onKeyDown. Don't renumber an existing scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when control is a flush EDGE child of a rounded overflow-hidden PARENT, OR a flush media tile in a near-gapless grid.
- Ring color: --ring resolves BLACK. OUTWARD ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted/faint-tint) = ring-ring; saturated/dark/IMAGE surface AS THE PARENT (or ring over media) = ring-white/70. A gradient/tinted-FILLED button/chip (bg-ig-gradient, or a faint primary-tint) on a NEUTRAL parent still uses ring-ring (the OUTWARD ring renders against the neutral parent, not its own fill). For an INSET ring it renders over the control's OWN surface — image-dominant tile → ring-white/70; neutral bg-card row → ring-ring.
- Press-scale tiers (CSS): icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab/single-select active:scale-[0.97]; wide full-width row WITH own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99]. Don't renumber an existing scale. NOTE: a framer-motion whileTap={{scale}} IS already a press effect — a control with whileTap should get ring-ONLY (NO added CSS active:scale = no second competing press).
- transition rule: transition-transform when scale is the ONLY animated CSS prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON. FLIP RULE: transition-colors/transition-opacity GAINING a NEW CSS active:scale MUST flip to transition-all. ALREADY transition-all → append without flipping. Adding ONLY a focus ring (no new animated CSS prop) → leave the existing transition class as-is. (Note: framer-motion whileTap is NOT a CSS transition prop — it never forces a flip; a ring-only append next to whileTap leaves the transition class untouched.)
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a PERSISTENT single-select segmented filter/tab/picker whose on/off is bg-conveyed. NOT aria-pressed on one-shot nav. For custom tabs without role=tablist/tab, aria-pressed is the house pattern. A natively-focusable raw <Link>/<a> may receive a display-only focus-ring className (block rounded-2xl + focus-visible:ring-ring) to close a keyboard-focus-indicator gap — this is className-only (NO role/tabIndex/onKeyDown), within scope.

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press handling [whileTap present? CSS scale present? → ring-only], transition class + whether FLIP/NEW/leave, ring-inset vs outward + reason, any aria-* attr; flag any to LEAVE):

A) L285 SERVICE-FILTER chip (motion.button, MAPPED ×5 over serviceFilters [all/flights/hotels/cars/rides], single-select, selection bg-conveyed via cn() `serviceFilter === filter.id ? "bg-ig-gradient text-white shadow-lg shadow-primary/30" : "bg-transparent border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"`, one-shot onClick={() => setServiceFilter(filter.id)}, VISIBLE icon+label; cn() STATIC base `shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-[11px] font-bold transition-all duration-300 touch-manipulation` [ALREADY transition-all], ALREADY whileHover={{scale:1.04}} whileTap={{scale:0.96}} [framer-motion press], NO focus/aria; container = a manual glass card `relative rounded-2xl` [NOT overflow-hidden] with inner `flex flex-wrap items-center gap-2 p-3` over `bg-card/65 backdrop-blur-2xl`). → my plan: ADD aria-pressed={serviceFilter === filter.id} + APPEND into the cn() STATIC arg `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ring-ONLY (the chip ALREADY presses via framer whileTap → DON'T add a CSS active:scale [second competing press]; NO flip — ring adds no animated CSS prop, already transition-all anyway; OUTWARD ring-ring — bg-ig-gradient fill chip on the neutral bg-card/65 glass parent [gap-2, not overflow-hidden → not clipped]; aria-pressed — persistent single-select filter, bg-conveyed). Confirm: aria-pressed + ring-ONLY [whileTap present] + OUTWARD ring-ring + no-flip.

B) L315 STATUS-FILTER tab (motion.button, MAPPED ×5 over statusFilters [all/upcoming/active/done/cancelled], single-select, selection bg-conveyed via cn() `statusFilter === filter.id ? "bg-ig-gradient text-white shadow-lg shadow-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-card/50"`, one-shot onClick={() => setStatusFilter(filter.id)}, VISIBLE text; cn() STATIC base `flex-1 text-[11px] font-bold py-2.5 rounded-xl transition-all duration-300 touch-manipulation` [ALREADY transition-all], ALREADY whileHover={{scale:1.04}} whileTap={{scale:0.92}} [framer press], NO focus/aria; container = GlassCard3D [a rounded-2xl OVERFLOW-HIDDEN glass card] with inner `flex gap-0.5 p-1.5` [tabs sit inside 6px p-1.5 padding, gap-0.5=2px between tabs]). → my plan: ADD aria-pressed={statusFilter === filter.id} + APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ring-ONLY (whileTap present → no CSS active:scale; no flip; aria-pressed — single-select tab). RING PLACEMENT decision: the GlassCard3D IS overflow-hidden BUT the tabs are NOT flush edge children — they sit inside p-1.5 (6px) padding, and a 2px outward ring renders within that padding (NOT clipped at the card edge). Lean OUTWARD ring-ring (renders against the neutral glass card surface). Confirm inset-vs-OUTWARD given the overflow-hidden-but-p-1.5-padded track (lean OUTWARD, like a padded non-flush segmented track), + aria-pressed + ring-ONLY [whileTap] + no-flip + ring-ring.

C) L250 HEADER BACK <Link> (icon-only ArrowLeft, to="/app", ALREADY aria-label="Go back", className `w-10 h-10 min-w-[44px] min-h-[44px] rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 flex items-center justify-center touch-manipulation shadow-lg shadow-primary/[0.05] hover:bg-card/80 transition-all` [ALREADY transition-all + hover:bg-card/80], NO focus; WRAPPED in a motion.div with whileHover={{scale:1.1,rotateY:10}} whileTap={{scale:0.88}} [framer press on the WRAPPER]; parent = sticky header `bg-background/70 backdrop-blur` neutral). → my plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ring-ONLY (the wrapping motion.div whileTap handles the press → DON'T add a CSS active:scale; NO flip — ring adds no animated prop, already transition-all; OUTWARD ring-ring on the neutral header; rounded-2xl present so ring traces; KEEP aria-label="Go back"; NO aria-pressed — one-shot nav). Confirm: ring-ONLY [wrapper whileTap] + OUTWARD ring-ring + keep aria-label + no-flip.

D) L188 NEXT-TRIP "VIEW" <Link> (to={next.detailPath}, VISIBLE text "View", className `shrink-0 text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 touch-manipulation active:scale-95 transition-all` [ALREADY a CSS active:scale-95 + transition-all], NO focus/aria; parent = the NextTripCard inner content over a faint `bg-gradient-to-br from-primary/15 via-primary/8 to-primary/5 backdrop-blur-xl` banner). → my plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ring-ONLY (ALREADY presses via the CSS active:scale-95 → DON'T add a second scale, KEEP active:scale-95 [NOT renumbered]; NO flip — already transition-all; OUTWARD ring-ring — the View pill's own fill is bg-primary/10 but the OUTWARD ring renders against the PARENT banner, a FAINT 15%/8%/5% primary-tint gradient = neutral-ish → ring-ring [NOT ring-white/70 — the tint is light, not a saturated/dark/image surface]; NO aria — visible text "View"). Confirm: ring-ONLY [existing active:scale-95 kept] + OUTWARD ring-ring [faint-tint parent → ring-ring not white/70] + no-flip + no-aria.

E) L141 TRIP-CARD wrapping <Link> (to={detailPath}, wraps the whole TripCard motion.div [which has its OWN whileHover={{scale:1.02...}} whileTap={{scale:0.97}} framer press]; the <Link> itself has NO className → a natively-focusable <a> with NO visible focus indicator; parent = the `space-y-3` trips list on the neutral page bg). → my plan: ADD `className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` (block so the inline <a> outlines the full card; rounded-2xl matches the card's radius so the ring traces tightly; OUTWARD ring-ring on the neutral list bg; NO press scale — the inner TripCard motion.div whileTap already handles the press [no second competing press]; NO aria — the visible card title/subtitle/status convey the link; this is a pure display-only focus-ring className on an already-focusable, already-interactive <a> — NO role/tabIndex/onKeyDown). NOTE this mirrors the prior SupportCenterPage decision (a bare Link wrapping a Card got `block rounded-2xl focus-visible:ring-ring` — keyboard-a11y gap closed, className-only). Confirm: ADD block rounded-2xl + OUTWARD ring-ring + no-press [inner motion whileTap] + no-aria — OR flag if you judge a className on the bare Link out of scope (prior precedent = ADD).

ALSO CONFIRM I should LEAVE these: the shadcn "Explore Services" <Button asChild><Link> L382-384 (own focus/scale tokens); the <Badge> status pills L122 (own tokens); all the GlassCard3D/BokehParticle/glass-layer/background <div>s + the loading skeletons (non-interactive/decorative); the TripCard inner motion.div L90 + NextTripCard motion.div L167 + filter-wrapper motion.div L275/L306 (entrance/hover anim, NO onClick — the mapped motion.buttons INSIDE are edited); MobileBottomNav L395 (own file); PullToRefresh (wrapper); the title <h1>/<p>s, Next-Trip labels, amount/date/meta <span>s (non-interactive); ArrowLeft/ChevronRight/Plane/Car/etc icons (decorative); the bg <img> alt="" (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Controls: A service-chip ×5 (aria-pressed + ring-ONLY[whileTap] + OUTWARD ring-ring + no-flip), B status-tab ×5 (aria-pressed + ring-ONLY[whileTap] + ring-ring + INSET-vs-OUTWARD on the overflow-hidden-but-p-1.5-padded GlassCard3D track [lean OUTWARD] + no-flip), C Back Link (ring-ONLY[wrapper whileTap] + OUTWARD ring-ring + keep aria-label), D View Link (ring-ONLY[keep existing active:scale-95] + OUTWARD ring-ring[faint-tint parent] + no-aria), E TripCard wrap Link (ADD block rounded-2xl + OUTWARD ring-ring + no-press + no-aria — prior precedent ADD). Resolve especially: A/B/C ring-ONLY because framer whileTap already presses; B inset-vs-outward on the p-1.5-padded overflow-hidden track; D ring-ring vs white/70 on the faint primary-tint banner parent; E whether a focus-ring className on the bare wrapping Link is in scope (prior SupportCenterPage precedent = ADD).
- files: src/pages/app/MyTripsPage.tsx

---

## Plan

5 raw interactive controls to edit in `src/pages/app/MyTripsPage.tsx`. All are className-only + display-only aria attrs. Zero logic lines touched. Two `aria-pressed` additions (A, B). All 5 get focus-visible rings. All 5 ring-ONLY (A/B have framer `whileTap`; C has wrapper `whileTap`; D already has CSS `active:scale-95`; E inner `motion.div` has `whileTap` — no competing second CSS press on any).

---

## Diff — `src/pages/app/MyTripsPage.tsx`

### A) Service-filter chip ×5 (L~282)

**Before:**
```jsx
<motion.button
  key={filter.id}
  whileHover={{ scale: 1.04 }}
  whileTap={{ scale: 0.96 }}
  onClick={() => setServiceFilter(filter.id)}
  className={cn(
    "shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-[11px] font-bold transition-all duration-300 touch-manipulation",
```

**After:**
```jsx
<motion.button
  key={filter.id}
  whileHover={{ scale: 1.04 }}
  whileTap={{ scale: 0.96 }}
  onClick={() => setServiceFilter(filter.id)}
  aria-pressed={serviceFilter === filter.id}
  className={cn(
    "shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-[11px] font-bold transition-all duration-300 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

| Decision | Rationale |
|---|---|
| `aria-pressed` | Persistent single-select filter, bg-conveyed |
| Ring-ONLY, no CSS `active:scale` | framer `whileTap={{scale:0.96}}` already presses — second CSS scale = competing |
| No flip | Already `transition-all`; ring adds no animated CSS prop |
| OUTWARD `ring-ring` | `bg-ig-gradient` fill on neutral `bg-card/65` glass parent; `gap-2` container not overflow-hidden |

---

### B) Status-filter tab ×5 (L~312)

**Before:**
```jsx
<motion.button
  key={filter.id}
  whileHover={{ scale: 1.04 }}
  whileTap={{ scale: 0.92 }}
  onClick={() => setStatusFilter(filter.id)}
  className={cn(
    "flex-1 text-[11px] font-bold py-2.5 rounded-xl transition-all duration-300 touch-manipulation",
```

**After:**
```jsx
<motion.button
  key={filter.id}
  whileHover={{ scale: 1.04 }}
  whileTap={{ scale: 0.92 }}
  onClick={() => setStatusFilter(filter.id)}
  aria-pressed={statusFilter === filter.id}
  className={cn(
    "flex-1 text-[11px] font-bold py-2.5 rounded-xl transition-all duration-300 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

| Decision | Rationale |
|---|---|
| `aria-pressed` | Persistent single-select tab, bg-conveyed |
| Ring-ONLY | framer `whileTap={{scale:0.92}}` already presses |
| No flip | Already `transition-all` |
| **OUTWARD** `ring-ring` | GlassCard3D IS `overflow-hidden`, BUT tabs sit inside `p-1.5` (6px padding). A 2px outward ring lands 4px from the overflow boundary — visible, not clipped. Same padded-track logic as SupportCenterPage's `p-1` segmented strip. Neutral `bg-card/65` glass interior → `ring-ring` |

---

### C) Header Back Link (L~246)

**Before:**
```jsx
className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 flex items-center justify-center touch-manipulation shadow-lg shadow-primary/[0.05] hover:bg-card/80 transition-all"
aria-label="Go back"
```

**After:**
```jsx
className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 flex items-center justify-center touch-manipulation shadow-lg shadow-primary/[0.05] hover:bg-card/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
aria-label="Go back"
```

| Decision | Rationale |
|---|---|
| Ring-ONLY | Wrapper `motion.div` has `whileTap={{scale:0.88}}` — no CSS active:scale on the Link |
| No flip | Already `transition-all`; ring adds no animated prop |
| OUTWARD `ring-ring` | Neutral header `bg-background/70 backdrop-blur` |
| Keep `aria-label="Go back"` | Icon-only control, pre-existing |

---

### D) View Link (L~187)

**Before:**
```jsx
className="shrink-0 text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 touch-manipulation active:scale-95 transition-all"
```

**After:**
```jsx
className="shrink-0 text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 touch-manipulation active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

| Decision | Rationale |
|---|---|
| Ring-ONLY, KEEP existing `active:scale-95` | Already has CSS press — no second competing scale |
| No flip | Already `transition-all` |
| OUTWARD `ring-ring` | Parent banner is a faint `from-primary/15 via-primary/8 to-primary/5` gradient — light/neutral-ish, NOT saturated/dark/image → `ring-ring`, not `ring-white/70` |
| No aria | Visible text "View" |

---

### E) TripCard wrapping Link (L~141)

**Before:**
```jsx
return detailPath ? <Link to={detailPath}>{cardContent}</Link> : cardContent;
```

**After:**
```jsx
return detailPath ? <Link to={detailPath} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{cardContent}</Link> : cardContent;
```

| Decision | Rationale |
|---|---|
| ADD focus-ring className | Bare `<a>` with zero focus indicator — genuine keyboard-a11y gap. Matches SupportCenterPage precedent (bare Link wrapping Card → `block rounded-2xl focus-visible:ring-ring`) |
| `block` | Makes inline `<a>` outline full Card area |
| `rounded-2xl` | Matches the inner card's radius so ring traces tightly |
| OUTWARD `ring-ring` | Neutral page `bg-background` list surface |
| No press | Inner `motion.div` has `whileHover/whileTap` — no competing press on the Link |
| No aria | Visible card title/subtitle/status convey the link |
| Pure className, no role/tabIndex/onKeyDown | In scope per house rule |

---

## LEAVE list (confirm)

- **shadcn `<Button asChild>` "Explore Services"** L~382 — own focus/scale tokens
- **`<Badge>` status pills** L~122 — own tokens
- **GlassCard3D / BokehParticle / glass-layer / background `<div>`s** — decorative
- **Loading skeletons** — non-interactive
- **TripCard inner `motion.div`** L~90, **NextTripCard `motion.div`** L~167, **filter-wrapper `motion.div`** L~275/L~306 — entrance/hover anim, NO onClick
- **MobileBottomNav** L~395 — own file
- **PullToRefresh** — wrapper
- **Title `<h1>`/`<p>`s, Next-Trip labels, amount/date/meta `<span>`s** — non-interactive
- **All icons** (ArrowLeft, ChevronRight, Plane, etc.) — decorative
- **`<img alt="">`** — decorative background

---

## Guard-grep summary

| Metric | Count |
|---|---|
| className `−`/`+` edits | 5 (A static string, B static string, C className string, D className string, E className addition) |
| New aria attrs | 2 (`aria-pressed` on A, `aria-pressed` on B) |
| `focus-visible:ring` | 5 (A/B/C/D/E) |
| `ring-ring` | 5 (all OUTWARD) |
| `ring-inset` | 0 |
| `ring-white/70` | 0 |
| `aria-pressed` new | 2 (A/B) |
| `aria-label` new | 0 (C pre-existing kept) |
| `aria-expanded` | 0 |
| `active:scale` renumbered | 0 |
| Competing 2nd press added | 0 |
| FLIPs | 0 |
| NEW transitions | 0 |
| `transition-colors` removed | 0 |
| Logic lines touched | 0 |

---

## Owner verification

1. **Run `npm run update`** — must be TRUE EXIT 0 (type-check + worker type-check + production build).
2. **Preview at 375/768/1280** — keyboard-tab through the page to confirm all 5 control types show the focus ring (service chips, status tabs, back button, View pill, trip-card links).
3. **Confirm the faint-tint ring color on D** — the View pill's parent banner is `from-primary/15 via-primary/8 to-primary/5`; the `ring-ring` (black) outward ring should be visible against this light tint. If it's too faint, flag for `ring-white/70` swap.
4. **Confirm B outward ring visibility** — the status tabs sit 6px inside the `overflow-hidden` GlassCard3D; the 2px outward ring should be visible within that padding. If any clipping occurs on specific border-radius rounding, flag for `ring-inset`.
5. Do NOT commit/deploy — owner handles that.
