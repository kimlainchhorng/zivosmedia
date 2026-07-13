# MiMo run — 2026-06-14T05:16:05.210Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive non-visual a11y + reduced-motion audit only, no layout/copy/logic change. MOUNTED full-screen modal offering a new order: dimmed backdrop, swipe card, 30s auto-dismiss countdown ({countdown} updates per second), Decline/Accept buttons, already voice-announces on arrival. Concise verdict per point: (1) Add role=dialog + aria-labelledby on the 'New Food Order'/'New Delivery' h3 (no aria-modal, no focus trap yet)? (2) aria-hidden on decorative icons beside text: TrendingUp, header Utensils/Navigation, ChefHat, Zap, Timer, dropoff MapPin, stats MapPin/Clock/Package, big DollarSign, loading-spinner Navigation. (3) Star rating is followed by a bare number - add sr-only 'Rating' label if Star is hidden? (4) reduced-motion (useReducedMotion from framer-motion): GUARD card entrance initial (y:100+scale), swipe-indicator y-bob, header-icon scale pulse, countdown-container scale pulse (isUrgent), surge-badge scale:0 initial, loading-spinner rotate; LEAVE backdrop/root opacity fades, countdown progress WIDTH fill, isUrgent + swipe-hint opacity pulses, drag-driven transforms, exit. (5) Countdown number live region OMIT? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/notifications/PremiumOrderPopup.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
Let me analyze each of the 5 audit points against the actual component code and give concise verdicts, then propose the diff.

