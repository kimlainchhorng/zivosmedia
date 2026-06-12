# MiMo run — 2026-06-12T19:07:16.377Z

- model: mimo-v2.5-pro
- task: Code review (report only, do not rewrite). Review src/components/hubs/HubScaffold.tsx — a shared premium shell (Header + hero with badge/gradient-title/subtitle/primaryCta + a 'browse' button that smooth-scrolls to a ref'd listings section + a 'how it works' steps strip using framer-motion whileInView + Footer). It is consumed by VoiceRoomsHubPage and FitnessHubPage. Check for: (1) real runtime or TypeScript bugs; (2) a11y gaps — focus-visible rings, aria, heading order (multiple h2s?), icon-only buttons without labels; (3) the framer-motion whileInView on steps — can above-the-fold steps get stuck at opacity:0 if the IntersectionObserver doesn't fire? (4) responsive issues at 375/768/1280. Give concrete findings with line numbers, terse. No fluff.
- files: src/components/hubs/HubScaffold.tsx

---

## Code Review: `src/components/hubs/HubScaffold.tsx`

No rewrite proposed. Findings only, grouped by severity.

---

### (1) Runtime / TypeScript bugs

**None found.** Types are clean, optional chaining on `primaryCta?.icon` is correct, `listingsRef` optional-chained, defaults are sound. No leaked state or missing deps.

---

### (2) a11y gaps

**A. Step number badges need `aria-hidden` (~line 117)**
The decorative `<span>{i + 1}</span>` on each step icon circle is read aloud by screen readers ("1… 2… 3…") after the step title, creating redundant output since DOM order already conveys sequence.
```tsx
// before
<span className="absolute -top-1 -right-1 w-5 h-5 ...">{i + 1}</span>
// after
<span aria-hidden className="absolute -top-1 -right-1 w-5 h-5 ...">{i + 1}</span>
```

**B. Steps container should be an ordered list (~lines 110-128)**
"How it works" steps are sequential instructions — semantically they're a `<ol>`, not a `div` grid. Screen reader users lose list-navigation shortcuts (VoiceOver rotor → Lists, NVDA `L` key). The grid CSS works on `<ol>` children via `display: contents` on each `<li>`, or just style the `<ol>` itself as grid.
```
// before:  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 ...">
// after:   <ol className="grid grid-cols-1 sm:grid-cols-3 gap-6 list-none ...">
//          <li> wrappers around each motion.div
```

**C. Browse button missing `ring-offset` (~line 93)**
Primary CTA has `focus-visible:ring-offset-2 ring-offset-background`; the browse button only has `ring-2 ring-ring` with no offset. On dark card backgrounds the ring may clip against the button edge. Minor inconsistency.

**D. No explicit `prefers-reduced-motion` handling**
The component doesn't import `useReducedMotion`. Framer-motion v10+ auto-detects and skips transitions, but the AGENTS.md mandates explicit reduced-motion awareness. The `initial: { opacity: 0, y: 24 }` on the hero (line 75) and steps (line 109) means elements start invisible — with reduced motion, framer-motion still applies `initial` before jumping to final, producing a 1–2 frame flash of invisible content that animation would normally mask. A `useReducedMotion` guard that sets `initial` to the final state when true eliminates this.

---

### (3) framer-motion `whileInView` stalling

**Above-the-fold steps CAN briefly stall at opacity: 0 (~lines 109-112).**

```tsx
initial={{ opacity: 0, y: 16 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
```

The IntersectionObserver fires within 1–2 frames for elements already in the viewport on mount. During that window, the step content is invisible (`opacity: 0`). On fast loads this is a flash; on slow/busy browsers it's perceptible. Combined with finding **2D** (reduced motion skips the transition entirely, making the flash more visible), this is a real concern.

**Concrete fix direction:** For elements guaranteed above the fold, use `animate` instead of `whileInView`, or add a CSS `@media (prefers-reduced-motion: no-preference)` gate on the initial hidden state. The hero already uses `animate` correctly — the steps should follow the same pattern if the viewport is < ~900px tall (mobile).

**`viewport={{ once: true }}` is correct** — prevents re-animation on scroll-back. ✅

---

### (4) Responsive

**A. `scroll-mt-28` is hardcoded (~line 125)**
Assumes the `Header` component is exactly `7rem` (112px) tall. If the header height varies by breakpoint, auth state (different nav items), or platform (mobile Safari toolbar), the smooth-scroll lands at the wrong offset — listings section appears slightly cut off or too low. Should read the header height dynamically or use a CSS custom property coordinated with `Header`.

**B. No issues at 375 / 768 / 1280 otherwise.**
- Hero: `text-3xl sm:text-4xl md:text-5xl`, `py-8 sm:py-10` ✅
- Steps: `grid-cols-1 sm:grid-cols-3` stacks correctly on mobile ✅
- Step desc `max-w-[14rem]` fits within 375px minus padding (343px available) ✅
- Buttons `flex-wrap gap-3` — two buttons fit in one row at 375px (~280px); wraps gracefully if labels are long ✅
- Listings `container mx-auto px-4` — standard responsive ✅

---

### Summary table

| # | Finding | Severity | Line(s) |
|---|---------|----------|---------|
| 2A | Step number badges missing `aria-hidden` | Medium | ~117 |
| 2B | Steps should be `<ol>` not `<div>` | Medium | ~110 |
| 2C | Browse button missing `ring-offset` | Low | ~93 |
| 2D | No explicit `useReducedMotion` guard | Medium | 75, 109 |
| 3 | Above-the-fold steps flash `opacity:0` before IO fires | Medium | 109-112 |
| 4A | `scroll-mt-28` hardcoded, doesn't track header height | Low | 125 |

No blockers. The component is well-structured and the TypeScript is clean. The findings are polish/a11y, not correctness — apply at your discretion.
