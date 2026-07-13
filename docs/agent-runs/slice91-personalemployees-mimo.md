# MiMo run — 2026-06-14T08:37:13.974Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/personal/PersonalEmployeesPage.tsx (164-line "Employees" — a customer's small-team roster at the personal employees route; localStorage-backed (EMP_KEY) CRUD: add/toggleStatus/remove + toast; useState employees/showAdd/newName/newRole/newEmail; layout: AppLayout [hideHeader] + a manual header [raw icon Back + "Employees" + a raw icon Add(+) toggle] + a 3-up stats grid [non-interactive] + an AnimatePresence add-form card [2 raw <input> + a role-chip strip of raw <button> mapped over ROLES + shadcn Cancel/Add-Member Buttons] + a list of employee cards [each = a motion.div with avatar + name/role/email + a raw toggle-status SWITCH <button> + a raw remove(X) icon <button>]). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, navigate, setNewRole/setShowAdd, save()/localStorage, toggleStatus/removeEmployee/addEmployee, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button>/<Badge> (own tokens). Don't churn the raw <input>s (ALREADY have native focus:ring-1 focus:ring-primary/40). Don't renumber an existing scale. Don't add role/tabIndex/onKeyDown. Don't touch disabled.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when the control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted, or faint tints like bg-primary/5) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/segmented-filter active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF. Adding a NEW transition to a button with NO prior transition is NEW (not a flip).
- FLIP: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover color/bg/border ON ITSELF → FLIP transition-colors→transition-all.
- DON'T-CHURN: a control that ALREADY has active:scale + transition → ADD ring (+aria) ONLY.
- A control that ALREADY presses via active:bg (background wash) + transition-colors → ADD ring ONLY (no competing scale).
- For bare icon/text-link buttons add a `rounded`/`rounded-full` so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter (a custom on/off switch counts as a persistent toggle).

FIVE edits applied — confirm each CORRECT or NEEDS-FIX:

A) L63 HEADER BACK button (icon-only ArrowLeft, one-shot onClick={() => navigate(-1)}, ALREADY aria-label="Go back", base `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform` [ALREADY active:scale-90 + transition-transform], NO focus; parent = the page column on bg-background neutral) → applied: DON'T-CHURN — APPENDED `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (KEEP active:scale-90 [DON'T renumber]; no flip; OUTWARD ring-ring; KEPT aria-label). Confirm.

B) L68 ADD-EMPLOYEE button (icon-only Plus, one-shot onClick={() => setShowAdd(v => !v)} [toggles the add form open/closed], ALREADY aria-label="Add employee", base `w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center active:scale-90 transition-transform` [ALREADY active:scale-90 + transition-transform], NO focus; parent = the header row on bg-background neutral) → applied: DON'T-CHURN — APPENDED `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (KEEP active:scale-90; no flip; OUTWARD ring-ring — the tile has its own bg-primary/10 fill but the outward ring renders against the neutral header bg; KEPT aria-label). NOTE: this is a one-shot toggle of a TRANSIENT add-form (not a persistent single-select state) → NO aria-pressed (kept aria-label only). Confirm DON'T-CHURN ring-only + OUTWARD ring-ring + keep aria-label + NO aria-pressed (transient form toggle, not a persistent state).

