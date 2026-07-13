# MiMo run (direct) — 2026-06-16T01:01:51.127Z

- task: nav clear iOS liquid-glass refinement
- stop: end_turn

---

## (1) Glass Direction

The pill shifts from near-opaque white (`0.82`) to true Liquid Glass: **`bg-white/[0.15]`** (light) / **`dark:bg-zinc-950/[0.40]`** (dark) so page content visibly bleeds through the frost. Heavy **`backdrop-blur-3xl` + `backdrop-saturate-[2]`** keeps the bleed colorful, not muddy. A bright **`inset_0_1px_0` specular rim-light** (white 65 % top, 10 % bottom) sells the glass edge; a soft **`0_8px_40px` float shadow** anchors the float. A subtle diagonal **gradient-to-br sheen** overlay adds the glossy highlight catch. Active icons/labels get a faint **`drop-shadow`** so the IG-gradient text stays crisp over the now-transparent surface.

---

## (2) Outer Container — Replace These Lines

Find this block (the main `<div>` wrapping all tabs) and **replace only the `className={cn(…)}` prop**:

```tsx
<div
  className={cn(
    "pointer-events-auto relative flex w-full items-stretch px-1.5 py-2",
    "rounded-[26px]",
    /* ── Liquid Glass surface ── */
    "bg-white/[0.15] backdrop-blur-3xl backdrop-saturate-[2]",
    /* ── Rim-light border (thin specular edge) ── */
    "border border-white/20",
    /* ── Specular highlights (top bright, bottom faint) + diffuse float shadow ── */
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-0.5px_0_rgba(255,255,255,0.1),0_8px_40px_rgba(0,0,0,0.08),0_2px_12px_rgba(0,0,0,0.04)]",
    /* ── Dark mode glass ── */
    "dark:bg-zinc-950/[0.40] dark:border-white/[0.08]",
    "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-0.5px_0_rgba(255,255,255,0.02),0_8px_40px_rgba(0,0,0,0.5),0_2px_12px_rgba(0,0,0,0.25)]",
  )}
>
```

**Add this sheen overlay as the *first* child inside that `<div>`** (before `{tabs.map(…)}`):

```tsx
{/* Glassy sheen — diagonal highlight catch */}
<div
  className="pointer-events-none absolute inset-0 rounded-[26px] bg-gradient-to-br from-white/[0.12] via-transparent to-transparent dark:from-white/[0.04] dark:via-transparent dark:to-transparent"
  aria-hidden
/>
```

---

## (3) Legibility Tweaks

### Active label — add `drop-shadow` so gradient text stays crisp over the transparent frost

Find the label `<span>` and **replace its `className`**:

```tsx
<span
  className={cn(
    "relative z-10 max-w-full truncate text-[10px] font-semibold leading-tight tracking-tight transition-colors duration-200",
    isActive
      ? "text-ig-gradient drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
      : "",
  )}
  aria-hidden
>
  {label}
</span>
```

### Inactive icon/label — bump one shade for better contrast on the clearer glass

Find the button's conditional color classes and **replace the two relevant lines**:

```tsx
// was:  isActive
//         ? "text-zinc-900 dark:text-white"
//         : "text-zinc-400 hover:text-zinc-500 dark:text-zinc-500 dark:hover:text-zinc-400",
isActive
  ? "text-zinc-900 dark:text-white"
  : "text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300",
```

### (Optional) Active icon — subtle drop-shadow for extra pop

Find the `<Icon>` component's `className` and **append the shadow when active**:

```tsx
<Icon
  className={cn(
    "h-[22px] w-[22px] transition-all duration-200",
    isActive &&
      "scale-[1.08] drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
  )}
```

---

### Quick Visual Summary of What Changed

| Property | Before | After |
|---|---|---|
| `bg` opacity | `white/[0.82]` (near-solid) | `white/[0.15]` / `zinc-950/[0.40]` (true glass) |
| `backdrop-saturate` | `[1.8]` | `[2]` (colors pop through frost) |
| Border | `white/60` (heavy) | `white/20` (barely-there) |
| Top specular | `inset_0_1px_0 … 0.95` (flat) | `inset_0_1px_0 … 0.65` (bright rim-light) |
| Bottom specular | *none* | `inset_0_-0.5px_0 … 0.1` (faint rim) |
| Float shadow | `4px / 12px spread` | `8px / 40px spread` (softer float) |
| Sheen overlay | *none* | diagonal `from-white/[0.12]` gradient |
| Active label | no shadow | `drop-shadow-[0_1px_2px …]` |
| Inactive text | `zinc-400` | `zinc-500` (one shade stronger) |
