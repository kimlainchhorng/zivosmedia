# MiMo run — 2026-06-14T06:34:32.542Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/CreatorSetupPage.tsx (978-line creator monetization onboarding: 6-step wizard [Profile/Verify/Payout/Tier/Tips/Launch] with a sticky header + Back, a horizontal STEP RAIL of pills, animated step-content card, footer Back/Next shadcn buttons; inner step components include a ProfileStep with a CategoryPicker disclosure + category chips, a TierStep with a reusable `Chip` segmented selector [tier type / billing interval / discount % / discount months / trial days] + a tier list with Edit/Delete text actions + a PromoCodesManager with Pause/Resume + Delete text actions, TipsStep with a shadcn Switch, LaunchStep with shadcn Enroll buttons). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState, useSearchParams/setParams, useQuery/refetch, supabase reads+writes (insert/update/delete), toast, byte-identical. Don't add a SECOND competing press effect; don't churn already-polished controls; don't renumber an existing active:scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT = ring-white/70. A gradient/tinted-FILLED button (bg-ig-gradient, bg-foreground) sitting ON a neutral parent still uses ring-ring (the outward ring renders against the neutral parent, not the fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip active:scale-[0.97]; wide full-width row/card WITH its own bordered/filled surface active:scale-[0.98]; BARE full-width row NO surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border. The bare `transition` utility includes transform+colors+box-shadow (so scale+ring+hover all ease — NO flip needed when appending scale/ring to a bare `transition`). FLIP RULE: a control with transition-colors GAINING a NEW active:scale MUST flip to transition-all. transition-transform already includes transform → NO flip when only adding scale. If a control ALREADY has active:scale + a transition, append ring ONLY (keep existing transition class + scale number; no flip — do NOT renumber).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter OR a two-way toggle whose on/off is bg-conveyed. aria-expanded on a disclosure/accordion trigger. aria-current="step" on the CURRENT step of a wizard/stepper rail (more precise than aria-pressed for a step navigator). NOT aria-pressed on one-shot actions (nav, set-value, delete, edit). A toggle with a DYNAMIC action-label ("Pause"/"Resume", "Mute"/"Unmute") should NOT also get aria-pressed (double-announcement).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, and any aria-* attr; flag any to LEAVE untouched):

A) L173 Header Back button (raw `<button>`, icon-only, onClick navigate("/creator-dashboard")): `p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation`. NO transition/scale/focus, NO aria-label. → my plan: ADD `aria-label="Back"` + APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only 95; transition-all because hover:bg + new scale; OUTWARD ring-ring neutral sticky header bg-background/85). Confirm.

B) L200 STEP RAIL pills (raw `<button>`, mapped over `steps`, navigates to that wizard step; selection bg-conveyed `bg-foreground text-background border-foreground` for the ACTIVE step [else done=emerald / undone=card]). Base: `shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors touch-manipulation`. Has transition-colors, NO scale/focus. onClick setActive(s.key)+setParams. In an `overflow-x-auto scrollbar-hide` row; PARENT neutral. → my plan: FLIP transition-colors→transition-all + APPEND `active:scale-[0.97] focus-visible...ring-ring` (segmented tier [0.97]; FLIP — transition-colors gaining scale; OUTWARD ring-ring — bg-foreground is the pill's OWN active fill, ring renders against neutral parent). ARIA QUESTION: this is a WIZARD STEP RAIL (one step is "current/active") — is `aria-current="step"` (set on the active pill) MORE correct than `aria-pressed={isActive}` here? Or is aria-pressed the established single-select pattern? Decide aria-current="step" vs aria-pressed vs none.

C) L362 CategoryPicker disclosure trigger (raw `<button>`, w-full, opens a category panel; has a ChevronRight that rotates 90° when open): `mt-1 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/40 transition`. Bare `transition`, NO scale/focus. onClick setOpen(o=>!o). → my plan: ADD `aria-expanded={open}` + APPEND `active:scale-[0.98] focus-visible...ring-ring` (wide bordered control tier [0.98]; NO flip — bare `transition` already includes transform+box-shadow; OUTWARD ring-ring — own bg-background neutral, parent neutral). Confirm tier + aria-expanded.

