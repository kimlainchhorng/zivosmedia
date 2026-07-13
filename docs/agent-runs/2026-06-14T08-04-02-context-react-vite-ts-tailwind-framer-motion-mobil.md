# DeepSeek run — 2026-06-14T08:04:02.944Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/TripStatusPage.tsx (514-line "Live Tracking" — real-time ride tracking at /trip/:id. REAL Supabase: fetches the `jobs` row by id (maybeSingle), SUBSCRIBES to Realtime `postgres_changes` UPDATE on that job, resolves `assigned_driver_id`→drivers.id then fetches `driver_profiles`, decrements an ETA each minute, auto-redirects on completed. `handleCancel` updates jobs.status=cancelled; `handleContact` tel: or toast; `handleShare` navigator.share/clipboard. useState job/driverProfile/etaMinutes/isCancelling/resolvedDriverId; useRef channel/interval/fetchedDriver. Renders an AnimatePresence that swaps between FindingDriverScreen / TripCompleteScreen / a cancelled screen / the DriverEnRouteTracker component. Layout: safe-area sticky header [raw icon Back + "Live Tracking" + status + a Live dot] + body. RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, handleCancel/handleContact/handleShare, useEffect/Supabase/Realtime/useRef, byte-identical. Don't add a SECOND competing press effect. DON'T-CHURN already-pressed buttons (every raw button here ALREADY has a press scale + transition) — append the focus ring ONLY, NO scale renumber, NO flip when already transition-all. Don't touch the DriverEnRouteTracker child component (its own file). Don't renumber an existing scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when control is a flush edge child of a rounded overflow-hidden PARENT, OR a flush media tile in a near-gapless grid.
- Ring color: --ring resolves BLACK. OUTWARD ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/IMAGE surface AS THE PARENT (or ring over media) = ring-white/70. A gradient-FILLED button (bg-ig-gradient) on a NEUTRAL parent still uses ring-ring (the OUTWARD ring renders against the neutral parent, NOT the button's own gradient fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab active:scale-[0.97]; wide full-width row/button WITH own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99]. DON'T renumber an existing scale (several buttons here ship active:scale-90 / scale-95 / scale-[0.98] — keep as-is).
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. ALREADY transition-all → append without flipping. Adding ONLY a focus ring (no new animated prop) → leave the existing transition class as-is.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a PERSISTENT single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, done, go-home, cancel).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier [confirm KEEP existing], transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L146 "DONE" button (raw <button>, inside TripCompleteScreen, one-shot `onClick={onDone}` [navigate("/")], VISIBLE text "Done", base `mt-2 w-full max-w-xs rounded-2xl bg-ig-gradient text-white font-bold py-3.5 active:scale-95 transition-transform`, ALREADY active:scale-95 + transition-transform, NO hover/focus/aria). Parent = the TripCompleteScreen column on bg-background (neutral). → my plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (ring-only — already pressed + transition-transform, NO new animated prop → leave transition-transform; KEEP existing active:scale-95 [DON'T renumber]; OUTWARD ring-ring — the bg-ig-gradient FILL renders the ring against the neutral bg-background parent, not ring-white/70; NO aria — visible text "Done", one-shot nav). Confirm ring-only + KEEP scale-95 + leave transition-transform + OUTWARD ring-ring + no-aria.

B) L394 HEADER BACK button (raw <button>, icon-only ArrowLeft, one-shot `onClick={() => navigate(-1)}`, base `w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform shrink-0`, ALREADY `aria-label="Go back"`, ALREADY active:scale-90 + transition-transform, NO hover/focus). Parent = the safe-area sticky header `bg-background/95 backdrop-blur-sm` (neutral). → my plan: KEEP existing aria-label="Go back" + APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (ring-only — already active:scale-90 + transition-transform, leave transition-transform; KEEP existing active:scale-90 [DON'T renumber to scale-95]; OUTWARD ring-ring on the neutral header). Confirm ring-only + KEEP scale-90 (not renumber) + keep-aria + OUTWARD ring-ring.

C) L445 "GO HOME" button (raw <button>, inside the cancelled screen, one-shot `onClick={() => navigate("/")}`, VISIBLE text "Go Home", base `mt-2 rounded-2xl bg-ig-gradient text-white font-bold py-3 px-8 active:scale-95 transition-transform`, ALREADY active:scale-95 + transition-transform, NO hover/focus/aria). Parent = the cancelled motion.div column on bg-background (neutral). → my plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (ring-only — already pressed + transition-transform; KEEP active:scale-95; OUTWARD ring-ring — bg-ig-gradient fill on neutral bg-background parent; NO aria — visible text). Confirm identical-pattern to A.

D) L488 "CANCEL TRIP" button (raw <button>, shown while trackerStatus arriving|waiting, one-shot `onClick={handleCancel}`, `disabled={isCancelling}`, VISIBLE text "Cancel Trip"/"Cancelling…", className via `cn(` with a SECOND static arg `"bg-red-500/5 hover:bg-red-500/10 active:scale-[0.98] transition-all"` [+ a first arg with the border/text + a conditional `isCancelling && "opacity-50 cursor-not-allowed"`], ALREADY active:scale-[0.98] + transition-all + `hover:bg-red-500/10` ON ITSELF, NO focus/aria). Parent = the tracker motion.div on bg-background (neutral); the button's own fill is the barely-tinted bg-red-500/5. → my plan: APPEND into the SECOND cn() static arg `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (ring-only — DON'T-CHURN, already active:scale-[0.98] + transition-all + self-hover → NO flip [already transition-all], NO scale renumber; OUTWARD ring-ring — the OUTWARD ring renders against the neutral bg-background parent [the bg-red-500/5 own-fill is negligible]; NO aria — visible text "Cancel Trip"). Confirm ring-only into the 2nd cn() arg + NO flip [already transition-all] + KEEP scale-[0.98] + OUTWARD ring-ring + no-aria.

