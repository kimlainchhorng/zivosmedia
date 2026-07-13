# MiMo advisor — Tailwind className-only polish review for a Telegram-style mobile chat header. Read the attached file (3 blocks: search+avatar-stack, saved-star button, All/Personal segmented control). HARD RULE: className/display-attr only, no JS, no restructure, no new components. Give CONCRETE old->new className changes that genuinely improve polish. Prioritize avatar-stack evenness (fallback initial vs photo), clearer active-segment affordance, dark-mode contrast/touch targets. Minimal; say 'leave as-is' for anything already good. Under 400 words.

Files: /tmp/chat-header-polish.md

## Findings

### 1. Avatar stack — fallback initial looks cramped/uneven vs photos

**Ring bleeds into header bg** — `ring-[#eaf5ff]` is nearly identical to the header `#eaf5ff`, so overlapping avatars appear ringless in light mode.

**Fallback initial has no visual weight** — `bg-white` behind a single letter on a white-ish ring looks ghostly compared to a filled photo.

```
// Avatar container — old:
"flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white text-[11px] font-black text-sky-700 ring-2 ring-[#eaf5ff] shadow-sm dark:bg-slate-800 dark:text-sky-200 dark:ring-slate-900"

// Avatar container — new:
"flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-[11px] font-black leading-none text-sky-700 ring-2 ring-white shadow-sm dark:bg-slate-800 dark:text-sky-200 dark:ring-slate-900"
```

Changes: `bg-white` → `bg-sky-100` (fallback has visible tint matching photo weight), `ring-[#eaf5ff]` → `ring-white` (clean white separation between overlapping rings), added `leading-none` (prevents initial letter from sitting slightly high).

### 2. Saved Messages star button — leave as-is

`h-11 w-11` = 44px ✓ touch target. Icon sizing and color are clean.

### 3. Segmented control — active pill is too subtle

`bg-[#eaf5ff]` on a white card barely registers as "selected," especially in bright ambient light. Add a lifted shadow to the active state:

```
// Active segment — old:
"bg-[#eaf5ff] text-sky-500 dark:bg-sky-500/15 dark:text-sky-300"

// Active segment — new:
"bg-[#eaf5ff] text-sky-500 shadow-sm shadow-sky-200/60 dark:bg-sky-500/15 dark:text-sky-300 dark:shadow-none"
```

One additive class pair — the subtle shadow physically "lifts" the active pill off the card surface, providing affordance without changing the color scheme.

### 4. Inactive segment contrast in dark mode

`text-slate-400` on `dark:bg-white/10` is borderline WCAG. Bump one step:

```
// Inactive segment — old (dark text portion):
"dark:text-slate-400"

// Inactive segment — new:
"dark:text-slate-300"
```

All other className → leave as-is. Input sizing, focus rings, search clear button, and badge pills are solid.
