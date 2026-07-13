# DeepSeek run — 2026-06-14T06:18:10.379Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/CreatorLiveEarningsPage.tsx (creator live-stream gift-earnings dashboard: dark glassmorphic hero earnings card with animated CountUp + a "Wallet" pill + a big Withdraw CTA; a 2-col animated stats grid; a "How it works" note; per-stream history cards; withdrawal history; and a Withdraw <Dialog> with amount input + quick-amount chips + a Max chip + a 2-option payout-method selector + summary + confirm). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState, hooks (useLiveEarnings / useRequestLiveEarningsPayout), mutateAsync, byte-identical. Don't add a SECOND competing press effect; don't churn already-polished controls; don't renumber an existing active:scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT = ring-white/70. A gradient/tinted-FILLED button sitting ON a neutral parent still uses ring-ring (the outward ring renders against the neutral parent, not the fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip active:scale-[0.97]; wide full-width row/card WITH its own bordered/filled surface active:scale-[0.98]; BARE full-width row NO surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border. FLIP RULE: a control with transition-colors GAINING a NEW active:scale MUST flip to transition-all. transition-transform already includes transform → NO flip when only adding scale. If a control ALREADY has active:scale + a transition, append ring ONLY (keep its existing transition class + scale number; no flip — do NOT renumber the scale).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, clear, set-value).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier [confirm: keep existing or renumber?], transition class + whether a FLIP is needed, and any aria-* attr; flag any to LEAVE untouched). Note ALL SIX already ship `active:scale` + a transition, so I expect every one to be a DON'T-CHURN ring-ONLY append — please confirm and supply the exact ring color per control:

A) L101 header Back icon button (raw `<button>`): `className="h-11 w-11 -ml-2 rounded-full hover:bg-muted/50 active:scale-95 touch-manipulation flex items-center justify-center transition-transform"` ALREADY `aria-label="Back"`, onClick navigate(-1). Icon-only, one-shot. ALREADY `active:scale-95` + `transition-transform` (NOTE: it also has `hover:bg-muted/50`, a hover BG, yet sits on `transition-transform` so the bg snaps instantly — a PRE-EXISTING mismatch). Parent is the neutral sticky header (bg-background/85). → ring-ONLY append ring-ring (keep `transition-transform`, do NOT flip — no new scale)? Or does adding the ring justify flipping transition-transform→transition-all so the pre-existing hover:bg also eases? (House rule says keep existing transition on a ring-only append — confirm.)

B) L152 "Wallet" pill button (raw `<button>`, INSIDE the dark glassmorphic hero card): `className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white/90 active:scale-95 transition"` onClick navigate("/account/wallet"). Small text pill, one-shot. ALREADY `active:scale-95` + bare `transition` + `hover:bg-white/15`. Its PARENT surface is the dark glassmorphic hero card (layered near-black gradient `from-slate-900 via-zinc-900 to-black`). → ring-ONLY append; ring color (parent is the dark hero card)?

C) L280 Stream-history card (motion.button, mapped over `streams`): `className="w-full text-left zivo-card-organic p-4 active:scale-[0.99] transition-transform hover:border-primary/30"` onClick navigate("/live-streams"). Full-width card WITH its own surface (`zivo-card-organic` = a card bg + border utility). ALREADY `active:scale-[0.99]` + `transition-transform` (also `hover:border-primary/30`, a hover border on `transition-transform` — PRE-EXISTING snap). Parent is the neutral page column (bg-background). → ring-ONLY append ring-ring (keep `[0.99]` + `transition-transform`, no flip)?

D) L453 Quick-amount chips (raw `<button>`, mapped over QUICK_AMOUNTS, in the Withdraw Dialog): `className="h-10 px-4 rounded-xl bg-muted text-sm font-extrabold hover:bg-muted/70 active:scale-95 transition tabular-nums"` onClick setAmount(String(a)). Medium pill, one-shot (sets the amount field). ALREADY `active:scale-95` + bare `transition` + `hover:bg`. Parent is the neutral DialogContent (bg-background). → ring-ONLY append ring-ring (keep existing `active:scale-95`, do NOT renumber to [0.98])?

E) L462 "Max" chip (raw `<button>`, in the Withdraw Dialog): `className="h-10 px-4 rounded-xl bg-emerald-500/10 text-emerald-600 text-sm font-extrabold hover:bg-emerald-500/20 active:scale-95 transition"` onClick setAmount(max). Medium tinted pill, one-shot. ALREADY `active:scale-95` + bare `transition` + `hover:bg`. Parent is the neutral DialogContent. The button's OWN fill is `bg-emerald-500/10` (a tint on a neutral parent). → ring-ONLY append; ring color (tinted fill on neutral dialog parent — ring-ring or ring-white/70)?