D) L378 Category chips (raw `<button>`, mapped over CREATOR_CATEGORIES inside the open panel; selection bg-conveyed `bg-ig-gradient text-white border-primary` when `value===c`; onClick onChange(c)+setOpen(false) — sets the value AND closes the panel). Base: `text-[11px] font-bold px-2.5 py-1.5 rounded-full border transition` + conditional. Bare `transition`, NO scale/focus. → my plan: APPEND `active:scale-[0.98] focus-visible...ring-ring` (medium chip [0.98]; NO flip — bare transition; OUTWARD ring-ring — bg-ig-gradient own fill on neutral panel). ARIA QUESTION: selection is bg-conveyed BUT clicking immediately CLOSES the panel (one-shot set-value-and-close, not a persistent in-place filter) — so NO aria-pressed (one-shot set-value)? Or aria-pressed because it's a single-select option list? Decide.

E) L570 reusable `Chip` (raw `<button>`, used MANY times for persistent single-selects: tier type [paid/free/custom], billing interval, discount %, discount months, trial days; selection bg-conveyed `bg-ig-gradient text-white border-primary` via the `active` prop). Base: `px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all` + conditional. Has transition-all, NO scale/focus. onClick={onClick}. → my plan: ADD `aria-pressed={active}` + APPEND `active:scale-[0.97] focus-visible...ring-ring` into the base (segmented filter [0.97]; NO flip — transition-all present; OUTWARD ring-ring — bg-ig-gradient own fill on neutral card parent). Confirm (single edit on the Chip component hits every instance).

F) L615 Edit-tier text button (raw `<button>`, onClick startEdit(t) — loads a tier into the editor): `text-[10px] font-bold text-primary px-2 py-1 hover:underline`. NO transition/scale/focus. Small inline text-link, one-shot. hover:underline (text-decoration, NOT a transitioned color/bg/border). → my plan: APPEND `active:scale-[0.97] transition-transform focus-visible...ring-ring` (small text-link [0.97]; transition-transform — scale is the ONLY smoothly-animated prop, hover:underline toggles instantly; OUTWARD ring-ring; NO aria — one-shot). Confirm transition-transform vs transition-all for a hover:underline text-link.

G) L616 Delete-tier text button (raw `<button>`, onClick remove(t.id) [native confirm()], visible text "Delete"): `text-[10px] font-bold text-destructive px-2 py-1 hover:underline`. Same shape as F. → my plan: APPEND `active:scale-[0.97] transition-transform focus-visible...ring-ring` (NO aria — one-shot destructive with visible text; native confirm() not a Dialog → no aria-haspopup). Confirm.

H) L628 Cancel-edit text button (raw `<button>`, onClick reset): `text-[10px] font-bold text-muted-foreground hover:text-foreground`. NO transition/scale/focus. Small inline text-link, one-shot. hover:text-foreground (a transitioned COLOR). → my plan: APPEND `active:scale-[0.97] transition-all focus-visible...ring-ring` (small text-link [0.97]; transition-all because hover:text-color + scale both animate; OUTWARD ring-ring; NO aria). Confirm.

I) L868 Pause/Resume promo-code text button (raw `<button>`, onClick toggle(c.id, c.is_active) — DYNAMIC label `{c.is_active ? "Pause" : "Resume"}`, two-way toggle of is_active): `text-[10px] font-bold text-muted-foreground hover:text-foreground`. NO transition/scale/focus. → my plan: APPEND `active:scale-[0.97] transition-all focus-visible...ring-ring` (small text-link [0.97]; transition-all — hover:text-color + scale; NO aria-pressed — DYNAMIC action-label toggle [like Mute/Unmute] → double-announce risk). Confirm NO aria-pressed.

