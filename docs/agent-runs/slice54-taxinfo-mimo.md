# MiMo run — 2026-06-14T04:50:24.271Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and confirm whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/TaxInfoPage.tsx (a "Tax Info" forms/1099s/reporting hub reached by in-app navigation; useNavigate; useAuth user; @tanstack/react-query reads `receipts` for the selected year; derives a YTD summary + a docs[] list; `year` useState + `yearOpen` useState [a custom dropdown]. Layout: a sticky header [shadcn ghost icon "Back" Button + a FileText icon-pill + gradient title]; a year-picker [a RAW <button> toggle that opens a custom dropdown of 3 year <button> options]; a gradient YTD banner [motion.div, presentational]; a "Breakdown by type" section [presentational bars]; a "Documents" section [per-doc motion.div rows, each with EITHER a RAW Download "PDF" <button> when available OR a plain status pill span]; a help card [decorative].)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, aria-expanded, framer-motion whileTap if warranted). Keep ALL logic byte-identical: the supabase receipts query, the year/yearOpen state + setYear/setYearOpen, the docs[] derivation, summary memo, every onClick, the navigate, react-query keys, the cn() conditionals' selection logic. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we apply consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset ONLY when the control is a flush edge child of a rounded overflow-hidden parent (so an outward ring would be clipped).
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the ONLY animated property; transition-all when there is ALSO a hover:bg/text/border/opacity that should animate alongside the press; transition-opacity when only opacity animates. FLIP RULE: a control that currently ships `transition-colors` (eases ONLY color/bg/border, NOT transform) and is GAINING a NEW active:scale MUST flip transition-colors -> transition-all. A control that already ships `transition-all` already covers transform -> NO flip when adding active:scale.
- NO-OP / pre-existing-press policy: if a control already ships a press affordance (active:scale-95/90, active:opacity-*), KEEP it and do NOT renumber.
- aria-label ONLY on icon-only / image-only controls (visible text -> NO aria-label). aria-pressed ONLY on a PERSISTENT toggle/segmented control whose on/off selection is conveyed by bg and which you can toggle BOTH ways; NOT on a one-shot action, NOT on a menu option that dismisses on select, NOT when role=tab. aria-expanded on a control toggling an inline disclosure region it owns (NOT a dialog opener).
- Don't-churn: if a control already has a valid focus ring / aria-label / aria-expanded / press-scale / transition, keep it.

RING COLOR: --ring resolves to BLACK in this app. An OUTWARD ring renders against the control's PARENT surface (not the control's own fill). A control whose outward ring renders against a neutral bg-card/bg-background/bg-muted parent uses ring-ring; a control whose ring renders ON a gradient/image surface uses ring-white/70. NOTE: a gradient-FILLED button (e.g. bg-ig-gradient) sitting on a NEUTRAL parent still uses ring-ring, because the OUTWARD ring renders against the neutral parent, not the button's own gradient fill. ring-inset requires an overflow-hidden ancestor; a flush child of an overflow-hidden rounded bg-card dropdown uses ring-inset + ring-ring (neutral card surface).

COMPONENT-TYPE RULES we follow:
- shadcn <Button> ships built-in tokens -> leave untouched.
- A framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> ships NO tokens.

MY PLANNED EDITS (please confirm each is right, or correct it):

