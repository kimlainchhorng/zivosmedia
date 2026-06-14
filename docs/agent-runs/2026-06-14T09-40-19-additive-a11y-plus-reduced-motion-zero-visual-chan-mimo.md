# MiMo run — 2026-06-14T09:40:19.868Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on WeeklyBreakdown a Lyft-style weekly earnings breakdown screen. File imports framer-motion motion and AnimatePresence and has NO useTranslation so plain-English labels. Add const reduceMotion useReducedMotion extend the framer-motion import. Motion inventory. ONE the two earnings-summary expandable detail panels inside AnimatePresence each a motion.div initial height 0 opacity 0 animate height auto opacity 1 exit height 0 opacity 0 these are user-tap accordion reveals advise whether to guard initial to false under reduceMotion or leave. TWO the commitment bottom-sheet has an outer backdrop motion.div initial opacity 0 animate opacity 1 exit opacity 0 PURE OPACITY leave unguarded and an inner sheet motion.div initial y 100 percent animate y 0 exit y 100 percent spring transition SPATIAL slide-up guard initial to reduceMotion false. Icons. The back button is an icon-only plain button with ArrowLeft add aria-label Back and aria-hidden the ArrowLeft. The top-right Calendar button is icon-only with no text add aria-label like Select week and aria-hidden the Calendar. The per-booked-hr TooltipTrigger wraps only an Info icon icon-only add aria-label like Rate info and aria-hidden the Info. Decorative aria-hidden the ChevronDown and Info inside each summary-row button which has visible label text the ChevronDown beside Total earnings text the Shield in the commitment card which has text the ChevronRight in the Tap to track button which has text the Shield in the guarantee badge which has text the ChevronRight in each quick-link button which has text. The bottom-sheet close button contains a literal multiply-sign character add aria-label Close. HEADINGS h1 Weekly breakdown then h2 Earnings summary then h2 ZIVO earnings commitment contiguous leave AS-IS. SAFE-AREA root is min-h-screen pb-24 normal flow header is sticky and already has pt calc env safe-area-inset-top plus 1rem no change. The commitment bottom-sheet inner panel is absolute bottom-0 left-0 right-0 with content pb-8 advise whether it needs pb calc env safe-area-inset-bottom since it is a flush-bottom overlay. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/WeeklyBreakdown.tsx

---

## Plan

**Motion:**
- Add `useReducedMotion` import + `const reduceMotion = useReducedMotion()`.
- Guard `initial` on both accordion panels and the bottom-sheet slide-up → `reduceMotion ? false : { ... }`. Reasoning: under reduced-motion the content should appear/disappear instantly (no height/slide ramp). `initial={false}` tells framer-motion to start at the `animate` values. `exit` stays unguarded (framer-motion context already shortens exits for reduced-motion users). Backdrop opacity stays unguarded (pure fade, no spatial movement). Sheet `transition` spring stays unguarded (framer-motion context handles it).

**Icon a11y — add `aria-label` + `aria-hidden` on icon-only buttons:**
| Control | Icon | aria-label on button | aria-hidden on icon |
|---|---|---|---|
| Back button | `ArrowLeft` | `"Back"` | yes |
| Calendar button | `Calendar` | `"Select week"` | yes |
| Per-booked-hr tooltip trigger | `Info` | `"Rate info"` | yes |
| Bottom-sheet close | `✕` | `"Close"` | n/a (text char) |

**Decorative `aria-hidden` only (parent button has visible text):**
- `ChevronDown` + `Info` in summary-row buttons
- `Shield` in commitment card
- `ChevronRight` in "Tap to track" button
- `Shield` in guarantee badge
- `ChevronRight` in each quick-link button (×4, same string → `replace_all`)

**Leave as-is:** headings (h1/h2 correct), safe-area (`pb-8` on sheet body is sufficient — content sits inside `max-h-[70vh] overflow-auto`, not flush viewport bottom), all existing logic/JSX structure.

---

## Proposed diff — `../zivodriver/src/pages/driver/WeeklyBreakdown.tsx`

### 1. Import — add `useReducedMotion`

```diff
-import { useState } from "react";
-import { motion, AnimatePresence } from "framer-motion";
+import { useState } from "react";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
```

### 2. Hook — add `reduceMotion` after `expandedRows` state

```diff
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
+ const reduceMotion = useReducedMotion();
```

### 3. Back button — aria-label + aria-hidden ArrowLeft

```diff
            <button
              onClick={goBack}
-             className="p-1.5 rounded-lg hover:bg-muted transition-colors"
+             className="p-1.5 rounded-lg hover:bg-muted transition-colors"
+             aria-label="Back"
            >
-             <ArrowLeft className="w-5 h-5" />
+             <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
```

### 4. Calendar button — aria-label + aria-hidden Calendar

```diff
-         <button className="p-2 rounded-lg hover:bg-muted transition-colors">
-           <Calendar className="w-5 h-5 text-muted-foreground" />
+         <button
+           className="p-2 rounded-lg hover:bg-muted transition-colors"
+           aria-label="Select week"
+         >
+           <Calendar className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          </button>
```

### 5. Per-booked-hr TooltipTrigger — aria-label + aria-hidden Info

```diff
              <TooltipTrigger>
-               <Info className="w-5 h-5 text-muted-foreground" />
+               <Info className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
              </TooltipContent>
```

```diff
-             <TooltipTrigger>
+             <TooltipTrigger aria-label="Rate info">
```

### 6. Summary-row buttons — decorative ChevronDown + Info

```diff
                    {row.expandable && (
                      <ChevronDown
-                       className={`w-4 h-4 text-muted-foreground transition-transform ${
+                       className={`w-4 h-4 text-muted-foreground transition-transform ${
                          expandedRows[row.key] ? "rotate-180" : ""
                        }`}
+                       aria-hidden="true"
                      />
                    )}
                    {row.info && (
-                     <Info className="w-4 h-4 text-muted-foreground" />
+                     <Info className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    )}
```

### 7. Accordion panel 1 (external fees) — guard initial

```diff
                    <motion.div
-                     initial={{ height: 0, opacity: 0 }}
+                     initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
```

### 8. Accordion panel 2 (other earnings) — guard initial

```diff
                    <motion.div
-                     initial={{ height: 0, opacity: 0 }}
+                     initial={reduceMotion ? false : { height: "auto", opacity: 1 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
```

### 9. Total Earnings row — decorative ChevronDown

```diff
              <span className="text-lg font-bold text-primary">
                {fmt(totalEarnings)}
              </span>
-             <ChevronDown className="w-4 h-4 text-primary" />
+             <ChevronDown className="w-4 h-4 text-primary" aria-hidden="true" />
            </div>
```

### 10. Commitment card — decorative Shield

```diff
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
-                   <Shield className="w-5 h-5 text-primary" />
+                   <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
```

### 11. "Tap to track" button — decorative ChevronRight

```diff
                    <button className="flex items-center gap-1 text-xs font-medium text-primary mt-2">
                      Tap to track your earnings
-                     <ChevronRight className="w-3.5 h-3.5" />
+                     <ChevronRight className="
