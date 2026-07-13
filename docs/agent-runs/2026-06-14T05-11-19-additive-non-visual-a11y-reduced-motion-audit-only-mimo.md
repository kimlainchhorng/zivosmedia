# MiMo run — 2026-06-14T05:11:19.790Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive non-visual a11y + reduced-motion audit only, no layout/copy/logic change. Wraps GoogleMap + a swipe-to-dismiss order-preview card shown when driver taps an order marker. Verdict per point: (1) aria-hidden on decorative icons Navigation, MapPin, Clock (text carries meaning; Dismiss/Accept buttons have visible text). (2) reduced-motion (useReducedMotion from framer-motion): GUARD card entrance initial (y:60+scale:0.9), infinite shimmer x-sweep, infinite swipe-indicator width pulse, infinite direction-arrow x-bob; LEAVE outer-glow opacity pulse, card exit (user-triggered), Dismiss whileTap. (3) Should the preview card get role=dialog+aria-labelledby or is that overkill for a non-modal map-tap preview? (4) Live region OMIT? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/map/EnhancedMapView.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
The user wants a concise audit verdict on 4 specific points for the `EnhancedMapView.tsx` component. Let me analyze each point carefully.

Let me go through the file and answer each point:

1. **aria-hidden on decorative icons** - Navigation, MapPin, Clock icons
2. **reduced-motion guards** on specific animations
3. **role=dialog on preview card** - is it overkill?
4. **Live region** - should we add one?

Let me analyze the code:

**Point 1: aria-hidden on decorative icons**
- `Navigation` icon (L151) - inside the direction arrow circle, purely decorative. The adjacent text carries meaning. → ADD `aria-hidden="true"`
- `MapPin` icon (L167) - inside a span with distance text. Decorative. → ADD `aria-hidden="true"`
- `Clock` icon (L171) - inside a span with time text. Decorative. → ADD `aria-hidden="true"`

**Point 2: reduced-motion**
Need to import `useReducedMotion` from framer-motion and guard:
- Card entrance `initial={{ opacity: 0, y: 60, scale: 0.9 }}` - when reduced motion, strip y/scale → `initial={reduced ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.9 }}`
- Shimmer x-sweep `animate={{ x: ["-100%", "100%"] }}` infinite → disable when reduced
- Swipe-indicator width pulse `animate={{ width: [40, 50, 40] }}` infinite → disable
- Direction-arrow x-bob `animate={{ x: [0, 3, 0] }}` infinite → disable

Leave alone:
- Outer-glow opacity pulse `animate={{ opacity: [0.3, 0.5, 0.3] }}` - subtle ambient, not motion
- Card exit `exit={{ opacity: 0, y: 60, scale: 0.9 }}` - user-triggered dismiss feedback
- Dismiss `whileTap={{ scale: 0.97 }}` - user-triggered press feedback

**Point 3: role=dialog**
This is a non-modal preview card that appears when tapping a map marker. It's not a dialog - it doesn't trap focus, isn't modal, and dismisses on swipe. Adding `role="dialog"` + `aria-labelledby` would be overkill and potentially misleading (AT users might expect focus trapping). The card is a supplementary info panel. Verdict: **skip role=dialog**. It's a transient preview, not a modal interaction.

**Point 4: Live region**
The card appears via AnimatePresence which unmounts/mounts. Screen readers won't announce the appearance automatically. However, this is a driver app (Capacitor native), and the card is a map-tap preview that the user just interacted with. Adding `aria-live="polite"` on the card wrapper would announce it, but could be verbose/annoying since the user already knows they tapped. Verdict: **omit aria-live**. The user initiated the interaction; the card content is visible and focusable. Adding it would create noise on every marker tap.

Now let me write the concise plan and diff.

The file path from context is `../zivodriver/src/components/map/EnhancedMapView.tsx` but the actual repo path would be within the monorepo. Given the context shows it as a separate `zivodriver` project, let me use that path. Wait, looking at the AGENTS.md, there's a "Zivo Driver" Supabase project mentioned (`yiedlgoxwjmansszdypf`). The file path shows `../zivodriver/` which seems to be a sibling directory. Let me just use the path as shown.

Actually, re-reading: the file is at `../zivodriver/src/components/map/EnhancedMapView.tsx` relative to the current repo. But I should just give the path as it appears. The user seems to be working in the zivodriver project.