ALSO CONFIRM I should LEAVE these: the `DriverEnRouteTracker` component L471 (its OWN file — its internal cancel/contact/share buttons are out of scope for THIS file); ALL motion.div wrappers (FindingDriverScreen L87, TripCompleteScreen L122 + its inner spring motion.div, the cancelled screen L427, the tracker wrapper L463 — entrance/exit anim, the buttons inside them ARE edited above); the Live-indicator dot + status <p>/<span>s + the "Finding your driver" / "You've arrived!" / "Trip Cancelled" copy (non-interactive); ArrowLeft/Loader2/CheckCircle2/Car icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. ALL 4 are DON'T-CHURN ring-only appends (every button already ships a press scale + transition). Resolve: A/C bg-ig-gradient-fill → OUTWARD ring-ring (not ring-white/70); B KEEP existing scale-90 (don't renumber to scale-95) + keep-aria; D append into the 2nd cn() static arg + NO flip (already transition-all).
- files: src/pages/TripStatusPage.tsx

---

## Plan

All 4 raw `<button>` controls in `TripStatusPage.tsx` already ship a press scale + transition. This is a **DON'T-CHURN ring-only pass**: append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to each, with zero other changes.

## Proposed diff

**File:** `src/pages/TripStatusPage.tsx`

### A) L146 "Done" button (TripCompleteScreen)
**Before:**
```tsx
className="mt-2 w-full max-w-xs rounded-2xl bg-ig-gradient text-white font-bold py-3.5 active:scale-95 transition-transform"
```
**After:**
```tsx
className="mt-2 w-full max-w-xs rounded-2xl bg-ig-gradient text-white font-bold py-3.5 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- Ring-only append ✓
- KEEP `active:scale-95` ✓
- Leave `transition-transform` ✓
- OUTWARD `ring-ring` (bg-ig-gradient fill on neutral `bg-background` parent) ✓
- No aria (visible text "Done") ✓

### B) L394 Header Back button
**Before:**
```tsx
className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform shrink-0"
```
**After:**
```tsx
className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- Ring-only append ✓
- KEEP `active:scale-90` (do NOT renumber to `scale-95`) ✓
- Leave `transition-transform` ✓
- OUTWARD `ring-ring` on neutral header `bg-background/95` ✓
- KEEP existing `aria-label="Go back"` ✓

### C) L445 "Go Home" button (cancelled screen)
**Before:**
```tsx
className="mt-2 rounded-2xl bg-ig-gradient text-white font-bold py-3 px-8 active:scale-95 transition-transform"
```
**After:**
```tsx
className="mt-2 rounded-2xl bg-ig-gradient text-white font-bold py-3 px-8 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- Identical pattern to A ✓
- Ring-only append ✓
- KEEP `active:scale-95` ✓
- Leave `transition-transform` ✓
- OUTWARD `ring-ring` (bg-ig-gradient on neutral `bg-background`) ✓
- No aria (visible text "Go Home") ✓

### D) L488 "Cancel Trip" button
**Before:**
```tsx
"bg-red-500/5 hover:bg-red-500/10 active:scale-[0.98] transition-all",
```
**After:**
```tsx
"bg-red-500/5 hover:bg-red-500/10 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```
- Ring-only append into the 2nd `cn()` static arg ✓
- NO flip (already `transition-all`) ✓
- KEEP `active:scale-[0.98]` ✓
- OUTWARD `ring-ring` (negligible `bg-red-500/5` own-fill on neutral `bg-background` parent) ✓
- No aria (visible text "Cancel Trip") ✓

### Controls LEFT (confirmed):
- `DriverEnRouteTracker` component (its own file)
- All `motion.div` wrappers (FindingDriverScreen, TripCompleteScreen, cancelled screen, tracker wrapper)
- Live indicator dot + status text
- All decorative icons (ArrowLeft, Loader2, CheckCircle2, Car)

## Verification needed

Run `npm run update` — this is a 4-line className append with zero logic changes, so it should pass cleanly.
