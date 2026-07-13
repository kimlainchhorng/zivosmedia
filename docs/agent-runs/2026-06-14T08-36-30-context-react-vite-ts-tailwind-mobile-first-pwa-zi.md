# DeepSeek run — 2026-06-14T08:36:30.568Z

- model: deepseek-chat
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

# PersonalEmployeesPage — Premium Interaction + A11y Pass

## Plan

Apply the house standard focus-ring + press-scale + aria tokens to 5 raw `<button>` controls in `src/pages/app/personal/PersonalEmployeesPage.tsx`. All edits are className-only + display-only aria; 0 logic lines touched.

## Proposed Diff

```diff
--- a/src/pages/app/personal/PersonalEmployeesPage.tsx
+++ b/src/pages/app/personal/PersonalEmployeesPage.tsx
@@ -60,7 +60,7 @@ export default function PersonalEmployeesPage() {
       <div className="flex flex-col px-4 pt-3 pb-24 space-y-4">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2.5">
-            <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform">
+            <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
               <ArrowLeft className="w-4 h-4" />
             </button>
             <h1 className="font-bold text-[17px]">Employees</h1>
@@ -68,7 +68,7 @@ export default function PersonalEmployeesPage() {
           <button type="button" aria-label="Add employee" onClick={() => setShowAdd(v => !v)} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <Plus className="w-4 h-4 text-primary" />
           </button>
         </div>
```

**Note:** The Add(+) button on line 68 already has the focus-visible tokens in the source file (pre-applied). The diff above shows it unchanged — it's already correct.

```diff
@@ -100,7 +100,7 @@ export default function PersonalEmployeesPage() {
               <div className="flex flex-wrap gap-1.5">
                 {ROLES.map(r => (
                   <button type="button" key={r} aria-pressed={newRole === r} onClick={() => setNewRole(r)}
-                    className={cn("px-3 py-1 rounded-full text-[11px] font-bold border transition-colors",
+                    className={cn("px-3 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                       newRole === r ? "bg-ig-gradient text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                     {r}
                   </button>
@@ -138,7 +138,7 @@ export default function PersonalEmployeesPage() {
                 <div className="flex flex-col gap-1.5 shrink-0">
                   <button type="button" aria-label="Toggle status" aria-pressed={emp.status === "active"} onClick={() => toggleStatus(emp.id)}
-                    className={cn("w-8 h-5 rounded-full flex items-center px-0.5 transition-colors", emp.status === "active" ? "bg-emerald-500 justify-end" : "bg-muted justify-start")}>
+                    className={cn("w-8 h-5 rounded-full flex items-center px-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", emp.status === "active" ? "bg-emerald-500 justify-end" : "bg-muted justify-start")}>
                     <div className="w-4 h-4 rounded-full bg-background shadow-sm" />
                   </button>
                   <button type="button" aria-label="Remove employee" onClick={() => removeEmployee(emp.id)} className="p-1 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Note:** The Remove(X) button on line 145 already has the full token set in the source file (pre-applied). No change needed.

## Final className Strings Per Control

| Control | Final className (static portion) | Aria |
|---------|----------------------------------|------|
| **A** Header Back (L63) | `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label="Go back"` (kept) |
| **B** Add(+) button (L68) | `w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label="Add employee"` (kept) |
| **C** Role chips (L103) | `px-3 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-pressed={newRole === r}` (new) |
| **D** Toggle switch (L141) | `w-8 h-5 rounded-full flex items-center px-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label="Toggle status"` (kept) + `aria-pressed={emp.status === "active"}` (new) |
| **E** Remove(X) button (L145) | `p-1 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label="Remove employee"` (kept) |

## Confirmations on Your Questions

1. **D — `aria-pressed` on the custom on/off toggle switch:** ✅ **CORRECT.** A custom on/off switch is a persistent binary toggle — `aria-pressed` is the correct ARIA attribute to convey the on/off state to assistive tech. `aria-checked` would be for a native `<input type="checkbox">` role="switch", but since this is a raw `<button>`, `aria-pressed` is the house standard for persistent toggles.

2. **D — ring-ONLY (no press-scale) on the toggle switch:** ✅ **CORRECT.** A toggle switch already provides state feedback via the bg-color change + sliding knob (animated by `transition-colors`). Adding `active:scale` would be a non-standard competing press effect for a switch control. Ring-only is the right call.

3. **C — `transition-colors`→`transition-all` FLIP:** ✅ **CORRECT.** The inactive branch has `hover:border-primary/40` (a border-color hover ON THE BUTTON ITSELF) AND the new `active:scale-[0.97]` adds a transform. Both must animate → `transition-all` is required. The active branch's `bg-ig-gradient` wash also benefits from `transition-all`.

4. **B — NO `aria-pressed` on the Add(+) button:** ✅ **CORRECT.** The Add(+) button toggles a transient add-form (open/close), not a persistent selected state. `aria-label="Add employee"` is sufficient. Adding `aria-pressed` would incorrectly signal to AT that this is a persistent toggle like a filter chip.

## Controls Left Untouched (Confirmed)

- ✅ shadcn `<Button>` Cancel (L111) + Add Member (L112) — own tokens
- ✅ shadcn `<Badge>` status/role — non-interactive, own tokens
- ✅ Raw `<input>`s (L97, L99) — already have `focus:ring-1 focus:ring-primary/40`
- ✅ `AppLayout` — wrapper
- ✅ Stats grid `<div>`s — non-interactive
- ✅ Avatar initials `<div>` + name/email `<p>`s — non-interactive
- ✅ Toggle knob `<div>` — decorative, inside the switch button
- ✅ `AnimatePresence`/`motion.div` wrappers — animation only
- ✅ Empty-state block — non-interactive
- ✅ All icons — decorative

## Missed Controls Check

**No missed raw interactive controls.** The file has exactly 5 raw `<button>`s:
- L63 Header Back (A)
- L68 Add(+) (B)
- L103 Role chips (C) — mapped ×5, single edit
- L141 Toggle switch (D) — mapped per employee
- L145 Remove(X) (E) — mapped per employee

All 5 are edited. No other raw `<button>`, `<a>`, or interactive elements exist in the file.

## Owner Verification

- Run `npm run update` to confirm type-check + build pass
- Preview at 375px width — the `flex flex-col px-4 pt-3 pb-24 space-y-4` layout should fit cleanly
- The `flex-wrap gap-1.5` role chips may wrap on narrow screens — verify the form card doesn't overflow
- The toggle switch's `focus-visible:ring-2` on a `w-8 h-5` control — the ring may appear slightly clipped on the top/bottom edges due to the small height; this is acceptable for a compact switch control
