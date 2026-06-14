# MiMo run — 2026-06-14T04:44:51.906Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and confirm whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/P2PMoneyPage.tsx (a "P2P Money" sends/receives history page reached by in-app navigation; useNavigate; useAuth user; @tanstack/react-query reads p2p_transfers + public_profiles from Supabase; respond(id, accept) optimistically updates a transfer to completed/declined; `tab` useState<"all"|"in"|"out"|"pending">. Layout: a sticky header [shadcn ghost icon Button "Back" + a DollarSign icon-pill + gradient title]; a gradient summary card [motion.div, presentational, 3 totals]; a horizontal segmented filter row [4 RAW <button> chips: all/in/out/pending]; a loading skeleton; an empty state; then a transfers list — per-row motion.div [entrance anim, NO onClick] each holding an avatar, direction badge, name, status chip, time, note, amount, and — only when the row is a pending request you received — a 2-button icon action cluster [Accept Check button + Decline X button].)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: the supabase queries, respond() mutation + optimistic setQueryData, every onClick, the navigate, react-query keys, the tab state, toast calls, the cn() conditionals' selection logic. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we apply consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset only when the control is a flush edge child of a rounded overflow-hidden parent.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the ONLY animated property; transition-all when there is ALSO a hover:bg/text/border/opacity that should animate alongside the press; transition-opacity when only opacity animates. FLIP RULE: a control that currently ships `transition-colors` (eases ONLY color/bg/border, NOT transform) and is GAINING a NEW active:scale MUST flip transition-colors -> transition-all. A control that already ships `transition-all` already covers transform -> NO flip when adding active:scale. (If scale is added via framer whileTap, framer drives transform and no flip is needed.)
- NO-OP / pre-existing-press policy: if a control already ships a press affordance (active:scale-95/90, active:opacity-*), KEEP it and do NOT renumber.
- aria-label ONLY on icon-only / image-only controls (visible text -> NO aria-label). aria-pressed ONLY on a PERSISTENT toggle/segmented control whose on/off selection is conveyed by bg and which you can toggle BOTH ways; NOT on a one-shot action, NOT on a control disabled in its "on" state, NOT when an icon-fill/badge already conveys the state, NOT when role=tab.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale / transition, keep it.

RING COLOR: --ring resolves to BLACK in this app. An OUTWARD ring renders against the control's PARENT surface (not the control's own fill). A control whose outward ring renders against a neutral bg-card/bg-background/bg-muted parent uses ring-ring; a control whose ring renders ON a gradient/image surface uses ring-white/70. NOTE: a gradient-FILLED button (e.g. bg-ig-gradient) sitting on a NEUTRAL parent still uses ring-ring, because the OUTWARD ring renders against the neutral parent, not the button's own gradient fill.

COMPONENT-TYPE RULES we follow:
- shadcn <Button> ships built-in tokens -> leave untouched.
- A framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> ships NO tokens.

MY PLANNED EDITS (please confirm each is right, or correct it):

