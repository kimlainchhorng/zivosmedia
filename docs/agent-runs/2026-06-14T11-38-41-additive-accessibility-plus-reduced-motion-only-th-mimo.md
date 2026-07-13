# MiMo run — 2026-06-14T11:38:41.703Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only. This is the customer PromoWallet page, English only, not bilingual. It uses framer-motion motion but no AnimatePresence. The single motion.div lives inside the PromoCard subcomponent with initial opacity 0 y 12 and animate opacity 1 y 0, no exit, no delay. Add useReducedMotion from framer-motion as var reduceMotion inside PromoCard near the top before the return, and guard the whole initial object with reduceMotion ternary to false. The loading skeleton is three raw divs with animate-pulse className mapped over an array, not a shadcn Skeleton component, so append motion-reduce colon animate-none to that className. Add aria-hidden true to decorative icons that sit next to visible text: the DiscIcon next to the discount label, the Ticket icon next to the promo code, the Clock icon next to the expiry text, the Check icon next to the used date, the Gift icon in the Available tab trigger, the Check icon in the Used tab trigger, and the two empty state icons Ticket and Check. The header back button is icon only with no visible text so add aria-label Back to the button element and aria-hidden true to its ArrowLeft icon. Do not change logic or layout. Do not touch the Tabs TabsList TabsTrigger TabsContent shadcn components themselves only the icons inside. The only raw heading is an h1 so no heading change.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/customer/PromoWallet.tsx

---

## Plan

1. **Import `useReducedMotion`** from `framer-motion`.
2. **Inside `PromoCard`**, add `const reduceMotion = useReducedMotion()` before the return, and guard the `initial` prop on the `motion.div` with a ternary (`reduceMotion ? false : { opacity: 0, y: 12 }`).
3. **Loading skeleton** (`[1, 2, 3].map` divs): append `motion-reduce:animate-none` to the existing `animate-pulse` className.
4. **9 decorative icons** get `aria-hidden="true"`: `DiscIcon`, code `Ticket`, expiry `Clock`, used-date `Check`, tab `Gift`, tab `Check`, empty-state `Ticket`, empty-state `Check`, and the back-button `ArrowLeft`.
5. **Back button** gets `aria-label="Back"`.
6. No logic, layout, or shadcn component prop changes.

---

## Proposed diff

**File:** `src/pages/customer/PromoWallet.tsx`

```diff
 import { motion } from "framer-motion";
+import { useReducedMotion } from "framer-motion";
 import { ArrowLeft, Ticket, Clock, Check, Gift, Percent, Truck } from "lucide-react";
```

*(Note: can be merged into one import line — see consolidated below.)*

**Consolidated `import` line change:**

```diff
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
```

**Inside `PromoCard`, before the existing `return`:**

```diff
 function PromoCard({ promo, variant }: { promo: PromoWalletItem; variant: "available" | "used" }) {
+  const reduceMotion = useReducedMotion();
+
   const isExpiringSoon =
```

**The `motion.div` `initial` prop:**

```diff
     <motion.div
-      initial={{ opacity: 0, y: 12 }}
+      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
       animate={{ opacity: 1, y: 0 }}
```

**`DiscIcon` (inside PromoCard, discount-icon badge):**

```diff
           <DiscIcon
+            aria-hidden="true"
             className={cn(
```

**`Ticket` icon (next to promo code):**

```diff
-              <Ticket className="h-3 w-3 text-muted-foreground" />
+              <Ticket aria-hidden="true" className="h-3 w-3 text-muted-foreground" />
```

**`Clock` icon (next to expiry text):**

```diff
-                <Clock className="h-3 w-3" />
+                <Clock aria-hidden="true" className="h-3 w-3" />
```

**`Check` icon (next to used date):**

```diff
-                <Check className="h-3 w-3" />
+                <Check aria-hidden="true" className="h-3 w-3" />
```

**Back button — `aria-label` + `ArrowLeft` `aria-hidden`:**

```diff
           <button
             onClick={() => navigate(-1)}
+            aria-label="Back"
             className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground"
           >
-            <ArrowLeft className="h-5 w-5" />
+            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
           </button>
```

**`Gift` icon in Available tab trigger:**

```diff
-              <Gift className="h-3.5 w-3.5 mr-1" />
+              <Gift aria-hidden="true" className="h-3.5 w-3.5 mr-1" />
```

**`Check` icon in Used tab trigger:**

```diff
-              <Check className="h-3.5 w-3.5 mr-1" />
+              <Check aria-hidden="true" className="h-3.5 w-3.5 mr-1" />
```

**Loading skeleton divs — append `motion-reduce:animate-none`:**

```diff
                   className="h-28 animate-pulse rounded-2xl bg-muted"
+                  className="h-28 animate-pulse motion-reduce:animate-none rounded-2xl bg-muted"
```

*(Replace the entire className string — the `-` and `+` above show intent; the actual edit replaces `"h-28 animate-pulse rounded-2xl bg-muted"` with `"h-28 animate-pulse motion-reduce:animate-none rounded-2xl bg-muted"`.)*

**Empty-state `Ticket` icon (available tab):**

```diff
-                <Ticket className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
+                <Ticket aria-hidden="true" className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
```

**Empty-state `Check` icon (used tab):**

```diff
-                <Check className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
+                <Check aria-hidden="true" className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
```

---

### Summary of changes (count)

| Category | Count |
|---|---|
| New import (`useReducedMotion`) | 1 |
| New `const` (`reduceMotion`) | 1 |
| `initial` prop guarded | 1 |
| `aria-hidden="true"` added to icons | 9 |
| `aria-label="Back"` on button | 1 |
| `motion-reduce:animate-none` on skeleton | 1 |
| **Logic / layout lines touched** | **0** |

---

### Owner verification

- Run `npm run update` (or the zivodriver equivalent) to confirm type-check + build pass.
- Test with OS "Reduce motion" enabled: `PromoCard` should skip the fade-up entrance; skeleton pulses should freeze.
- Tab through the page: back button should announce "Back"; all decorative icons should be hidden from the accessibility tree; visible text labels remain the accessible names.
