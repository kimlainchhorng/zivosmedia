# MiMo run — 2026-06-14T06:19:27.605Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive non-visual accessibility plus reduced-motion audit ONLY. No layout, copy, routing, styling, or logic change. This is DriverEarnings, the auth-gated /driver/earnings page (flagship daily-use earnings screen), premium 3D glass. It imports useTranslation t() (copy uses t() keys). It does NOT import useReducedMotion. Structure: root div min-h-100dvh bg-background pb-24 (NORMAL flow, not fixed inset-0); a decorative fixed inset-0 pointer-events-none layer with THREE FloatingOrb components, each a motion.div with INFINITE animation (animate y array 0 -20 0 15 0, scale array, opacity array, transition repeat Infinity) - purely decorative blurred orbs (WCAG 2.3.3); a sticky motion.header ENTRANCE (initial y -20 opacity 0) with an icon-only back motion.button (whileTap scale 0.9, onClick goBack, ONLY an ArrowLeft, no accessible name), h1 t earningsPage.title + p, and an icon-only refresh motion.button (whileTap, onClick refetch, ONLY a RefreshCw that gets className animate-spin when isLoading, no accessible name); a main with out-of-scope child cards; shadcn Tabs (today/week) with TabsTrigger holding decorative Calendar icon + text; per-tab a 2-col grid of category motion.buttons (whileTap, decorative Truck or Gift icon + visible label + visible amount, NOT icon-only); a breakdown child (out of scope); a section motion.div ENTRANCE (initial opacity 0 y 15) with an h3 holding decorative Package or Calendar icon + text, an empty-state decorative Package icon + text, OR a deliveries list. Week tab also has a 2x2 grid of stat motion.divs (ENTRANCE initial opacity 0 scale 0.9 + STAGGER delay i*0.08) each value p + label p. Finally a Quick Actions 2-col grid of motion.buttons (whileTap, ENTRANCE initial opacity 0 y 12 + STAGGER delay 0.3+i*0.05) each a decorative EMOJI span + visible t() label. Concise verdict per point: (1) Freeze the 3 infinite FloatingOrbs under reduced-motion by refactoring FloatingOrb to take a reduceMotion prop and conditionally render a STATIC plain div (resting opacity 0.2) when reduced else the motion.div - agree? (2) Guard ENTRANCES with initial reduceMotion ? false : object: header, the 2 section opacity-0-y-15, the 4 week stat tiles opacity-0-scale-0.9 (+zero i*0.08 stagger), the 7 quick-action opacity-0-y-12 (+zero 0.3+i*0.05 stagger). Confirm + that ALL whileTap stays UNGUARDED. (3) icon-only back (ArrowLeft) + refresh (RefreshCw) lack accessible names - add aria-label; file HAS t(): t('common.back') for back, t('common.refresh','Refresh') for refresh - agree? (4) aria-hidden true list: back ArrowLeft, refresh RefreshCw, 2 TabsTrigger Calendar, 4 category Truck/Gift, 2 section Package/Calendar, empty-state Package; plus wrap the 7 quick-action EMOJI spans aria-hidden true (emojis are read by AT)? Confirm. (5) RefreshCw CSS animate-spin while isLoading - append motion-reduce:animate-none or LEAVE (transient loading)? one line. (6) Heading order h1 then h3 (skips h2) - change those h3 to h2 (className keeps size, zero visual) or do child components inject an h2 (you cannot see child files - give safe call)? (7) Safe-area: header has pt-calc(env(safe-area-inset-top)+4px), root normal-flow min-h-100dvh pb-24 with BottomNav - adequate? Tight additive-only verdict.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Earnings.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
Let me carefully audit the `DriverEarnings` page against each of the 7 points in the task, staying strictly additive, non-visual, accessibility-only, and respecting all guardrails.

