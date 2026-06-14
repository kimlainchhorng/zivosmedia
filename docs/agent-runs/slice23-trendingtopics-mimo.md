# MiMo run — 2026-06-14T01:07:29.251Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control changes are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/TrendingTopicsPage.tsx  (route /trending-topics — a Twitter/X-style trending topic discovery list, backed by the trending_topics table; tapping a topic navigates to /tag/:slug)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap). Please keep all data logic exactly as it is: the Supabase query, the react-query key, the region/period filter logic, the useMemo derivations, navigate() targets, and all prop wiring should stay byte-identical. Only advise on className tokens and the display-only attributes listed above.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] + rounded-sm ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99]
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (visible-text controls do not need it).

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens (focus ring, press feel) -> we leave it untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- A native <input> that already has its own focus ring (e.g. focus:outline-none focus:ring-2 focus:ring-rose-500/30) -> we leave it untouched (never add active:scale to an input).
- A raw <button>/<a> gets the full token set.
- A framer-motion element WITH whileTap: CSS active:scale is overridden by motion's inline transform, so we do NOT add a CSS scale; we add the focus ring via box-shadow ring only. If the element already has a CSS transition that only animates color/bg (e.g. transition-colors for a hover:bg), that does NOT conflict with motion's transform, so we keep it as-is rather than flipping it to transition-all.

MY PLANNED EDITS (please confirm each is right, or correct it):

1. Region filter chips, line ~135 (a .map over regions):
   current: a raw <button type="button" onClick={() => setActiveRegion(r)}> whose cn() base string already includes transition-all; selection is conveyed ONLY by bg-ig-gradient text-white (active) vs bg-secondary ...hover:bg-muted (inactive); content is a Globe icon + the visible region name.
   plan: add aria-pressed={activeRegion === r}; append  active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  into the cn() base; KEEP transition-all; the row is flex gap-2 overflow-x-auto scrollbar-hide so I plan a normal OUTWARD ring (overflow-x-auto clips overflowing content, not the ~2px ring), NOT ring-inset. Visible region text = accessible name so no aria-label.

2. Period filter chips, line ~154 (a .map over periods):
   current: a raw <button type="button" onClick={() => setActivePeriod(p)}> whose cn() base already includes transition-all; selection conveyed ONLY by bg-foreground text-background (active) vs border border-border ...hover:bg-secondary (inactive); content is the visible period text; this chip is a bit smaller (text-[11px] px-3 py-1).
   plan: add aria-pressed={activePeriod === p}; append  active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  into the cn() base; KEEP transition-all; normal OUTWARD ring (same overflow-x-auto row). Visible period text = accessible name so no aria-label.