F) L481 Payout-method selector buttons (raw `<button>`, mapped over PAYOUT_METHODS [2 options: Bank Transfer / ABA-Payway], in the Withdraw Dialog): `className={`w-full h-14 px-3.5 rounded-2xl border-2 flex items-center gap-3 active:scale-[0.99] transition ${selected ? "border-emerald-500 bg-emerald-500/5" : "border-border bg-card"}`}` onClick setMethod(m.id). This is a PERSISTENT single-select option list — the chosen method is conveyed by an emerald border + tinted bg + a trailing CheckCircle2 icon, and `method` state persists (drives the actual payout). ALREADY `active:scale-[0.99]` + bare `transition`. Parent is the neutral DialogContent. → ring-ONLY append ring-ring (keep `[0.99]`)? AND: is this single-select-with-bg-conveyed-selection a candidate for `aria-pressed={selected}` (like a segmented filter / two-way bg-toggle) — OR is aria-pressed wrong here because it's really radio-group semantics (which would need role="radio"+aria-checked, beyond a display-only pass)? Decide whether to ADD `aria-pressed={selected}` or add NO aria.

ALSO CONFIRM I should LEAVE these (shadcn `<Button>` ship their own focus/scale tokens; or native; or presentational): hero Withdraw `<Button>` L194 (shadcn, big white CTA); the amount `<Input>` L437 (shadcn input); Confirm-withdrawal `<Button>` L537 (shadcn); EmptyStreamsState "Go Live Now" `<Button>` L606 (shadcn); the hero `motion.div` L117 (entrance + pulse anim, NO onClick — presentational); stats `motion.div`s L210 (entrance anim, NO onClick — presentational); withdrawal-history rows L362 (plain `<div>`, NO onClick); the `<Badge>`s, CountUp, progress bars, floating empty-state gift icons (decorative). Also the Dialog itself (shadcn, ships focus trap).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Note A is one button; B/C one each; D/F are mapped templates (single edit hits all instances); E one button.
- files: src/pages/CreatorLiveEarningsPage.tsx

---

# Plan

This is a **ring-ONLY append pass** on `src/pages/CreatorLiveEarningsPage.tsx`. All 6 interactive controls already ship `active:scale` + a transition — no new press scales, no flips, no renumbering. I'll append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-{color}` to each, plus one `aria-pressed` on the payout-method selector.

---

## Proposed diff

**File:** `src/pages/CreatorLiveEarningsPage.tsx`

### A) L101 header Back icon button

**Before:**
```tsx
className="h-11 w-11 -ml-2 rounded-full hover:bg-muted/50 active:scale-95 touch-manipulation flex items-center justify-center transition-transform"
```

**After:**
```tsx
className="h-11 w-11 -ml-2 rounded-full hover:bg-muted/50 active:scale-95 touch-manipulation flex items-center justify-center transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- **Ring color:** `ring-ring` — parent is the neutral sticky header (`bg-background/85`)
- **Press tier:** keep existing `active:scale-95` (icon-only)
- **Transition:** keep `transition-transform` — **no flip** (ring-only append, house rule says keep existing transition)
- **Aria:** already has `aria-label="Back"` — no change

---

### B) L152 "Wallet" pill button

**Before:**
```tsx
className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white/90 active:scale-95 transition"
```

**After:**
```tsx
className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white/90 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```

- **Ring color:** `ring-white/70` — parent IS the dark glassmorphic hero card (saturated dark surface `from-slate-900 via-zinc-900 to-black`), so outward ring needs white for contrast
- **Press tier:** keep existing `active:scale-95` (small text pill)
- **Transition:** keep bare `transition` — **no flip** (ring-only append)
- **Aria:** one-shot nav with visible text → no `aria-pressed`

---

### C) L280 Stream-history card

**Before:**
```tsx
className="w-full text-left zivo-card-organic p-4 active:scale-[0.99] transition-transform hover:border-primary/30"
```

**After:**
```tsx
className="w-full text-left zivo-card-organic p-4 active:scale-[0.99] transition-transform hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- **Ring color:** `ring-ring` — parent is the neutral page column (`bg-background`); the card's own surface (`zivo-card-organic`) is a neutral card bg, and the outward ring renders against the neutral page column
- **Press tier:** keep existing `active:scale-[0.99]` (wide full-width card with own surface)
- **Transition:** keep `transition-transform` — **no flip** (ring-only append)
- **Aria:** one-shot nav with visible text → no `aria-pressed`

---

### D) L453 Quick-amount chips (mapped template)

**Before:**
```tsx
className="h-10 px-4 rounded-xl bg-muted text-sm font-extrabold hover:bg-muted/70 active:scale-95 transition tabular-nums"
```

