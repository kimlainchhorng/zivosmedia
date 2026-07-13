# MiMo run — 2026-06-14T08:43:52.632Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on FleetRental. File imports framer-motion motion and NO useTranslation so plain-English labels. ONE component. Motion inventory. ONE motion.header initial opacity 0 y minus 20 GUARD initial only with reduceMotion ternary leave animate intact. ONE back motion.button whileHover whileTap only NO entrance LEAVE UNTOUCHED only add aria-label Back and ArrowLeft aria-hidden. No perpetual loops. Add const reduceMotion useReducedMotion from framer-motion extend the existing import. Icons aria-hidden decorative ArrowLeft Sparkles beside h1 Car in Browse TabsTrigger Filter in My Rentals TabsTrigger Search inside the input Car browse empty-state Car rentals empty-state. Search Input has placeholder only and NO Label htmlFor so ADD aria-label Search vehicles. HEADING the page has h1 Fleet Vehicles then two sibling h3 Active Rentals and Past Rentals a h1 to h3 skip. These two are styled by className and self-contained in this file the cards are separate components. Advise whether a simple safe h3 to h2 promotion is correct here like was done on DriverIncidents or whether to DEFER. Skeleton loaders OUT OF SCOPE. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/FleetRental.tsx

---

## 1. Plan

Seven edits, all display-only / a11y, zero logic changes:

| # | What | Why |
|---|------|-----|
| A | Extend framer-motion import: add `useReducedMotion` | Required for motion guard |
| B | Add `const reduceMotion = useReducedMotion()` at top of component body | Hook call |
| C | `motion.header` `initial` → `initial={reduceMotion ? false : { opacity: 0, y: -20 }}` | Respects prefers-reduced-motion; `animate` untouched |
| D | Back `motion.button`: add `aria-label="Back"`; `<ArrowLeft>` add `aria-hidden="true"` | Icon-only button needs accessible name; icon decorative |
| E | Six other decorative icons: `Sparkles`, `Car`(×2 in triggers), `Filter`, `Search`, `Car`(×2 empty-state) → `aria-hidden="true"` | All purely decorative |
| F | `<Input>`: add `aria-label="Search vehicles"` | Placeholder is not an accessible name |
| G | Both `<h3>` → `<h2>` ("Active Rentals", "Past Rentals") | Fix h1→h3 heading-level skip |

**Heading advisory:** A simple h3→h2 promotion is **correct and safe** here. The page has one `h1` ("Fleet Vehicles") and exactly two section headings ("Active Rentals", "Past Rentals"). They are self-contained in this file, styled only by className (no CSS selectors keyed on `h3`), and the child cards are separate components that don't inject their own heading levels into these sections. This mirrors the DriverIncidents pattern exactly. **Promote — don't defer.**

---

## 2. Diff

**File:** `../zivodriver/src/pages/driver/FleetRental.tsx`

```diff
--- a/src/pages/driver/FleetRental.tsx
+++ b/src/pages/driver/FleetRental.tsx
@@ -2,7 +2,7 @@
  * FleetRental – Driver page to browse fleet vehicles and manage rentals
  */
 import { useState } from "react";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Car, Sparkles, Search, Filter } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { useGoBack } from "@/hooks/useGoBack";
@@ -22,6 +22,7 @@ export default function FleetRental() {
   const navigate = useNavigate();
   const goBack = useGoBack();
   const [activeTab, setActiveTab] = useState("browse");
+  const reduceMotion = useReducedMotion();
   const [search, setSearch] = useState("");
   const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
 
@@ -51,13 +52,14 @@
       <motion.header
         className="sticky top-0 z-40 backdrop-blur-xl bg-card/95 border-b border-border/30 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
-        initial={{ opacity: 0, y: -20 }}
+        initial={reduceMotion ? false : { opacity: 0, y: -20 }}
         animate={{ opacity: 1, y: 0 }}
       >
         <div className="flex items-center gap-3">
           <motion.button
             onClick={goBack}
             className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
+            aria-label="Back"
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </motion.button>
           <div className="flex-1">
             <h1 className="text-lg font-display font-bold flex items-center gap-2">
               Fleet Vehicles
-              <Sparkles className="w-
