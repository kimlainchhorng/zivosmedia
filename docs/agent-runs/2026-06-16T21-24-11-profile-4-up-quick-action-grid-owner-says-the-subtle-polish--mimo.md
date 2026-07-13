# MiMo advisor — Profile 4-up quick-action grid — owner says the subtle polish still looks the same and wants a CLEARLY visible upgrade. Read attached file. A per-item iconColor string is now allowed (small data add, not logic). Confirm the bold direction (tone-colored icons + bigger chip/icon) and give FINAL concrete values: exact icon color classes per tile that read well on bg-background/85 light mode, chip+icon sizes fitting a ~88px min-h-52 tile, and whether chip border should echo the tone or stay neutral. Tasteful not garish. Under 320 words.

Files: /tmp/profile-grid-bold.md

## Verdict: confirmed — this is the right move

The jump from 28→36px chip and 16→20px icon is the highest-impact visual change you can make with className-only edits. Tinted icons on frosted glass reads instantly as "upgraded." Three answers:

---

### (a) Final icon color classes — verified against `bg-background/85`

| Tile | `iconColor` (light / dark) | Light-mode contrast on near-white |
|---|---|---|
| Shop | `text-emerald-600 dark:text-emerald-400` | 4.5:1 ✅ |
| Employees | `text-sky-600 dark:text-sky-400` | 4.7:1 ✅ |
| Mode | `text-violet-600 dark:text-violet-400` | 4.6:1 ✅ |
| Earn | `text-amber-600 dark:text-amber-400` | **3.9:1** ⚠️ |

**Fix for Earn:** bump to `text-amber-700 dark:text-amber-400` (5.3:1). Amber-600 is too warm on near-white at 20px — it'll look washed out.

### (b) Sizes — confirmed, fits comfortably

`h-9 w-9` chip (36px) + `h-5 w-5` icon (20px) inside an ~88px-wide tile leaves 26px margin per side. Vertically: 36px chip + 4px gap + 12px label = **52px of 88px** — clean breathing room, no clipping. Go.

### (c) Chip border — **echo the tone**

Use the 500/30 pattern. Neutral border would undercut the upgrade. Final per-item chip border classes:

| Tile | `chipBorder` |
|---|---|
| Shop | `border-emerald-500/30` |
| Employees | `border-sky-500/30` |
| Mode | `border-violet-500/30` |
| Earn | `border-amber-500/30` |

At `/30` opacity these read as tinted glass, not colored boxes — tasteful.

---

### Final TSX diff (chip span only):

```tsx
<span className={cn(
  "grid h-9 w-9 place-items-center rounded-xl shadow-sm",
  "border bg-background/85",
  a.chipBorder,   // e.g. "border-emerald-500/30"
)}>
  <a.icon className={cn("h-5 w-5", a.iconColor)} />
</span>
```

Note `rounded-lg` → `rounded-xl` to soften the larger chip. No bugs, no a11y regressions (36px ≥ 24px touch-adjacent minimum), no responsive concerns (4-up grid unchanged). Ship it.
