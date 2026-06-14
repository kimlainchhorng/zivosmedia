# MiMo run — 2026-06-14T07:28:56.709Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change. File HAS framer-motion (motion plus AnimatePresence, two motion.div) and HAS useTranslation so back label uses t common.back. Edits: (1) extend import to add useReducedMotion, add const reduceMotion. (2) FAQ-item entrance map motion.div initial opacity 0 y 8 transition delay i times 0.03 - guard initial reduceMotion ? false keep animate, wrap transition reduceMotion ? undefined object. (3) answer-reveal motion.div initial height 0 opacity 0 animate height auto exit height - guard initial reduceMotion ? false keep animate keep exit. (4) icon-only ghost back Button gets aria-label t of common.back, ArrowLeft aria-hidden true. (5) aria-hidden true on decorative icons: header HelpCircle, the Search icon inside the input, the ChevronDown in each FAQ toggle, the empty-state HelpCircle. (6) the search Input has only placeholder no label - add aria-label set to t of driver.faq.searchPlaceholder. (7) each FAQ accordion toggle button has visible question text so NO aria-label but add aria-expanded set to openIndex equals i. (8) the ChevronDown rotates via CSS transition-transform not JS animation - LEAVE as is no motion-reduce. (9) category pills have visible text no change. Single h1 no change. List exact edits only, no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/DriverFAQ.tsx

---

## Plan

Nine edit sites in one file, zero visual change, zero logic touched:

| # | What | Type |
|---|------|------|
| 1 | Extend framer-motion import → add `useReducedMotion`; add `const reduceMotion = useReducedMotion()` in component | import + const |
| 2 | FAQ entrance `motion.div` — guard `initial` and `transition` with `reduceMotion` | prop guard |
| 3 | Answer-reveal `motion.div` — guard `initial` and `exit` with `reduceMotion` | prop guard |
| 4 | Ghost back `Button` → `aria-label={t("common.back")}`; `ArrowLeft` → `aria-hidden="true"` | 2 aria attrs |
| 5 | Four decorative icons get `aria-hidden="true"`: header `HelpCircle`, `Search` inside input, `ChevronDown` per toggle, empty-state `HelpCircle` | 4 aria attrs |
| 6 | Search `<Input>` — add `aria-label={t("driver.faq.searchPlaceholder")}` (placeholder alone is not an accessible name) | 1 aria attr |
| 7 | Each FAQ toggle `<button>` — add `aria-expanded={openIndex === i}` | 1 aria attr |

No className edits. No logic changes. ChevronDown CSS rotation left as-is. Category pills left as-is (visible text).

---

## Proposed diff — `src/pages/driver/DriverFAQ.tsx`

### Edit 1 — import line

```diff
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
```

### Edit 2 — add const inside component (after `const { t } = useTranslation();`)

```diff
  const { t } = useTranslation();
+ const reduceMotion = useReducedMotion();
```

### Edit 3 — Back button (aria-label on Button, aria-hidden on ArrowLeft)

```diff
-          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
-            <ArrowLeft className="w-5 h-5" />
+          <Button variant="ghost" size="icon" onClick={() =>
