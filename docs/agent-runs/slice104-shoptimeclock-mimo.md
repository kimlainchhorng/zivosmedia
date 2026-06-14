# MiMo run — 2026-06-14T09:44:57.479Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopTimeClockPage.tsx (204-line merchant "Time Clock" page rendered inside <AppLayout title="Time Clock" hideHeader>; localStorage-backed ClockEntry[] (zivo_timeclock_entries) — NO supabase/react-query on this page; useState entries/employeeName/showForm/clockType; clockAction records an in/out entry; framer-motion AnimatePresence clock form; derived clockedInNames/hoursWorkedToday). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, localStorage, setState, onKeyDown byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition (add ring only). Don't add role/tabIndex/onKeyDown (structural — FLAG). Don't touch disabled. SKIP shadcn Card/Button/AppLayout (own tokens). LEAVE native form fields.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99]. Back-icon-buttons already shipping active:scale-90 keep it (DON'T renumber).
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF.
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover/active color/bg/border ON ITSELF → use transition-all (FLIP).
- DON'T-CHURN: control ALREADY has press (active:scale) + transition → ADD ring (+aria) ONLY; don't renumber, no flip.
- For bare icon/text-link buttons/anchors add a rounded/rounded-full so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter. aria-expanded on a disclosure.

THREE edits applied — confirm each CORRECT or NEEDS-FIX:

A) L90 BACK button — was `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform` (icon-only ArrowLeft; ALREADY ships active:scale-90 + transition-transform; NO ring; NO aria-label; on the page background neutral) → **DON'T-CHURN: APPENDED ring + ADDED `aria-label="Go back"`** (kept active:scale-90 [DON'T renumber]; kept transition-transform — scale is the only animated prop; OUTWARD ring-ring). Final: `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Go back"`. Confirm.

B) L154 X-CLOSE glyph button (clock form) — was `p-2 rounded-xl hover:bg-muted/60 text-muted-foreground text-sm` (the ONLY child is a "✕" unicode glyph — effectively icon-only; hover:bg ON ITSELF; NO transition, NO scale, NO ring; rounded-xl present; NO aria-label) → ADDED `aria-label="Close"` + FLIP (no-transition→transition-all) + `active:scale-95` + ring. Final: `p-2 rounded-xl hover:bg-muted/60 text-muted-foreground text-sm transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Close"`. Confirm: (1) treating a glyph-only "✕" button as icon-only (aria-label="Close", scale-95) correct; (2) FLIP no-transition→transition-all correct (hover:bg + new scale both animate); (3) OUTWARD ring-ring inside the bg-card form.

C) L158 QUICK-NAME chip buttons (fill employeeName from clocked-in names) — was `text-[11px] px-2 py-0.5 rounded-full border border-border hover:border-primary/50 text-muted-foreground transition-colors` (one-shot action chip that calls setEmployeeName(name); has VISIBLE text = the name; hover:border-primary/50 ON ITSELF + transition-colors; NO scale, NO ring; rounded-full present) → ADDED `active:scale-[0.97]` (chip tier) + FLIP transition-colors→transition-all (hover:border ON ITSELF + new scale both animate) + ring; NO aria (visible text name); NO aria-pressed (one-shot action, NOT a persistent toggle). Final: `text-[11px] px-2 py-0.5 rounded-full border border-border hover:border-primary/50 text-muted-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: (1) scale-[0.97] chip tier correct; (2) FLIP transition-colors→transition-all correct (hover:border ON ITSELF); (3) NO aria-pressed correct (it's a one-shot name-fill action, not a persistent toggle); (4) NO aria-label correct (visible text).

ALSO CONFIRM I should LEAVE: AppLayout shell; shadcn <Card> (stat tiles L103, clocked-in list L113, form wrapper L139, empty-state L175, entry rows L182 — all own tokens, non-interactive containers); shadcn <Button> "Clock In" L127 / "Clock Out" L130 / "Record" L153 (own tokens; Record has disabled); the native text <input> L144 (has focus:outline-none focus:ring-2 focus:ring-primary/30 — native form field, house standard; has onKeyDown Enter handler + autoFocus — existing logic, LEAVE); the clocked-in badge <span>s L117 (non-interactive); the motion.div form wrapper L138; all lucide icons (decorative); the stat-tile content; the entry-row content. No clickable divs with onClick.

Be concise and exact. Return the precise final className after-string for EACH of A–C + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) B — glyph-only "✕" treated as icon-only (aria-label + scale-95 + FLIP) — correct? (2) C — chip with visible text getting scale-[0.97] + FLIP + ring but NO aria (it's a one-shot name-fill, not a toggle, so no aria-pressed) — correct? (3) A — DON'T-CHURN ring-only + aria-label add, keeping scale-90 (no renumber) and transition-transform (no flip — only scale animates) — correct? (4) leaving the native input (focus:ring + onKeyDown) untouched — correct?
- files: src/pages/app/shop/ShopTimeClockPage.tsx

---

## Verification — ShopTimeClockPage.tsx (3 edits)

### (1) Short plan

Audit the three proposed edits against the house token vocabulary and the file's interactive-control inventory. Confirm each is correct or flag a fix. Confirm the leave-list. Scan for missed raw interactive controls.

---

### (2) Edit-by-edit verdict

**A) L90 BACK button — ✅ CORRECT**

Final className:
```
w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
+ `aria-label="Go back"`

