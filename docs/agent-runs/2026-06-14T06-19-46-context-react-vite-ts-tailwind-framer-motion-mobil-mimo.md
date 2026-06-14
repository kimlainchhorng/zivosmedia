# MiMo run — 2026-06-14T06:19:46.140Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

Six raw `<button>` / `motion.button` controls already ship `active:scale` + a transition. Every one is a **DON'T-CHURN ring-ONLY append** — no new scale, no flip, no renumber. One control (F — payout-method selector) also gets `aria-pressed` per the house segmented-filter rule. No logic, imports, or handlers change.

---

## Per-control verdict

### A) L101 Header Back icon button — **ring-ONLY, ring-ring, NO flip**

| Item | Value |
|---|---|
| Existing | `active:scale-95` + `transition-transform` + `hover:bg-muted/50` |
| Pre-existing mismatch | `hover:bg-muted/50` snaps on `transition-transform` — **not introduced here, don't fix** |
| Ring | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| Ring color reason | OUTWARD — parent is neutral `bg-background/85` header → `ring-ring` |
| Scale | Keep `95` (icon-only tier), confirmed existing |
| Transition | Keep `transition-transform`, **NO flip** (house rule: ring-only append → keep existing transition) |
| aria | `aria-label="Back"` already present, no change |

**Final string:**
```
h-11 w-11 -ml-2 rounded-full hover:bg-muted/50 active:scale-95 touch-manipulation flex items-center justify-center transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

---

### B) L152 Wallet pill — **ring-ONLY, ring-white/70**

| Item | Value |
|---|---|
| Existing | `active:scale-95` + bare `transition` + `hover:bg-white/15` |
| Ring | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` |
| Ring color reason | OUTWARD — parent is the **dark glassmorphic hero** (near-black gradient) → white ring for contrast |
| Scale | Keep `95` (icon-small-pill tier), confirmed existing |
| Transition | Keep bare `transition`, no flip |
| aria | One-shot nav with visible text → none needed |

**Final string:**
```
h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white/90 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70
```

---

### C) L280 Stream-history card (`motion.button`) — **ring-ONLY, ring-ring**

| Item | Value |
|---|---|
| Existing | `active:scale-[0.99]` + `transition-transform` + `hover:border-primary/30` |
| Pre-existing mismatch | `hover:border-primary/30` snaps on `transition-transform` — not introduced here |
| Ring | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| Ring color reason | OUTWARD — parent is neutral page column `bg-background` → `ring-ring` |
| Scale | Keep `[0.99]` (wide full-width card with own surface tier), confirmed existing |
| Transition | Keep `transition-transform`, **NO flip** |
| aria | One-shot nav with visible text → none needed |

**Final string:**
```
w-full text-left zivo-card-organic p-4 active:scale-[0.99] transition-transform hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

---

### D) L453 Quick-amount chips (mapped template) — **ring-ONLY, ring-ring**

| Item | Value |
|---|---|
| Existing | `active:scale-95` + bare `transition` + `hover:bg` |
| Ring | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| Ring color reason | OUTWARD — parent is neutral `DialogContent` (bg-background) → `ring-ring` |
| Scale | Keep `95` — **do NOT renumber to [0.98]** (house rule: don't renumber existing scale) |
| Transition | Keep bare `transition`, no flip |
| aria | One-shot set-value → none needed |

**Final string:**
```
h-10 px-4 rounded-xl bg-muted text-sm font-extrabold hover:bg-muted/70 active:scale-95 transition tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

---

### E) L462 Max chip — **ring-ONLY, ring-ring**

| Item | Value |
|---|---|
| Existing | `active:scale-95` + bare `transition` + `hover:bg-emerald-500/20` |
| Ring | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| Ring color reason | OUTWARD — parent is neutral `DialogContent` → `ring-ring`. The button's OWN fill (`bg-emerald-500/10`) is a **light tint**, not a saturated/dark surface; the outward ring renders against the neutral dialog parent. |
| Scale | Keep `95`, confirmed existing |
| Transition | Keep bare `transition`, no flip |
| aria | One-shot set-value → none needed |