C) L103 ROLE chip (raw <button>, MAPPED over ROLES [Driver/Admin/Support/Manager/Dispatcher], single-select, selection conveyed via cn() conditional `newRole === r ? "bg-ig-gradient text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"` [INACTIVE branch has a hover:border-primary/40 border-color hover ON THE BUTTON], one-shot onClick={() => setNewRole(r)}, VISIBLE text role name; cn() static base `px-3 py-1 rounded-full text-[11px] font-bold border transition-colors` [ALREADY transition-colors], NO scale/focus/aria; container = `flex flex-wrap gap-1.5` inside the add-form card `rounded-2xl border border-primary/20 bg-primary/5 p-4`) → applied: ADDED `aria-pressed={newRole === r}` + into the static cn() arg FLIPPED `transition-colors`→`transition-all` + APPENDED `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (segmented-filter tier [0.97]; FLIP REQUIRED — gains a new active:scale transform NOT covered by transition-colors, AND the inactive branch's hover:border-primary/40 + the active bg-ig-gradient wash must keep animating → transition-all; OUTWARD ring-ring — a gradient-filled chip on the faint-tint bg-primary/5 form card [treated neutral] → ring-ring [the outward ring renders against the form-card parent, not the chip's own gradient]; the chips sit in a flex-wrap with the card's p-4 padding, NOT a flush edge child of an overflow-hidden parent → OUTWARD not inset; aria-pressed — persistent single-select role filter, selection bg-conveyed). Confirm aria-pressed + FLIP transition-colors→transition-all + [0.97] + OUTWARD ring-ring.

D) L141 TOGGLE-STATUS switch (raw <button>, a CUSTOM on/off SWITCH — `w-8 h-5 rounded-full` track with a sliding `w-4 h-4` knob div inside, state conveyed via cn() conditional `emp.status === "active" ? "bg-emerald-500 justify-end" : "bg-muted justify-start"` [bg-color + knob-position via justify], one-shot onClick={() => toggleStatus(emp.id)}, ALREADY aria-label="Toggle status", cn() static base `w-8 h-5 rounded-full flex items-center px-0.5 transition-colors` [ALREADY transition-colors — for the state bg wash + the knob slide], NO scale/focus/aria-pressed; parent = the employee card `rounded-2xl bg-card border p-4` neutral) → applied: ADDED `aria-pressed={emp.status === "active"}` + into the static cn() arg APPENDED `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (ring-ONLY — NO scale; a custom on/off switch already gives press/state feedback via the bg-color change + the sliding knob [animated by the existing transition-colors], adding an active:scale press would be a SECOND competing effect + is non-standard for a switch; keep transition-colors, NO flip [the ring adds no animated prop]; OUTWARD ring-ring — the switch's own fill is bg-emerald-500/bg-muted but the outward ring renders against the neutral bg-card row → ring-ring; already rounded-full so the ring traces; aria-pressed — a custom on/off switch is a PERSISTENT toggle → aria-pressed conveys the on/off state; KEPT aria-label). Confirm ring-ONLY (NO scale on a switch) + keep transition-colors no flip + OUTWARD ring-ring + ADD aria-pressed + keep aria-label. **Is aria-pressed correct on a custom on/off switch (vs leaving it / vs a scale)? Is ring-ONLY (no press-scale) the right call for a toggle switch?**

E) L145 REMOVE(X) button (icon-only X, one-shot onClick={() => removeEmployee(emp.id)} [deletes the employee from localStorage], ALREADY aria-label="Remove employee", base `p-1 rounded-lg hover:bg-muted/60` [has a hover:bg-muted/60 color wash ON THE BUTTON but NO transition/scale/focus]; parent = the employee card bg-card neutral) → applied: KEPT aria-label + APPENDED `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier scale-95; transition-all NEW — the button has a hover:bg-muted/60 color hover AND gains a scale transform → BOTH animate → transition-all NOT transition-transform [and it's NEW, not a flip — no prior transition class]; rounded-lg already present so the ring traces; OUTWARD ring-ring on the neutral bg-card; KEPT aria-label). Confirm tier scale-95 + transition-all NEW (hover present) + OUTWARD ring-ring + keep aria-label.

ALSO CONFIRM I should LEAVE: the shadcn Cancel <Button> L111 + Add-Member <Button> L112 (own focus/scale tokens); all shadcn <Badge> (status/role — own tokens, non-interactive); the two raw add-form <input>s L97 + L99 (ALREADY native focus:outline-none focus:ring-1 focus:ring-primary/40 — leave to avoid churn); AppLayout (wrapper, hideHeader); the 3-up stats grid <div>s (non-interactive); the avatar-initials <div> + name/email <p>s + <span>s (non-interactive); the toggle knob <div> (decorative, inside the switch); the AnimatePresence/motion.div wrappers (anim, NO onClick); the empty-state block; ArrowLeft/Users/Plus/X/Shield/Clock/Mail icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) D — is aria-pressed correct on the custom on/off toggle switch, and is ring-ONLY (NO competing press-scale) the right call? (2) C — is the transition-colors→transition-all FLIP correct given the inactive branch's hover:border-primary/40? (3) B — is NO aria-pressed correct for the Add(+) button (it toggles a transient form, not a persistent selected state)?
- files: src/pages/app/personal/PersonalEmployeesPage.tsx

---

## Review: All 5 edits CORRECT — zero changes needed.

### Per-control verification

| # | Control | Edit | Verdict |
|---|---------|------|---------|
| **A** | Header Back `button` | DON'T-CHURN ring-only append; keep `active:scale-90` + `transition-transform`; keep `aria-label="Go back"` | ✅ |
| **B** | Add-employee `button` | DON'T-CHURN ring-only append; keep `active:scale-90` + `transition-transform`; keep `aria-label="Add employee"`; NO `aria-pressed` (transient form toggle) | ✅ |
| **C** | Role chip `button` ×5 | FLIP `transition-colors`→`transition-all` + `active:scale-[0.97]` + ring + `aria-pressed={newRole === r}` | ✅ |
| **D** | Toggle-status `button` | ring-ONLY (no scale) + keep `transition-colors` (no flip) + `aria-pressed={emp.status === "active"}` + keep `aria-label` | ✅ |
| **E** | Remove(X) `button` | `transition-all` NEW + `active:scale-95` + ring + keep `aria-label="Remove employee"` | ✅ |

### Answers to the three flagged questions

**(1) D — `aria-pressed` on a custom on/off switch, ring-ONLY with no scale?**
Both correct. The rulebook explicitly says *"a custom on/off switch counts as a persistent toggle"* → `aria-pressed` conveys the live on/off state. Ring-only is the right call: the switch already gives press/state feedback via the bg-color change + sliding knob (animated by the existing `transition-colors`); adding `active:scale` would be a non-standard competing effect for a toggle switch.

**(2) C — `transition-colors`→`transition-all` FLIP?**
Correct. The inactive branch has `hover:border-primary/40` (a border-color hover **on the button itself**) and the new `active:scale-[0.97]` is a transform — both must animate → `transition-all`. If the inactive branch had no hover, plain `transition-transform` would suffice, but the hover forces the flip.

**(3) B — NO `aria-pressed` on the Add(+) button?**
Correct. The button toggles visibility of a **transient** add-form (open/close), not a persistent selected state. `aria-pressed` is for segmented filters, custom toggles, and on/off switches where the pressed state is semantically meaningful. An expanding/collapsing panel toggle would use `aria-expanded` — but since the form is purely transient UI and the button is icon-only with `aria-label="Add employee"`, leaving it as-is is correct. (Adding `aria-expanded` would be a nice-to-have but is outside the display-only scope of this pass.)

### Final class strings after each edit (for the record)

**A.** `className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` — `aria-label="Go back"`

**B.** `className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` — `aria-label="Add employee"`

**C.** `className={cn("px-3 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", newRole === r ? "bg-ig-gradient text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}` — `aria-pressed={newRole === r}`

**D.** `className={cn("w-8 h-5 rounded-full flex items-center px-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", emp.status === "active" ? "bg-emerald-500 justify-end" : "bg-muted justify-start")}` — `aria-label="Toggle status"` + `aria-pressed={emp.status === "active"}`

**E.** `className="p-1 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` — `aria-label="Remove employee"`

### Leave list — confirmed, no missed controls

All shadcn `<Button>` (Cancel/Add-Member), `<Badge>` (status/role), raw `<input>`s (native `focus:ring-1 focus:ring-primary/40`), stats grid divs, avatar/name/email non-interactive elements, toggle knob div, `AnimatePresence`/`motion.div` wrappers, empty state, and all icons are correctly left untouched. **No other in-scope raw interactive controls missed** — the file has exactly 5 distinct `<button>` sites (A, B, C-mapped, D, E), all covered.

### Diff summary

- **5 className edits** (A/B/E appended ring on existing or new-press controls; C FLIP+append; D ring-only append)
- **2 new aria attrs**: `aria-pressed={newRole === r}` (C), `aria-pressed={emp.status === "active"}` (D)
- **2 kept aria attrs**: `aria-label="Go back"` (A), `aria-label="Add employee"` (B), `aria-label="Toggle status"` (D), `aria-label="Remove employee"` (E)
- **0 logic lines touched** — all `onClick`/`navigate`/`setNewRole`/`setShowAdd`/`save()`/`localStorage`/`toggleStatus`/`removeEmployee`/`addEmployee` byte-identical
- **1 FLIP** (C `transition-colors`→`transition-all`); **2 NEW transitions** (D none — ring-only; E `transition-all` NEW [hover present + new scale])

### Owner action

1. Run `npm run update` — must pass (types + worker types + build).
2. The file is ready to commit. No deploy changes needed beyond the normal push.