J) L871 Delete promo-code text button (raw `<button>`, onClick remove(c.id) [native confirm()], visible text "Delete"): `text-[10px] font-bold text-destructive`. NO transition/scale/focus, NO hover. Small inline text-link, one-shot destructive. → my plan: APPEND `active:scale-[0.97] transition-transform focus-visible...ring-ring` (small text-link [0.97]; transition-transform — scale is the ONLY animated prop, no hover; OUTWARD ring-ring; NO aria). Confirm.

ALSO CONFIRM I should LEAVE these: all shadcn `<Button>` (footer Back L278 + Next L281; Save profile L341; Start verification L424; Create tier L756; Create code L854; Enroll L969 — ship own focus/scale tokens); shadcn `<Switch>` L913 (ships tokens); shadcn `<Input>`/`<Textarea>`/`<Label>` (form fields, ship tokens); UnifiedPayoutCard L451 (separate component); the progress-bar motion.div L184 + step-content motion.div L222 (animation, presentational); the tier-list rows L589 + program rows L956 + promo-code rows L861 (plain `<div>`s, NO onClick — presentational); badges/icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Note B/E are mapped/reused templates (single edit hits all instances); A/C/D/F/G/H/I/J one each (D is also mapped over categories but one edit).
- files: src/pages/CreatorSetupPage.tsx

---

## Plan

10 raw controls edited across the file (A–J). 4 aria attrs. 1 FLIP (B). All ring-ring (neutral parents throughout). One single edit on the reusable `Chip` component (E) propagates to every tier/billing/discount/trial instance.

**ARIA decisions:**
- **B (step rail):** Use `aria-current="step"` on the active pill — more precise than `aria-pressed` for a wizard/stepper rail (WAI-ARIA pattern: "current step in a sequence").
- **D (category chips):** NO `aria-pressed` — clicking selects AND closes the panel (one-shot dropdown picker, not a persistent segmented filter). The trigger text communicates the selection.
- **E (Chip):** `aria-pressed={active}` — persistent in-place segmented filter with bg-conveyed selection.

---

## Diff — `src/pages/CreatorSetupPage.tsx`

### A) Header Back button

```diff
-          <button type="button" onClick={() => navigate("/creator-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
+          <button type="button" onClick={() => navigate("/creator-dashboard")} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### B) Step rail pills

```diff
-              <button type="button"
+              <button type="button" aria-current={isActive ? "step" : undefined}
                 key={s.key}
                 onClick={() => { setActive(s.key); setParams({ step: s.key }); }}
