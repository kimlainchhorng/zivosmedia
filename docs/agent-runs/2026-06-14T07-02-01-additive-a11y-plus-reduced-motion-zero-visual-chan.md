# DeepSeek run — 2026-06-14T07:02:01.478Z

- model: deepseek-chat
- task: Additive a11y plus reduced-motion, zero visual change at default motion. Small wrapper page, bulk is in SecurityDashboard child component which is OUT OF SCOPE. File HAS framer-motion, NO useTranslation so plain Back. Add useReducedMotion from framer-motion, const reduceMotion in Security component. The motion.header entrance initial opacity 0 y minus 20 animate opacity 1 y 0 no transition - guard initial whole-object reduceMotion ? false : object, keep animate. The back motion.button has whileHover and whileTap only - leave those UNGUARDED, but add aria-label Back to it and aria-hidden true on its ArrowLeft icon. aria-hidden true on the Shield icon inside the h1 (beside Security Center text). Confirm single h1 Security Center. List exact edits only, no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/Security.tsx

---

## Plan

Additive a11y + reduced-motion pass on `src/pages/Security.tsx`:

1. **Import `useReducedMotion`** from framer-motion
2. **Guard `motion.header` entrance** — `initial` becomes `reduceMotion ? false : { opacity: 0, y: -20 }` (animate stays as-is)
3. **Back button** — add `aria-label="Back"`, `aria-hidden="true"` on `ArrowLeft` icon
4. **Shield icon** — add `aria-hidden="true"` inside the `<h1>`
5. **Confirm single `<h1>`** — yes, one `Security Center` h1
6. **Zero visual change** at default motion (no `reduceMotion` → identical behavior)

---

## Diff

**File:** `src/pages/Security.tsx`

```diff
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Shield } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import SecurityDashboard from "@/components/security/SecurityDashboard";
 import BottomNav from "@/components/BottomNav";

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

## Verification & deploy

- **Verify:** `npm run update` must pass (type-check + worker type-check + production build)
- **Preview:** navigate to the Security page — header entrance animation should work identically unless OS-level reduced motion is on
- **No logic changes** — `SecurityDashboard` child component is untouched
- **Owner commits & deploys** (per workflow rules)