**After:**
```tsx
className="h-10 px-4 rounded-xl bg-muted text-sm font-extrabold hover:bg-muted/70 active:scale-95 transition tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- **Ring color:** `ring-ring` — parent is the neutral DialogContent (`bg-background`)
- **Press tier:** keep existing `active:scale-95` (medium pill, **do NOT renumber to [0.98]**)
- **Transition:** keep bare `transition` — **no flip** (ring-only append)
- **Aria:** one-shot set-value → no `aria-pressed`

---

### E) L462 "Max" chip

**Before:**
```tsx
className="h-10 px-4 rounded-xl bg-emerald-500/10 text-emerald-600 text-sm font-extrabold hover:bg-emerald-500/20 active:scale-95 transition"
```

**After:**
```tsx
className="h-10 px-4 rounded-xl bg-emerald-500/10 text-emerald-600 text-sm font-extrabold hover:bg-emerald-500/20 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- **Ring color:** `ring-ring` — the button's OWN fill is `bg-emerald-500/10` (a tint), but its PARENT is the neutral DialogContent (`bg-background`). Per house rule: "A gradient/tinted-FILLED button sitting ON a neutral parent still uses ring-ring (the outward ring renders against the neutral parent, not the fill)."
- **Press tier:** keep existing `active:scale-95` (medium pill, **do NOT renumber to [0.98]**)
- **Transition:** keep bare `transition` — **no flip** (ring-only append)
- **Aria:** one-shot set-value → no `aria-pressed`

---

### F) L481 Payout-method selector buttons (mapped template)

**Before:**
```tsx
className={`w-full h-14 px-3.5 rounded-2xl border-2 flex items-center gap-3 active:scale-[0.99] transition ${
  selected
    ? "border-emerald-500 bg-emerald-500/5"
    : "border-border bg-card"
}`}
```

**After:**
```tsx
className={`w-full h-14 px-3.5 rounded-2xl border-2 flex items-center gap-3 active:scale-[0.99] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
  selected
    ? "border-emerald-500 bg-emerald-500/5"
    : "border-border bg-card"
}`}
```

- **Ring color:** `ring-ring` — parent is the neutral DialogContent (`bg-background`)
- **Press tier:** keep existing `active:scale-[0.99]` (wide full-width row with own bordered surface)
- **Transition:** keep bare `transition` — **no flip** (ring-only append)
- **Aria:** **ADD `aria-pressed={selected}`** — this IS a persistent single-select option list where selection is conveyed by bg (`bg-emerald-500/5` + `border-emerald-500`). While radio-group semantics (`role="radio"` + `aria-checked`) would be more semantically correct, that's a structural change beyond a display-only pass. `aria-pressed` is the closest display-only attribute that communicates the toggle state to screen readers, matching the precedent set on segmented filter chips (e.g., SurveysPage, RecommendationScoresPage). The two-option list with bg-conveyed selection is analogous to a segmented filter.

---

### Controls to LEAVE untouched (confirmed)

| Control | Reason |
|---------|--------|
| Hero Withdraw `<Button>` L194 | shadcn — ships own focus/scale tokens |
| Amount `<Input>` L437 | shadcn input — native focus ring |
| Confirm-withdrawal `<Button>` L537 | shadcn — ships own focus/scale tokens |
| "Go Live Now" `<Button>` L606 | shadcn — ships own focus/scale tokens |
| Hero `motion.div` L117 | Entrance + pulse anim, NO onClick — presentational |
| Stats `motion.div`s L210 | Entrance anim, NO onClick — presentational |
| Withdrawal-history rows L362 | Plain `<div>`, NO onClick |
| `<Badge>`s, CountUp, progress bars, floating gift icons | Decorative / non-interactive |
| Dialog itself | shadcn — ships focus trap |

---

## Summary of changes

| Control | Edit type | Ring color | Aria |
|---------|-----------|------------|------|
| A) Back icon | ring-ONLY append | `ring-ring` | (already has `aria-label`) |
| B) Wallet pill | ring-ONLY append | `ring-white/70` | — |
| C) Stream card | ring-ONLY append | `ring-ring` | — |
| D) Quick-amount chips | ring-ONLY append | `ring-ring` | — |
| E) Max chip | ring-ONLY append | `ring-ring` | — |
| F) Payout-method buttons | ring-ONLY append + aria | `ring-ring` | `aria-pressed={selected}` |

**0 new press scales, 0 flips, 0 renumberings, 0 logic lines touched.** All 6 controls confirmed as DON'T-CHURN ring-only appends.

---

## Verify

Run `npm run update` — must pass (type-check + worker type-check + production build). Then preview at `/creator/live-earnings` on mobile (375px) and desktop to confirm rings render cleanly against their parent surfaces.
