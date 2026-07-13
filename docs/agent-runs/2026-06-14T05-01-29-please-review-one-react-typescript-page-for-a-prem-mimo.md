# MiMo run — 2026-06-14T05:01:29.848Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and confirm whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/NotificationPrefsPage.tsx (a "Notification preferences" per-category toggle page reached by in-app navigation; useNavigate; @tanstack/react-query reads `notification_templates` [read-only catalog]; per-category opt-out state held in React state + persisted to localStorage [STORAGE_KEY "zivo:notif-prefs:v1"]; `disabled` Set<string> useState. Layout: a sticky header [shadcn ghost icon "Back" Button + a Bell icon-pill + gradient title]; a gradient stats banner [motion.div, presentational]; a loading skeleton; an empty state; then per-category motion.section cards [rounded-2xl bg-card border overflow-hidden] each with a header row holding the category name + a RAW "Mute all"/"Enable all" chip <button>, then a `divide-y` list of per-template RAW row <button>s [each a full-width row with name/body text + EITHER a "Required" pill span when locked OR a visual toggle span].)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: the supabase notification_templates query, the localStorage load/save, the `disabled` Set state + setDisabled, toggleCategory/toggleTemplate, the grouped memo, every onClick, the navigate, react-query keys, the cn() conditionals' selection logic, the toast calls. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we apply consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset ONLY when the control is a flush edge child of a rounded overflow-hidden parent (so an outward ring would be clipped).
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the ONLY animated property; transition-all when there is ALSO a hover:bg/text/border/opacity that should animate alongside the press; transition-opacity when only opacity animates. FLIP RULE: a control that currently ships `transition-colors` (eases ONLY color/bg/border, NOT transform) and is GAINING a NEW active:scale MUST flip transition-colors -> transition-all. A control already shipping `transition-all` -> NO flip when adding active:scale.
- NO-OP / pre-existing-press policy: if a control already ships a press affordance, KEEP it and do NOT renumber.
- aria-label ONLY on icon-only / image-only controls (visible text -> NO aria-label). aria-pressed ONLY on a PERSISTENT two-way toggle/segmented control whose on/off selection is conveyed by bg; NOT on a one-shot action, NOT when the control's visible LABEL TEXT itself flips to convey state, NOT when state is conveyed elsewhere.
- Don't-churn: if a control already has a valid focus ring / aria-label / aria-pressed / press-scale / transition, keep it.

RING COLOR: --ring resolves to BLACK. An OUTWARD ring renders against the control's PARENT surface (not the control's own fill). A control whose outward ring renders against a neutral bg-card/bg-background/bg-muted parent uses ring-ring; a control whose ring renders ON a gradient/image surface uses ring-white/70. NOTE: a gradient-FILLED button (bg-ig-gradient) on a NEUTRAL parent still uses ring-ring, because the OUTWARD ring renders against the neutral parent, not the button's own gradient fill. ring-inset requires an overflow-hidden ancestor; a flush full-width child of an overflow-hidden rounded bg-card section uses ring-inset + ring-ring (neutral card surface).

COMPONENT-TYPE RULES we follow:
- shadcn <Button> ships built-in tokens -> leave untouched.
- A framer-motion motion.div/motion.section with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> ships NO tokens.

MY PLANNED EDITS (please confirm each is right, or correct it):

