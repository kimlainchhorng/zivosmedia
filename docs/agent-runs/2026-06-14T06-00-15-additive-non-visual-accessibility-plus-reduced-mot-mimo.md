# MiMo run — 2026-06-14T06:00:15.554Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. DeliveryProofCapture MOUNTED on /map is a plain motion.div glass card, rendered TWICE in Map.tsx each inside a shadcn Dialog/DialogContent (Radix focus trap, role=dialog, Escape) whose DialogContent has NO DialogTitle (the card renders only a visual <p>Delivery Proof</p> + subline, not a DialogTitle) - so the dialog has no accessible name and Radix warns. useState/useRef hooks, NO early return. Single entrance motion.div (initial opacity 0 y 12, spring). Header: decorative Camera in a tile + 'Delivery Proof'/'Optional photo verification' text + an optional icon-only close motion.button (whileTap 0.9) with only an X. Preview: when chosen, img alt='Delivery proof preview' + an icon-only clear motion.button (whileTap 0.9) with only an X; when empty, a big decorative Camera + 'Take a photo of the delivery'. Two hidden file inputs (className hidden = display:none, triggered via button click). Buttons: 'Take Photo' (Camera + text), 'Choose File' (ImagePlus + text); a single 'Upload & Complete' (Check + text) that while uploading swaps to Loader2 (animate-spin) + 'Uploading...'; a ghost 'Skip Photo' button. Upload status via toast (useToast). Concise verdict per point: (1) aria-hidden on header Camera, empty-state Camera, Take-Photo Camera, ImagePlus, Loader2, Check, and the two X icons? (2) aria-label on the two icon-only buttons - close='Close', clear='Remove photo' (plain English, no t())? (3) guard the single entrance (opacity 0 y 12) with useReducedMotion initial false, LEAVE the two whileTap? (4) Loader2 animate-spin - add motion-reduce:animate-none? (5) DialogContent in Map.tsx (both sites ~1688/~1706) has NO DialogTitle - add a VisuallyHidden/sr-only DialogTitle in Map.tsx (minimal correct) or defer? recommend exact text ('Delivery proof'/'Pickup proof'). (6) the two display:none file inputs triggered via button - confirm out of a11y tree, no action? (7) img has alt already - confirm no extra live region (focus-trapped dialog + toast handles status)?
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/driver/DeliveryProofCapture.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
Let me analyze the 7 points carefully and provide a precise audit with exact diffs.

Let me go through each point:

**(1) aria-hidden on decorative icons?**
Yes — Camera (header tile), Camera (empty-state), Camera (Take Photo button), ImagePlus (Choose File), Loader2 (Uploading), Check (Upload & Complete), and the two X icons on the close/clear buttons... wait, the two X icons are INSIDE icon-only buttons, so they should be aria-hidden because the button itself will get an aria-label. So yes, all decorative icons that are either purely visual or inside buttons with aria-labels should get `aria-hidden="true"`.

Icons to mark aria-hidden:
- L header Camera (decorative, in a tile)
- L empty-state Camera (decorative)
- L "Take Photo" button Camera (has text "Take Photo" as sibling — the icon is decorative)
- L "Choose File" button ImagePlus (has text "Choose File" as sibling — decorative)
- L Loader2 (Uploading... has text sibling — decorative)
- L Check (Upload & Complete has text sibling — decorative)
- Close button X (inside icon-only button — will get aria-label, so icon is decorative)
- Clear button X (inside icon-only button — will get aria-label, so icon is decorative)

All 8 icons → `aria-hidden="true"`.

**(2) aria-label on icon-only buttons?**
- Close button (the `onClose` one) → `aria-label="Close"`
- Clear/remove photo button → `aria-label="Remove photo"`

Both are plain English. No t() needed since the rest of the component is in English.

**(3) useReducedMotion for entrance motion.div?**
The entrance `initial={{ opacity: 0, y: 12 }}` should respect reduced motion. Use `useReducedMotion` from framer-motion with initial=false (so the animation runs by default, but is skipped when the user prefers reduced motion).

For the entrance: when reduced motion is preferred, skip the `initial` animation entirely. The cleanest approach: conditionally set `initial` to `false` (which means "use the animate state as initial") when reduced motion is preferred.

The `whileTap={{ scale: 0.9 }}` on the close and clear buttons — the task says "LEAVE the two whileTap?" — I'd say leave them. They're a micro-interaction feedback, and framer-motion's `whileTap` is already brief enough that it's debatable. The `animate-spin` on Loader2 is more important to guard (point 4). Actually, re-reading the task: "guard the single entrance (opacity 0 y 12) with useReducedMotion initial false, LEAVE the two whileTap?" — so the recommendation is to guard the entrance but leave whileTap alone.

**(4) Loader2 animate-spin — motion-reduce:animate-none?**
Yes. `animate-spin` is a continuous animation that can be problematic for users who prefer reduced motion. Add `motion-reduce:animate-none` to the Loader2 className. The text "Uploading..." still communicates the state.

