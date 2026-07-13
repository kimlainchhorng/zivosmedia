# MiMo run — 2026-06-14T03:10:51.847Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/MedicationsPage.tsx  (a "track medications, doses, refills" page reached by in-app navigation; LOCAL-ONLY — persists to localStorage under "zivo:meds:v1", no PHI sent to any server; `meds` useState; `toggleTaken(id)`, `removeMed(id)`, `addMed()` handlers all mutate state + saveMeds(localStorage); `stats` useMemo. Layout: a sticky header with a shadcn back button + title + a shadcn "Add" button, a gradient hero stat card, a collapsible add-form (AnimatePresence: two text inputs + a select + Save/Cancel shadcn buttons), then a vertical list of med rows. Each med row is a presentational motion.div containing a leading round "taken" toggle button (icon-only Check), the med name/dose/time/refill meta, and a trailing icon-only "remove" (X) button.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, and framer-motion whileTap if warranted). Please keep ALL logic exactly as it is: the `toggleTaken`/`removeMed`/`addMed` handlers, the localStorage load/save, the `stats` useMemo, the `navigate(-1)` target, the `draft`/`adding`/`meds` state, and every onClick must stay byte-identical. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset). Use focus-visible:ring-inset INSTEAD OF an outward ring when the control is a flush edge child of a rounded overflow-hidden parent.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press. If the control ALREADY ships transition-all, append the ring (don't re-flip).
- aria-label only on icon-only / image-only controls (a control with rich descriptive visible child text does NOT get an aria-label). Don't-churn: if a control already ships a valid aria-label, keep it.
- aria-pressed on a toggle button with a persistent on/off selected state; NOT on a one-shot action.
- Don't-churn rule: if a control already has a valid existing value (a focus ring, an aria-label, a press-scale), keep it rather than re-flipping/renumbering it.

COMPONENT-TYPE RULES we follow:
- shadcn <Button>/<Input> already ship built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button>/<input>/<select> (plain HTML, not shadcn) ships NO tokens.

MY PLANNED EDITS (please confirm each is right, or correct it):

1. The "taken" toggle button, line ~194 (a RAW `<button type="button">` inside `.map` over `meds`; `onClick={() => toggleTaken(m.id)}`; ALREADY has a dynamic `aria-label={m.takenToday ? "Mark as not taken" : "Mark as taken"}`; visible child = ONLY a Check icon [icon-only]; current className via cn() base `"shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-90"` + a taken/untaken conditional background). It already ships `transition-all` + `active:scale-90` but LACKS a focus ring:
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() base. KEEP the existing dynamic aria-label. KEEP the existing `active:scale-90` (don't-churn — a valid existing press-scale). NO transition flip (transition-all already present). OUTWARD ring (the parent med-row motion.div is `p-3 rounded-2xl border`, NOT overflow-hidden).
   - QUESTION (Q3 below): this IS a persistent on/off toggle (takenToday) — but it ALREADY announces its state via the DYNAMIC aria-label ("Mark as taken" vs "Mark as not taken"). Should I ALSO add aria-pressed={m.takenToday}, or would that double-announce state alongside the changing accessible name? My lean: KEEP the dynamic aria-label as the single source of state and do NOT add aria-pressed (to avoid a changing-name + aria-pressed redundancy), but please advise.

2. The "remove" button, line ~226 (a RAW `<button type="button">` inside the same `.map`; `onClick={() => removeMed(m.id)}`; ALREADY has a dynamic `aria-label={`Remove ${m.name}`}`; visible child = ONLY an X icon [icon-only]; current className `"shrink-0 h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex items-center justify-center transition-colors"`):
   plan: FLIP `transition-colors`->`transition-all` + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. KEEP the existing dynamic aria-label. NO aria-pressed (one-shot action).
   - FLIP required: the existing `transition-colors` eases the `hover:bg-destructive/10` + `hover:text-destructive` fades but NOT the new `active:scale` transform; `transition-all` (superset) eases both.
   - icon-only tier -> active:scale-95.
   - OUTWARD ring (trailing child of a `p-3 rounded-2xl border` row, NOT overflow-hidden).
   This matches the established DevicesPage/DownloadedPacksPage icon-only Remove precedent.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none need a change):
