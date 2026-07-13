# DeepSeek run — 2026-06-14T06:06:56.103Z

- model: deepseek-chat
- task: Additive non-visual accessibility plus reduced-motion audit ONLY. No layout, copy, routing, styling, or logic change. This is EnhancedNavigationView, MOUNTED twice on /map (Map.tsx lines 1169 and 1180). It is a CUSTOM full-screen overlay (a motion.div with className fixed inset-0 z-2005 pointer-events-none), NOT a Radix Dialog and NOT a shadcn Sheet - so it has NO role=dialog, NO focus trap, NO accessible name, NO Escape handling from any library. The component imports motion, AnimatePresence, useMotionValue, animate from framer-motion - it does NOT currently import useReducedMotion. It has many hooks (useState x12, useRef, useEffect, useMemo, useCallback, useVoiceNavigation which provides a t() for VOICE strings only) and NO early return. Structure: (A) a root motion.div entrance opacity 0 to 1 with exit; (B) an AnimatePresence Confirmation Overlay shown on showConfirmation: a backdrop fade, an inner motion.div scale 0.5 to 1 spring with exit scale 1.2, a colored circle motion.div with animate scale 1,1.1,1 transition repeat 2, holding either a Package icon (isPickup) or a CheckCircle2 icon, plus a motion.div text block (h2 Picked Up! or Delivered!, p subline) initial opacity 0 y 10; (C) a Waiting Mode branch (isWaitingMode) with INFINITE looping animations: two pulse-ring motion.divs (animate scale and opacity, transition repeat Infinity), a center Compass icon wrapped in a motion.div animate rotate 360 repeat Infinity linear, an h2 Ready to Drive and p both initial opacity 0 y 10, and a status pill with an INFINITE pulsing dot (animate scale 1,1.3,1 repeat Infinity) + span Online and Available; (D) a Destination Mode header motion.div initial opacity 0 y -12 scale 0.95 spring, containing a decorative Navigation icon in a tile + address text + ETA/distance/time spans; (E) a Close button (only shown when not waiting and not destination mode): a motion.div initial scale 0.9 opacity 0 wrapping a shadcn Button variant ghost size icon that contains ONLY an X icon (strokeWidth 2.5) and onClick onClose - this icon-only button has NO accessible name; (F) speedometer/report/road-alert child components (out of scope - their own files); (G) a Bottom Panel: a Waiting Mode card motion.div initial opacity 0 y 10 with a Navigation icon wrapped in an INFINITE rotate 360 motion.div + h3 Looking for Orders + p; a Slide-to-Confirm-Arrival motion.div initial opacity 0 y 10 with animate that includes a CONDITIONAL infinite scale pulse when isArriving (scale 1,1.02,1 repeat Infinity), an INFINITE shimmer motion.div (animate x -100% to 100% repeat Infinity) shown when isArriving, a progress-fill motion.div, a text layer (span Slide to Pickup/Complete when arriving, else a span with a decorative Lock icon + Get closer text), and a draggable Swipe Handle motion.div with drag x, whileDrag scale 1.08, a CONDITIONAL infinite boxShadow pulse when isArriving, and an inner motion.div with a CONDITIONAL infinite rotate wiggle holding a Package or CheckCircle2 icon; and a Destination-mode Stop button: a motion.button initial opacity 0 y 8, whileTap scale 0.93, containing an X icon + visible text Stop. Give a concise verdict per point: (1) Which icons are purely decorative and need aria-hidden true? My list: confirmation Package, confirmation CheckCircle2, Compass, destination-header Navigation, waiting-card Navigation, the Lock in Get closer, the Package/CheckCircle2 inside the swipe handle, and the X inside the Stop button (which has visible text Stop). Confirm or correct. (2) The icon-only Close Button (only an X, onClick onClose) needs aria-label Close - the file has no t() for UI strings (t() is voice-only), so plain English Close - agree? (3) Reduced-motion: this file has NO useReducedMotion. For the ENTRANCE one-shot movement animations (root could stay - pure opacity; confirmation inner scale 0.5; confirmation text y 10; destination header y -12 scale 0.95; waiting h2/p y 10; waiting status pill scale 0.9; waiting-card y 10; slider y 10; stop button y 8) recommend guarding the MOVEMENT ones with useReducedMotion initial false idiom (set initial to false when reduced). For the INFINITE looping animations (the two pulse rings, the compass rotate, the online dot pulse, the waiting-card nav rotate, the slider arriving-scale pulse, the shimmer sweep, the swipe-handle boxShadow pulse, the swipe-handle icon wiggle) - what is the correct framer-motion reduced-motion pattern? My plan: gate each infinite loop behind reduceMotion (e.g. animate={reduceMotion ? undefined : {...}} and transition={reduceMotion ? undefined : {...}}) so the element renders static under prefers-reduced-motion. Confirm this is the right approach and that I should LEAVE whileTap and whileDrag and drag unguarded (user-triggered). (4) Should I leave the pure-opacity root fade and all exits unguarded? (5) This is a CUSTOM modal overlay with no role=dialog / focus trap / accessible name / Escape. Is adding role=dialog + aria-modal + aria-label + Escape-to-close + a focus trap IN SCOPE for an additive a11y pass, or should it be DEFERRED to a dedicated custom-modal-semantics slice (it needs focus management wiring, not just attributes)? Recommend defer-or-do with one line of reasoning. (6) Any orphan numbers (ETA min, distance mi/ft, the destination-header time) that need an sr-only label, or do adjacent visible texts/units suffice? (7) The voice navigation (useVoiceNavigation speak/announceDirection) already announces turns aloud - given that, do the on-screen turn banners need any extra aria-live, or is that handled by child components / out of scope? Keep the verdict tight and additive-only.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/navigation/EnhancedNavigationView.tsx

