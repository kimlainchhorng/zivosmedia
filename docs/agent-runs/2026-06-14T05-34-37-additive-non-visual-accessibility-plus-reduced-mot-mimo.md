# MiMo run — 2026-06-14T05:34:37.789Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. MultiAccountBanner MOUNTED on /map is a persistent destructive glass alert. A framer-motion div animates in with initial opacity 0 y -8. Inside: ShieldAlert icon, bold title 'Account under review', muted line 'Please contact support for assistance.' No buttons. Questions: (1) aria-hidden true on the ShieldAlert icon (redundant with title)? (2) Guard the y -8 entrance with useReducedMotion so initial becomes false under reduced motion? (3) Add role=status aria-live=polite to announce this account-status alert? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/driver/MultiAccountBanner.tsx

---

## Verdicts

| # | Question | Verdict |
|---|----------|---------|
| 1 | `aria-hidden="true"` on `ShieldAlert` | **Yes.** Purely decorative — the adjacent "Account under review" text conveys the meaning. Screen readers would otherwise announce the SVG's accessible name redundantly. |
| 2 | Guard `y: -8` entrance with `useReducedMotion` | **Yes.** Under `prefers-reduced-motion: reduce`, skip the translation so the banner mounts at its final position. The spring transition on `opacity` is harmless (already at 1), but the `y` slide is the real motion concern. |
| 3 | `role="status" aria-live="polite"` | **Yes.** This is a persistent account-status banner (not a transient toast or emergency). `role="status"` implicitly carries `aria-live="polite"` — add both for explicitness. Polite is correct; assertive would be too disruptive for a review hold. |

## Proposed diff

**File:** `src/components/driver/MultiAccountBanner.tsx`

```diff
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ShieldAlert } from "lucide-react";

 export default function MultiAccountBanner() {
+  const reducedMotion = useReducedMotion();
+
   return (
     <motion.div
-      initial={{ opacity: 0, y: -8 }}
+      role="status"
+      aria-live="polite"
+      initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ type: "spring", stiffness: 300, damping: 25 }}
       className="mx-4 mt-2 p-3.5 rounded-[16px] flex items-center gap-3 border border-destructive/25"
       style={{
@@ @@
       <div className="w-9 h-9 rounded-[12px] bg-destructive/12 flex items-center justify-center shrink-0">
-        <ShieldAlert className="h-5 w-5 text-destructive" />
+        <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
       </div>
```

**Change summary:** 3 additive a11y attrs (`aria-hidden`, `role`, `aria-live`) + 1 hook import + 1 conditional initial. Zero logic, layout, copy, routing, or styling lines touched.

## Owner verify

- `npm run update` (or the zivodriver equivalent type-check + build) must exit 0.
- With `prefers-reduced-motion: reduce` enabled in OS/browser, the banner should appear instantly (no y slide).
- Screen reader: the icon should be silent; the "Account under review" text should be announced as a polite status on mount.
