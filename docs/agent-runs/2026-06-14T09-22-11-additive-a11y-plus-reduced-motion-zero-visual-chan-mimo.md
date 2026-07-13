# MiMo run — 2026-06-14T09:22:11.691Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on Support a driver support hub. File imports framer-motion motion and has NO useTranslation so plain-English labels. Add const reduceMotion useReducedMotion extend the framer-motion import. Motion inventory FOUR surfaces. ONE motion.div the priority-support banner initial opacity 0 y -10 animate no transition SPATIAL GUARD initial to false under reduceMotion. ONE motion.button per topic card in a map initial opacity 0 y 10 animate transition delay index times 0.05 SPATIAL staggered GUARD initial to false and set transition delay reduceMotion ? 0 colon index times 0.05. ONE motion.button the Live Chat with Admin card initial opacity 0 y 10 animate transition delay 0.2 SPATIAL GUARD initial to false and set delay reduceMotion ? 0 colon 0.2. ONE motion.div the Quick Tip initial opacity 0 animate transition delay 0.3 this is PURE OPACITY-ONLY advise LEAVE UNGUARDED. TWO CSS animate-spin Loader2 spinners one inside the topic card while creating one inside the dialog Live Chat button while creating both sit inside text-bearing buttons so they are decorative advise aria-hidden plus append motion-reduce:animate-none NOT role status. Icons aria-hidden decorative. TWO icon-only Buttons with no text the back Button with ArrowLeft add aria-label Back the call Button with Phone add aria-label Call support and aria-hidden each inner icon. The priority-banner lightning emoji span aria-hidden. The category.icon emoji container div aria-hidden. MessageCircle beside Live Chat with Admin text aria-hidden. The green status dot span aria-hidden. Ticket inside View My Tickets Button which has visible text aria-hidden. Bot beside AI Assistant text aria-hidden. Headphones beside Live Chat text aria-hidden. The active-tickets count badge span shows a number after View My Tickets text advise leave. HEADINGS h1 Support then h2 How can we help contiguous no skip advise leave AS-IS the AlertDialogTitle is a separate Radix dialog context. Safe-area header already has pt calc env safe-area-inset-top plus 0.75rem root is normal-flow min-h-screen advise no change. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Support.tsx

---

## Plan

**File:** `src/pages/driver/Support.tsx`

19 exact edit sites — zero logic changes, zero visual change at default motion, reduced-motion users see everything instantly.

| # | What | Type |
|---|------|------|
| 1 | `import { motion }` → add `useReducedMotion` | Import |
| 2 | `const reduceMotion = useReducedMotion()` inside component | Hook |
| 3 | Priority banner `motion.div` — guard `initial` to `false` under `reduceMotion` | SPATIAL |
| 4 | Topic card `motion.button` — guard `initial` + `transition.delay` | SPATIAL staggered |
| 5 | Live Chat `motion.button` — guard `initial` + `transition.delay` | SPATIAL |
| 6 | Quick Tip `motion.div` — pure opacity-only → **LEAVE UNGUARDED** | No-op |
| 7–8 | Two `Loader2` spinners — `aria-hidden="true"` + `motion-reduce:animate-none` | a11y + RM |
| 9–10 | Back Button → `aria-label="Back"`, `ArrowLeft` → `aria-hidden="true"` | a11y |
| 11–12 | Call Button → `aria-label="Call support"`, `Phone` → `aria-hidden="true"` | a11y |
| 13 | Lightning emoji `<span>` → `aria-hidden="true"` | Decorative |
| 14 | Category icon container `<div>` → `aria-hidden="true"` | Decorative |
| 15 | `MessageCircle` icon → `aria-hidden="true"` | Decorative |
| 16 | Green status dot `<span>` → `aria-hidden="true"` | Decorative |
| 17 | `Ticket` icon → `aria-hidden="true"` | Decorative |
| 18