---

# EnhancedNavigationView — Additive Accessibility + Reduced Motion Audit

## (1) Short Plan

Apply **className-only and attribute-only** changes to `EnhancedNavigationView.tsx`:
- Add `aria-hidden="true"` to purely decorative icons
- Add `aria-label="Close"` to the icon-only Close button
- Import `useReducedMotion` from framer-motion and guard all movement animations and infinite loops
- Leave all logic, layout, styling, and routing untouched

---

## (2) Proposed Change

### File: `../zivodriver/src/components/navigation/EnhancedNavigationView.tsx`

#### Change 1: Add `useReducedMotion` import (line 3)

**Before:**
```tsx
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
```

**After:**
```tsx
import { motion, AnimatePresence, useMotionValue, animate, useReducedMotion } from "framer-motion";
```

#### Change 2: Add `reduceMotion` hook (after line 42, inside component body)

**Before:**
```tsx
const EnhancedNavigationView = ({ ... }: EnhancedNavigationViewProps) => {
  const haptic = useHapticFeedback();
```

**After:**
```tsx
const EnhancedNavigationView = ({ ... }: EnhancedNavigationViewProps) => {
  const reduceMotion = useReducedMotion();
  const haptic = useHapticFeedback();
```

#### Change 3: Decorative icons — add `aria-hidden="true"`

**Confirmation Package icon (line ~140):**
```tsx
<Package className="w-12 h-12 text-primary-foreground" aria-hidden="true" />
```

**Confirmation CheckCircle2 icon (line ~142):**
```tsx
<CheckCircle2 className="w-12 h-12 text-success-foreground" aria-hidden="true" />
```

**Waiting mode Compass icon (line ~175):**
```tsx
<Compass className="w-10 h-10 text-primary" aria-hidden="true" />
```

**Destination header Navigation icon (line ~215):**
```tsx
<Navigation className="w-4 h-4 text-white" aria-hidden="true" />
```

**Waiting card Navigation icon (line ~310):**
```tsx
<Navigation className="w-6 h-6 text-primary" aria-hidden="true" />
```

**Slider Lock icon (line ~340):**
```tsx
<Lock className="w-3 h-3" aria-hidden="true" />
```

**Swipe handle Package icon (line ~370):**
```tsx
<Package className="w-5 h-5" aria-hidden="true" />
```

