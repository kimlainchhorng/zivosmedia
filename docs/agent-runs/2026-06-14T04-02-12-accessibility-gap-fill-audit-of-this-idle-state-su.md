# DeepSeek run — 2026-06-14T04:02:12.229Z

- model: deepseek-chat
- task: Accessibility gap-fill audit of this idle-state suggestion banner (driver ride-hail app). Context: shown only when the driver is online, idle (not in a high-demand zone), and a nearby high-demand zone exists. It says High demand X mi DIRECTION / Drive there to get more orders, with two icon-only buttons: a Navigate button (line 97 to 104, opens Google Maps directions) and a Dismiss button (line 105 to 111). The driver is IDLE here, not actively navigating. Focus ONLY on additive non-visual a11y. No visual redesign, no copy, no routing, no layout. Questions: 1) Both action buttons are icon-only with no accessible name. Recommend an aria-label for the Navigate button and one for the Dismiss button, plus aria-hidden true on their inner Navigation icon (line 103) and X icon (line 110). 2) Confirm aria-hidden true on the decorative TrendingUp icon at line 82 (the High demand text next to it states the meaning). 3) Reduced motion: file does not import useReducedMotion. There is a framer entrance animation at lines 61 to 64 (initial opacity 0 y -12). Give the exact reduced-motion guard for the initial prop. The two buttons use whileTap scale 0.9 - confirm we should NOT guard whileTap (brief tap feedback, not an entrance or looping animation). 4) LIVE REGION JUDGMENT: should the suggestion text (lines 87 to 92) get a polite role status so a screen-reader idle driver hears the suggestion when it appears? It contains interactive buttons in the same banner. If yes, recommend scoping aria-live to only the text block, not the buttons. Argue both ways and give a concrete additive recommendation. Note: line 3 imports MapPin which appears unused. Give exact line plus attribute for every recommendation. Keep additive and minimal.
- files: src/components/map/DemandSuggestionBanner.tsx

---

Looking at this task, I need to audit a specific component for accessibility gaps. Let me analyze the code provided.

## Short Plan

1. **Navigate button (L97-104)**: Add `aria-label="Navigate to high demand zone"` + `aria-hidden="true"` on inner Navigation icon (L103)
2. **Dismiss button (L105-111)**: Add `aria-label="Dismiss suggestion"` + `aria-hidden="true"` on inner X icon (L110)
3. **TrendingUp icon (L82)**: Already has `aria-hidden="true"` — confirmed correct
4. **Reduced motion**: Guard the `initial` prop on the framer-motion banner (L61-64) with `useReducedMotion`
5. **Live region**: Add `aria-live="polite"` scoped to the text block only (L87-92), not the buttons

## Proposed Changes

**File**: `src/components/driver/IdleSuggestionBanner.tsx`

### Change 1: Import `useReducedMotion` (add to existing framer-motion import)

```diff
- import { motion, AnimatePresence } from "framer-motion";
+ import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
```

### Change 2: Add reduced-motion guard + live region + aria-labels

```diff
 export function IdleSuggestionBanner({ zone, onDismiss }: Props) {
+  const prefersReducedMotion = useReducedMotion();
   // ... existing state/hooks ...

   return (
     <AnimatePresence>
       {show && (
         <motion.div
           initial={{ opacity: 0, y: -12 }}
+          initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -12 }}
           // ... rest of motion props ...
         >
           <div className="flex items-start gap-3 p-4">
-            <TrendingUp className="h-5 w-5 mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
+            <TrendingUp className="h-5 w-5 mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
             <div className="flex-1 min-w-0">
-              <p className="text-sm font-semibold text-foreground">
-                High demand {zone.distance} mi {zone.direction}
-              </p>
-              <p className="text-xs text-muted-foreground mt-0.5">
-                Drive there to get more orders
-              </p>
+              <div aria-live="polite" aria-atomic="true">
+                <p className="text-sm font-semibold text-foreground">
+                  High demand {zone.distance} mi {zone.direction}
+                </p>
+                <p className="text-xs text-muted-foreground mt-0.5">
+                  Drive there to get more orders
+                </p>
+              </div>
             </div>
             <div className="flex items-center gap-1 shrink-0">
-              <button onClick={() => openMaps(zone)} className="...">
-                <Navigation className="h-4 w-4" />
+              <button onClick={() => openMaps(zone)} className="..." aria-label="Navigate to high demand zone">
+                <Navigation className="h-4 w-4" aria-hidden="true" />
               </button>
-              <button onClick={onDismiss} className="...">
-                <X className="h-4 w-4" />
+              <button onClick={onDismiss} className="..." aria-label="Dismiss suggestion">
+                <X className="h-4 w-4" aria-hidden="true" />
               </button>
             </div>
           </div>
         </motion.div>
       )}
     </AnimatePresence>
   );
```

### Change 3: Remove unused `MapPin` import (L3)

```diff
- import { TrendingUp, Navigation, X, MapPin } from "lucide-react";
+ import { TrendingUp, Navigation, X } from "lucide-react";
```

## Reasoning for Live Region Decision

**For `aria-live="polite"` on the text block:**
- A screen-reader driver who is idle (not actively navigating) would benefit from hearing "High demand 3 mi North — Drive there to get more orders" announced when the banner appears
- The banner appears dynamically (conditionally rendered) — this is exactly the use case for `aria-live`
- Scoping it to the text block only (not the buttons) avoids re-announcing button labels on every appearance

**Against:**
- The banner already has interactive buttons — screen readers will naturally discover it when navigating
- If the driver is in a screen-reader browse mode, the banner's appearance might cause an unexpected announcement
- The buttons are immediately actionable — the live region could steal focus context

**Recommendation: ADD `aria-live="polite"` on the text block.** The driver is IDLE (not navigating), so the suggestion is genuinely new information they should be aware of. The `polite` setting means it won't interrupt the current utterance. Scoping to the text block (not the buttons) avoids double-announcing button labels. The `aria-atomic="true"` ensures the full text is read as one unit.

## Verification

- `npm run update` must pass (type-check + worker type-check + build)
- Preview at 375px viewport to confirm no layout shift from the added `<div>` wrapper
- The `useReducedMotion` hook returns `undefined` when the user has no preference (treated as falsy), so the animation plays normally for most users

## Owner Must Verify

1. The `useReducedMotion` import is available from `framer-motion` (v10+). If the project uses an older version, the import path may differ — verify with `npm ls framer-motion`
2. The `MapPin` import removal is safe (confirm no other usage in this file — the snippet shows it only at L3)
3. The `aria-live="polite"` wrapper is a `<div>` (not a `<span>`) — this is correct for block-level content and won't affect layout since it's inside a `flex-1 min-w-0` container
