# DeepSeek run — 2026-06-14T03:39:37.159Z

- model: deepseek-chat
- task: Accessibility gap-fill audit of this idle-state draggable bottom sheet (driver app). Focus ONLY on additive non-visual a11y. Questions: 1) The drag handle near line 104 is a plain motion.div, drag-only — keyboard and screen-reader users cannot expand the sheet to reach the Where-to search and saved places. Note: the drag is on the OUTER motion.div near line 77 (drag=y, onDragEnd). Recommend an additive way to make the handle operable (role=button, tabIndex 0, aria-expanded bound to isExpanded, aria-label, onClick, onKeyDown for Enter/Space toggling setIsExpanded). Flag the risk that a trailing click after a drag double-toggles, and give a dragOccurredRef mitigation (set true in onDragStart on the outer motion.div, reset false in onPointerDown on the handle, early-return in onClick). 2) List the decorative lucide icons that should get aria-hidden true: Search at 140 (inside Where-to button with visible text), the saved-place Icon at 157, Clock at 180, ChevronUp at 202 (decorative bounce hint, pointer-events-none). 3) Reduced motion: the file does NOT import useReducedMotion. The handle pulse (line 107, width keyframes repeat Infinity), the ChevronUp bounce (line 199, y keyframes repeat Infinity), and the expanded-content fade (line 128). Which should be guarded and how (prop-gate animate/transition to undefined for the two perpetual loops; guard initial for the fade)? Do NOT suggest visual redesign, copy, routing, or layout changes. Give exact line plus attribute for each.
- files: src/components/map/IdleBottomSheet.tsx

---

# Accessibility Audit: Driver Bottom Sheet

## Plan

Three additive, non-visual fixes:

1. **Keyboard/SR handle** — make the drag handle operable via keyboard by adding `role="button"`, `tabIndex={0}`, `aria-expanded={isExpanded}`, `aria-label="Expand search panel"`, `onClick`, and `onKeyDown` (Enter/Space). Mitigate double-toggle from drag→click with a `dragOccurredRef`.

2. **Decorative icons** — add `aria-hidden="true"` to 4 Lucide icons that are purely decorative (Search inside a labeled button, saved-place Icon, Clock, ChevronUp bounce).

3. **Reduced motion** — guard the two perpetual animation loops (handle pulse, ChevronUp bounce) and the expanded-content fade with `useReducedMotion` from framer-motion.

---

## Proposed Changes

### File: `src/pages/driver/DriverBottomSheet.tsx`

#### 1. Drag handle keyboard operability (around line 104)

**Before:**
```tsx
<motion.div
  className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/30"
  animate={isExpanded ? { width: 40 } : { width: 24 }}
  // ...
/>
```

**After:**
```tsx
<motion.div
  role="button"
  tabIndex={0}
  aria-expanded={isExpanded}
  aria-label="Expand search panel"
  className="mx-auto mt-2 h-1 w-10 cursor-pointer rounded-full bg-white/30"
  animate={isExpanded ? { width: 40 } : { width: 24 }}
  // ...
  onClick={() => {
    if (dragOccurredRef.current) {
      dragOccurredRef.current = false;
      return;
    }
    setIsExpanded(prev => !prev);
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(prev => !prev);
    }
  }}
/>
```

**Add `dragOccurredRef` near the top of the component** (after other refs):
```tsx
const dragOccurredRef = useRef(false);
```

**Wire into the outer `motion.div` drag handlers** (around line 77):
```tsx
<motion.div
  drag="y"
  onDragStart={() => { dragOccurredRef.current = true; }}
  onDragEnd={(_, info) => {
    // existing logic...
  }}
  // ...
>
```

**Wire into the handle's `onPointerDown`** (reset the flag so a standalone click works):
```tsx
onPointerDown={() => { dragOccurredRef.current = false; }}
```

#### 2. Decorative icons — add `aria-hidden="true"`

| Line | Element | Change |
|------|---------|--------|
| ~140 | `<Search className="..." />` (inside Where-to button with visible text) | Add `aria-hidden="true"` |
| ~157 | `<Icon className="..." />` (saved-place icon) | Add `aria-hidden="true"` |
| ~180 | `<Clock className="..." />` | Add `aria-hidden="true"` |
| ~202 | `<ChevronUp className="..." />` (bounce hint, `pointer-events-none`) | Add `aria-hidden="true"` |

#### 3. Reduced motion guard

**Add import** (top of file):
```tsx
import { useReducedMotion } from 'framer-motion';
```

**Add at component top** (after other hooks):
```tsx
const prefersReducedMotion = useReducedMotion();
```

**Guard handle pulse** (line ~107, the `animate` with `width` keyframes `repeat: Infinity`):
```tsx
animate={prefersReducedMotion ? { width: 32 } : isExpanded ? { width: 40 } : { width: 24 }}
transition={prefersReducedMotion ? undefined : { /* existing transition */ }}
```

**Guard ChevronUp bounce** (line ~199, `y` keyframes `repeat: Infinity`):
```tsx
animate={prefersReducedMotion ? { y: 0 } : { y: [0, -4, 0] }}
transition={prefersReducedMotion ? undefined : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
```

**Guard expanded-content fade** (line ~128, the `initial={{ opacity: 0 }}`):
```tsx
initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
animate={prefersReducedMotion ? { opacity: 1 } : { opacity: isExpanded ? 1 : 0 }}
transition={prefersReducedMotion ? undefined : { duration: 0.2 }}
```

---

## Owner Verification

1. **`npm run update`** must pass (type-check + worker type-check + build).
2. **Preview on mobile** — verify the handle is keyboard-focusable (Tab) and Enter/Space toggle the sheet. Verify a drag does NOT trigger a toggle on release (the `dragOccurredRef` guard).
3. **Test with OS reduced-motion enabled** — the handle pulse and ChevronUp bounce should be static; the expanded-content fade should be instant (no opacity transition).
4. **Screen reader** — the handle should announce "Expand search panel, button, collapsed/expanded". The 4 `aria-hidden` icons should be skipped by the SR.

No visual changes — this is purely additive a11y.
