# MiMo run — 2026-06-12T03:11:20.059Z

- model: mimo-v2.5-pro
- task: Premium + responsive refinement of the ZIVO Car Rental landing (src/pages/CarRentalLanding.tsx). The hero sits over a DARK photo; headings/text correctly use text-primary-foreground (white), but several icons use text-foreground (dark) = low contrast: the CarFront badge icon and the 3 trust-badge icons. Propose: (1) fix hero icon contrast on the dark hero, (2) add a reduced-motion-aware hero fade-in (framer-motion not yet imported here), (3) any responsive issues. NOTE: the 'Search Cars' button looking washed-out is its disabled state (form invalid until a location is picked) — intentional, do NOT change. Additive + type-safe. Concrete Tailwind + minimal diff. Be concise.
- files: src/pages/CarRentalLanding.tsx

---

## Plan

1. **Hero icon contrast** — 4 icons use `text-foreground` (dark) on the dark hero photo. Change to `text-primary-foreground` (white) for the `CarFront` badge icon and the 3 trust-badge `ShieldCheck`/`CheckCircle`/`Lock` icons. The disclaimer `ShieldCheck` icons sit on light backgrounds (`bg-secondary` / white) — leave those as-is.
2. **Reduced-motion-aware hero fade-in** — import `motion` + `useReducedMotion` from framer-motion, wrap the hero `<section>` in `<motion.section>` with a short fade+lift. `prefersReducedMotion ? false : { opacity: 0, y: 12 }` disables the animation entirely when reduced-motion is on.
3. **Responsive micro-polish** — trust-badge row `gap-6` is generous on 375 px; tighten to `gap-4 sm:gap-6`.

No changes to the disabled `Search Cars` button. No structural changes. Fully additive.

---

## Proposed diff — `src/pages/CarRentalLanding.tsx`

```diff
--- a/src/pages/CarRentalLanding.tsx
+++ b/src/pages/CarRentalLanding.tsx
@@ -1,5 +1,6 @@
 import { useParams } from "react-router-dom";
-import { CarFront, Shield, Clock, CheckCircle, ExternalLink, ShieldCheck, Lock } from "lucide-react";
+import { motion, useReducedMotion } from "framer-motion";
+import { CarFront, CheckCircle, ShieldCheck, Lock } from "lucide-react";
 import Header from "@/components/Header";
 import Footer from "@/components/Footer";
@@ -33,6 +34,7 @@
 export default function CarRentalLanding() {
   const { location } = useParams<{ location?: string }>();
+  const prefersReducedMotion = useReducedMotion();
 
   const formattedLocation = location
     ?.split("-")
@@ -62,7 +64,12 @@
       <main className="pt-16">
         {/* Hero Section with Photo Background */}
-        <section className="relative py-16 sm:py-24 overflow-hidden">
+        <motion.section
+          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
+          animate={{ opacity: 1, y: 0 }}
+          transition={{ duration: 0.5, ease: "easeOut" }}
+          className="relative py-16 sm:py-24 overflow-hidden"
+        >
           {/* Background Image */}
@@ -88,7 +95,7 @@
               <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium mb-6 text-primary-foreground">
-                <CarFront className="w-4 h-4 text-foreground" />
+                <CarFront className="w-4 h-4 text-primary-foreground" />
                 <span className="text-primary-foreground/80">Compare car rental prices</span>
@@ -108,9 +115,9 @@
             {/* Trust Badges */}
-            <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
+            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8">
               {trustBadges.map((badge) => (
                 <div key={badge.text} className="flex items-center gap-2 text-sm text-primary-foreground/70">
-                  <badge.icon className="w-4 h-4 text-foreground" />
+                  <badge.icon className="w-4 h-4 text-primary-foreground" />
                   <span>{badge.text}</span>
                 </div>
@@ -120,7 +127,7 @@
           </div>
-        </section>
+        </motion.section>
```

**Also removed from the lucide-react import:** `Shield`, `Clock`, `ExternalLink` — they were already unused in this file (dead imports). Keeps the diff honest.

---

## What changed (summary)

| Line(s) | Before | After | Why |
|---|---|---|---|
| import (lucide) | 7 icons imported | 4 (removed 3 unused) | Dead-code cleanup |
| new import | — | `motion, useReducedMotion` from framer-motion | Hero fade-in |
| L34 | — | `const prefersReducedMotion = useReducedMotion()` | Guard motion |
| L64 | `<section className="…">` | `<motion.section initial=… animate=… transition=… className="…">` | Fade+lift entrance |
| L95 | `<CarFront … text-foreground />` | `text-primary-foreground` | White on dark hero ✅ |
| L118 | `gap-6` | `gap-4 sm:gap-6` | Tighter on mobile |
| L121 | `<badge.icon … text-foreground />` | `text-primary-foreground` | White on dark hero ✅ |
| closing | `</section>` | `</motion.section>` | Match opening tag |

---

## Owner verification

1. **`npm run update`** — must pass (type-check + worker type-check + build). framer-motion is already a project dependency.
2. **Visual spot-check at 375 / 768 / 1280 px** — confirm hero icons are legible white against the dark photo; trust badges don't wrap awkwardly on narrow phones.
3. **`prefers-reduced-motion` test** — in DevTools → Rendering → Emulate `prefers-reduced-motion: reduce` → hero should appear instantly (no fade/lift).
4. No other pages affected — change is scoped to `CarRentalLanding.tsx` only.