Let me draft the diff now. I need to be precise about what changes.

Changes needed:
1. Import `useReducedMotion` from framer-motion
2. Add `const reduced = useReducedMotion();` in the component
3. Add `aria-hidden="true"` to Navigation, MapPin, Clock icons
4. Guard card entrance initial with reduced motion
5. Guard shimmer animate with reduced motion
6. Guard swipe-indicator animate with reduced motion  
7. Guard direction-arrow animate with reduced motion

Let me write the diff carefully.

For the animations, when reduced motion is preferred:
- Card entrance: `{ opacity: 0 }` instead of `{ opacity: 0, y: 60, scale: 0.9 }`
- Shimmer: `false` or `{ x: 0 }` instead of `{ x: ["-100%", "100%"] }`
- Swipe indicator: `{ width: 40 }` or just remove the animate
- Direction arrow: `{ x: 0 }` instead of `{ x: [0, 3, 0] }`

Actually, for infinite animations, the cleanest pattern is to set `animate` to a static value when reduced. For the shimmer, setting `animate={reduced ? {} : { x: ["-100%", "100%"] }}` would work, but a cleaner approach is to just not render the shimmer when reduced, or set animate to `false`. 

Actually, framer-motion's `animate` accepts an object. When reduced, we can pass an empty object `{}` or a non-animated value. The cleanest is:
- `animate={reduced ? {} : { x: ["-100%", "100%"] }}`

But for the shimmer, if we pass `{}`, it stays at whatever `initial`/style it has. Since it's a decorative gradient overlay, it'll just sit at its initial position (the "from-transparent" part), which is fine - it's decorative.

For the swipe indicator width pulse:
- `animate={reduced ? {} : { width: [40, 50, 40] }}`
- But we also need a fixed width when reduced. We can set `style={{ width: 40 }}` as fallback, or use `animate={reduced ? { width: 40 } : { width: [40, 50, 40] }}`.

Actually, the cleanest pattern for all of these: when reduced, animate to a static end state. Let me think about each:

1. Shimmer: `animate={reduced ? { x: "0%" } : { x: ["-100%", "100%"] }}` — but `x: "0%"` might not be the same as initial. Actually the element starts at `className="absolute inset-0"` with no x transform, so `x: 0` would be correct. But passing `{ x: 0 }` would set an explicit transform. Better to just not animate: pass `animate={reduced ? {} : { x: ["-100%", "100%"] }}`.

2. Swipe indicator: `animate={reduced ? { width: 40 } : { width: [40, 50, 40] }}` — settles at 40px.

3. Direction arrow: `animate={reduced ? { x: 0 } : { x: [0, 3, 0] }}` — settles at 0.

For the card entrance, the `initial` and `animate` both change:
- `initial={reduced ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.9 }}`
- `animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}`
- `exit` stays as-is (user-triggered, leave alone per the spec)

Let me write the precise diff now.

Wait, I should also consider: the `useReducedMotion` hook returns `boolean | null`. So `reduced` is `boolean | null`. In conditions, `null` is falsy, so `reduced ? ... : ...` would treat `null` (unknown) as "not reduced" which is the safe default (keep animations if unsure).

Let me write the complete diff.

Actually, I realize I need to be more careful about the animate prop for shimmer. The shimmer element has no `initial` prop, so it starts at the CSS position. When we pass `animate={reduced ? {} : { x: ["-100%", "100%"] }}`, framer-motion will not set any x transform when reduced, which is correct.

For the swipe indicator, it has `className="w-10 h-1 rounded-full bg-muted-foreground/30"` which sets `width: 2.5rem` (40px). When reduced, `animate={{ width: 40 }}` would explicitly set 40px (matching). This is fine but redundant with the CSS. Actually, the animate overrides the CSS width, so when reduced we need to ensure the width is set. Using `animate={reduced ? {} : { width: [40, 50, 40] }}` would let it fall back to the CSS `w-10` class. But since we're using `animate`, framer-motion will take control of the width. Hmm, actually if we pass `animate={{}}`, framer-motion might still animate from the initial value. Let me think...

Actually, the cleanest approach for all infinite decorative animations: when reduced, pass `false` to `animate` which tells framer-motion not to animate. But `animate` doesn't accept `false` directly... 

Looking at framer-motion docs: `animate` can be `false` to prevent animation (added in later versions). But the safest pattern that works across versions is:

```tsx
animate={reduced
