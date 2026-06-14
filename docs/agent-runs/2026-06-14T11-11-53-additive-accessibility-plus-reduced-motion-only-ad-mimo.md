# MiMo run — 2026-06-14T11:11:53.047Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only. Add useReducedMotion from framer-motion as var reduceMotion. For framer-motion entrance elements with spatial initial props opacity y or x guard the whole initial object with reduceMotion ternary to false. For stagger delays set transition delay to 0 when reduceMotion using delay reduceMotion ? 0 : original. Append motion-reduce colon animate-none to the loading skeleton CSS animate-pulse divs and add aria-hidden true to them. Add aria-hidden true to decorative icons including the status icons returned by getStatusIcon. Add aria-label Back to the icon-only back button. There is an icon-only Copy button next to the referral code input that has only a Copy icon and no visible text so add aria-label Copy referral code to it and aria-hidden its icon. Do not add aria-label to any control that has visible text such as the Copy Link button or the Share button or the CardTitles, only aria-hidden their inner icons. Do not promote any CardTitle shadcn component heading. The raw headings are h1 then h2 already contiguous so do not change any heading tags. Do not change logic or layout.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/community/ReferralProgram.tsx

---

## (1) Plan

**File:** `../zivodriver/src/pages/community/ReferralProgram.tsx`

Additive-only accessibility + reduced-motion pass. No logic, no layout, no heading changes.

| # | What | Where |
|---|------|-------|
| 1 | Import `useReducedMotion`; add `const reduceMotion = useReducedMotion()` | top of component |
| 2 | Guard all 7 `motion.div` `initial` props: `reduceMotion ? false : { opacity: 0, y/x: … }` | hero, 3 stats, 3× list items |
| 3 | Guard all 5 stagger `transition.delay` props: `reduceMotion ? 0 : original` | 3 stats (0.1/0.2/0.3), how-it-works loop, referral-list loop |
| 4 | Loading skeleton divs: append `motion-reduce:animate-none`, add `aria-hidden="true"` | 3 skeleton divs |
| 5 | `aria-hidden="true"` on all decorative icons: ArrowLeft, Gift×2, DollarSign, Users×2 (stat + CardTitle), Clock×2 (stat + getStatusIcon), CheckCircle, Copy×2, Share2 | throughout |
| 6 | `aria-label="Back"` on icon-only back button | header button |
| 7 | `aria-label="Copy referral code"` + `aria-hidden` on Copy icon on icon-only copy button | referral code row |
| 8 | No aria-label on visible-text buttons (Copy Link, Share) — only `aria-hidden` on their inner icons | as-is |
| 9 | No CardTitle promotion, no heading tag changes | as-is |

---

## (2) Proposed change

**File:** `../zivodriver/src/pages/community/ReferralProgram.tsx`

**Import line — before:**
```ts
import { motion } from "framer-motion";
```
**After:**
```ts
import { motion, useReducedMotion } from "framer-motion";
```

**Component body — add after existing hooks (after `const { toast } = useToast();`):**
```ts
  const reduceMotion = useReducedMotion();
```

**Loading skeleton — before:**
```tsx
            <div key={i} className="h-32 bg-muted/30 rounded-xl animate-pulse" />
```
**After:**
```tsx
            <div key={i} className="h-32 bg-muted/30 rounded-xl animate-pulse motion-reduce:animate-none" aria-hidden="true" />
```

**Back button — before:**
```tsx
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
```
**After:**
```tsx
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
```

**Hero motion.div — before:**
```tsx
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
```
**After:**
```tsx
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
```

**Hero Gift icon — before:**
```tsx
              <Gift className="w-12 h-12 mx-auto mb-3" />
```
**After:**
```tsx
              <Gift className="w-12 h-12 mx-auto mb-3" aria-hidden="
