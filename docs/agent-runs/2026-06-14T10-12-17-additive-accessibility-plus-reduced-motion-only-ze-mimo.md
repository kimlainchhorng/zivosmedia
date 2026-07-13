# MiMo run — 2026-06-14T10:12:17.249Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced motion only, zero visual change. File imports motion from framer-motion, no useReducedMotion, no useTranslation. Plan: extend the framer-motion import to add useReducedMotion plus add const reduceMotion equals useReducedMotion after const navigate. EDITS: one the motion.header entrance initial opacity 0 y minus20 guard initial to false when reduceMotion. two the back motion.button keeps its whileHover whileTap but gets aria-label Back and its ArrowLeft gets aria-hidden true. three the Sparkles beside the h1 gets aria-hidden true. four the Calculator badge is a perpetual loop motion.div animate rotate 0 10 minus10 0 transition repeat Infinity duration 3, guard BOTH animate and transition to undefined when reduceMotion and add aria-hidden true to the wrapper. five the loading Loader2 animate-spin with no adjacent text gets motion-reduce colon animate-none appended keeping animate-spin plus aria-hidden true. six the Hero Earnings card motion.div entrance initial opacity 0 y 20 guard initial to false. seven the radial blob motion.div inside the hero is a perpetual loop animate scale 1 1.2 1 transition repeat Infinity duration 4, guard BOTH to undefined and add aria-hidden true. eight the netEarnings motion.span is a key-change scale pop initial scale 1.1 animate scale 1, guard initial to false. nine the TrendingUp beside the hourly rate gets aria-hidden true. ten the Data Source Note motion.div entrance initial opacity 0 y 20 delay 0.05 guard initial to false and delay to 0, and the Info icon beside the text gets aria-hidden true. eleven the Input Controls motion.div entrance y 20 delay 0.1 guard. twelve each slider motion.div entrance initial opacity 0 x minus20 delay 0.1 plus index times 0.1 guard initial to false and delay to 0, and the slider.icon gets aria-hidden true. thirteen the Breakdown motion.div entrance y 20 delay 0.3 guard, and the Zap icon in the h3 gets aria-hidden true. fourteen the Disclaimer motion.p entrance initial opacity 0 delay 0.4 guard initial to false and delay to 0. HEADING FIX: there is one raw h3 Earnings Breakdown after the h1 which is a skip h1 to h3, promote that h3 to h2 so the outline is contiguous, className controlled so zero visual. SAFE AREA no change since the header already has pt calc env safe-area-inset-top plus 0.75rem and the root is normal flow min-h-screen pb-24 with BottomNav. Confirm this plan is correct and additive.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/tools/EarningsCalculator.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
Let me carefully go through the task and verify each edit against the source file. The task is to add `useReducedMotion` from framer-motion for accessibility, plus some `aria-hidden` attributes and a heading level fix.

Let me trace through each edit:

1. **Import**: Add `useReducedMotion` to the framer-motion import
2. **Add const**: `const reduceMotion = useReducedMotion()` after `const navigate = useNavigate()`
3. **motion.header** entrance: guard `initial` to `false` when reduceMotion
4. **Back motion.button**: add `aria-label="Back"` + ArrowLeft gets `aria-hidden="true"`
5. **Sparkles** beside h1: `aria-hidden="true"`
6. **Calculator badge motion.div**: perpetual loop, guard BOTH animate and transition to undefined when reduceMotion, add `aria-hidden="true"`
7. **Loading Loader2**: `motion-reduce:animate-none` appended to `animate-spin` + `aria-hidden="true"`
8. **Hero Earnings card motion.div**: guard initial to false
9. **Radial blob motion.div**: perpetual loop, guard BOTH to undefined, add `aria-hidden="true"`
10. **netEarnings motion.span**: guard initial to false
11. **TrendingUp** beside hourly rate: `aria-hidden="true"`
12. **Data Source Note motion.div**: guard initial to false and delay to 0, Info icon gets `aria-hidden="true"`
13. **Input Controls motion.div**: guard initial to false and delay to 0
14. **Each slider motion.div**: guard initial to false and delay to 0, slider.icon gets `aria-hidden="true"`
15. **Breakdown motion.div**: guard initial to false and delay to 0, Zap icon gets `aria-hidden="true"`
16. **h3 "Earnings Breakdown"**: promote to h2
17. **Disclaimer motion.p**: guard initial to false and delay to 0