A. Year-picker toggle (L146, RAW <button>, full-width, VISIBLE TEXT "Tax year {year}" + a ChevronDown that rotates, onClick={() => setYearOpen(!yearOpen)}, ALREADY aria-expanded={yearOpen} KEEP, className "w-full h-11 px-4 rounded-xl bg-card border border-border flex items-center justify-between text-sm font-semibold text-foreground" — NO transition, NO scale, NO ring, NO hover color; sits on the neutral page bg-background):
   plan: APPEND `transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (wide full-width tier 0.99; transition-transform because there is NO hover color — scale is the only animated property; KEEP aria-expanded; visible text -> NO aria-label; OUTWARD ring-ring on neutral bg-background).
   Confirm, or correct (e.g. if you think transition-all is better despite no hover, or a different tier).

B. Year option buttons (L162, RAW <button> ×3 inside the dropdown, VISIBLE TEXT year number, onClick={() => { setYear(y); setYearOpen(false); }} [selects the year AND closes the dropdown], cn() base "w-full px-4 py-2.5 text-left text-sm font-medium transition-colors" + conditional [selected: "bg-secondary text-ig-gradient font-bold" / unselected: "text-foreground hover:bg-secondary/60"] — HAS transition-colors + hover:bg on unselected, NO scale/ring; these are flush full-width children of the dropdown motion.div which is `rounded-xl bg-card border ... overflow-hidden`):
   plan: FLIP transition-colors -> transition-all + APPEND `active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset` (FLIP because a NEW active:scale is added and the existing hover:bg must keep easing; wide full-width tier 0.99; ring-inset because the buttons are flush edge children of the rounded overflow-hidden dropdown parent — an outward ring would be clipped; ring-ring color because the dropdown surface is neutral bg-card; visible text -> NO aria-label).
   QUESTION Q-B (the KEY call): should each year option ALSO get `aria-pressed={year === y}`? My read: NO — these are dropdown MENU options that SELECT a year and immediately DISMISS the dropdown (setYearOpen(false)); they are not a persistent two-way toggle/segmented control you press on/off in place. The idiomatic ARIA for a select-style dropdown option would be role=option + aria-selected, NOT aria-pressed; and we are not adding roles in this minimal pass. The selected year does get a persistent bg-secondary highlight when the dropdown is reopened, but the control pattern is a menu/listbox, not a segmented toggle. Confirm NO aria-pressed, or correct.

C. Download "PDF" button (L247, RAW <button>, has BOTH a Download icon AND visible text "PDF", ALREADY aria-label={`Download ${d.name}`} [disambiguates WHICH doc — there are up to 3 "PDF" buttons], onClick is absent in v1 [placeholder, no handler yet — but it's a real interactive control], className "shrink-0 h-9 px-3 rounded-full bg-ig-gradient text-white text-xs font-bold flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all" — ALREADY active:scale-95 + transition-all + hover:opacity-90, NO ring; sits on the per-doc card surface bg-card):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP active:scale-95 pre-existing press — do NOT renumber; KEEP transition-all — already covers transform + the hover opacity; OUTWARD ring-ring — the bg-ig-gradient is the button's own fill, the outward ring renders against the neutral bg-card doc-row parent, NOT the gradient).
   QUESTION Q-C: the button has visible text "PDF" but ALSO a pre-existing aria-label={`Download ${d.name}`}. My read: KEEP the aria-label (don't-churn) — bare "PDF" is ambiguous across the 3 docs, the aria-label supplies the doc-specific accessible name ("Download 1099-MISC 2026"), which is a genuine a11y improvement; removing it to satisfy "visible text -> no aria-label" would be churn that REDUCES accessibility. Confirm KEEP the aria-label, or correct.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- The header "Back" shadcn ghost icon Button L131 (ships tokens, has aria-label) -> leave.
- The dropdown wrapper motion.div L156 (entrance anim, NO onClick -> presentational) -> leave.
- The YTD banner motion.div L179 + the breakdown bar motion.divs L210 + the per-doc row motion.div L229 (entrance/width anim, NO onClick -> presentational) -> leave.
- The status pill <span> L256 (not a button) + the help card + all icons/text -> decorative.

QUESTIONS:
Q1. Year-picker toggle (A): APPEND transition-transform + active:scale-[0.99] + ring + KEEP aria-expanded + NO aria-label + OUTWARD ring-ring — correct? (transition-transform OK given no hover color?)
Q2. Year option buttons (B): FLIP transition-colors->transition-all + active:scale-[0.99] + ring-inset ring-ring (flush children of overflow-hidden dropdown) + NO aria-label, and the KEY call Q-B — NO aria-pressed (menu option that dismisses on select, not a persistent segmented toggle)? Confirm or correct.
Q3. Download PDF (C): APPEND ring-only + KEEP active:scale-95/transition-all + OUTWARD ring-ring, and Q-C — KEEP the existing disambiguating aria-label despite visible "PDF" text? Confirm or correct.
Q4. Confirm the leave-untouched list (shadcn Back Button, all presentational motion.divs incl. the dropdown wrapper, the status pill span, the help card, all icons/text) is handled correctly.
Q5. At 375px, does the header (Back + icon-pill + gradient title), the full-width year-picker toggle + its dropdown, the gradient YTD banner (with break-words on a possibly-long multi-currency total), the breakdown bars, and a doc row (icon + name + 2-line desc + Download PDF button OR status pill) lay out without crushing? And at iPad 768/1024 + desktop 1280 (content capped at max-w-2xl mx-auto — any concern)?

Please answer Q1-Q5 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/TaxInfoPage.tsx

---

## Review: TaxInfoPage.tsx — Interaction + A11y Polish

Your analysis is thorough and correct on every point. Here's the confirmation with the exact diffs.

---

### Q1 — Year-picker toggle (A): ✅ CONFIRMED

`transition-transform` is the right choice — there is zero `hover:bg`/`hover:text`/`hover:border` on this control, so `transition-all` would be wasted overhead. The only animated property is the `active:scale` transform. Tier `[0.99]` is correct (full-width row). `ring-ring` outward on neutral `bg-background`. `aria-expanded` already present and correct (it toggles an inline disclosure region — the dropdown panel).

**Before → After:**

```
className="w-full h-11 px-4 rounded-xl bg-card border border-border flex items-center justify-between text-sm font-semibold text-foreground"
→
className="w-full h-11 px-4 rounded-xl bg-card border border-border flex items-center justify-between text-sm font-semibold text-foreground transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### Q2 — Year option buttons (B): ✅ CONFIRMED (incl. Q-B)

