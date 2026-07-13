# MiMo advisor — Tailwind className-only polish for a mobile profile STATS row (React SPA, mobile-first 375px, light+dark; app is forcedTheme=light so dark: classes are correctness-only). HARD RULE: className-only — NO JS/logic/structure changes, no new fields, no new elements. This 4-up row (Followers/Following/Posts/Friends) sits directly ABOVE a quick-action grid that was just polished with tone-colored icons (emerald/sky/violet/amber) in h-9 rounded-xl chips, so the stats row now looks plain/grey by comparison. The Posts cell is a non-clickable span (bg-muted/10) on purpose; the other 3 are buttons opening a social modal. Give CONCRETE old->new className changes (use a verdict-first format) that improve legibility + cohesion WITHOUT redesign. Prioritize: (a) label legibility — labels are text-[8px] uppercase tracking-wide on a ~90px-wide cell with truncate; is 8px too small, what is the smallest tasteful bump (9px/10px) that still fits, and should tracking change? (b) count emphasis (currently text-[13px] font-black); (c) keep the non-clickable Posts cell visually distinct but not looking broken/disabled; (d) any subtle divider/hover/press refinement. Note any a11y/contrast issue with specific Tailwind values. If a part is already good say leave-as-is. Under 300 words.

Files: /tmp/profile-stats-row.tsx

## Verdict: Needs targeted fixes — 4 findings

---

### P1 — Label text is too small at 8px; fails legibility on mobile

`text-[8px]` uppercase on a ~90px cell is below practical mobile legibility. Bump to **`text-[10px]`** — the smallest tasteful size that still fits "FOLLOWERS" at 90px. Keep `tracking-wide`; tighten to `tracking-wider` is unnecessary at 10px.

**All four label spans:**
```
- text-[8px] font-bold uppercase tracking-wide text-muted-foreground
+ text-[10px] font-semibold uppercase tracking-wide text-muted-foreground
```
Drop `font-bold` → `font-semibold` to reduce ink density at the larger size; uppercase + semibold at 10px reads clearly.

---

### P1 — `text-muted-foreground` likely fails 4.5:1 at small sizes

At 10px uppercase this is **small text** (WCAG AA requires 4.5:1). Standard Tailwind `muted-foreground` ≈ `oklch(0.556)` on light card yields ~4.0–4.2:1 — **borderline fail**. Safest className fix:

```
- text-muted-foreground
+ text-foreground/60
```
`foreground/60` on a light card (~oklch 0.98) gives ~5.2:1 — comfortably passes. Apply to all four label spans.

---

### P1 — Posts cell `bg-muted/10` reads as broken, not "non-interactive"

At `/10` the tint is near-invisible on light theme — it looks like a rendering glitch, not an intentional distinction. Bump to:

```
- bg-muted/10
+ bg-muted/25
```
Still clearly subordinate to the interactive buttons' `hover:bg-muted/35` affordance, but visibly "this cell is different."

---

### P2 — Count numbers could use 1px bump for cohesion with chip row above

The chip row uses `h-9` icons with color weight; the stats counts at 13px feel slight by comparison.

```
- text-[13px] font-black leading-none
+ text-sm font-black leading-none          /* text-sm = 14px */
```
`text-sm` (14px) is a standard Tailwind step — no custom value, slightly more presence. Keep `font-black`.

---

### Leave as-is

- **Dividers** (`border-r border-border/50`) — tasteful, correctly stops before last cell.
- **Hover/active states** — `hover:bg-muted/35 active:bg-muted/45` + `focus-visible:ring-2` are solid.
- **Posts `<span>` count** — `text-foreground` is correct (no disabled color needed; it's content, not a control).