**File:** `src/pages/driver/Earnings.tsx` (the repo may be at `../zivodriver/` but I'll use the path as given)

Let me go through each point:

### (1) FloatingOrb — reduced motion

Currently `FloatingOrb` renders a `motion.div` with `animate` that has infinite looping. Under `prefers-reduced-motion`, this should freeze. The plan is to add a `reduceMotion` prop and conditionally render a plain static `div` with resting opacity 0.2.

Agree — clean approach. The parent passes `reduceMotion` based on the hook.

### (2) ENTRANCES — reduced motion

Currently these `motion.*` elements have `initial` + `animate` for entrance:
- Header: `initial={{ y: -20, opacity: 0 }}` → `animate={{ y: 0, opacity: 1 }}`
- Today section (deliveries list container): `initial={{ opacity: 0, y: 15 }}` → appears twice (today + week)
- Week stat tiles: `initial={{ opacity: 0, scale: 0.9 }}` with `delay: i * 0.08`
- Quick actions: `initial={{ opacity: 0, y: 12 }}` with `delay: 0.3 + i * 0.05`

Under reduced motion, guard `initial` to `false` (meaning: render at the `animate` state immediately, no entrance animation). The `animate` stays as-is. `whileTap` stays unguarded — tap feedback is user-initiated, not auto-playing, and is a WAI-ARIA best practice.

Approach: use `useReducedMotion()` hook. For each entrance, change `initial` to `reduceMotion ? false : { ... }`.

`initial={false}` on a framer-motion component means "render at the animate state with no initial animation" — exactly what we want.

### (3) Accessible names for icon-only buttons

- Back button: only contains `<ArrowLeft />` — needs `aria-label={t('common.back')}`
- Refresh button: only contains `<RefreshCw />` — needs `aria-label={t('common.refresh', 'Refresh')}`

Wait, let me check the `useTranslation` hook signature. The task says `t('common.back')` and `t('common.refresh','Refresh')`. The `t()` function typically takes a key and a fallback. Let me use that.

Actually, I should check if `t()` supports a second argument as fallback. In i18next-style hooks, `t(key, defaultValue)` works. The task says to use `t('common.refresh','Refresh')` so I'll trust that.

Agree on both.

### (4) `aria-hidden` on decorative icons

List of icons to mark `aria-hidden="true"`:
- Back `ArrowLeft` (icon-only button, gets aria-label → icon is decorative)
- Refresh `RefreshCw` (icon-only button, gets aria-label → icon is decorative)
- 2 `TabsTrigger` `Calendar` icons (text label beside them → decorative)
- 4 category `Truck`/`Gift` icons (text label beside them → decorative)
- 2 section `Package`/`Calendar` (in h3, text beside → decorative) — these are in the `motion.div` sections
- Empty-state `Package` icon (text beside → decorative)
- 7 quick-action emoji `<span>`s — emojis are read by AT if not hidden

Wait, let me count the icons precisely:

1. Back `ArrowLeft` — in `<ArrowLeft className="w-5 h-5" />`
2. Refresh `RefreshCw` — in `<RefreshCw className={...} />`
3. Today tab `Calendar` — `<Calendar className="w-4 h-4" />` in TabsTrigger
4. Week tab `Calendar` — `<Calendar className="w-4 h-4" />` in TabsTrigger
5. Today deliveries section h3 `Package` — `<Package className="w-4 h-4" />`
6. Empty state `Package` — `<Package className="w-12 h-12 ..." />`
7. Week section h3 `Calendar` — `<Calendar className="w-4 h-4" />`
8. Today category `Truck` — `<cat.icon .../>` where cat.key="deliveries"
9. Today category `Gift` — `<cat.icon .../>` where cat.key="bonuses"
10. Week category `Truck` — same mapped
11. Week category `Gift` — same mapped

The category icons are rendered via `<cat.icon className={...} />` — lucide-react components accept extra props. I can add `aria-hidden` there.

For the emoji spans in quick actions: `<span className="text-lg">{item.emoji}</span>` — add `aria-hidden="true"`.

Agree on all.

### (5) `animate-spin` on RefreshCw — `motion-reduce:animate-none`

The `animate-spin` is a transient loading indicator — it spins while `isLoading` is true, then stops. Under reduced-motion, a spinning animation could be problematic (WCAG 2.3.3 or more precisely 2.2.2 — pause/stop/hide). However, since this is a small icon indicating "loading in progress" and it's transient (not permanent), the guidance is mixed. The task asks for a one-line verdict.

I'd recommend **add `motion-reduce:animate-none`** — it's one className append, purely additive, and a user who prefers reduced motion won't see a spinning icon. The `isLoading` state still disables the button, so the lack of spin doesn't lose information. It's a net-positive accessibility improvement with zero visual cost for non-reduced-motion users.

### (6) Heading order: h1 → h3 (skips h2)

The page has `<h1>` (earnings title) then `<h3>` (section headings like "Completed today", "This week summary"). This skips h2.

Since I can't see child components, the safe call is: **change the `h3` to `h2`** in this file. The `className` keeps `text-sm font-semibold` so the visual size doesn't change. There are exactly two `h3` elements in this file:
1. `<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">` in the today deliveries section
2. `<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">` in the week summary section

Both → `h2`. Zero visual change.

### (7) Safe-area

Header has `pt-[calc(env(safe-area-inset-top)+4px)]` — correct for the sticky header with safe area. Root has `min-h-[100dvh] pb-24 overscroll-none` with `BottomNav` at the bottom. The `pb-24` provides space for the bottom nav (typically ~60-80px + safe area). `BottomNav` presumably handles its own safe-area-inset-bottom. This looks adequate.

Verdict: **adequate, no change needed.**

---

Now let me draft the complete diff.

**Changes needed:**
1. Add `import { useReducedMotion } from "@/hooks/useReducedMotion";` (or use `window.matchMedia` — but in this codebase, the convention appears to be a hook. Let me check... The AGENTS.md mentions `useReducedMotion` as a hook. I'll use that.)

Actually wait — the task says the file "does NOT import useReducedMotion." The codebase likely has this hook available. Let me import it.

2. Modify `FloatingOrb` to accept `reduceMotion` prop and conditionally render.

3. In the component body, get `reduceMotion` from the hook.

4. Guard all `initial` props on entrance animations.

5. Add `aria-label` to both icon-only buttons.

6. Add `aria-hidden="true"` to all decorative icons.

7. Append `motion-reduce:animate-none` to RefreshCw's className.

8. Change `h3` → `h2` for the two section headings.

Let me write the precise diff now.

Actually, I should think about this more carefully. Let me re-read the source and make sure I get every single change right.

For FloatingOrb, the current signature is:
```tsx
const FloatingOrb = ({ delay, x, y, size, color }: { delay: number; x: string; y: string; size: number; color: string }) => (
  <motion.div ... />
);
```

New signature:
```tsx
const FloatingOrb = ({ delay, x, y, size, color, reduceMotion }: { delay: number; x: string; y: string; size: number; color: string; reduceMotion: boolean }) => (
  reduceMotion ? (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x, top: y, width: size, height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(40px)",
        opacity: 0.2,
      }}
    />
  ) : (
    <motion.div ... existing ... />
  )
);
```

For the parent calls:
```tsx
<FloatingOrb delay={0} x="8%" y="15%" size={180} color="hsl(var(--primary) / 0.1)" reduceMotion={reduceMotion} />
```

For entrances:

**Header:**
```tsx
<motion.header
  initial={reduceMotion ? false : { y: -20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  ...
>
```

**Today deliveries section:**
```tsx
<motion.div
  initial={reduceMotion ? false : {