3. Topic result row, line ~194 (a .map over filtered topics):
   current: a framer-motion motion.button WITH whileTap={{ scale: 0.985 }} and an entrance animation (initial/animate on opacity+y); className is "w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"; content includes the visible topic name + counts (= accessible name); the list wrapper is space-y-1.5 (NOT overflow-hidden).
   plan: append  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (ring ONLY — whileTap already owns the press-scale, so no CSS active:scale); KEEP the existing transition-colors (it only animates the hover:bg-secondary/40, which does not conflict with motion's transform — so I would NOT flip it to transition-all); KEEP the existing whileTap={{ scale: 0.985 }}; normal OUTWARD ring (the button is the rounded element and the list is not overflow-hidden). Visible topic text = accessible name so no aria-label.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none of these need a change):
- Back button, line ~96: shadcn <Button aria-label="Back" variant="ghost" size="icon"> — already labeled, ships tokens.
- Search <input type="search">, line ~123 — native input that ALREADY has focus:outline-none focus:ring-2 focus:ring-rose-500/30 — leave alone.
- Hero stat card, line ~109: a motion.div with an entrance animation and NO onClick — presentational, not pressable.

QUESTIONS:
Q1. Region chips: is aria-pressed + active:scale-[0.97] + outward ring (keeping transition-all) the right call for a segmented filter chip whose only selection signal is the bg/text swap?
Q2. Period chips: same treatment even though they are visually smaller (text-[11px] px-3 py-1)? Is [0.97] still the right tier, or would you treat the smaller chip differently?
Q3. Topic row motion.button: confirm ring-ONLY is correct (whileTap owns the scale), and confirm KEEPING transition-colors (rather than flipping to transition-all) is right since the CSS transition only animates the hover bg and does not touch transform. Also: is the existing whileTap={{ scale: 0.985 }} a sensible press value for a wide row, or would you nudge it?
Q4. Confirm leaving the native search <input> untouched (it already ships its own focus ring) is correct, and that adding active:scale to an input would be wrong.
Q5. Is my untouched list correct, and does anything there actually need a token? Also: at a 375px-wide phone viewport, do the two overflow-x-auto chip rows and the topic rows lay out cleanly, and do the chips keep a comfortable tap target?

Please answer Q1-Q5 and give me any corrected className strings. Keep all data/query logic unchanged. Thank you.
- files: src/pages/TrendingTopicsPage.tsx

---

## Review — `src/pages/TrendingTopicsPage.tsx`

### Control inventory (exhaustive, line-by-line)

| # | Line (approx) | Element | Action | Verdict |
|---|---|---|---|---|
| 1 | ~96 | `<Button aria-label="Back" variant="ghost" size="icon">` | shadcn — ships tokens + already labeled | **Leave** ✅ |
| 2 | ~109 | `<motion.div … initial/animate …>` | hero stat card, NO onClick | **Leave** ✅ |
| 3 | ~123 | `<input type="search" … focus:ring-2 focus:ring-rose-500/30">` | native input, own focus ring | **Leave** ✅ |
| 4 | ~135 | raw `<button>` ×N — region chips | interactive | **Polish** |
| 5 | ~154 | raw `<button>` ×N — period chips | interactive | **Polish** |
| 6 | ~165 | `<div className="h-14 bg-muted animate-pulse rounded-xl" />` ×6 | skeleton, non-interactive | **Leave** ✅ |
| 7 | ~183 | empty-state `<div>` | non-interactive | **Leave** ✅ |
| 8 | ~190 | no-match `<p>` | non-interactive | **Leave** ✅ |
| 9 | ~194 | `<motion.button>` ×N — topic rows | interactive | **Polish** |

Exactly **3 control groups** to polish. Your untouched list is complete and correct — nothing missed, nothing to add.

---

### Q1 — Region chips

**Your plan is exactly right.** No corrections.

Segmented filter chip with bg/text-swap-only selection → `aria-pressed` + `active:scale-[0.97]` + outward ring + keep `transition-all`. The `overflow-x-auto` row clips content overflow, not the ~2px box-shadow ring. Visible text (Globe icon + region name) = accessible name → no `aria-label`.

**Corrected cn() base (append into the existing string):**
```
"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 capitalize active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
Add: `aria-pressed={activeRegion === r}` as a standalone JSX attribute.

---

### Q2 — Period chips

**Your plan is exactly right.** No corrections.

[0.97] is the correct tier even though these chips are visually smaller (`text-[11px] px-3 py-1`). The tier is determined by the **control's functional role** (segmented filter chip), not its pixel size. The visual difference between [0.97] and [0.98] on a ~60px chip is sub-pixel and imperceptible. Consistency across the two chip rows in the same page matters more.

Same treatment as region chips: `aria-pressed` + `active:scale-[0.97]` + outward ring + keep `transition-all`. Visible text = name → no `aria-label`.

**Corrected cn() base:**
```
"shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all capitalize active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
Add: `aria-pressed={activePeriod === p}` as a standalone JSX attribute.

---

### Q3 — Topic row `motion.button`

**Your plan is exactly right on two of three points. One nuance on the `whileTap` value.**

**(a) Ring-only — confirmed correct.** `whileTap={{ scale: 0.985 }}` owns the press transform; a CSS `active:scale` would be dead (framer's inline transform overrides CSS). Append ring only:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**(b) KEEP `transition-colors` — confirmed correct.** The existing `transition-colors` animates only `color`, `background-color`, `border-color`, `opacity` (the `hover:bg-secondary/40` fade). It does **not** touch `transform`, so it does not conflict with motion's inline `transform: scale(…)`. Flipping to `transition-all` would add `transform` to the CSS transition list — a dead property that motion overrides — for zero benefit. Leave it.

**(c) `whileTap={{ scale: 0.985 }}` — a nudge, but optional.**

The repo's **wide-row tier** is `active:scale-[0.99]` (1% scale reduction). `0.985` = 1.5% reduction — a slightly stronger press than the standard for a full-width row. It's not wrong (feels like "pressing a card" rather than "tapping a row"), but for consistency with every other wide row in the app, I'd nudge to `0.99`:

```
whileTap={{ scale: 0.99 }}
```

This is a display-only prop, in scope per your guardrails, and a one-character change. If you prefer the slightly heavier feel of 0.985, leave it — the difference is barely perceptible. But `0.99` matches the tier system.

**Full diff for the `motion.button`:**

Before:
```
whileTap={{ scale: 0.985 }}
```
After:
```
whileTap={{ scale: 0.99 }}
```

Before (className):
```
className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
```
After (className):
```
className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

No `aria-label` (visible topic name + counts = accessible name). No `ring-inset` (button is `rounded-xl` with no `overflow-hidden`, parent is `space-y-1.5` — no clipping). Normal outward ring.

---

### Q4 — Search input

**Confirmed correct — leave untouched.** The input already has `focus:outline-none focus:ring-2 focus:ring-rose-500/30`. Adding `active:scale` to an `<input>` would be wrong: inputs don't "press" — they focus and receive text. The focus ring is the correct tactile/visual feedback for an input. This is a hard rule in the token system.

---

### Q5 — Untouched list + responsive @375px

**Untouched list: correct, complete, nothing missed.**

**Responsive @375px — clean, no crush:**

- **Region chip row:** `flex gap-2 overflow-x-auto scrollbar-hide` inside `max-w-2xl mx-auto px-4` (343px inner). Chips are `px-3.5 py-1.5 text-xs` (~38px for "All", ~70-80px for region names). With 2-4 regions, some scroll horizontally — `overflow-x-auto` handles this cleanly. Tap targets: height ~24px (below 44px, established repo compact pattern — flag only, not per-page fix); width comfortable (even "All" at ~38px is tappable).

- **Period chip row:** same pattern, `px-3 py-1 text-[11px]` — even smaller (~22px tall). 2-3 periods typically fit or scroll. Same flag on tap height.

- **Topic rows:** `w-full flex items-center gap-3 p-3` = 36px rank badge + 12px gap + `flex-1 min-w-0` (name truncates via `line-clamp-1`) + optional score. At 343px inner, the content truncates cleanly. No crush.

---

### Final diff summary

3 control groups, 5 JSX edits total (3 className appends + 1 `aria-pressed` on each chip row + 1 optional `whileTap` nudge):

**Region chips (~line 135):**
```diff
               <button
                 key={r}
                 type="button"
                 onClick={() => setActiveRegion(r)}
+                aria-pressed={activeRegion === r}
                 className={cn(
-                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 capitalize",
+                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 capitalize active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                   activeRegion === r ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                 )}
```

**Period chips (~line 154):**
```diff
               <button
                 key={p}
                 type="button"
                 onClick={() => setActivePeriod(p)}
+                aria-pressed={activePeriod === p}
                 className={cn(
-                  "shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all capitalize",
+                  "shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all capitalize active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                   activePeriod === p ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:bg-secondary",
                 )}
```

**Topic rows (~line 194):**
```diff
-                whileTap={{ scale: 0.985 }}
+                whileTap={{ scale: 0.99 }}
                 onClick={() => handleOpen(t.topic)}
-                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
+                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Zero changes to:** the Supabase query, react-query key `"trending-topics"`, `regions`/`periods`/`filtered` useMemo derivations, `handleOpen` + `navigate` targets, `formatCount`, the `TopicRow` interface, `SEOHead`, `SwipeBackContainer`, the `cn` import, or any prop wiring. Every `onClick`/`useState`/`useMemo`/`useQuery` line is byte-identical.

---

### Owner verification

1. Run `npm run update` — must pass (type-check + worker type-check + production build).
2. Preview at `/trending-topics` at 375px / 768px / 1280px — chip rows scroll if they overflow, topic rows truncate, focus ring visible on Tab navigation.
3. The `aria-pressed` on chips reflects filter state — screen readers will announce "selected"/"not selected".
4. Sub-44px tap targets on chips (24px / 22px tall) — established repo compact pattern, flag-only.