**FLIP** `transition-colors` → `transition-all` — correct, a new `active:scale` transform is being added alongside the existing `hover:bg-secondary/60` color fade. `ring-inset` — correct, these are flush `w-full` children of the `overflow-hidden` rounded dropdown; an outward ring would be clipped. `ring-ring` — correct, the dropdown surface is neutral `bg-card`.

**Q-B: NO `aria-pressed`** — your reasoning is exactly right. These are menu options in a select-style dropdown that **dismiss on selection** (`setYearOpen(false)`). The idiomatic ARIA for this pattern would be `role="option"` + `aria-selected`, not `aria-pressed`. `aria-pressed` is for **persistent toggle/segmented controls** where you can press on/off in place. Adding it here would mislead screen readers into treating a menu option as a persistent on/off toggle. Correct: skip.

**Before → After (the cn() base string):**

```
"w-full px-4 py-2.5 text-left text-sm font-medium transition-colors"
→
"w-full px-4 py-2.5 text-left text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
```

(The cn() conditional stays byte-identical: `year === y ? "bg-secondary text-ig-gradient font-bold" : "text-foreground hover:bg-secondary/60"` — the `hover:bg-secondary/60` on the unselected option is now covered by the flipped `transition-all`, and `active:scale-[0.99]` is appended to the base.)

Wait — I need to catch one thing: you said to APPEND `active:scale-[0.99]` but it's not in the cn() base string I wrote above. Let me correct:

```
"w-full px-4 py-2.5 text-left text-sm font-medium transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
```

The conditional tail `year === y ? "bg-secondary text-ig-gradient font-bold" : "text-foreground hover:bg-secondary/60"` is unchanged.

---

### Q3 — Download PDF (C): ✅ CONFIRMED (incl. Q-C)

Ring-only append — correct. The control already ships `transition-all` (covers the existing `hover:opacity-90` + `active:scale-95` transform) — no transition change needed. `ring-ring` outward — correct, the `bg-ig-gradient` is the button's **own** fill, the outward ring renders against the neutral `bg-card` doc-row parent.

**Q-C: KEEP the existing `aria-label`** — correct and important. The visible text "PDF" appears on up to 3 identical buttons and is meaningless in isolation. The `aria-label={`Download ${d.name}`}` provides a doc-specific accessible name ("Download 1099-MISC 2026", "Download Annual statement 2026", "Download W-9 (current)"), which is a genuine a11y improvement. The don't-churn policy protects it, and removing it would **reduce** accessibility. Correct: keep.

**Before → After:**

