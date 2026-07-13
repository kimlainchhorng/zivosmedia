# MiMo run — 2026-06-14T07:39:44.395Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change at default motion. File HAS framer-motion motion only no AnimatePresence and NO useTranslation so plain Back. Two motion.div: A the OrderCard initial opacity 0 y 10 animate whileTap scale 0.98 - guard initial reduceMotion ? false keep animate keep whileTap NEVER guard whileTap. B the header motion.div initial opacity 0 y minus 20 animate - guard initial reduceMotion ? false keep animate. useReducedMotion added in BOTH OrderCard and DriverOrders. NO animate-spin or animate-pulse anywhere the loaders are shadcn Skeleton out of scope so NO motion-reduce work. Icon-only ghost back Button gets aria-label Back ArrowLeft aria-hidden true. aria-hidden true on decorative icons all beside visible text or ornamental header Package next to My Orders the OrderCard type Package AlertTriangle in the Dispute badge DollarSign beside payout ChevronRight the two stat-card icons Clock and CheckCircle the two TabsTrigger icons Clock and CheckCircle WifiOff error state RefreshCw inside the Retry button which has visible text so no aria-label just aria-hidden its icon the empty-state AlertCircle and CheckCircle. HEADING HIERARCHY question single h1 My Orders then jumps to h3 - the error-state Couldn't load orders is h3 and the empty-state No active orders or No completed orders is h3 with NO h2 between. These two h3 are same-file error and empty states mutually exclusive. NOTE the page renders child components UpcomingScheduledSection and BundledOrdersCard above which may have their own headings. Recommend promoting both same-file h3 to h2 className unchanged zero visual change for contiguous h1 then h2 outline. Confirm or correct. List exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Orders.tsx

---

## Plan

| # | Edit | Category |
|---|------|----------|
| 1 | Import `useReducedMotion` from `framer-motion` | Import |
| 2 | OrderCard: call `useReducedMotion`, guard `initial` on its `motion.div` | Reduced-motion |
| 3 | DriverOrders: call `useReducedMotion`, guard `initial` on header `motion.div` | Reduced-motion |
| 4 | Back Button: `aria-label="Back"`, ArrowLeft `aria-hidden="true"` | a11y |
| 5 | 13 decorative icons get `aria-hidden="true"` | a11y |
| 6 | Two `<h3>` → `<h2>` (error + empty states) — contiguous heading outline | Heading hierarchy |

No logic changes. No animate-spin/animate-pulse. Skeletons untouched.

---

## Proposed diff

**File:** `src/pages/driver/Orders.tsx`

### 1 — Import

```diff
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
```

### 2 — OrderCard: reduced-motion guard + decorative icons

```diff
 const OrderCard = ({ order, onClick,
