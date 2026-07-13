# MiMo run — 2026-06-14T11:23:20.923Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only. This file is bilingual via an isCambodia boolean that switches visible copy between English and Khmer. Add useReducedMotion from framer-motion as var reduceMotion after const navigate. The notification list uses a motion.button inside AnimatePresence with initial opacity 0 y 8, exit opacity 0 y -8, and transition with delay i times 0.03 plus a spring. Guard the whole initial object with reduceMotion ternary to false, for the exit drop the spatial y so it becomes reduceMotion ? opacity 0 only : opacity 0 y -8, and set the transition delay to reduceMotion ? 0 : i times 0.03 keeping the spring. Add aria-hidden true to decorative icons: the category icons returned by getCategoryIcon which are Car Package Gift ShieldAlert Info Bell shown next to the visible category label, the CheckCheck icon inside the Mark all read button which has visible text, and the empty state Bell. The back button is an icon-only ghost Button with size icon containing only an ArrowLeft and no visible text so add a bilingual aria-label using isCambodia ternary Khmer for back English Back and aria-hidden its ArrowLeft. Do not add aria-label to controls with visible text such as the Mark all read button or the TabsTriggers or the notification buttons which contain title and body text, only aria-hidden their inner icons. Do NOT touch the shadcn Skeleton component it is a primitive. There is no raw heading skip the only raw heading is the h1. Do not change logic or layout.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/customer/CustomerNotifications.tsx

---

## Plan

1. **Import + hook**: add `useReducedMotion` to the `framer-motion` import; declare `const reduceMotion = useReducedMotion();` right after `const navigate = useNavigate();`.
2. **`getCategoryIcon`**: add `aria-hidden="true"` to every icon (`Car`, `Package`, `Gift`, `ShieldAlert`, `Info`, `Bell`) — they sit next to a visible category label.
3. **Back button**: add bilingual `aria-label={isCambodia ? "ថយក្រោយ" : "Back"}` to the `<Button>`; add `aria-hidden="true"` to its child `<ArrowLeft>`.
4. **CheckCheck icon** in the "Mark all read" button: add `aria-hidden="true"`.
5. **Empty-state Bell**: add `aria-hidden="true"`.
6. **`motion.button` list items**: guard `initial`, `exit`, and `transition.delay` with the `reduceMotion` ternary per the spec.
7. **Nothing else touched** — no Skeleton, no logic, no layout, no heading, no aria-label on controls with visible text.

---

## Proposed diff

**File:** `../zivodriver/src/pages/customer/CustomerNotifications.tsx`

### 1 — Import `useReducedMotion`

```diff
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
```

### 2 — Declare hook after `navigate`

```diff
  const navigate = useNavigate();
+ const reduceMotion = useReducedMotion();
  const goBack = useGoBack();
```

### 3 — `getCategoryIcon`: `aria-hidden` on every decorative icon

```diff
 function getCategoryIcon(category: string) {
   switch (category) {
-    case "order_tracking": return <Car className="w-4.5 h-4.5 text-primary" />;
-    case "order_complete": return <Package className="w-4.5 h-4.5 text-success" />;
-    case "promo": return <Gift className="w-4.5 h-4.5 text-warning" />;
-    case "alert": return <ShieldAlert className="w-4.5 h-4.5 text-destructive" />;
-    case "system": return <Info className="w-4.5 h-4.5 text-muted-foreground" />;
-    default: return <Bell className="w-4.5 h-4.5 text-muted-foreground" />;
+    case "order_tracking": return <Car aria-hidden="true" className="w-4.5 h-4.5 text-primary" />;
+    case "order_complete": return <Package aria-hidden="true" className="w-4.5 h-4.5 text-success" />;
+    case "promo": return <Gift aria-hidden="true" className="w-4.5 h-4.5 text-warning" />;
+    case "alert": return <ShieldAlert aria-hidden="true" className="w-4.5 h-4.5 text-destructive" />;
+    case "system": return <Info aria-hidden="true" className="w-4.5 h-4.5 text-muted-foreground" />;
+    default: return <Bell aria-hidden="true" className="w-4.5 h-4.5 text-muted-foreground" />;
   }
 }
```

### 4 — Back button: bilingual `aria-label` + `aria-hidden` ArrowLeft

```diff
-            <Button variant="ghost" size="icon" onClick={goBack} className="rounded-xl">
-              <ArrowLeft className="w-5 h-5" />
+            <Button variant="ghost" size="icon" onClick={goBack} className="rounded-xl" aria-label={isCambodia ? "ថយក្រោយ" : "Back"}>
+              <ArrowLeft aria-hidden="true" className="w-5 h-5" />
             </Button>
```

### 5 — CheckCheck icon: `aria-hidden`

```diff
-              <CheckCheck className="w-4 h-4 mr-1" />
+              <CheckCheck aria-hidden="true" className="w-4 h-4 mr-1" />
```

### 6 — Empty-state Bell: `aria-hidden`

```diff
-              <Bell className="w-7 h-7 text-muted-foreground/40" />
+              <Bell aria-hidden="true" className="w-7 h-7 text-muted-foreground/40" />
```

### 7 — `motion.button`: reduced-motion guards on `initial`, `exit`, `transition`

```diff
              <motion.button
                key={notif.id}
-               initial={{ opacity: 0, y: 8 }}
+               initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
-               exit={{ opacity: 0, y: -8 }}
-               transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 25 }}
+               exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
+               transition={{ delay: reduceMotion ? 0 : i * 0.03, type: "spring", stiffness: 300, damping: 25 }}
```

---

## Owner verification / deployment

- **`npm run update`** must pass (type-check + worker type-check + production build) — `useReducedMotion` returns `boolean | undefined` so the ternary arms are compatible.
- The file lives under `../zivodriver/` — verify it's in the same build pipeline or has its own equivalent gate.
- The Khmer string `"ថយក្រោយ"` ("Back") should be spot-checked by a Khmer speaker for naturalness.
- No logic, layout, or styling changed — purely additive accessibility + reduced-motion guards.