**(5) DialogContent missing DialogTitle in Map.tsx?**
The task says to add a VisuallyHidden/sr-only DialogTitle. Since this is a DialogContent without a DialogTitle, Radix will warn. The correct fix is to add a `<DialogTitle className="sr-only">` inside the DialogContent. But the task says the file to edit is Map.tsx, and the context asks me to recommend exact text.

Recommended text: "Delivery proof" (for the delivery proof dialog) and "Pickup proof" (if there's a pickup proof variant).

Actually, re-reading the task: "DeliveryProofCapture MOUNTED on /map is a plain motion.div glass card, rendered TWICE in Map.tsx each inside a shadcn Dialog/DialogContent" — so there are two dialogs. I need to see Map.tsx to know what both are for. But the task says to recommend exact text: 'Delivery proof' / 'Pickup proof'.

This fix goes in Map.tsx, not DeliveryProofCapture.tsx. But I don't have the Map.tsx content. I'll describe the fix.

Actually wait — the task says "Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change." Adding a DialogTitle is additive + accessibility, so it's in scope.

But I don't have the Map.tsx file content. I'll provide the fix for DeliveryProofCapture.tsx (the main file given) and describe the Map.tsx fix.

Actually, looking more carefully, the cleanest approach would be to pass a `dialogTitle` prop to DeliveryProofCapture and render it as a `<DialogTitle className="sr-only">` inside the component. But that would be a prop change. Alternatively, just add the sr-only DialogTitle in Map.tsx where the dialogs are defined.

Let me focus on what I have — DeliveryProofCapture.tsx — and give the Map.tsx fix as a recommendation.

**(6) display:none file inputs — out of a11y tree?**
Yes. `className="hidden"` applies `display: none`, which removes elements from the accessibility tree entirely. They're triggered programmatically via `.click()` from visible buttons. No action needed.

**(7) img alt + no extra live region?**
The img already has `alt="Delivery proof preview"`. The dialog is focus-trapped (Radix), and upload status is communicated via toast. No extra live region needed. Confirmed.

---

Now let me write the precise diff for DeliveryProofCapture.tsx:

Changes needed:
1. Import `useReducedMotion` from framer-motion
2. Add `const prefersReducedMotion = useReducedMotion();` hook
3. Guard entrance motion.div: conditionally set initial based on reduced motion
4. Add `aria-hidden="true"` to 8 decorative icons
5. Add `aria-label` to 2 icon-only buttons
6. Add `motion-reduce:animate-none` to Loader2

Let me write the diff carefully.

```tsx
import { motion, useReducedMotion } from "framer-motion";
```

Add hook:
```tsx
const prefersReducedMotion = useReducedMotion();
```

Entrance motion.div:
```tsx
initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
```

Header Camera (decorative):
```tsx
<Camera className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
```

Close button X (icon-only):
```tsx
<motion.button whileTap={{ scale: 0.9 }} onClick={onClose} aria-label="Close"
```
And its X:
```tsx
<X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
```

Empty-state Camera:
```tsx
<Camera className="h-12 w-12 mb-2 opacity-40" aria-hidden="true" />
```

Preview clear button:
```tsx
<motion.button whileTap={{ scale: 0.9 }} onClick={handleClear} aria-label="Remove photo"
```
And its X:
```tsx
<X className="h-4 w-4 text-foreground" aria-hidden="true" />
```

Take Photo Camera:
```tsx
<Camera className="h-4 w-4" aria-hidden="true" /> Take Photo
```

Choose File ImagePlus:
```tsx
<ImagePlus className="h-4 w-4" aria-hidden="true" /> Choose File
```

Uploading Loader2:
```tsx
<Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Uploading...
```

Check:
```tsx
<Check className="h-4 w-4 mr-2" aria-hidden="true" /> Upload & Complete
```

That's the complete set. Let me verify: 8 `aria-hidden`, 2 `aria-label`, 1 `useReducedMotion` import + hook + guard, 1 `motion-reduce:animate-none`. Zero logic changes, zero layout changes.

Wait — I need to double-check: does `motion-reduce:animate-none` work as a Tailwind class? Yes, `motion-reduce:` is a standard Tailwind variant that maps to `@media (prefers-reduced-motion: reduce)`. So `motion-reduce:animate-none` compiles to `@media (prefers-reduced-motion: reduce) { animation: none; }`. This is correct.

Also: `useReducedMotion` from framer-motion — when the user prefers reduced motion, it returns `true`. The guard `prefersReducedMotion ? false : { opacity: 0, y: 12 }` means: if reduced motion, `initial={false}` which tells framer-motion to start at the `animate` state (no entrance animation). If not reduced motion, animate in from opacity 0 and y 12. This is correct.

One thing to note: `useReducedMotion` initial value. The task says "useReducedMotion initial false" — this means the hook should initially return false (i.e., assume no reduced motion preference until the media query is checked). In framer-motion, `useReducedMotion()` returns `false
