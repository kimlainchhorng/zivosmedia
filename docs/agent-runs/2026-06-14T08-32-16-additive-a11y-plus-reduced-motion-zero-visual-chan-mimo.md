# MiMo run — 2026-06-14T08:32:16.342Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on DriverAnalytics. File imports framer-motion motion and useTranslation so use t common.back for aria-label. Motion inventory four motion.div all with y movement. ONE stat-cards map initial opacity 0 y 12 animate opacity 1 y 0 transition delay i times 0.05. ONE daily-earnings initial opacity 0 y 16 delay 0.3. ONE peak-hours initial opacity 0 y 16 delay 0.4. ONE performance initial opacity 0 y 16 delay 0.5. Recharts BarChart is functional data viz LEAVE AS IS. Plan extend framer-motion import add useReducedMotion, add const reduceMotion useReducedMotion in body, guard each initial reduceMotion ? false keep animate intact, guard transition delay reduceMotion ? 0 colon original. Icons aria-hidden decorative the Calendar beside Last 7 days the stat.icon the Zap in Peak Hours CardTitle. Back ghost Button gets aria-label its ArrowLeft aria-hidden. HEADING single h1 Analytics no heading change. Skeleton out of scope. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/DriverAnalytics.tsx

---

## Plan

11 display-only edits, zero logic changes. All under the file `src/pages/driver/DriverAnalytics.tsx` (relative to the `zivodriver` project root).

| # | What | Why |
|---|------|-----|
| 1 | Add `useReducedMotion` to the `framer-motion` import | hook needed for motion guards |
| 2 | Add `const reduceMotion = useReducedMotion();` after the `useTranslation` call | single read of the preference |
| 3 | Back `<Button>` → add `aria-label={t("common.back")}` | a11y — icon-only button needs accessible name |
| 4 | `ArrowLeft` → add `aria-hidden="true"` | decorative — label is now on the button |
| 5–8 | Each of the 4 `motion.div` blocks → `initial={reduceMotion ? false : {...}}` | reduced-motion: skip the entrance, snap to final state (animate stays, so final state renders) |
| 9–12 | Same 4 blocks → `transition={{ delay: reduceMotion ? 0 : original }}` | reduced-motion: no stagger/wait delay |
| 13 | `<Calendar>` → add `aria-hidden="true"` | decorative, "Last 7 days" is the visible text |
| 14 | `<stat.icon>` → add `aria-hidden="true"` | decorative in stat card |
| 15 | `<Zap>` in Peak Hours title → add `aria-hidden="true"` | decorative beside "Peak Hours" text |

Recharts `<BarChart>` left untouched — functional data viz.

---

## Proposed diff

**File:** `src/pages/driver/DriverAnalytics.tsx`

```diff
--- a/src/pages/driver/DriverAnalytics.tsx
+++ b/src/pages/driver/DriverAnalytics.tsx
@@ -18,7 +18,7 @@
 import { useTranslation } from "@/hooks/useTranslation";
 import { formatCurrency } from "@/utils/currency";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { BarChart, Bar, XAxis, YAxis