**Final string:**
```
h-10 px-4 rounded-xl bg-emerald-500/10 text-emerald-600 text-sm font-extrabold hover:bg-emerald-500/20 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

---

### F) L481 Payout-method selector (mapped template) — **ring-ONLY, ring-ring + `aria-pressed`**

| Item | Value |
|---|---|
| Existing | `active:scale-[0.99]` + bare `transition` + conditional border/bg |
| Ring | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (in the **static** template part, outside the ternary) |
| Ring color reason | OUTWARD — parent is neutral `DialogContent` → `ring-ring`. The emerald tint (`bg-emerald-500/5`) is negligible and the border is not a saturated fill. |
| Scale | Keep `[0.99]` (wide full-width card with own bordered surface tier), confirmed existing |
| Transition | Keep bare `transition`, no flip |
| aria | **ADD `aria-pressed={selected}`** |

**aria-pressed rationale:** This IS a persistent single-select with bg-conveyed selection (emerald border + tint + CheckCircle2), functionally identical to a segmented filter. The house rule explicitly covers "persistent single-select segmented filter." Yes, `role="radio"` + `aria-checked` would be more semantically precise, but that requires `role="radiogroup"` on the parent `<div>` — a structural change beyond display-only. `aria-pressed` on a native `<button>` is the established codebase pattern for this pattern (15+ prior slices). Display-only safe.

**Final template (static ring tokens outside ternary):**
```jsx
className={`w-full h-14 px-3.5 rounded-2xl border-2 flex items-center gap-3 active:scale-[0.99] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
  selected
    ? "border-emerald-500 bg-emerald-500/5"
    : "border-border bg-card"
}`}
```
Plus: `aria-pressed={selected}` as a separate JSX attribute.

---

## LEAVE-UNTOUCHED (confirmed)

| Control | Reason |
|---|---|
| Hero Withdraw `<Button>` L194 | shadcn, ships own tokens |
| Amount `<Input>` L437 | shadcn input |
| Confirm-withdrawal `<Button>` L537 | shadcn |
| "Go Live Now" `<Button>` L606 | shadcn (already has `active:scale-[0.97]`) |
| Hero `motion.div` L117 | Entrance + pulse anim, no onClick — presentational |
| Stats `motion.div`s L210 | Entrance anim, no onClick — presentational |
| Withdrawal-history rows L362 | Plain `<div>`, no onClick |
| `<Badge>`s, CountUp, progress bars, floating icons | Decorative |
| Dialog itself | shadcn, ships focus trap |
| EmptyStreamsState decorative blobs | Presentational |

---

## Proposed diff

**File:** `src/pages/CreatorLiveEarningsPage.tsx`

```diff
*** A) L101 — Back button (ring-ONLY append)
-            className="h-11 w-11 -ml-2 rounded-full hover:bg-muted/50 active:scale-95 touch-manipulation flex items-center justify-center transition-transform"
+            className="h-11 w-11 -ml-2 rounded-full hover:bg-muted/50 active:scale-95 touch-manipulation flex items-center justify-center transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

*** B) L152 — Wallet pill (ring-ONLY append, ring-white/70)
-                className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white/90 active:scale-95 transition"
+                className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white/90 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"

*** C) L280 — Stream-history card (ring-ONLY append)
-                    className="w-full text-left zivo-card-organic p-4 active:scale-[0.99] transition-transform hover:border-primary/30"
+                    className="w-full text-left zivo-card-organic p-4 active:scale-[0.99] transition-transform hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

*** D) L453 — Quick-amount chips (ring-ONLY append)
-                  className="h-10 px-4 rounded-xl bg-muted text-sm font-extrabold hover:bg-muted/70 active:scale-95 transition tabular-nums"
+                  className="h-10 px-4 rounded-xl bg-muted text-sm font-extrabold hover:bg-muted/70 active:scale-95 transition tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

*** E) L462 — Max chip (ring-ONLY append)
-                  className="h-10 px-4 rounded-xl bg-emerald-500/10 text-emerald-600 text-sm font-extrabold hover:bg-emerald-500/20 active:scale-95 transition"
+                  className="h-10 px-4 rounded-xl bg-emerald-500/10 text-emerald-600 text-sm font-extrabold hover:bg-emerald-500/20 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

*** F) L481 — Payout-method selector (ring-ONLY append + aria-pressed)
                     <button type="button"
                       key={m.id}
                       onClick={() => setMethod(m.id)}
-                      className={`w-full h-14 px-3.5 rounded-2xl border-2 flex items-center gap-3 active:scale-[0.99] transition ${
+                      aria-pressed={selected}
+                      className={`w-full h-14 px-3.5 rounded-2xl border-2 flex items-center gap-3 active:scale-[0.99] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                         selected
```

---

## Summary of changes

| Control | className edits | aria edits | Scale kept? | Flip? | Ring color |
|---|---|---|---|---|---|
| A Back | 1 | 0 | `95` ✓ | NO | `ring-ring` |
| B Wallet pill | 1 | 0 | `95` ✓ | NO | `ring-white/70` |
| C Stream card | 1 | 0 | `[0.99]` ✓ | NO | `ring-ring` |
| D Quick-amount | 1 | 0 | `95` ✓ | NO | `ring-ring` |
| E Max chip | 1 | 0 | `95` ✓ | NO | `ring-ring` |
| F Payout-method | 1 | 1 (`aria-pressed`) | `[0.99]` ✓ | NO | `ring-ring` |
| **Total** | **6** | **1** | **all kept** | **0** | |

**Post-apply guard-grep expectations:** `focus-visible:ring` = 6, `ring-white/70` = 1 (B), `ring-inset` = 0, `aria-pressed` = 1 (F), fresh `active:scale` = 0, FLIPs = 0, `transition-all` = 0 new (all existing transitions preserved).

## Owner verification

1. Apply the diff above (6 className edits + 1 aria attr, 0 logic lines).
2. Run `npm run update` — must exit 0 (type-check + worker type-check + production build).
3. Preview at 375/768/1280 — all six controls should show visible focus rings on Tab navigation; the Wallet pill's ring should be white on the dark hero; F should announce "Bank Transfer, pressed" / "ABA / Payway, pressed" to screen readers when selected.
4. No deploy until owner confirms.
