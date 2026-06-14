# MiMo run — 2026-06-14T10:06:17.833Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced motion only, zero visual change. File imports motion from framer-motion, no useReducedMotion, no useTranslation. Plan: extend framer-motion import to add useReducedMotion plus add const reduceMotion equals useReducedMotion after const navigate. EDITS: (1) the loading-state Loader2 (animate-spin, beside text Loading wellness data) gets motion-reduce colon animate-none plus aria-hidden true. (2) the motion.header entrance initial opacity 0 y minus20 guard initial to false. (3) back motion.button keeps its whileHover whileTap but gets aria-label Back, its ArrowLeft gets aria-hidden true. (4) the Sparkles beside the h1 gets aria-hidden true. (5) the Heart badge is a perpetual loop animate scale 1 1.1 1 transition repeat Infinity duration 1.5 on a motion.div wrapper, guard BOTH animate and transition to undefined when reduceMotion and add aria-hidden true to the Heart. (6) the Wellness Score hero motion.div entrance initial opacity 0 y 20 guard initial to false. (7) the radial blob motion.div inside the hero is a perpetual loop animate scale 1 1.2 1 transition repeat Infinity duration 4, guard BOTH to undefined and add aria-hidden true. (8) the decorative score-ring svg gets aria-hidden true since the score is shown as adjacent text. (9) the two Current-Status grid motion.divs entrances initial opacity 0 y 20 with delay 0.1 and 0.15 guard initial to false and delay to 0, and their Timer and Coffee icons plus the AlertTriangle beside Break recommended get aria-hidden true. (10) the Take a Break Now motion.div entrance initial opacity 0 scale 0.95 with delay 0.2 guard initial to false and delay to 0, keep its whileHover whileTap, and the Coffee inside the button beside the text gets aria-hidden true. (11) the Wellness Checklist motion.div entrance y 20 delay 0.25 guard, the checklist items are motion.buttons that keep whileTap, the Check icon inside gets aria-hidden true. (12) the Settings motion.div entrance y 20 delay 0.3 guard, the Coffee AlertTriangle Zap icons get aria-hidden true. (13) the Wellness Tips section motion.div entrance y 20 delay 0.35 guard, each tip motion.div entrance y 20 delay 0.35 plus i times 0.05 guard initial to false and delay to 0, the tip.icon gets aria-hidden true. HEADING FIX: there are three raw h3 section headings Daily Wellness Checklist, Wellness Alerts, Wellness Tips after the h1 which is a skip h1 to h3, promote those three h3 to h2 and promote the tip.title h4 to h3 so the outline is contiguous, all className controlled so zero visual. SAFE AREA no change since the header already has pt calc env safe-area-inset-top plus 0.75rem and the root is normal flow min-h-screen pb-24 with BottomNav. Confirm this plan is correct and additive.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/tools/DriverWellness.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
The user wants me to review and confirm a detailed accessibility + reduced-motion plan for `DriverWellness.tsx`, then produce a diff. Let me carefully parse the plan against the source code and verify correctness.

Let me go through each edit:

1. **Loader2** (loading state) - gets `motion-reduce:animate-none` + `aria-hidden="true"` ✓
2. **motion.header** entrance - guard `initial` to `false` when reduceMotion ✓
3. **back motion.button** - keep whileHover/whileTap, add `aria-label="Back"`, ArrowLeft gets `aria-hidden="true"` ✓
4. **Sparkles** beside h1 - `aria-hidden="true"` ✓
5. **Heart badge** - perpetual loop, guard both animate/transition to undefined when reduceMotion, add `aria-hidden="true"` to Heart ✓
6. **Wellness Score hero motion.div** - entrance, guard initial to false ✓
7. **Radial blob motion.div** - perpetual loop, guard both to undefined, add `aria-hidden="true"` ✓
8. **Score-ring svg** - `aria-hidden="true"` ✓
9. **Two Current-Status grid motion.divs** - entrances with delays 0.1/0.15, guard initial to false and delay to 0; Timer, Coffee, AlertTriangle get `aria-hidden="true"` ✓
10. **Take a Break Now motion.div** - entrance with delay 0.2, guard initial/delay, keep whileHover/whileTap, Coffee inside button gets `aria-hidden="true"` ✓
11. **Wellness Checklist motion.div** - entrance delay 0.25, guard; checklist items are motion.buttons keep whileTap; Check icon gets `aria-hidden="true"` ✓
12. **Settings motion.div** - entrance delay 0.3, guard; Coffee, AlertTriangle, Zap icons get `aria-hidden="true"` ✓
13. **Wellness Tips section** - entrance delay 0.35, guard; each tip motion.div entrance with delay 0.35 + i*0.05, guard; tip.icon gets `aria-hidden="true"` ✓