**Swipe handle CheckCircle2 icon (line ~372):**
```tsx
<CheckCircle2 className="w-5 h-5" aria-hidden="true" />
```

**Stop button X icon (line ~380):**
```tsx
<X className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
```

#### Change 4: Icon-only Close button — add `aria-label="Close"` (line ~230)

**Before:**
```tsx
<Button
  variant="ghost"
  size="icon"
  className="w-10 h-10 rounded-full bg-card shadow-lg border border-border/20"
  style={{ boxShadow: "0 4px 16px -4px hsl(var(--foreground) / 0.2)" }}
  onClick={onClose}
>
  <X className="w-4.5 h-4.5" strokeWidth={2.5} />
</Button>
```

**After:**
```tsx
<Button
  variant="ghost"
  size="icon"
  className="w-10 h-10 rounded-full bg-card shadow-lg border border-border/20"
  style={{ boxShadow: "0 4px 16px -4px hsl(var(--foreground) / 0.2)" }}
  onClick={onClose}
  aria-label="Close"
>
  <X className="w-4.5 h-4.5" strokeWidth={2.5} aria-hidden="true" />
</Button>
```

#### Change 5: Guard movement animations with `reduceMotion`

**Root entrance (line ~120):**
```tsx
<motion.div
  className="fixed inset-0 z-[2005] pointer-events-none"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>
```
→ **Leave as-is** (pure opacity, no movement — safe)

**Confirmation inner scale (line ~130):**
```tsx
initial={{ scale: reduceMotion ? false : 0.5, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
exit={{ scale: 1.2, opacity: 0 }}
transition={{ type: "spring", damping: 15 }}
```

**Confirmation text block (line ~145):**
```tsx
initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.2 }}
```

**Waiting mode outer pulse ring (line ~165):**
```tsx
animate={reduceMotion ? { scale: 1, opacity: 0.5 } : { scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
transition={reduceMotion ? {} : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
```

**Waiting mode inner pulse ring (line ~170):**
```tsx
animate={reduceMotion ? { scale: 1, opacity: 0.3 } : { scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
transition={reduceMotion ? {} : { repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.3 }}
```

**Waiting mode compass rotate (line ~177):**
```tsx
<motion.div
  animate={reduceMotion ? { rotate: 0 } : { rotate: 360 }}
  transition={reduceMotion ? {} : { repeat: Infinity, duration: 8, ease: "linear" }}
>
```

**Waiting mode h2 (line ~180):**
```tsx
initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.2 }}
```

**Waiting mode p (line ~185):**
```tsx
initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.3 }}
```

**Waiting mode status pill (line ~190):**
```tsx
initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.9 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ delay: 0.4 }}
```

**Online dot pulse (line ~195):**
```tsx
<motion.div
  className="w-2 h-2 rounded-full bg-success"
  animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.3, 1] }}
  transition={reduceMotion ? {} : { repeat: Infinity, duration: 1.5 }}
/>
```

**Destination header (line ~210):**
```tsx
initial={{ opacity: 0, y: reduceMotion ? 0 : -12, scale: reduceMotion ? 1 : 0.95 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
transition={{ type: "spring", stiffness: 300, damping: 25 }}
```

**Close button entrance (line ~225):**
```tsx
initial={{ scale: reduceMotion ? 1 : 0.9, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
```

**Waiting card (line ~300):**
```tsx
initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
animate={{ opacity: 1, y: 0 }}
```

**Waiting card nav rotate (line ~308):**
```tsx
<motion.div
  animate={reduceMotion ? { rotate: 0 } : { rotate: 360 }}
  transition={reduceMotion ? {} : { repeat: Infinity, duration: 3, ease: "linear" }}
>
```

**Slider container (line ~320):**
```tsx
initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
animate={{ 
  opacity: 1, 
  y: 0,
  scale: isArriving && !reduceMotion ? [1, 1.02, 1] : 1 
}}
transition={isArriving && !reduceMotion ? { scale: { repeat: Infinity, duration: 2 } } : {}}
```