-                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors touch-manipulation ${
+                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
```

### C) CategoryPicker disclosure trigger

```diff
-        onClick={() => setOpen((o) => !o)}
-        className="mt-1 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/40 transition"
+        onClick={() => setOpen((o) => !o)}
+        aria-expanded={open}
+        className="mt-1 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/40 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### D) Category chips

```diff
-                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border transition ${
+                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
```

### E) Reusable `Chip` component

```diff
-    <button
-      type="button"
-      onClick={onClick}
-      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
+    <button
+      type="button"
+      onClick={onClick}
+      aria-pressed={active}
+      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
```

### F) Edit-tier text button

```diff
-              <button type="button" onClick={() => startEdit(t)} className="text-[10px] font-bold text-primary px-2 py-1 hover:underline">Edit</button>
+              <button type="button" onClick={() => startEdit(t)} className="text-[10px] font-bold text-primary px-2 py-1 hover:underline transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Edit</button>
```

### G) Delete-tier text button

```diff
-              <button type="button" onClick={() => remove(t.id)} className="text-[10px] font-bold text-destructive px-2 py-1 hover:underline">Delete</button>
+              <button type="button" onClick={() => remove(t.id)} className="text-[10px] font-bold text-destructive px-2 py-1 hover:underline transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Delete</button>
```

### H) Cancel-edit text button

```diff
-            <button type="button" onClick={reset} className="text-[10px] font-bold text-muted-foreground hover:text-foreground">Cancel</button>
+            <button type="button" onClick={reset} className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
```

### I) Pause/Resume promo-code text button

```diff
-              <button type="button" onClick={() => toggle(c.id, c.is_active)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground">
+              <button type="button" onClick={() => toggle(c.id, c.is_active)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### J) Delete promo-code text button

```diff
-              <button type="button" onClick={() => remove(c.id)} className="text-[10px] font-bold text-destructive">Delete</button>
+              <button type="button" onClick={() => remove(c.id)} className="text-[10px] font-bold text-destructive transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Delete</button>
```

---

## Per-control summary

| Control | Press tier | Transition | FLIP? | Ring color | Ring reason | Aria |
|---------|-----------|------------|-------|-----------|-------------|------|
| **A** Back | icon-only 95 | transition-all | NO (new control) | ring-ring | neutral sticky header | `aria-label="Back"` |
| **B** Step pills | segmented [0.97] | transition-all | **YES** (was transition-colors) | ring-ring | overflow-x-auto, bg-foreground is own fill, neutral parent | `aria-current="step"` on active |
| **C** Category trigger | wide bordered [0.98] | bare transition kept | NO | ring-ring | own bg-background neutral | `aria-expanded={open}` |
| **D** Category chips | medium chip [0.98] | bare transition kept | NO | ring-ring | bg-ig-gradient own fill on neutral panel | none (closing picker) |
| **E** Chip | segmented [0.97] | transition-all kept | NO | ring-ring | bg-ig-gradient own fill on neutral card | `aria-pressed={active}` |
| **F** Edit tier | text-link [0.97] | transition-transform | NO | ring-ring | neutral row | none (one-shot) |
| **G** Delete tier | text-link [0.97] | transition-transform | NO | ring-ring | neutral row | none (one-shot destructive) |
| **H** Cancel edit | text-link [0.97] | transition-all | NO (new control) | ring-ring | neutral card | none (one-shot) |
| **I** Pause/Resume | text-link [0.97] | transition-all | NO (new control) | ring-ring | neutral row | none (dynamic label → no aria-pressed) |
| **J** Delete promo | text-link [0.97] | transition-transform | NO | ring-ring | neutral row | none (one-shot destructive) |

---

## LEAVE untouched (confirmed)

All shadcn `<Button>` (footer Back/Next L278/L281, Save profile L341, Start verification L424, Create tier L756, Create code L854, Enroll L969), shadcn `<Switch>` L913, shadcn `<Input>`/`<Textarea>`/`<Label>`, `UnifiedPayoutCard` L451, progress-bar `motion.div` L184, step-content `motion.div` L222, tier-list rows L589, program rows L956, promo-code rows L861 (all plain `<div>`s — no onClick, presentational), badges/icons (decorative).

---

## Guard-grep expectations after apply

- `className` edits: 10 (A–J)
- `aria-label`: 1 (A)
- `aria-current`: 1 (B)
- `aria-expanded`: 1 (C)
- `aria-pressed`: 1 (E only)
- `focus-visible:ring`: 10
- `ring-ring`: 10, `ring-white/70`: 0, `ring-inset`: 0
- `active:scale-95`: 1 (A)
- `active:scale-[0.97]`: 7 (B, E, F, G, H, I, J)
- `active:scale-[0.98]`: 2 (C, D)
- FLIP: 1 (B `transition-colors`→`transition-all`)
- `transition-transform`: 3 (F, G, J)
- `transition-all`: 4 new (A, H, I + B flipped) + 1 kept (E)
- Every `onClick`/`navigate`/`setState`/`setParams`/`useQuery`/`refetch`/supabase write byte-identical, 0 logic lines touched.

---

## Owner must verify

1. Apply the diff, then run **`npm run update`** — must exit 0 (type-check + worker type-check + production build).
2. Preview at 375/768/1280 — step rail horizontal scroll, category picker open/close, tier form chip selections, promo code rows all render clean.
3. Screen-reader: the step rail should announce "Step X of Y" via `aria-current="step"`, the category picker trigger should announce expanded/collapsed, and the Chip instances should announce pressed state.
