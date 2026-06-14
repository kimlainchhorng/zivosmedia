# MiMo run — 2026-06-14T07:02:29.996Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change. Small wrapper page, SecurityDashboard child OUT OF SCOPE. HAS framer-motion, NO useTranslation plain Back. Add useReducedMotion, const reduceMotion in Security. motion.header entrance initial opacity 0 y minus 20 no transition - guard initial reduceMotion ? false : object keep animate. back motion.button has whileHover whileTap only leave unguarded but add aria-label Back and aria-hidden on ArrowLeft. aria-hidden true on Shield in h1. Confirm single h1. List exact edits only.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/Security.tsx

---

## Plan

Six surgical edits to `src/pages/Security.tsx` (driver repo):

1. **Import** — add `useReducedMotion` to the `framer-motion` import.
2. **Hook** — `const reduceMotion = useReducedMotion();` after `useNavigate()`.
3. **Header entrance guard** — `initial={reduceMotion ? false : { opacity: 0, y: -20 }}` (keeps `animate` as-is; `false` = instant, no animation on mount for reduced-motion users).
4. **Back button** — add `aria-label="Back"` (icon-only, needs accessible name).
5. **ArrowLeft icon** — add `aria-hidden="true"` (decorative; the `aria-label` on the button is the accessible name).
6. **Shield icon** — add `aria-hidden="true"` (decorative next to the h1 text).

Single `<h1>` confirmed ✓ — exactly one, "Security Center".

`whileHover`/`whileTap` on the back button are **left unguarded** — they are pointer-driven, not auto-playing, so reduced-motion users who voluntarily tap/hover still get feedback.

---

## Diff

**File:** `src/pages/Security.tsx` (driver repo)

```diff
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";

 const Security = () => {
   const navigate = useNavigate();
+  const reduceMotion = useReducedMotion();

   return (
     <div className="min-h-screen bg-background pb-24">
       {/* Header */}
       <motion.header
         className="sticky top-0 z-40 backdrop-blur-xl bg-card/95 border-b border-border/30 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
-        initial={{ opacity: 0, y: -20 }}
+        initial={reduceMotion ? false : { opacity: 0, y: -20 }}
         animate={{ opacity: 1, y: 0 }}
       >
         <div className="flex items-center gap-3">
           <motion.button
             onClick={() => navigate(-1)}
             className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
+            aria-label="Back"
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </motion.button>
           <div className="flex-1">
             <h1 className="text-lg font-display font-bold flex items-center gap-2">
               Security Center
-              <Shield className="w-4 h-4 text-primary" />
+              <Shield className="w-4 h-4 text-primary" aria-hidden="true" />
             </h1>
             <p className="text-xs text-muted-foreground">Protect your account</p>
           </div>
         </div>
       </motion.header>
```

---

## Summary of exact edits

| # | What | Why |
|---|------|-----|
| 1 | `useReducedMotion` added to import | Hook source |
| 2 | `const reduceMotion = useReducedMotion()` | Value for guard |
| 3 | `initial={reduceMotion ? false : …}` | No entrance animation under reduced-motion |
| 4 | `aria-label="Back"` on `motion.button` | Accessible name for icon-only button |
| 5 | `aria-hidden="true"` on `ArrowLeft` | Decorative icon, label is on button |
| 6 | `aria-hidden="true"` on `Shield` | Decorative icon beside h1 text |

Zero logic lines touched. Zero visual change for users without `prefers-reduced-motion`. SecurityDashboard is untouched.

## Owner verify

- `npm run update` (or at minimum `npm run type-check`) in the **driver repo** — must be 0 errors.
- In a browser with `prefers-reduced-motion: reduce` enabled: the header should appear instantly (no slide-down). The back button's `whileHover`/`whileTap` still fire on interaction. Screen reader should read "Back, button" for the arrow and "Security Center" for the heading (Shield silenced).
