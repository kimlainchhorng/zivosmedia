# MiMo run (direct) — 2026-06-16T01:36:16.721Z

- task: make top Feed header read as premium Liquid Glass over light/white content

---

## Root Cause

At `bg-white/[0.15]` over an already-white page, the blur has nearly-zero color difference to work with — the frost produces nothing visible. The panel needs to generate its *own* visual texture: a higher-opacity body with a subtle self-tint, stronger specular edges, and a deeper float shadow so the eye perceives a distinct physical layer.

---

### (1) Header surface div — replace className

```tsx
className="
  rounded-[1.5rem] overflow-hidden
  sticky top-0 z-50
  bg-white/[0.68] dark:bg-zinc-950/[0.55]
  backdrop-blur-3xl backdrop-saturate-[2.5]
  border border-white/[0.50] dark:border-white/[0.08]
  shadow-[inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.08),0_12px_48px_rgba(0,0,0,0.06)]
  /* ...keep your other layout/sizing classes */
"
```

**What changed & why:**

| Token | Was | Now | Why |
|---|---|---|---|
| `bg-white` opacity | `[0.15]` | `[0.68]` | Body must register as a layer over white; 15% is invisible |
| `dark:bg-zinc-950` opacity | `[0.40]` | `[0.55]` | Matched bump for dark-mode parity |
| `backdrop-saturate` | `[2]` | `[2.5]` | Boosts any faint tint bleed from the page gradient |
| `border-white` opacity | `/20` | `/[0.50]` | Crisper catch-light edge, defines the panel perimeter |
| Top inset highlight | `0.65` | `0.92` | Sharp specular bevel — primary "glass edge" signal |
| Added bottom inset | — | `inset_0_-1px_0_rgba(0,0,0,0.04)` | Subtle inner lip separates panel from content below |
| Float shadow | `0_8px_40px…0.08` | `0_4px_16px…0.08, 0_12px_48px…0.06` | Two-layer shadow reads as realistic elevated glass |

---

### (2) Overlay children — add inside the header div (before the content row)

```tsx
{/* A: Diagonal specular sheen — bump opacity slightly */}
<div
  aria-hidden
  className="pointer-events-none absolute inset-0
    bg-gradient-to-br from-white/[0.20] via-white/[0.04] to-transparent"
/>

{/* B: Subtle self-tint — cool-grey wash at top fading to transparent
      This is the KEY trick: it gives the glass its own "color temperature"
      so it reads as a material, not as the page behind it */}
<div
  aria-hidden
  className="pointer-events-none absolute inset-x-0 top-0 h-[60%]
    bg-gradient-to-b from-slate-200/[0.30] to-transparent"
/>

{/* C: Bottom separation hairline — fine "ground shadow" edge */}
<div
  aria-hidden
  className="pointer-events-none absolute inset-x-6 bottom-0 h-px
    bg-gradient-to-r from-transparent via-black/[0.07] to-transparent"
/>
```

**Why each:**

- **A (sheen)** — Bumped from `0.12` → `0.20`. At higher body opacity, the sheen needs to be proportionally stronger to still read as a specular pass.
- **B (self-tint)** — This is the critical fix. A `slate-200` wash at 30% opacity creates a *barely-there* blue-grey cool tone that the eye interprets as "tinted glass thickness." It's neutral enough to satisfy the no-color constraint but distinct enough that the header is no longer indistinguishable from the white page. In dark mode it's invisible (you can add `dark:from-zinc-800/[0.25]` if desired).
- **C (hairline)** — A 1px fade-to-black hairline grounds the panel and reinforces the "floating above content" read.

---

### (3) Wordmark & icon tweaks for crispness

The higher-opacity body (0.68) is more legible than before, but punch up contrast slightly:

```tsx
{/* Feed wordmark — bump from foreground to zinc-950 for extra crispness on frost */}
<span className="... text-zinc-950 dark:text-white font-semibold tracking-tight antialiased">
  Feed
</span>

{/* Icon buttons — add a very faint pill backdrop so they don't feel "stuck" to the glass */}
<button className="... p-2 rounded-xl
  text-zinc-700 dark:text-zinc-300
  hover:bg-black/[0.05] dark:hover:bg-white/[0.06]
  transition-colors"
>

{/* Search pill — same principle */}
<div className="... bg-zinc-900/[0.05] dark:bg-white/[0.07]">
```

---

### TL;DR of the perception trick

Glass reads as glass over white when there are **three simultaneous signals**: (1) the panel is visibly *lighter/different* from the page (achieved by raising opacity to 0.68 and adding the cool self-tint), (2) edges catch light (the 0.92 top-inset + 0.50 border), and (3) it visibly *floats* (the two-layer shadow + bottom hairline). The old 0.15-opacity panel had none of these signals against a white background.