A. Per-category "Mute all"/"Enable all" chip (L170, RAW <button>, VISIBLE TEXT that flips between "Mute all" and "Enable all", onClick={() => toggleCategory(category, !allEnabled)}, ALREADY aria-label={allEnabled ? "Mute all" : "Enable all"} [redundant — exactly matches the visible text], cn() base "text-[11px] font-bold rounded-full px-3 py-1 transition-all" + conditional [allEnabled: "bg-secondary text-muted-foreground hover:bg-muted" / else: "bg-ig-gradient text-white shadow-sm"] — HAS transition-all + a hover:bg on the allEnabled state, NO scale/ring; it sits INSET within the section header row's px-4 py-3 padding [NOT flush to the rounded-2xl overflow-hidden section edge], on the neutral bg-card section surface):
   plan: APPEND to cn() base `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (medium chip tier 0.98; KEEP transition-all — already present, NO flip; OUTWARD ring-ring — the chip is inset within the header px-4 py-3 so a 2px outward ring is NOT clipped by the section overflow-hidden, and even in the bg-ig-gradient state the OUTWARD ring renders against the neutral bg-card parent -> ring-ring). aria: KEEP the existing aria-label (don't-churn) OR remove it as redundant-with-visible-text? My read: KEEP (don't-churn, harmless, exactly matches text). NO aria-pressed — the visible LABEL TEXT itself flips ("Mute all"<->"Enable all") to convey state, so aria-pressed would be redundant/misleading.
   QUESTION Q-A1: medium chip tier active:scale-[0.98] + OUTWARD ring-ring (inset in header, gradient fill still gets ring-ring on neutral parent) — correct?
   QUESTION Q-A2: KEEP vs REMOVE the redundant aria-label, and NO aria-pressed (label-text flips to convey state) — confirm.

B. Per-template toggle row (L187, RAW <button>, full-width, VISIBLE TEXT [template name + body], onClick={() => toggleTemplate(t.id, locked)}, NO aria-label, className "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors" — HAS transition-colors + hover:bg, NO scale/ring; it is a FLUSH full-width child of a `divide-y` list inside the `rounded-2xl bg-card border overflow-hidden` motion.section; the row contains a child visual toggle <span> that ALREADY carries aria-pressed={!isOff} [for un-locked templates]):
   plan: FLIP transition-colors -> transition-all + APPEND `active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset` (FLIP because a NEW active:scale is added and the existing hover:bg must keep easing; wide full-width row tier 0.99; ring-inset because the rows are flush edge children of the overflow-hidden rounded section — an outward ring would be clipped at the section's rounded corners; ring-ring color — neutral bg-card surface; NO aria-label — visible text; LEAVE the child span's existing aria-pressed untouched [pre-existing, on the visual toggle]).
   QUESTION Q-B: FLIP transition-colors->transition-all + active:scale-[0.99] + ring-inset ring-ring (flush child of overflow-hidden section) + NO aria-label + leave the child span aria-pressed — correct? Or should aria-pressed move from the visual span onto the button itself? My read: LEAVE it on the span (don't-churn, it's existing logic/markup; moving it is out of scope for a className+display-only pass and risks double-announcing).

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- The header "Back" shadcn ghost icon Button L115 (ships tokens, has aria-label) -> leave.
- The gradient stats banner motion.div L128 (entrance anim, NO onClick -> presentational) -> leave.
- The per-category motion.section L161 (entrance anim, NO onClick -> presentational) -> leave.
- The loading skeleton + the empty state + the "Required" pill <span> L200 + the visual toggle <span> L204 [keeps its aria-pressed] + all icons/text -> decorative/non-button.

QUESTIONS:
Q1. Mute/Enable chip (A): medium tier active:scale-[0.98] + KEEP transition-all (no flip) + OUTWARD ring-ring (inset in header, gradient fill -> ring-ring on neutral parent) + KEEP redundant aria-label + NO aria-pressed (label flips) — correct?
Q2. Template row (B): FLIP transition-colors->transition-all + active:scale-[0.99] + ring-inset ring-ring (flush child of overflow-hidden section) + NO aria-label + leave child span aria-pressed — correct?
Q3. Confirm the leave-untouched list (shadcn Back Button, 2 presentational motion.div/section, skeleton, empty state, Required pill, visual toggle span, all icons/text) is handled correctly.
Q4. At 375px, does the header, the gradient stats banner, a category card (header row with name + Mute-all chip + the divide-y template rows with name/body + toggle/Required pill) lay out without crushing? And at iPad 768/1024 + desktop 1280 (content capped at max-w-2xl mx-auto — any concern)?

Please answer Q1-Q4 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/NotificationPrefsPage.tsx

---

## Review: `NotificationPrefsPage.tsx` — Interaction Polish

### Short Plan

Two RAW `<button>` controls need tokens. No other interactive controls are uncovered. The file's inventory is **exhaustive at 3 controls** (1 shadcn + 2 RAW).

---

### Answers to Q1–Q4

**Q1 — Mute/Enable chip (A): ALL CORRECT.**
- `active:scale-[0.98]` medium chip tier ✓
- `transition-all` already present → NO flip ✓
- OUTWARD `ring-ring` — the chip is ≥12px inset within the section header `px-4 py-3`, so the 2px outward ring clears the `overflow-hidden` section edge; even when `bg-ig-gradient` the outward ring renders against the neutral `bg-card` parent → `ring-ring` ✓
- KEEP the redundant `aria-label` (don't-churn — harmless, matches text) ✓
- NO `aria-pressed` — the visible label text itself flips ("Mute all" ↔ "Enable all") to convey state; `aria-pressed` would be redundant/misleading ✓

**Q2 — Template row (B): ALL CORRECT.**
- FLIP `transition-colors` → `transition-all` (new `active:scale` + existing `hover:bg` must ease together) ✓
- `active:scale-[0.99]` wide full-width row tier ✓
- `ring-inset` — rows are flush edge children of the `divide-y` div inside the `rounded-2xl overflow-hidden` section; outward ring clipped at rounded corners → inset ✓
- `ring-ring` — neutral `bg-card` surface ✓
- NO aria-label — visible name/body text ✓
- LEAVE the child span's existing `aria-pressed={!isOff}` (don't-churn, pre-existing markup) ✓

**Q3 — Leave-untouched list: ALL CORRECT.**
- Shadcn Back `<Button>` L115 → ships tokens + has `aria-label="Back"` ✓
- Stats banner `motion.div` L128 → entrance anim, no onClick, presentational ✓
- Per-category `motion.section` L161 → entrance anim, no onClick, presentational ✓
- Loading skeleton divs → `animate-pulse`, decorative ✓
- Empty state card → no interactive children ✓
- "Required" pill `<span>` L200 → non-button ✓
- Visual toggle `<span>` L204 → keeps its existing `aria-pressed={!isOff}`, not a `<button>` ✓
- All icons/text → decorative ✓

**Q4 — Responsive: CLEAN at all breakpoints.**
- **375px**: header (Back 40px + Bell pill 28px + title) fits in `px-4`; stats banner `p-5` single column; category card header row (name left `flex-1` + chip right `px-3 py-1` ~65px) fits within 343px inner; template row (`px-4` = 32px padding → 343px inner, name `flex-1 min-w-0 line-clamp-1` + toggle `shrink-0 w-10` + `gap-3` = 12px → 291px for text column) fits comfortably.
- **768/1024**: same layout, wider container, no crush.
- **1280**: `max-w-2xl` (672px) centered → no concern.

---

### Proposed Diff

**File:** `src/pages/NotificationPrefsPage.tsx`

**2 className line edits. 0 logic changes. 0 new aria attributes.**

#### A. Mute/Enable chip (L170)

**Before:**
```tsx
className={cn(
  "text-[11px] font-bold rounded-full px-3 py-1 transition-all",
  allEnabled ? "bg-secondary text-muted-foreground hover:bg-muted" : "bg-ig-gradient text-white shadow-sm",
)}
```

**After:**
```tsx
className={cn(
  "text-[11px] font-bold rounded-full px-3 py-1 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  allEnabled ? "bg-secondary text-muted-foreground hover:bg-muted" : "bg-ig-gradient text-white shadow-sm",
)}
```

Change: APPEND `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() base string.

#### B. Template toggle row (L187)

**Before:**
```tsx
className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
```

**After:**
```tsx
className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
```

Change: FLIP `transition-colors` → `transition-all` + APPEND `active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset`.

---

### Diff Summary

| Metric | Count |
|---|---|
| Rings added | 2 (both `ring-ring`; B is `ring-inset`) |
| `aria-pressed` / `aria-expanded` added | 0 |
| FRESH `active:scale` | 2 (`[0.98]` chip tier, `[0.99]` row tier) |
| Transition flips | 1 (`transition-colors` → `transition-all` on B) |
| `ring-inset` | 1 (B — flush child of overflow-hidden section) |
| `ring-white/70` | 0 |
| `aria-label` added/changed | 0 (1 pre-existing KEPT on A) |
| Logic lines touched | 0 |

---

### Owner Flags (out of scope — flag, don't fix)

**(a)** The visual toggle `<span>` (L204) carries `aria-pressed={!isOff}` but is a `<span>`, not a `<button>`. `aria-pressed` is semantically intended for button-role elements. The parent `<button>` (the row) carries the `onClick`. This creates a nested `aria-pressed` inside a button, which may confuse screen readers. Pre-existing markup — a future pass could move the pressed state to the row button or restructure as a proper toggle.

**(b)** The template row `<button>` acts as both the row navigation/action AND contains the toggle indicator. For locked templates, tapping the row fires `toast.info("This notification type can't be disabled.")` — the button is always clickable even when the action is a no-op (existing logic).

**(c)** `supabase as unknown as {…}` hand-rolled cast for `notification_templates` (clean up when types regenerate).

**(d)** Per-template prefs are device-local via localStorage (`STORAGE_KEY`), not server-backed — the footer notes this. Pre-existing design.

---

### Verification

After applying, run:
```bash
npm run update
```
Must pass with TRUE EXIT 0 (type-check + worker type-check + production build). The changes are className-only with no logic impact, so type-check and build are expected to succeed unchanged.
