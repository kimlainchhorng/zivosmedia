# MiMo run — 2026-06-14T06:54:53.461Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change at default motion. File HAS framer-motion and HAS useTranslation t with common.back. Add useReducedMotion from framer-motion. Motion inventory: FloatingOrb component infinite loop animate y scale opacity transition repeat Infinity - gate BOTH with reduceMotion to undefined, call useReducedMotion inside FloatingOrb. Header motion.div entrance initial y minus 20 opacity 0 no transition - guard initial whole-object false. Summary card entrance initial opacity 0 y 20 rotateX 8 spring transition - guard initial false wrap transition reduceMotion undefined. Holographic sheen infinite loop backgroundPosition repeat Infinity - gate both. Filter chips container entrance initial opacity 0 x minus 20 no transition - guard initial false. filters.map motion.button whileTap plus entrance initial opacity 0 y 10 transition delay - guard initial and transition keep whileTap. groups.map entrance initial opacity 0 y 20 transition delay - guard. events.map entrance initial opacity 0 x minus 15 transition delay - guard. Leave whileTap unguarded. back motion.button icon-only aria-label t common.back, refresh motion.button icon-only aria-label Refresh fallback, Live tab has text so just aria-hidden Radio. aria-hidden true on ArrowLeft RefreshCw Radio. RefreshCw uses animate-spin add motion-reduce:animate-none. Confirm heading h1 only. List exact edits only.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Activity.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
Let me analyze the file and plan the exact edits needed.