Wait, let me re-read the task more carefully:

"one the motion.header entrance initial opacity 0 y minus20 guard initial to false when reduceMotion"

So: `initial={reduceMotion ? false : { opacity: 0, y: -20 }}`

"two the back motion.button keeps its whileHover whileTap but gets aria-label Back and its ArrowLeft gets aria-hidden true"

OK.

"three the Sparkles beside the h1 gets aria-hidden true"

OK.

"four the Calculator badge is a perpetual loop motion.div animate rotate 0 10 minus10 0 transition repeat Infinity duration 3, guard BOTH animate and transition to undefined when reduceMotion and add aria-hidden true to the wrapper"

So: `animate={reduceMotion ? undefined : { rotate: [0, 10, -10, 0] }}` and `transition={reduceMotion ? undefined : { repeat: Infinity, duration: 3 }}`

"five the loading Loader2 animate-spin with no adjacent text gets motion-reduce colon animate-none appended keeping animate-spin plus aria-hidden true"

So: `className="w-8 h-8 animate-spin text-primary motion-reduce:animate-none"` + `aria-hidden="true"`

"six the Hero Earnings card motion.div entrance initial opacity 0 y 20 guard initial to false"

So: `initial={reduceMotion ? false : { opacity: 0, y: 20 }}`

"seven the radial blob motion.div inside the hero is a perpetual loop animate scale 1 1.2 1 transition repeat Infinity duration 4, guard BOTH to undefined and add aria-hidden true"

"eight the netEarnings motion.span is a key-change scale pop initial scale 1.1 animate scale 1, guard initial to false"

So: `initial={reduceMotion ? false : { scale: 1.1 }}`

"nine the TrendingUp beside the hourly rate gets aria-hidden true"

"ten the Data Source Note motion.div entrance initial opacity 0 y 20 delay 0.05 guard initial to false and delay to 0, and the Info icon beside the text gets aria-hidden true"

So: `initial={reduceMotion ? false : { opacity: 0, y: 20 }}` and `transition={{ delay: reduceMotion ? 0 : 0.05 }}`

"eleven the Input Controls motion.div entrance y 20 delay 0.1 guard"

"twelve each slider motion.div entrance initial opacity 0 x minus20 delay 0.1 plus index times 0.1 guard initial to false and delay to 0, and the slider.icon gets aria-hidden true"

So: `initial={reduceMotion ? false : { opacity: 0, x: -20 }}` and `transition={{ delay: reduceMotion ? 0 : 0.1 + index * 0.1 }}`

"thirteen the Breakdown motion.div entrance y 20 delay 0.3 guard, and the Zap icon in the h3 gets aria-hidden true"

"fourteen the Disclaimer motion.p entrance initial opacity 0 delay 0.4 guard initial to false and delay to 0"

"HEADING FIX: there is one raw h3 Earnings Breakdown after the h1 which is a skip h1 to h3, promote that h3 to h2 so the outline is contiguous, className controlled so zero visual."

OK so the `h3` "Earnings Breakdown" becomes `h2`.

Let me now look at the slider icons. The slider array has `icon: Clock`, `icon: MapPin`, `icon: MapPin`, `icon: TrendingUp`. The task says "the slider.icon gets aria-hidden true". So we need to add `aria-hidden="true"` to `<slider.icon ... />`.

Now let me construct the full diff. Let me think about whether `initial={false}` when `reduceMotion` is the right approach. Yes - framer-motion's `initial={false}` means "don't animate the initial state, just use the animate target immediately." This is the standard pattern for respecting prefers-reduced-motion.

For perpetual loops, when `reduceMotion` is true, we set `animate={undefined}` and `transition={undefined}`. This stops the loop. The element will still render but won't animate.