- Back button, line ~98: shadcn <Button aria-label="Back" variant="ghost" size="icon"> — labeled, ships tokens.
- "Add" button, line ~107: shadcn <Button size="sm" onClick={setAdding(true)}> with visible "Add" text + Plus icon — ships tokens, visible text.
- The two text inputs (line ~145, ~152) + the select (line ~159) in the add form: RAW <input>/<select> but they ALREADY ship a valid focus treatment (`focus:outline-none focus:ring-2 focus:ring-rose-500/30`). My lean per don't-churn: LEAVE them as-is (they do not LACK a focus ring; migrating `focus:ring-rose-500/30` to the `focus-visible:ring-ring` token would be a churn of a working style). Please confirm leave-as-is is right, or advise if you think these should be migrated to the token for consistency.
- Save/Cancel buttons (line ~170, ~173): shadcn <Button> — ship tokens, visible text.
- Hero stat card (line ~120), add-form wrapper (line ~137), each med-row motion.div (line ~184): entrance animation, NO onClick — presentational.
- Empty-state (line ~238), the privacy note <p> (line ~248) — non-interactive.
- All Pill/Plus/Clock/Bell/Check/X/AlertCircle icons — decorative.

QUESTIONS:
Q1. Taken toggle (line ~194): is APPEND-ring-only (keep transition-all, keep active:scale-90, keep dynamic aria-label, OUTWARD ring) correct?
Q2. Remove button (line ~226): is FLIP transition-colors->transition-all + active:scale-95 + OUTWARD ring + KEEP dynamic aria-label, NO aria-pressed, correct and consistent with the DevicesPage Remove precedent?
Q3. aria-pressed on the taken toggle: should it be added (persistent on/off state) OR omitted (the dynamic aria-label already announces the state, and aria-pressed alongside a changing name could double-announce)? Which is the better single-source-of-truth?
Q4. The add-form inputs/select already have `focus:ring-rose-500/30` — leave as-is (don't-churn) or migrate to `focus-visible:ring-ring`? And at 375px, do the med rows (toggle + name/meta + remove) and the add form lay out without crushing?

Please answer Q1-Q4 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/MedicationsPage.tsx

---

## Review: MedicationsPage.tsx — interaction polish pass

### Control inventory (exhaustive, 225-line read)

| # | Line | Element | Type | Decision |
|---|------|---------|------|----------|
| 1 | ~98 | Back button | shadcn `<Button aria-label="Back">` | **SKIP** — labeled, ships tokens |
| 2 | ~107 | "Add" button | shadcn `<Button>` + visible "Add" text | **SKIP** — ships tokens, visible text |
| 3 | ~145 | Name `<input>` | RAW, `focus:ring-rose-500/30` | **SKIP** — has valid existing focus ring |
| 4 | ~152 | Dose `<input>` | RAW, `focus:ring-rose-500/30` | **SKIP** — same |
| 5 | ~159 | Time `<select>` | RAW, `focus:ring-rose-500/30` | **SKIP** — same |
| 6 | ~170 | Save button | shadcn `<Button>` + visible "Save" text | **SKIP** — ships tokens |
| 7 | ~173 | Cancel button | shadcn `<Button variant="ghost">` + visible text | **SKIP** — ships tokens |
| 8 | ~194 | **Taken toggle** | RAW `<button>`, icon-only, `transition-all active:scale-90` | **EDIT** — add focus ring only |
| 9 | ~226 | **Remove button** | RAW `<button>`, icon-only, `transition-colors` | **EDIT** — flip + scale + ring |
| — | ~120 | Hero stat card | `motion.div`, NO onClick | SKIP — presentational |
| — | ~137 | Add-form wrapper | `motion.div`, NO onClick | SKIP — presentational |
| — | ~184 | Med-row div | `motion.div`, NO onClick | SKIP — presentational |
| — | ~238 | Empty state | `<div>` | SKIP — non-interactive |
| — | ~248 | Privacy note | `<p>` | SKIP — non-interactive |

**Total: 2 controls to edit, 0 aria attrs to add/change, 2 className string changes.**

---

### Answers to Q1–Q4

**Q1 — Taken toggle (line ~194): APPEND-ring-only?**
✅ **Correct.** The button already ships `transition-all` and `active:scale-90` — don't-churn says keep both. The only gap is the missing focus ring. Parent med-row has `p-3 rounded-2xl border` and is NOT `overflow-hidden` → OUTWARD ring, no `ring-inset`.

**Q2 — Remove button (line ~226): FLIP + scale + ring?**
✅ **Correct and consistent with the DevicesPage/DownloadedPacksPage icon-only Remove precedent exactly.** The `hover:bg-destructive/10` + `hover:text-destructive` require `transition-all` (the FLIP from `transition-colors`), icon-only tier → `active:scale-95`, OUTWARD ring (same `p-3` parent, not `overflow-hidden`). Dynamic `aria-label` kept. One-shot action → no `aria-pressed`.

**Q3 — aria-pressed on the taken toggle?**
✅ **Omit `aria-pressed`. Your lean is correct.** The dynamic aria-label (`"Mark as taken"` ↔ `"Mark as not taken"`) is an "action-based" label that inherently communicates state — it is already the single source of truth. Adding `aria-pressed={m.takenToday}` would create a double-announcement: screen readers would read "Mark as not taken, **pressed**" which is redundant and slightly confusing (the "not taken" in the label + "pressed" is semantically contradictory-feeling). If the label were constant (e.g., always "Taken today"), then `aria-pressed` would be required. But with a changing name, it's the better sole announcer. Keep the existing dynamic label as-is, no `aria-pressed`.

**Q4 — Migrate `focus:ring-rose-500/30` on inputs/select?**
✅ **Leave as-is (don't-churn).** Two reasons:
1. The existing `focus:ring-rose-500/30` is a valid, visible, functional focus ring — per don't-churn, don't re-flip a working style.
2. Text inputs and selects are **always-click focus targets** (you click into them to type even on mouse), so `focus:` is actually more appropriate than `focus-visible:` for these elements. Migrating would regress mouse-click focus visibility.

**Q4 part 2 — Responsive at 375px:**
✅ **No crush.** At 375px → 343px inner (`px-4` each side). **Med row:** taken toggle `h-10 w-10` (40px) + `gap-3` (12px) left, remove `h-8 w-8` (32px) + `gap-3` (12px) right → **247px for the middle column** — name `line-clamp-1` + meta `text-[11px]` with `flex-wrap` and `min-w-0` handles even "Refill in 28d" content gracefully. **Add form:** all `w-full h-10` single-column inputs + the save/cancel `flex gap-2` row (save `flex-1` + cancel) fits comfortably at 343px.

---

### Proposed changes (2 edits, exact before/after)

**Edit 1 — Taken toggle (line ~194): APPEND focus ring to cn() base**

```diff
-                  "shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-90",
+                  "shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

Kept: `transition-all`, `active:scale-90`, dynamic `aria-label`, cn() conditional bg.  
Added: focus ring (3 tokens appended).  
No: `ring-inset` (OUTWARD — parent has `p-3`, not `overflow-hidden`), no `aria-pressed`, no transition flip.

**Edit 2 — Remove button (line ~226): FLIP transition + append scale + ring**

```diff
-                className="shrink-0 h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex items-center justify-center transition-colors"
+                className="shrink-0 h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

FLIPped: `transition-colors` → `transition-all` (the `hover:bg` + `hover:text` fades need the superset).  
Appended: `active:scale-95` (icon-only tier) + focus ring.  
Kept: dynamic `aria-label`, `hover:` classes, `text-muted-foreground`.  
No: `aria-pressed` (one-shot action), no `ring-inset` (OUTWARD).

---

### Diff summary

| Metric | Value |
|--------|-------|
| Controls edited | 2 / 9 |
| className changes | 2 ins / 2 del (+0 net) |
| Focus rings added | 2 (taken toggle + remove) |
| Transition flips | 1 (remove: `transition-colors` → `transition-all`) |
| `active:scale` added | 1 (remove: `active:scale-95`) |
| `active:scale` kept (don't-churn) | 1 (taken: existing `active:scale-90`) |
| `aria-pressed` added | 0 |
| `aria-label` changed | 0 (both kept as-is) |
| `ring-inset` | 0 |
| Logic lines touched | 0 |

---

### What the owner must verify

1. **`npm run update`** must pass (type-check + worker type-check + production build — TRUE EXIT 0). Both edits are className-only, zero logic risk.
2. **Preview at 375px** — toggle ring and remove ring should render cleanly; the taken toggle's ring sits inside the `p-3` med-row with 12px clearance (no clip); the remove button's ring likewise.
3. **Screen reader test (optional)** — confirm the dynamic aria-label alone (without `aria-pressed`) reads naturally on VoiceOver/NVDA: "Mark as not taken, button" when taken, "Mark as taken, button" when not.