**File:** `src/pages/driver/Activity.tsx` (actually `../zivodriver/src/pages/driver/Activity.tsx` based on the context file path, but following the ZIVO monorepo convention it's likely `src/pages/driver/Activity.tsx`)

Wait, the file header says `../zivodriver/src/pages/driver/Activity.tsx` — this is in the zivodriver project. Let me check the path more carefully. The task says "FILES FOR CONTEXT" with `../zivodriver/src/pages/driver/Activity.tsx`. But the rulebook says the monorepo is the ZIVO monorepo. The path might actually be `src/pages/driver/Activity.tsx` within the main repo since the AGENTS.md mentions zivodriver.com backend. Let me just use the path as given for context and note it correctly.

Actually, looking at the project structure, the zivodriver source is probably at `src/pages/driver/Activity.tsx` in the main ZIVO monorepo (since the monorepo serves multiple domains). The `../zivodriver/` prefix in the context file path might just be relative path from where the task was generated. I'll reference it as `src/pages/driver/Activity.tsx`.

Let me now inventory every motion element and plan the edits:

**Motion inventory:**

1. **FloatingOrb** (component) — `animate={{ y, scale, opacity }}` + `transition={{ repeat: Infinity, ... }}` — gate both with `reduceMotion` to `undefined`, call `useReducedMotion` inside FloatingOrb.

2. **Header `motion.div`** — `initial={{ y: -20, opacity: 0 }}` + `animate={{ y: 0, opacity: 1 }}` — guard `initial` whole-object to `false` when reduced.

3. **Summary card `motion.div`** — `initial={{ opacity: 0, y: 20, rotateX: 8 }}` + `animate` + `transition={{ type: "spring", ... }}` — guard `initial` to `false`, wrap `transition` to `reduceMotion ? undefined : ...`.

4. **Holographic sheen `motion.div`** — `animate={{ backgroundPosition }}` + `transition={{ repeat: Infinity, ... }}` — gate both with `reduceMotion` to `undefined`.

5. **Filter chips container `motion.div`** — `initial={{ opacity: 0, x: -20 }}` — guard `initial` to `false`.

6. **Live tab `motion.button`** — `whileTap` — leave unguarded. No entrance animation on this one (it doesn't have initial/animate).

7. **filters.map `motion.button`** — `whileTap` + `initial={{ opacity: 0, y: 10 }}` + `animate` + `transition={{ delay }}` — guard `initial` and `transition`, keep `whileTap`.

8. **groups.map `motion.div`** — `initial={{ opacity: 0, y: 20 }}` + `animate` + `transition={{ delay }}` — guard.

9. **events.map `motion.div`** — `initial={{ opacity: 0, x: -15 }}` + `animate` + `transition={{ delay }}` — guard.

**Leave whileTap unguarded on all buttons.**

**A11y edits:**

1. **Back `motion.button`** — icon-only (`ArrowLeft`), add `aria-label={t("common.back")}`.
2. **Refresh `motion.button`** — icon-only (`RefreshCw`), add `aria-label="Refresh"` (no translation key mentioned, fallback "Refresh").
3. **Live tab `motion.button`** — has text (`t("activity.live")`), just `aria-hidden` on the `Radio` icon.
4. **ArrowLeft** — add `aria-hidden="true"`.
5. **RefreshCw** — add `aria-hidden="true"` + `motion-reduce:animate-none` class.
6. **Radio** — add `aria-hidden="true"`.

**Confirm heading:** h1 is the only heading. ✓ (the `<h1>` is already there)

Let me now write the exact edits.

---

### Edit 1: FloatingOrb — add useReducedMotion, gate animate + transition

Before:
```tsx
const FloatingOrb = ({ delay, x, y, size, color }: { delay: number; x: string; y: string; size: number; color: string }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: x, top: y, width: size, height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      filter: "blur(40px)",
    }}
    animate={{
      y: [0, -25, 0, 18, 0],
      scale: [1, 1.3, 0.85, 1.15, 1],
      opacity: [0.2, 0.5, 0.2, 0.4, 0.2],
    }}
    transition={{ repeat: Infinity, duration: 10 + delay, delay, ease: "easeInOut" }}
  />
);
```

After:
```tsx
const FloatingOrb = ({ delay, x, y, size, color }: { delay: number; x: string; y: string; size: number; color: string }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x, top: y, width: size, height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(40px)",
      }}
      animate={reduceMotion ? undefined : {
        y: [0, -25, 0, 18, 0],
        scale: [1, 1.3, 0.85, 1.15, 1],
        opacity: [0.2, 0.5, 0.2, 0.4, 0.2],
      }}
      transition={reduceMotion ? undefined : { repeat: Infinity, duration: 10 + delay, delay, ease: "easeInOut" }}
    />
  );
};
```

### Edit 2: Import — add useReducedMotion

The import line:
```tsx
import { motion } from "framer-motion";
```
→
```tsx
import { motion, useReducedMotion } from "framer-motion";
```

### Edit 3: Header motion.div — guard initial

Before:
```tsx
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 pt-[calc(env(safe-area-inset-top)+4px)]"
```

After:
```tsx
      <motion.div
        initial={false}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 pt-[calc(env(safe-area-inset-top)+4px)]"
```

### Edit 4: Summary card — guard initial, wrap transition

Before:
```tsx
        <motion.div
          initial={{ opacity: 0, y: 20, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="rounded-2xl p-4 relative overflow-hidden"
```

After: Need to add `const reduceMotion = useReducedMotion();` at the top of the component... wait, actually we need to be careful. Let me re-read the task:

"Summary card entrance initial opacity 0 y 20 rotateX 8 spring transition - guard initial false wrap transition reduceMotion undefined."

So: `initial={false}`, `transition={reduceMotion ? undefined : { type: "spring", stiffness: 200, damping: 20 }}`.

But we need `reduceMotion` available in the component scope. We should add `const reduceMotion = useReducedMotion();` inside `DriverActivity`.

### Edit 5: Holographic sheen — gate animate + transition

Before:
```tsx
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(105deg, transparent 40%, hsl(var(--primary) / 0.08) 45%, hsl(var(--primary) / 0.15) 50%, hsl(var(--primary) / 0.08) 55%, transparent 60%)",
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["200% 0%", "-200% 0%"] }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          />
```

After:
```tsx
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(105deg, transparent 40%, hsl(var(--primary) / 0.08) 45%, hsl(var(--primary) / 0.15) 50%, hsl(var(--primary) / 0.08) 55%, transparent 60%)",
              backgroundSize: "200% 100%",
            }}
            animate={reduceMotion ? undefined : { backgroundPosition: ["200% 0%", "-200% 0%"] }}
            transition={reduceMotion ? undefined : { repeat: Infinity, duration: 4, ease: "linear" }}
          />
```

### Edit 6: Filter chips container — guard initial

Before:
```tsx
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar"
        >
```

After:
```tsx
        <motion.div
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar"
        >
```

### Edit 7: Live tab motion.button — aria-hidden on Radio icon only

The Live tab button has text content, so no aria-label needed. The `Radio` icon inside needs `aria-hidden="true"`.

Before:
```tsx
            <Radio className="w-3.5 h-3.5" />
```

After:
```tsx
            <
