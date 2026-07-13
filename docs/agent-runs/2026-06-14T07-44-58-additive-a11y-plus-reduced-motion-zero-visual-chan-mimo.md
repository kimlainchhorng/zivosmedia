# MiMo run — 2026-06-14T07:44:58.511Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change at default motion. File imports motion from framer-motion no AnimatePresence and NO useTranslation so plain Back. About 10 motion.div all with y movement entrances initial opacity 0 y 20 or y minus 20 animate opacity 1 y 0. Several have stagger transition delay 0.05 0.1 0.12 0.1 0.15 0.18 0.2 0.3. Plan extend import to add useReducedMotion. Add const reduceMotion useReducedMotion in OrderDetails. Guard every initial as reduceMotion ? false keep animate. Wrap each staggered transition delay as reduceMotion ? undefined keep delay object. Two animate-spin Loader2 the status button and the send-note button APPEND motion-reduce animate-none KEEP animate-spin never drop it. Icon-only ghost back Button gets aria-label Back ArrowLeft aria-hidden true. Other icon-only Buttons the Phone call button the pickup Navigation button the dropoff Navigation button the send-note button need aria-labels Call customer Navigate to pickup Navigate to dropoff Send note and their icons aria-hidden true. The note Input has placeholder Add a note about this order add aria-label reusing that placeholder text. aria-hidden true on decorative icons header CardTitle Package User DollarSign CheckCircle MessageSquare CardTitle Clock CardTitle Play in Replay button has visible text so just aria-hidden the order-not-found AlertTriangle. HEADING question single h1 Order Details. There is an h3 Order not found inside the order-not-found early-return which is a separate render branch with no h1 visible. Also CardTitle renders h3 for Food Delivery Trip and Add Note and Activity. Recommend leave the Order not found h3 as-is since it is its own early-return branch and leave CardTitle h3 as-is cross-component. Confirm or correct. List exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/OrderDetails.tsx

---

## 1. Plan

**File:** `zivodriver/src/pages/driver/OrderDetails.tsx`

Five additive categories, zero logic changes:

| # | Category | Count |
|---|----------|-------|
| A | Reduced-motion: import `useReducedMotion`, guard 10 `motion.div`s | 10 |
| B | Loader2 `animate-spin` → append `motion-reduce:animate-none` | 2 |
| C | Icon-only buttons → `aria-label` + icons `aria-hidden="true"` | 5 buttons, 8 icon attrs |
| D | Decorative icons → `aria-hidden="true"` | 6 |
| E | Note `<Input>` → `aria-label` | 1 |

**Heading question — confirmed leave-as-is.** The `h3` "Order not found" is in its own early-return branch (no `h1` visible). The `CardTitle` `h3`s ("Food Delivery"/"Trip", "Add Note", "Activity") are cross-component. The single `h1` "Order Details" is on the main render branch. Correct as-is.

---

## 2. Proposed diff

**File:** `zivodriver/src/pages/driver/OrderDetails.tsx`

### Edit 1 — Import

```diff
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
```

### Edit 2 — Hook (insert after `useOrderDisputes` / `useOrderItemModifications` lines, ~L108)

```diff
  const { modifications, isLoading: modificationsLoading } = useOrderItemModifications(
    order?.type === "food_order" ? order.id : undefined
  );
+
+  const reduceMotion = useReducedMotion();
```

### Edit 3 — Header `motion.div`

```diff
       <motion.div
         className="bg-gradient-to-b from-primary/20 via-primary/10 to-background px-5 pt-8 pb-6"
-        initial={{ opacity: 0, y: -20 }}
-        animate={{ opacity: 1, y: 0 }}
+        initial={reduceMotion ? false : { opacity: 0, y: -20 }}
+        animate={reduceMotion ? false : { opacity: 1, y: 0 }}
       >
```

### Edit 4 — Back button (icon-only → aria-label + aria-hidden)

```diff
-          <Button variant="ghost" size="icon" onClick={goBack}>
-            <ArrowLeft className="w-5 h-5" />
+          <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back">
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
```

###