(1) **role=dialog + aria-labelledby**: The component renders a full-screen modal with a backdrop. Adding `role="dialog"` and `aria-labelledby` pointing to the h3 ("New Food Order"/"New Delivery") is correct. No `aria-modal` (backdrop is clickable, it's not truly modal-trapped), no focus trap (out of scope per task). ✓ ADD.

(2) **aria-hidden on decorative icons**: All listed icons are purely decorative beside text labels. ✓ ADD `aria-hidden="true"` to each: TrendingUp (swipe indicator), header Utensils/Navigation, ChefHat, Zap (surge badge), Timer, dropoff MapPin, stats row MapPin/Clock/Package, big DollarSign, loading-spinner Navigation.

(3) **Star rating followed by bare number**: The Star icon has `fill-warning text-warning` and is followed by `{request.restaurant_rating}` (a bare number like "4.5"). The Star IS visible (not hidden), so screen readers will announce "star" (or the icon name) + the number. Adding an `sr-only` "Rating:" label before the number makes the association clearer. ✓ ADD `<span className="sr-only">Rating:</span>` before the rating number.

Wait, actually the Star icon from lucide-react will be announced by screen readers unless `aria-hidden`. It doesn't have aria-hidden currently. The Star is decorative here - it's a visual indicator with the number being the actual info. So: `aria-hidden` on the Star + `sr-only` "Rating:" before the number. That's clean.

(4) **reduced-motion guards**: The task lists specific animations to guard and specific ones to leave. Let me map them:

**GUARD** (suppress on reduced motion):
- Card entrance `initial={{ y: 100, opacity: 0, scale: 0.95 }}` → set `initial={{ opacity: 0 }}` on reduced (keep opacity fade, drop y/scale)
- Swipe-indicator `animate={{ y: [-2, -8, -2] }}` (the TrendingUp bob) → disable on reduced
- Header icon `animate={{ scale: [1, 1.05, 1] }}` (the Utensils/Navigation pulse) → disable on reduced
- Countdown container `animate={isUrgent ? { scale: [1, 1.05, 1] } : {}}` → disable on reduced
- Surge badge `initial={{ scale: 0 }}` → `initial={{ opacity: 0 }}` on reduced (or just render without scale pop)
- Loading spinner `animate={{ rotate: 360 }}` → hide or static on reduced

**LEAVE** (keep even on reduced motion):
- Backdrop/root opacity fades
- Countdown progress width fill
- isUrgent + swipe-hint opacity pulses
- Drag-driven transforms (user-initiated)
- Exit animations

Implementation: import `useReducedMotion` from framer-motion (or check `prefers-reduced-motion` media query). Actually, framer-motion's `useReducedMotion` is the right hook. But it was deprecated in newer versions... Let me check - in framer-motion v10+, `useReducedMotion()` still works but the recommended approach is `useReducedMotion()` which returns a boolean.

Actually, the simplest pattern: `const shouldReduceMotion = useReducedMotion();` then conditionally set animations.

For the card entrance: change `initial` and `animate` conditionally.
For repetitive animations: conditionally set the `animate` prop to `{}` or remove the `transition`.

Let me think about the cleanest way to implement this...

```tsx
const shouldReduceMotion = useReducedMotion();
```

Then for each:

Card initial/animate:
```tsx
initial={shouldReduceMotion ? { opacity: 0 } : { y: 100, opacity: 0, scale: 0.95 }}
animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
exit={shouldReduceMotion ? { opacity: 0 } : { y: 100, opacity: 0, scale: 0.95 }}
```

Swipe indicator bob:
```tsx
animate={shouldReduceMotion ? {} : { y: [-2, -8, -2] }}
```

Header icon pulse:
```tsx
animate={shouldReduceMotion ? {} : { scale: [1, 1.05, 1] }}
```

Countdown scale pulse:
```tsx
animate={shouldReduceMotion ? {} : (isUrgent ? { scale: [1, 1.05, 1] } : {})}
```

Surge badge:
```tsx
initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0 }}
animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1 }}
```

Loading spinner:
```tsx
// Already inside a conditional, just guard the rotate
animate={shouldReduceMotion ? {} : { rotate: 360 }}
```
But wait, if reduced motion, the spinner should still indicate loading. Just show a static icon or use an opacity pulse instead. Actually, per the task, just guard the rotate. A static Navigation icon still communicates "loading" given the Accept button context. Or we could do an opacity pulse: `animate={shouldReduceMotion ? { opacity: [1, 0.5, 1] } : { rotate: 360 }}`. But the task says "GUARD loading-spinner rotate" — simplest is to just not animate on reduced. Let me just do `animate={shouldReduceMotion ? {} : { rotate: 360 }}` and skip the transition too.

Actually for a loading indicator, removing animation entirely on reduced motion is problematic — users can't tell it's loading. An opacity pulse is a good reduced-motion alternative since the task explicitly LEAVES opacity pulses for reduced motion. Let me use that.

(5) **Countdown live region OMIT**: The task says "OMIT" — meaning we should NOT add a live region for the countdown number. The reasoning: a live region that announces every second would be extremely noisy/annoying for screen reader users. The countdown is already communicated visually and the auto-dismiss at 0 is the actionable moment. Verdict: OMIT (do not add `aria-live` on the countdown). ✓ Agreed.

Let me now write the diff.

Actually wait - the task says "Concise verdict per point" so they want me to give verdicts first, then the diff.

Let me write a clean plan and diff.

For the diff, the file path is `../zivodriver/src/components/notifications/PremiumOrderPopup.tsx` but in the monorepo context this would be... actually the user said this is from `../zivodriver/` which seems to be a separate project. The rulebook mentions `yiedlgoxwjmansszdypf` ("Zivo Driver") as a Supabase project. But the file path shown is relative. Let me just use the path as given.

Let me construct the diff carefully:

1. Add `useReducedMotion` to the framer-motion import
2. Add `const shouldReduceMotion = useReducedMotion();` after the existing hooks
3. Add `role="dialog"` and `aria-labelledby` to the main card
4. Add `id` to the h3 for the aria-labelledby reference
5. Add `aria-hidden="true"` to decorative icons
6. Add `sr-only` rating label + aria-hidden on Star
7. Guard animations per reduced-motion
8. Add `aria-live="off"` or just omit (verdict: omit)

Let me write this out precisely.

Actually, looking more carefully at the exit animation - the task says to LEAVE exit. So the card exit should stay as-is. Only the initial/animate entrance gets guarded. Let me be precise:

- Card `exit` → LEAVE (don't guard)

Wait, actually: `initial={{ y: 100, opacity: 0, scale: 0.95 }}` and `exit={{ y: 100, opacity: 0, scale: 0.95 }}` - the task says LEAVE exit, so the exit prop stays. Only the `initial` and `animate` get guarded for reduced motion.

Hmm, but that's a bit odd - if initial is just opacity:0 and animate is opacity:1 on reduced, but exit still does y:100+scale. That would be inconsistent. Let me re-read: "LEAVE backdrop/root opacity fades, countdown progress WIDTH fill, isUrgent + swipe-hint opacity pulses, drag-driven transforms, exit."

"exit" in the LEAVE list means the exit animation should be left alone (not guarded). That makes sense - exits are one-shot, not repetitive, and less triggering. OK so I'll guard initial/animate but leave exit as-is.

Actually... wait. The initial/animate with y:100+scale is the entrance. On reduced motion, we'd want a simple fade entrance. The exit with y:100+scale is the dismiss. The task says leave exit. This creates an asymmetry but that's what's asked. The entrance is the repetitive part (happens on every new order), the exit is a one-shot close. Makes sense.

Let me finalize the diff now.

For the `useReducedMotion` import - it's already available from `framer-motion` in the import line, just need to add it to the destructuring.

Current import: `import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";`
Add: `useReducedMotion`

OK let me write the full diff now. I'll be precise about line-level changes.

Let me also think about point (3) more carefully. The current code:
```tsx
<span className="flex items-center gap-0.5">
  <Star className="w-3 h-3 fill-warning text-warning" />
  {request.restaurant_rating