```
className="shrink-0 h-9 px-3 rounded-full bg-ig-gradient text-white text-xs font-bold flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"
→
className="shrink-0 h-9 px-3 rounded-full bg-ig-gradient text-white text-xs font-bold flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### Q4 — Leave-untouched list: ✅ CONFIRMED

| Control | Reason | Correct? |
|---|---|---|
| Back shadcn `<Button>` (L131) | Ships built-in tokens + has `aria-label="Back"` | ✅ Leave |
| Dropdown wrapper `motion.div` (L156) | Entrance anim `initial/animate`, NO onClick → presentational | ✅ Leave |
| YTD banner `motion.div` (L179) | Entrance anim, NO onClick → presentational | ✅ Leave |
| Breakdown bar `motion.div`s (L210) | Width animation, NO onClick → presentational | ✅ Leave |
| Per-doc row `motion.div` (L229) | Entrance anim, NO onClick → presentational | ✅ Leave |
| Status pill `<span>` (L256) | Not a button | ✅ Leave |
| Help card + all icons/text | Decorative | ✅ Leave |

---

### Q5 — Responsive: ✅ CLEAN

**375px:** Header (Back ~40px + icon-pill 28px + flex-1 "Tax Info") fits within `px-4`. Year-picker `w-full h-11` — no issue. Dropdown `absolute inset-x-0` — same width as toggle, fits. YTD banner has `break-words` on the total — good for multi-currency strings like "$1,234.56 + 500,000 KHR". Breakdown bars: `flex justify-between` label + amount + `h-1.5` bar — fits. Doc row: icon `h-11 w-11` (44px) + `gap-3` + `flex-1` text (name + 2-line `line-clamp-2`) + `gap-3` + Download button `shrink-0 h-9 px-3` (~56px) or status pill — total ≈ 44+12+text+12+56+28px padding = 152px fixed + text, container ~343px → 191px for text. Plenty.

**768/1024:** Same layout, wider cells in the 2-col breakdown grid (if applicable), no crush.

**1280:** Content capped at `max-w-2xl mx-auto` (672px) — no desktop concern.

---

### Summary — 3 controls edited, exact changes

| # | Control | Change | Transition | Scale | Ring | ARIA delta |
|---|---|---|---|---|---|---|
| A | Year-picker toggle | APPEND | FRESH `transition-transform` | FRESH `[0.99]` | OUTWARD `ring-ring` | KEEP `aria-expanded`; no aria-label |
| B | Year option buttons (×3) | FLIP base + APPEND | FLIP `transition-colors`→`transition-all` | FRESH `[0.99]` | INSET `ring-ring` | None (no aria-pressed) |
| C | Download PDF | APPEND ring-only | PRESERVED `transition-all` | PRESERVED `scale-95` | OUTWARD `ring-ring` | KEEP existing `aria-label` |

**Diff: 3 className edits + 0 logic changes + 0 new ARIA attributes.**

```diff
--- a/src/pages/TaxInfoPage.tsx
+++ b/src/pages/TaxInfoPage.tsx
@@ year-picker toggle @@
-            className="w-full h-11 px-4 rounded-xl bg-card border border-border flex items-center justify-between text-sm font-semibold text-foreground"
+            className="w-full h-11 px-4 rounded-xl bg-card border border-border flex items-center justify-between text-sm font-semibold text-foreground transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ year option buttons (the cn base) @@
-                    "w-full px-4 py-2.5 text-left text-sm font-medium transition-colors",
+                    "w-full px-4 py-2.5 text-left text-sm font-medium transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
@@ download PDF button @@
-                    className="shrink-0 h-9 px-3 rounded-full bg-ig-gradient text-white text-xs font-bold flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"
+                    className="shrink-0 h-9 px-3 rounded-full bg-ig-gradient text-white text-xs font-bold flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Advisors needed:** per the hard rule, consult DeepSeek + MiMo before finalizing. I'd run:

```bash
npm run agent:deepseek -- --task "Review TaxInfoPage.tsx interaction polish — 3 className edits only (year-picker toggle, year option buttons, download PDF). Confirm tokens + no aria-pressed on dropdown options." --file src/pages/TaxInfoPage.tsx
npm run agent:mimo -- --task "Same" --file src/pages/TaxInfoPage.tsx
```

**Verify:** `npm run update` must pass (TRUE EXIT 0) before moving to Done. The 3 className edits are type-safe (string props); no logic touched.