**Heading fix**: Three `h3` sections ("Daily Wellness Checklist", "Wellness Alerts", "Wellness Tips") promoted to `h2`, and `tip.title` `h4` promoted to `h3`. ✓

**Import change**: extend `motion` import to add `useReducedMotion`, add `const reduceMotion = useReducedMotion()` after `const navigate`. ✓

Let me verify there are no issues:

- The plan guards initial to false (not true) — this means when reduceMotion is true, `initial` becomes `false` which tells framer-motion to NOT play the entrance animation (element starts in its animate state). Correct.
- For delays, setting to 0 when reduceMotion is true — correct (no delay but still animate to final state, just instantly).
- Perpetual loops: animate and transition set to undefined — correct (stops the looping animation).
- whileHover/whileTap are KEPT (not guarded) — the task says "keep whileHover whileTap". This is correct for accessibility — hover/tap are user-initiated, not autoplay.

Wait, let me re-read: "(3) back motion.button keeps its whileHover whileTap" and "(10) keep its whileHover whileTap" and "(11) checklist items are motion.buttons that keep whileTap" — yes, these are all kept. The reduced motion hook is about autoplay/looping, not user interactions. This is correct.

Let me also check: does the file currently import `useReducedMotion`? No — the import is just `{ motion }` from "framer-motion". So we need to extend to `{ motion, useReducedMotion }`.

Now let me produce the diff. This is a large file with many edits. Let me be precise.

Actually, I also need to think about whether `whileHover` and `whileTap` should be guarded by reduced motion. The standard approach is that user-triggered micro-interactions (hover/tap) are fine to keep even with reduced motion preferences — they're brief, predictable, and user-initiated. The `prefers-reduced-motion` spec is about auto-playing/looping animations. So keeping them is correct per best practices and the rulebook's approach.

Let me write the full diff now.

For the heading fix:
- L with "Daily Wellness Checklist": `<h3` → `<h2` (and closing `</h3>` → `</h2>`)
- L with "Wellness Alerts": `<h3` → `<h2` (and closing `</h3>` → `</h2>`)
- L with "Wellness Tips": `<h3` → `<h2` (and closing `</h3>` → `</h2>`)
- L with `tip.title`: `<h4` → `<h3` (and closing `</h4>` → `</h3>`)

All className unchanged — zero visual impact.

Let me produce a clean, comprehensive diff. Since this is many scattered edits across the file, I'll write it as a unified diff.

Let me carefully go through the source and mark every line that changes.

Actually, for the advisor output, I should present:
1. Short plan (confirmation)
2. The diff
3. Owner verification notes

Let me trace through the file line by line and produce the edits.

Lines that change:

**Line 2 (import):**
```
import { motion } from "framer-motion";
```
→
```
import { motion, useReducedMotion } from "framer-motion";
```

**After line 8 (const navigate):**
Add: `const reduceMotion = useReducedMotion();`

**Loading state Loader2 (line ~30):**
```
<Loader2 className="w-8 h-8 animate-spin text-primary" />
```
→
```
<Loader2 className="w-8 h-8 animate-spin motion-reduce:animate-none text-primary" aria-hidden="true" />
```

**motion.header (line ~38):**
```
initial={{ opacity: 0, y: -20 }}
animate={{ opacity: 1, y: 0 }}
```
→
```
initial={reduceMotion ? false : { opacity: 0, y: -20 }}
animate={{ opacity: 1, y: 0 }}
```

**Back motion.button (line ~42):**
```
className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
```
→
```
className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
aria-label="Back"
```
Wait, but it's a motion.button. I need to add `aria-label="Back"` as a prop. Let me check the JSX structure:

```jsx
<motion.button
  onClick={() => navigate(-1)}
  className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  <ArrowLeft className="w-5 h-5" />
</motion.button>
```

→

