# MiMo run — 2026-06-14T08:18:32.285Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion. File HAS framer-motion motion only no AnimatePresence and HAS useTranslation so use t common.back for the back label. One repeated motion.button per quick-link initial opacity 0 y 8 animate opacity 1 y 0 transition delay 0.03 times index whileTap scale 0.98. Guard initial reduceMotion ? false keep animate and KEEP whileTap never guard tap. Wrap transition reduceMotion ? undefined keep the 0.03 times index delay. Plan extend import add useReducedMotion add const reduceMotion useReducedMotion in component body. The back control is a plain native button onClick navigate minus 1 not a shadcn Button add aria-label t common.back and its ArrowLeft aria-hidden true. aria-hidden true on the per-link decorative icons the link.icon in the gradient tile beside the label and the ChevronRight all beside visible text or ornamental. There is NO animate-spin or animate-pulse. HEADING single h1 no other headings so NO heading change. Confirm or correct. List exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/QuickAccess.tsx

---

## Plan

8 additive edits, zero className/logic changes. Import `useReducedMotion`, add the `reduceMotion` const, guard the two framer-motion entrance props (`initial`/`transition`) on the mapped `motion.button`, add `aria-label` on the back button + `aria-hidden="true"` on all decorative icons.

---

## Confirmations

- ✅ `whileTap={{ scale: 0.98 }}` stays as-is — task says "KEEP whileTap never guard tap"
- ✅ `animate={{ opacity: 1, y: 0 }}` stays as-is — task says "keep animate"
- ✅ Back button is a plain `<button>` (not shadcn `<Button>`) — confirmed
- ✅ No `animate-spin` or `animate-pulse` in file — confirmed
- ✅ Single `h1`, no heading change needed — confirmed
- ✅ `link.icon` and `ChevronRight` are both decorative beside visible text — confirmed

---

## Exact edits — `src/pages/driver/QuickAccess.tsx`

### Edit 1 — extend import (line 1)

```diff
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
```

### Edit 2 — add `reduceMotion` const in component body (after `const { t } = useTranslation();`)

```diff
   const { t } = useTranslation();
+  const reduceMotion = useReducedMotion();
```

### Edit 3 — back button `aria-label` (plain native `<button>`)

```diff
           <button
             onClick={() => navigate(-1)}
+            aria-label={t("common.back")}
             className="p-2 rounded-xl hover:bg-muted transition-colors"
           >
```

### Edit 4 — `ArrowLeft` icon `aria-hidden`

```diff
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
```

### Edit 5 — per-link `link.icon` `aria-hidden` (inside `.map()`, covers all 9)

```diff
-              <link.icon className={`w-5 h-5 ${link.color}`} />
+              <link.icon className={`w-5 h-5 ${link.color}`} aria-hidden="true" />
```

### Edit 6 — `ChevronRight` `aria-hidden` (inside `.map()`, covers all 9)

```diff
-            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
+            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
```

### Edit 7 — guard `initial` with `reduceMotion`

```diff
-            initial={{ opacity: 0, y: 8 }}
+            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
```

### Edit 8 — guard `transition` with `reduceMotion`

```diff
-            transition={{ delay: 0.03 * index }}
+            transition={reduceMotion ? undefined : { delay: 0.03 * index }}
```

---

## Verification / deploy notes

- **Run `npm run update`** (type-check + worker type-check + production build) — must pass green before done.
- **Reduced-motion check:**