A. Segmented filter chips (L153, RAW <button>, 4 chips all/in/out/pending, VISIBLE TEXT capitalized, onClick={() => setTab(t)}, className via cn() base "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize" + conditional [selected: "bg-ig-gradient text-white shadow-sm" / unselected: "bg-secondary text-foreground hover:bg-muted"] — HAS transition-all + hover:bg on unselected, NO scale/ring; the chip row sits on the neutral page bg-background; selection conveyed by bg-ig-gradient vs bg-secondary):
   plan: APPEND to the cn() base `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (segmented filter chip tier 0.97; transition-all already present -> NO flip; visible text -> NO aria-label; OUTWARD ring-ring because the ring renders against the neutral bg-background parent, NOT the chip's gradient fill).
   QUESTION Q-A (the KEY call): should each chip ALSO get `aria-pressed={tab === t}`? My read: YES — this is a PERSISTENT segmented filter group whose selected state is conveyed purely by bg (bg-ig-gradient vs bg-secondary), with no role=tab, and you can toggle between chips both ways; aria-pressed communicates the on/off selection to screen readers. These are plain <button>s (no role=tab, no radio). Confirm aria-pressed={tab === t}, or correct (e.g. if you think these are better left with NO aria-pressed because they are a single-select filter group rather than independent toggles).

B. Accept button (L192, RAW <button>, ICON-ONLY Check, ALREADY aria-label="Accept" KEEP, onClick={() => respond(t.id, true)}, className "h-7 w-7 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center active:scale-95" — ALREADY has active:scale-95, NO transition class, NO ring; sits on the per-row card surface bg-card):
   plan: KEEP active:scale-95 (pre-existing press, do NOT renumber), APPEND `transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (transition-transform so the existing scale eases; scale is the only animated property -> transition-transform not transition-all; KEEP aria-label; one-shot action -> NO aria-pressed; OUTWARD ring-ring on the bg-card parent — the emerald fill is the button's own bg, the outward ring renders against the card).

C. Decline button (L193, RAW <button>, ICON-ONLY X, ALREADY aria-label="Decline" KEEP, onClick={() => respond(t.id, false)}, className "h-7 w-7 rounded-full bg-rose-500 text-white inline-flex items-center justify-center active:scale-95" — ALREADY has active:scale-95, NO transition class, NO ring):
   plan: identical to B — KEEP active:scale-95, APPEND `transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`; KEEP aria-label; one-shot -> NO aria-pressed; OUTWARD ring-ring on bg-card.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- The header "Back" shadcn ghost icon Button L132 (ships tokens, has aria-label) -> leave.
- The gradient summary card motion.div L141 (entrance anim, NO onClick -> presentational) -> leave.
- The per-row transfer motion.div L177 (entrance anim, NO onClick -> presentational) -> leave.
- All decorative icons/badges/chips that are not buttons, the avatars, the loading skeleton divs -> leave.

QUESTIONS:
Q1. Filter chips (A): APPEND active:scale-[0.97] + ring (NO flip, transition-all already present) + NO aria-label (visible text) + OUTWARD ring-ring (renders against neutral bg-background, not the gradient fill) — correct? And the KEY call Q-A: aria-pressed={tab === t} YES or NO?
Q2. Accept (B): KEEP active:scale-95 + APPEND transition-transform + ring + KEEP aria-label + one-shot -> NO aria-pressed + OUTWARD ring-ring on bg-card — correct? (Is transition-transform right vs transition-all, given there is no hover color on these buttons?)
Q3. Decline (C): identical to B — confirm.
Q4. Confirm the leave-untouched list (shadcn Back Button, both presentational motion.divs, decorative elements) is handled correctly.
Q5. At 375px, does the header (Back + icon-pill + gradient title), the 3-col gradient summary card, the 4-chip horizontal filter row [overflow-x-auto], and a transfer row (avatar + direction badge + name + status chip + time + note + amount + a 2-icon action cluster) lay out without crushing? And at iPad 768/1024 + desktop 1280 (note: content is capped at max-w-2xl mx-auto — any concern)?

Please answer Q1-Q5 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/P2PMoneyPage.tsx

---

## Plan

Three controls need tokens; everything else stays. All logic (supabase queries, `respond()` mutation, `setQueryData`, every `onClick`, `navigate`, react-query keys, `tab` state, toast calls) remains byte-identical.

---

## Q&A — answered

**Q1 (filter chips) — all correct.** `transition-all` already present → NO flip; `active:scale-[0.97]` (segmented chip tier); visible text → no aria-label; outward `ring-ring` (ring renders against the neutral `bg-background` parent, not the chip's own gradient fill). **KEY Q-A → YES, add `aria-pressed={tab === t}`.** These are plain `<button>`s (no `role=tab`, no radio group), the selection is conveyed purely by bg (`bg-ig-gradient` vs `bg-secondary`), and you can toggle between chips freely. This matches the BotDiscoverPage category-chip precedent exactly (`aria-pressed={active}` on a single-select segmented filter group, label word constant, not `role=tab`).

**Q2 (Accept) — all correct.** KEEP pre-existing `active:scale-95` (don't renumber); `transition-transform` is right because scale is the ONLY animated property (no hover color on these buttons — `transition-all` would be unnecessary churn); KEEP `aria-label="Accept"`; one-shot action → NO `aria-pressed`; outward `ring-ring` (the button's `bg-emerald-500` is its own fill; the outward ring renders against the parent `bg-card` row).

**Q3 (Decline) — confirmed identical to B.** Same reasoning, `bg-rose-500` fill, same `bg-card` parent.

**Q4 (leave-untouched) — confirmed correct.** Shadcn `<Button>` (header back) ships built-in tokens → leave. Both `motion.div` wrappers (summary card + per-row transfer) have entrance `initial/animate` and NO `onClick` → presentational → leave. All avatars, direction badges, status chips, icons, skeleton divs, decorative elements → leave.

**Q5 (responsive) — clean at all breakpoints.** At 375: header (back `h-10` 40px + gap-12 + icon-pill 28px + gap-8 + "P2P Money" title) fits in `px-4` (343px inner); summary card `grid grid-cols-3 gap-2 p-5` — tight but standard for a 3-col stat row; filter chips `flex gap-1.5 overflow-x-auto shrink-0` — scrolls, never crushes; transfer row (avatar 40px + gap-12 + flex-1 content `line-clamp-1` + gap-12 + shrink-0 amount/action cluster ~62px) fits. At 768/1024/1280: `max-w-2xl mx-auto` (672px cap) centers content — no concern.

---

## Proposed changes

**File:** `src/pages/P2PMoneyPage.tsx`

### A. Segmented filter chips (~L153)

**Before:**
```tsx
<button key={t} type="button" onClick={() => setTab(t)} className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize", tab === t ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>{t}</button>
```

**After:**
```tsx
<button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t} className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === t ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>{t}</button>
```

Changes: **+`aria-pressed={tab === t}`** attr; **+`active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`** appended to the cn() base string.

### B. Accept button (~L192)

**Before:**
```tsx
<button type="button" onClick={() => respond(t.id, true)} aria-label="Accept" className="h-7 w-7 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center active:scale-95"><Check className="h-3 w-3" /></button>
```

**After:**
```tsx
<button type="button" onClick={() => respond(t.id, true)} aria-label="Accept" className="h-7 w-7 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Check className="h-3 w-3" /></button>
```

Changes: **+`transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`** appended; `active:scale-95` and `aria-label="Accept"` KEPT.

### C. Decline button (~L193)

**Before:**
```tsx
<button type="button" onClick={() => respond(t.id, false)} aria-label="Decline" className="h-7 w-7 rounded-full bg-rose-500 text-white inline-flex items-center justify-center active:scale-95"><X className="h-3 w-3" /></button>
```

**After:**
```tsx
<button type="button" onClick={() => respond(t.id, false)} aria-label="Decline" className="h-7 w-7 rounded-full bg-rose-500 text-white inline-flex items-center justify-center active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-3 w-3" /></button>
```

Changes: identical to B — **+`transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`** appended; `active:scale-95` and `aria-label="Decline"` KEPT.

---

## Diff summary

| Metric | Count |
|--------|-------|
| className edits | **3** (A chips base, B accept, C decline) |
| New `aria-pressed` attrs | **1** (A, dynamic `{tab === t}`) |
| `aria-label` added/changed | **0** (2 KEPT on B+C) |
| Rings added | **3** (all outward `ring-ring`) |
| `ring-inset` / `ring-white/70` | **0 / 0** |
| `aria-pressed` on B or C | **0** (one-shot actions) |
| `active:scale-[0.97]` fresh | **1** (A) |
| `active:scale-95` kept (pre-existing) | **2** (B+C) |
| `transition-transform` fresh | **2** (B+C) |
| `transition-all` kept (pre-existing) | **1** (A — no flip) |
| Transition flips | **0** |
| Logic lines touched | **0** |

---

## Owner verification

1. **Run `npm run update`** — must pass (type-check + worker type-check + production build, exit 0).
2. The `aria-pressed` prop on the chip `<button>` is valid JSX (boolean attribute on a native button) — type-check will confirm.
3. Preview at 375/768/1280: the filter row should scroll horizontally on narrow screens; the Accept/Decline buttons should show a visible focus ring when Tab-navigated to and a subtle press-scale on tap/click.