```jsx
<motion.button
  onClick={() => navigate(-1)}
  className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  aria-label="Back"
>
  <ArrowLeft className="w-5 h-5" aria-hidden="true" />
</motion.button>
```

**Sparkles (line ~53):**
```
<Sparkles className="w-4 h-4 text-destructive" />
```
→
```
<Sparkles className="w-4 h-4 text-destructive" aria-hidden="true" />
```

**Heart badge wrapper (line ~56):**
```jsx
<motion.div
  animate={{ scale: [1, 1.1, 1] }}
  transition={{ repeat: Infinity, duration: 1.5 }}
  className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20"
>
  <Heart className="w-5 h-5 text-destructive" />
</motion.div>
```
→
```jsx
<motion.div
  animate={reduceMotion ? undefined : { scale: [1, 1.1, 1] }}
  transition={reduceMotion ? undefined : { repeat: Infinity, duration: 1.5 }}
  className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20"
>
  <Heart className="w-5 h-5 text-destructive" aria-hidden="true" />
</motion.div>
```

**Wellness Score hero motion.div (line ~63):**
```
initial={{ opacity: 0, y: 20 }}
```
→
```
initial={reduceMotion ? false : { opacity: 0, y: 20 }}
```

**Radial blob motion.div (line ~70):**
```jsx
<motion.div
  className="absolute -top-16 -right-16 w-32 h-32 rounded-full"
  style={{ background: "radial-gradient(circle, hsl(var(--destructive) / 0.2) 0%, transparent 70%)" }}
  animate={{ scale: [1, 1.2, 1] }}
  transition={{ repeat: Infinity, duration: 4 }}
/>
```
→
```jsx
<motion.div
  className="absolute -top-16 -right-16 w-32 h-32 rounded-full"
  style={{ background: "radial-gradient(circle, hsl(var(--destructive) / 0.2) 0%, transparent 70%)" }}
  animate={reduceMotion ? undefined : { scale: [1, 1.2, 1] }}
  transition={reduceMotion ? undefined : { repeat: Infinity, duration: 4 }}
  aria-hidden="true"
/>
```

**Score-ring svg (line ~76):**
```
<svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
```
→
```
<svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
```

**First Current-Status motion.div (Driving Time):**
```
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.1 }}
```
→
```
initial={reduceMotion ? false : { opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: reduceMotion ? 0 : 0.1 }}
```

Timer icon: `<Timer className="w-4 h-4 text-primary-foreground" />` → `<Timer className="w-4 h-4 text-primary-foreground" aria-hidden="true" />`

**Second Current-Status motion.div (Last Break):**
```
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.15 }}
```
→
```
initial={reduceMotion ? false : { opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: reduceMotion ? 0 : 0.15 }}
```

Coffee icon inside the card: `<Coffee className="w-4 h-4 text-primary-foreground" />` → `<Coffee className="w-4 h-4 text-primary-foreground" aria-hidden="true" />`

Wait, there are multiple Coffee icons. Let me be careful about which ones. The task says for (9): "their Timer and Coffee icons plus the AlertTriangle beside Break recommended get aria-hidden true." So the Timer in the first card and the Coffee in the second card, plus the AlertTriangle.

AlertTriangle: `<AlertTriangle className="w-3 h-3" />` → `<AlertTriangle className="w-3 h-3" aria-hidden="true" />`

**Take a Break Now motion.div (line ~124):**
```
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ delay: 0.2 }}
```
→
```
initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ delay: reduceMotion ? 0 : 0.2 }}
```

Coffee inside the button: `<Coffee className="w-5 h-5 mr-2" />` → `<Coffee className="w-5 h-5 mr-2" aria-hidden="true" />`

**Wellness Checklist motion.div:**
```
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.25 }}
```
→
```
initial={reduceMotion ? false : { opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: reduceMotion ? 0 : 0.25 }}
```

h3 → h2: `<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Daily Wellness Checklist</h3>` → `<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Daily Wellness Checklist</h2>`

Check icon: `{item.checked && <Check className="w-4 h-4 text-primary-foreground" />}` → `{item.checked && <Check className="w-4 h-4 text-primary-foreground" aria-hidden="true" />}`

**Settings motion.div:**
```
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.3 }}
```
→
```
initial={reduceMotion ? false : { opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: reduceMotion ? 0 : 0.3 }}
```

h3 → h2: `<h3 className="text-sm font-semibold text-muted-foreground