**Shimmer (line ~330):**
```tsx
{isArriving && !reduceMotion && (
  <motion.div
    className="absolute inset-0 pointer-events-none"
    style={{
      background: `linear-gradient(90deg, transparent 0%, ${isPickup ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--success) / 0.2)'} 50%, transparent 100%)`,
    }}
    animate={{ x: ["-100%", "100%"] }}
    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
  />
)}
```

**Swipe handle boxShadow pulse (line ~365):**
```tsx
animate={isArriving && !reduceMotion ? { boxShadow: ["0 0 0 0 rgba(0,0,0,0)", "0 0 20px 4px rgba(var(--primary), 0.3)", "0 0 0 0 rgba(0,0,0,0)"] } : {}}
transition={isArriving && !reduceMotion ? { boxShadow: { repeat: Infinity, duration: 1.5 } } : {}}
```

**Swipe handle icon wiggle (line ~368):**
```tsx
<motion.div
  animate={isArriving && !reduceMotion ? { rotate: [0, 10, -10, 0] } : {}}
  transition={reduceMotion ? {} : { repeat: Infinity, duration: 0.5, repeatDelay: 2 }}
>
```

**Stop button (line ~375):**
```tsx
initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.1 }}
whileTap={{ scale: 0.93 }}
```
→ **Leave `whileTap` unguarded** (user-triggered)

---

## (3) Verdict Per Point

1. **Decorative icons list — CORRECT.** All 9 icons you listed are purely decorative (no semantic meaning, no interactive function, adjacent visible text or icon swap conveys state). Add `aria-hidden="true"` to each.

2. **Close button `aria-label="Close"` — AGREE.** The button has only an X icon with no visible text. Plain English `"Close"` is correct since `t()` is voice-only.

3. **Reduced-motion pattern — CORRECT.** Your plan is the right framer-motion pattern:
   - **Movement animations** (y, scale, initial position): set `initial` to the "rest" value when `reduceMotion` is true (e.g., `y: 0` instead of `y: 10`, `scale: 1` instead of `scale: 0.5`)
   - **Infinite loops** (pulse rings, compass rotate, dot pulse, nav rotate, slider scale, shimmer, boxShadow, wiggle): gate with `animate={reduceMotion ? { staticValue } : { ...animation }}` and `transition={reduceMotion ? {} : { ... }}`
   - **`whileTap` and `whileDrag`**: leave unguarded (user-triggered, not automatic motion)

4. **Pure-opacity root fade and exits — CORRECT.** Leave unguarded. Opacity-only animations don't cause vestibular issues. Exits are user-triggered and brief.

5. **Custom modal semantics — DEFER.** Adding `role="dialog"`, `aria-modal`, focus trap, and Escape handling requires:
   - Focus management (trap focus within the overlay, restore focus on close)
   - Escape key handler (currently none)
   - Potential conflicts with the existing `pointer-events-none`/`pointer-events-auto` pattern
   - Testing with screen readers to ensure the announcement order is correct
   
   This is a **structural change** beyond additive attributes. Defer to a dedicated custom-modal-semantics slice.

6. **Orphan numbers — NO ACTION NEEDED.** The ETA (`${Math.round(displayEta)} min`), distance (`distanceRemaining`), and time (`toLocaleTimeString`) all have adjacent visible text labels ("min", the distance string, and the time format). Screen readers will read the number + unit together.

7. **Voice navigation — OUT OF SCOPE.** The `useVoiceNavigation` hook already handles turn announcements. The on-screen turn banners (`UberStyleNavBanner`, `TurnByTurnCard`) are child components in their own files. Any `aria-live` region for turn-by-turn would need to be added in those child components, not here.

---

## (4) Owner Verification

- **Run `npm run update`** — must pass (type-check + build)
- **Preview on a driver device** — verify the overlay still renders correctly
- **Test with `prefers-reduced-motion: reduce`** — all infinite loops should be static, all movement animations should start at their final position
- **Test with screen reader** — verify:
  - Close button announces "Close"
  - Decorative icons are skipped
  - Confirmation overlay content is still readable
- **No layout, copy, routing, styling, or logic changes** — this is purely additive attributes + one import
