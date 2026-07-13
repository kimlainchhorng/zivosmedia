# MiMo run — 2026-06-14T12:18:33.187Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: TASK: Premium interaction-token + a11y className pass for src/pages/AITripPlanner.tsx (customer-facing public AI Trip Planner — marketing/teal-slate palette, NavBar+Footer, multi-step planner card + recommended-destination cards).

STRICT CONSTRAINTS — className-only + tiny display-only aria attrs (aria-label / aria-pressed / aria-expanded ONLY). NO logic, NO handlers, NO state, NO routing, NO new framer props, NO tabIndex/role/onKeyDown. Buttons with NO onClick (non-functional placeholders) are FLAGGED to owner — but STILL receive the className interaction tokens (they are real <button>s that render). Do NOT add the missing handler.

INTERACTION-TOKEN RULES (parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button> get: active:scale-[X] + a transition utility + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Scale tiers: icon-only = scale-95; small/pill chips & segmented = [0.97]; self-contained selectable cards = [0.98]; full-width/wide rows = [0.99].
- transition: a Tailwind BARE `transition` shorthand already covers transform → when a button has `transition` + hover:bg/text/translate, just APPEND active:scale (NO flip). transition-transform for pure press-scale with NO hover color. FLIP transition-colors->transition-all only when adding scale alongside a color hover with transition-colors.
- ring: outward ring-ring default; ring-white/70 when the ring renders OVER a photographic/image surface; ring-inset only when flush inside a SEPARATE overflow-hidden rounded ancestor.
- aria: aria-pressed for toggle buttons whose on/off (or selected) state is conveyed by BACKGROUND/BORDER fill with constant label content — applies to BOTH single-select pickers AND multi-select toggle chips (each chip is independently pressed). icon-only button with no visible text + no aria-label -> ADD aria-label; with one -> KEEP.

CONTROL INVENTORY (8 raw <button>; everything else on this page is shadcn <Button> = SKIP, ships own tokens — that includes the +/- traveler steppers L304/L318, the Back/Continue/Build/New-search L524-554, Tune-request L633, and DatePickerButton's trigger):

1. L260 quickDestinations chip (step 1, MAPPED x5). Single-select, selection bg-conveyed cn() `destination === quick.label ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white/80"`. onClick={() => setDestination(quick.label)}. Visible img+text. cn() STATIC base: `flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white` (has bare `transition` + hover translate/color). NO scale/ring/aria.
2. L350 budgetLevels card (step 3, MAPPED x3). Single-select, cn() `budget === level.value ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white"`. onClick={() => setBudget(level.value)}. Visible icon+label+description, p-4 tile in grid sm:grid-cols-3. STATIC base: `rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300`. QUESTION: card tier [0.98] or chip [0.97]?
3. L367 interestOptions chip (step 3, MAPPED x6). MULTI-select toggle, cn() `interests.includes(id) ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-teal-300"`. onClick={() => toggleInterest(interest.id)}. Visible icon+text. STATIC base: `flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition`. QUESTION: aria-pressed valid for MULTI-select toggle chips?
4. L580 interestOptions chip (InsightPanel section, MAPPED x6). Same multi-select toggle as #3. cn() `interests.includes(id) ? "border-teal-500 bg-teal-600 text-white" : "...hover:border-teal-300"`. STATIC base: `flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition`.
5. L849 DestinationCard favorite heart (icon-only). HAS aria-label `Favorite ${city}`. NO onClick (non-functional placeholder — FLAG). className `absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:text-rose-600`. Sits OVER the card's h-48 <img> media surface. QUESTION: ring-white/70 (over image) + icon scale-95, keep aria-label, flag missing onClick?
6. L884 DestinationCard Save (text+icon). onClick={onSave}, disabled={saving}. Segmented action bar `grid grid-cols-[1fr_1fr_auto]`. className `flex min-h-12 items-center justify-center gap-2 border-r border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60`. Visible text.
7. L893 DestinationCard Start (text+icon). onClick={onStart}. Same segmented bar. className `flex min-h-12 items-center justify-center gap-2 border-r border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50`. Visible text.
8. L901 DestinationCard Share (icon-only). HAS aria-label `Share ${city}`. NO onClick (non-functional placeholder — FLAG). Same segmented bar (auto col). className `flex min-h-12 w-12 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-950`. NOT over media (white action bar).

DELIVERABLE: For EACH of the 8 controls give the EXACT className delta (what to append / flip) and any aria attr. Answer the lettered QUESTIONS. Confirm ring color per control (outward ring-ring vs ring-white/70 over the card image for #5). Confirm scale tier for #2. Confirm aria-pressed for the multi-select toggles #3/#4. Be concise — per-control list. Do NOT rewrite the file.
- files: src/pages/AITripPlanner.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Per-control premium interaction-token + a11y className pass for `src/pages/AITripPlanner.tsx`. 8 raw `<button>` controls only — all shadcn `<Button>` instances (traveller steppers, Back/Continue/Build/New-search, Tune-request, DatePickerButton trigger) are **SKIPPED** (own tokens). Answering the 3 questions inline, then the per-control list.

---

## Answers to Questions

**Q1 — Scale tier for #2 (budgetLevels card)?**
**Card tier `[0.98]`**. These are self-contained selectable cards (`p-4`, icon + bold label + description, inside a `sm:grid-cols-3` grid) — not small pills or chips.

**Q2 — `aria-pressed` for multi-select toggles #3/#4?**
**Yes**. The rules explicitly state `aria-pressed` "applies to BOTH single-select pickers AND multi-select toggle chips (each chip is independently pressed)." Each interest chip is independently toggleable; its selected state is conveyed by bg/border fill with constant label content.

**Q3 — Ring color for #5 (favorite heart)?**
**`ring-white/70`**. The heart `<button>` is absolutely positioned inside the card's `h-48` image container — the ring renders directly over the `<img>` media surface.

---

## Per-Control List (8 controls)

### #1 — L260 quickDestinations chip (×5 mapped, step 1)

Single-select, bg-conveyed. Bare `transition` + `hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white` already covers transform.

**APPEND** to the `cn()` STATIC arg:
```
 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
**ADD** `aria-pressed={destination === quick.label}` on the `<button>`.

- NO FLIP (bare `transition` already covers transform).
- Ring: **outward `ring-ring`** — neutral `bg-[#f6fbff]` page.
- Tier: small/pill chip → `[0.97]`.

Static arg after:
```
"flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### #2 — L350 budgetLevels card (×3 mapped, step 3)

Single-select, bg-conveyed. Bare `transition` + `hover:-translate-y-0.5 hover:border-teal-300` already covers transform.

**APPEND** to the `cn()` STATIC arg:
```
 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
**ADD** `aria-pressed={budget === level.value}` on the `<button>`.

- NO FLIP.
- Ring: **outward `ring-ring`** — neutral white panel.
- Tier: **self-contained selectable card → `[0.98]`**.

Static arg after:
```
"rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### #3 — L367 interestOptions chip (×6 mapped, step 3)

Multi-select toggle, bg-conveyed. Bare `transition` (no `transition-colors` → already covers all props).

**APPEND** to the `cn()` STATIC arg:
```
 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
**ADD** `aria-pressed={interests.includes(interest.id)}` on the `<button>`.

- NO FLIP (bare `transition` covers transform).
- Ring: **outward `ring-ring`** — neutral white planner panel.
- Tier: small/pill chip → `[0.97]`.

Static arg after:
```
"flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### #4 — L580 interestOptions chip (×6 mapped, InsightPanel section)

Same multi-select toggle pattern as #3. Bare `transition`.

**APPEND** to the `cn()` STATIC arg:
```
 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
**ADD** `aria-pressed={interests.includes(interest.id)}` on the `<button>`.

- NO FLIP.
- Ring: **outward `ring-ring`** — the InsightPanel has `bg-teal-50` with a faint 20% opacity decorative image; chips have their own white/teal-600 fill. Not a photographic surface → `ring-ring`.
- Tier: `[0.97]`.

Static arg after:
```
"flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### #5 — L849 DestinationCard favorite heart (icon-only, ×N mapped)

HAS `aria-label={`Favorite ${destination.city}`}` → **KEEP**. NO onClick → **FLAG to owner** (non-functional placeholder, but still receives tokens since it's a real `<button>` rendering).

**APPEND** to the className string:
```
 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70
```

- NO FLIP (bare `transition` covers transform; `hover:text-rose-600` is a colour change but `transition` is the superset).
- Ring: **`ring-white/70`** — button is `absolute right-4 top-4` inside the card's `relative h-48 overflow-hidden` image container; the ring renders over the `<img>` media surface.
- Tier: **icon-only → `scale-95`**.

ClassName after:
```
"absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:text-rose-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```

---

### #6 — L884 DestinationCard Save (text+icon, segmented action bar)

`onClick={onSave}`, `disabled={saving}`. Bare `transition` + `hover:bg-slate-50`.

**APPEND** to the className string:
```
 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

- NO FLIP (bare `transition` covers transform).
- Ring: **outward `ring-ring`** — white action bar.
- Tier: segmented 3-col grid → `[0.97]`.

ClassName after:
```
"flex min-h-12 items-center justify-center gap-2 border-r border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### #7 — L893 DestinationCard Start (text+icon, segmented action bar)

`onClick={onStart}`. Bare `transition` + `hover:bg-slate-50`.

**APPEND** to the className string:
```
 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

- NO FLIP.
- Ring: **outward `ring-ring`**.
- Tier: `[0.97]`.

ClassName after:
```
"flex min-h-12 items-center justify-center gap-2 border-r border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### #8 — L901 DestinationCard Share (icon-only, segmented action bar)

HAS `aria-label={`Share ${destination.city}`}` → **KEEP**. NO onClick → **FLAG to owner**.

**APPEND** to the className string:
```
 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

- NO FLIP (bare `transition` covers transform).
- Ring: **outward `ring-ring`** — white action bar, NOT over media.
- Tier: **icon-only → `scale-95`**.

ClassName after:
```
"flex min-h-12 w-12 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Guard Tally

| Metric | Count |
|---|---|
| className edits | **8** |
| `aria-pressed` new | **4** (#1, #2, #3, #4) |
| `aria-label` new | **0** (#5, #8 already had one → kept) |
| `focus-visible:ring` | **8** (all 8 controls) |
| `ring-ring` (outward) | **7** (#1–4, #6–8) |
| `ring-white/70` (over image) | **1** (#5) |
| `ring-inset` | **0** |
| `active:scale-[0.97]` | **5** (#1, #3, #4, #6, #7) |
| `active:scale-[0.98]` | **1** (#2) |
| `active:scale-95` | **2** (#5, #8) |
| FLIPs | **0** (all controls already have bare `transition`, the superset) |
| Competing 2nd press added | **0** |
| Logic/handler lines touched | **0** |
| Controls FLAGGED (no onClick) | **2** (#5 heart, #8 share — owner to wire) |

## SKIPPED (own tokens — shadcn `<Button>`)

- L304/L318 traveller −/+ steppers
- L524 Back, L535 Continue, L541 Build, L549 New-search
- L633 Tune-request
- DatePickerButton `<PopoverTrigger asChild><Button>` trigger

## Owner Flags

- **#5 (heart) and #8 (share) have no `onClick`** — they render as real `<button>`s and received tokens, but are non-functional placeholders. The owner must wire `onFavorite` / `onShare` handlers.
- The multi-select interest chips (#3, #4) use `aria-pressed` (house pattern). A `role="group"` + `aria-label="Travel interests"` on the wrapping `<div>` would be more semantically precise but is STRUCTURAL → flagged.
- Sub-44px tap targets: #5 heart is `h-10 w-10` (40px) and #8 share is `min-h-12 w-12` (48×48) — the heart is slightly below 44px guideline but matches the repo's icon-button scale; flagged for a repo-wide sweep.