| Token | Rationale |
|---|---|
| `active:scale-90` kept | DON'T-CHURN — existing, don't renumber ✅ |
| `transition-transform` kept | Scale is the ONLY animated prop (`bg-muted/60` is static, not a hover prop) ✅ |
| ring appended | OUTWARD `ring-ring` on neutral page background; `rounded-full` traces tightly ✅ |
| `aria-label="Go back"` | Icon-only button (single `ArrowLeft` icon) ✅ |

**B) L154 X-CLOSE button — ✅ CORRECT**

Final className:
```
p-2 rounded-xl hover:bg-muted/60 text-muted-foreground text-sm transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
+ `aria-label="Close"`

| Question | Answer |
|---|---|
| Glyph-only "✕" treated as icon-only? | ✅ Yes — single-character glyph, no visible text label → `aria-label="Close"` + `active:scale-95` icon-only tier |
| FLIP no-transition→`transition-all`? | ✅ Yes — `hover:bg-muted/60` is a bg-color ON ITSELF + new scale → both must animate → `transition-all` |
| OUTWARD ring-ring? | ✅ Inside `bg-card` Card neutral parent; `rounded-xl` traces tightly |

**C) L158 QUICK-NAME chips — ✅ CORRECT**

Final className:
```
text-[11px] px-2 py-0.5 rounded-full border border-border hover:border-primary/50 text-muted-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
No aria attrs.

| Question | Answer |
|---|---|
| `scale-[0.97]` chip tier? | ✅ Yes — one-shot action chip with visible text |
| FLIP `transition-colors`→`transition-all`? | ✅ Yes — `hover:border-primary/50` is a border-color ON ITSELF + new scale → both animate |
| No `aria-pressed`? | ✅ Correct — `setEmployeeName(name)` is a one-shot name-fill action, NOT a persistent single-select toggle |
| No `aria-label`? | ✅ Correct — button has VISIBLE text (the employee name) |

---

### Leave-list — ✅ CONFIRMED (all correctly skipped)

| Control | Reason |
|---|---|
| `AppLayout` shell | Own tokens |
| shadcn `<Card>` (stat tiles, clocked-in list, form wrapper, empty-state, entry rows) | Own tokens, non-interactive containers |
| shadcn `<Button>` "Clock In" L127 / "Clock Out" L130 / "Record" L153 | Own tokens; Record has `disabled` — LEAVE |
| Native `<input>` L144 | Has `focus:outline-none focus:ring-2 focus:ring-primary/30` + `onKeyDown` Enter + `autoFocus` — native form field, house standard |
| `<span>` clocked-in badges L117 | Non-interactive |
| `motion.div` form wrapper L138 | Non-interactive |
| All lucide icons | Decorative |
| Stat-tile / entry-row content | Non-interactive |

### Missed controls scan — **NONE**

All raw interactive controls on the page:

| # | Control | Type | Action |
|---|---|---|---|
| 1 | L90 Back `<button>` | raw | EDITED (A) ✅ |
| 2 | L127 Clock In | shadcn `<Button>` | SKIP ✅ |
| 3 | L130 Clock Out | shadcn `<Button>` | SKIP ✅ |
| 4 | L144 Employee name | native `<input>` | SKIP ✅ |
| 5 | L153 Record | shadcn `<Button>` | SKIP ✅ |
| 6 | L154 X-Close `<button>` | raw | EDITED (B) ✅ |
| 7 | L158 Quick-name `<button>` chips | raw | EDITED (C) ✅ |

No clickable divs with `onClick`. No raw `<a>`. No other native form fields.

---

### Guard grep summary

| Metric | Count |
|---|---|
| className edits | 3 (A, B, C) |
| New aria attrs | 2 (`aria-label` on A + B) |
| `focus-visible:ring` | 3 (all) |
| `ring-ring` | 3 (all OUTWARD) |
| `ring-inset` | 0 |
| `aria-pressed` | 0 |
| `aria-expanded` | 0 |
| `active:scale-90` kept | 1 (A — NOT renumbered) |
| `active:scale-95` new | 1 (B) |
| `active:scale-[0.97]` new | 1 (C) |
| FLIPs | 2 (B: no-transition→transition-all; C: transition-colors→transition-all) |
| Competing 2nd press added | 0 |
| `disabled` touched | 0 |
| Logic lines touched | 0 |

All `onClick`/`navigate`/`setEmployeeName`/`setShowForm`/`clockAction`/`setClockType`/`localStorage` byte-identical.

---

### (3) Owner must verify / deploy

1. **Run `npm run update`** — type-check + worker type-check + production build must pass (0 errors). The edit is className + aria-only, so it should be clean.
2. **Preview at 375/768/1280** — single-column `max-w-2xl` layout; the clock form's `flex gap-2` of `[flex-1 input] + [sm Button] + [p-2 X]` should fit at 375. Quick-name chips flex-wrap cleanly.
3. **No deploy needed until owner decides** — changes are ready to commit when the owner says go.
