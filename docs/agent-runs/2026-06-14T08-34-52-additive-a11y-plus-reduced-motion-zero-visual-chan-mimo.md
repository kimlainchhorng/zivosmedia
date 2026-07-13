# MiMo run — 2026-06-14T08:34:52.671Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on DriverIncidents. File imports framer-motion motion and NO useTranslation so plain-English labels. Motion inventory. ONE motion.header initial opacity 0 y minus 20 animate opacity 1 y 0 this has y movement GUARD initial reduceMotion ? false keep animate. ONE back motion.button with ONLY whileHover scale 1.05 whileTap scale 0.95 NO initial NO animate LEAVE WHILETAP WHILEHOVER UNTOUCHED do not guard. Plan extend framer-motion import add useReducedMotion add const reduceMotion in body guard the header initial only. Icons aria-hidden decorative the ArrowLeft in back button the Sparkles beside Incidents in h1 the Plus in Report TabsTrigger the List in History TabsTrigger the AlertTriangle in empty state. Back motion.button is icon-only gets aria-label Back its ArrowLeft aria-hidden. HEADING question single h1 Incidents then TWO h3 section labels Open Incidents and Resolved which is an h1 to h3 skip. These h3 are in-file styled only by className. Advise whether to promote both to h2 zero visual or defer. Skeleton out of scope. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/DriverIncidents.tsx

---

## 1. Plan

**Reduced-motion guard:** Import `useReducedMotion`; add `const reduceMotion = useReducedMotion()` in the body; guard **only** the `motion.header` `initial` (`initial={reduceMotion ? false : { opacity: 0, y: -20 }}`). The back `motion.button` has only `whileHover`/`whileTap` (user-triggered micro-interactions, no entrance) — **leave untouched**, no guard.

**A11y — decorative icons:** Add `aria-hidden="true"` to all 5 decorative Lucide icons: `ArrowLeft` (back button), `Sparkles` (h1), `Plus` (Report TabsTrigger), `List` (History TabsTrigger), `AlertTriangle` (empty state). All have adjacent visible text or are purely decorative.

**A11y — back button:** Icon-only `motion.button` → add `aria-label="Back"`.

**Heading hierarchy:** Current `h1` → `h3` → `h3` is a heading-level skip. Promote both `h3` to `h2`. Both are styled entirely by `className` (`text-xs font-semibold text-warning uppercase tracking-wider` / `text-xs font-semibold text-muted-foreground uppercase tracking-wider`) — changing the tag has **zero visual impact**. Result: `h1` → `h2` → `h2` (correct outline).

**No logic changes.** No skeleton changes. Zero visual difference at default motion.

---

## 2. Proposed diff

**File:** `src/pages/driver/DriverIncidents.tsx`

```diff
--- a/src/pages/driver/DriverIncidents.tsx
+++ b/src/pages/driver/DriverIncidents.tsx
@@ -2,7 +2,7 @@
  * DriverIncidents – Driver page to report and track incidents
  */
 import { useState } from "react";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, AlertTriangle, Plus, List, Sparkles } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { useGoBack } from "@/hooks/useGoBack";
@@ -19,6 +19,7 @@
   const navigate = useNavigate();
   const goBack = useGoBack();
   const [activeTab, setActiveTab] = useState("report");
+  const reduceMotion = useReducedMotion();
   const { data: incidents, isLoading } = useDriverIncidents();
 
   const openIncidents = incidents?.filter((i) =>
@@ -33,7 +34,7 @@
       <motion.header
         className="sticky top-0 z-40 backdrop-blur-xl bg-card/95 border-b border-border/30 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
-        initial={{ opacity: 0, y: -20 }}
+        initial={reduceMotion ? false : { opacity: 0, y: -20 }}
         animate={{ opacity: 1, y: 0 }}
       >
         <div className="flex items-center gap-3">
@@ -41,10 +42,11 @@
             onClick={goBack}
             className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
+