Wait, for the Calculator badge, if we set `animate={undefined}`, the rotation just stays at whatever the default is (0). That's fine.

For the radial blob, same thing - scale stays at default (1). Good.

Let me also think about whether `reduceMotion` being `null` initially (before the hook returns) causes issues. `useReducedMotion()` returns `boolean | undefined`. When it's `undefined` (before the media query is evaluated), the ternary `reduceMotion ? false : {...}` would evaluate to `{...}` (animate normally), which is fine - it's the safe default.

Actually wait, `useReducedMotion` returns `boolean | undefined` where `undefined` means "not yet determined." So `reduceMotion ? false : {...}` - when `reduceMotion` is `undefined`, it's falsy, so we get the animation. That's the correct default (animate until we know the user prefers reduced motion).

Let me now construct the complete proposed file. I'll make sure every edit is correct.

Actually, the task says to respond with a diff. Let me create a clear diff.

Let me trace through the file carefully:

```tsx
import { motion } from "framer-motion";
```
→
```tsx
import { motion, useReducedMotion } from "framer-motion";
```

```tsx
  const navigate = useNavigate();
```
→
```tsx
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
```

```tsx
      <motion.header
        className="sticky top-0 z-40 backdrop-blur-xl bg-card/95 border-b border-border/30 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
```
→
```tsx
      <motion.header
        className="sticky top-0 z-40 backdrop-blur-xl bg-card/95 border-b border-border/30 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
        initial={reduceMotion ? false : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
```

```tsx
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
```tsx
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

```tsx
              <Sparkles className="w-4 h-4 text-primary" />
```
→
```tsx
              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
```

```tsx
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20"
          >
            <Calculator className="w-5 h-5 text-primary" />
          </motion.div>
```
→
```tsx
          <motion.div
            animate={reduceMotion ? undefined : { rotate: [0, 10, -10, 0] }}
            transition={reduceMotion ? undefined : { repeat: Infinity, duration: 3 }}
            className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20"
            aria-hidden="true"
          >
            <Calculator className="w-5 h-5 text-primary" />
          </motion.div>
```

```tsx
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
```
→
```tsx
            <Loader2 className="w-8 h-8 animate-spin motion-reduce:animate-none text-primary" aria-hidden="true" />
```

Wait, the original order is `animate-spin text-primary`. Should I keep the same order? Let me put `motion-reduce:animate-none` after `animate-spin` to keep them together logically: `animate-spin motion-reduce:animate-none text-primary`. That's fine.

```tsx
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/20 via-card to-primary/5 border border-primary/30"
        >
```
→
```tsx
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/20 via-card to-primary/5 border border-primary/30"
        >
```

```tsx
          <motion.div
            className="absolute -top-12 -right-12 sm:-top-16 sm:-right-16 w-24 h-24 sm:w-32 sm:h-32 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 4 }}
          />
```
→
```tsx
          <motion.div
            className="absolute -top-12 -right-12 sm:-top-16 sm:-right-16 w-24 h-24 sm:w-32 sm:h-32 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)" }}
            animate={reduceMotion ? undefined : { scale: [1, 1.2, 1] }}
            transition={reduceMotion ? undefined : { repeat: Infinity, duration: 4 }}
            aria-hidden="true"
          />
```

```tsx
              <motion.span 
                className="text-4xl sm:text-5xl font-bold"
                key={netEarnings.toFixed(0)}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
              >
```
→
```tsx
              <motion.span 
                className="text-4xl sm:text-5xl font-bold"
                key={netEarnings.toFixed(0)}
                initial={reduceMotion ? false : { scale: 1.1 }}
                animate={{ scale: 1 }}
              >
```

```tsx
                <TrendingUp className="w-3 h-3" />
```
→
```tsx
                <TrendingUp className="w-3 h-3" aria-hidden="true" />
```

```tsx
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-2xl bg-primary/5 border border-primary/20"
          >
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
```
→
```tsx
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.05 }}
            className="p-4 rounded-2xl bg-primary/5 border border-primary/20"
