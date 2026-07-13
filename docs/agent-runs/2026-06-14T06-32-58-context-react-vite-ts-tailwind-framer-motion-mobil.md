# DeepSeek run — 2026-06-14T06:32:58.057Z

- model: deepseek-chat
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

# CreatorSetupPage Premium Interaction + A11y Pass — Plan & Diff

## Plan

Edit 10 raw controls across `src/pages/CreatorSetupPage.tsx` with className-only + aria-* changes. All logic, hooks, queries, mutations preserved byte-for-byte. 0 logic lines touched.

## Per-Control Specification

### A) Header Back button (L173)
**Before:** `"p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation"`
**After:** `"p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
**Aria:** ADD `aria-label="Back"`
**Ring:** `ring-ring` — neutral sticky header parent
**Tier:** icon-only `95`
**Transition:** `transition-all` (hover:bg + new scale)
**FLIP:** No (no prior transition class)

### B) Step rail pills (L200, mapped template)
**Before:** `"shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors touch-manipulation"`
**After:** `"shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"`
**Aria:** ADD `aria-current={isActive ? "step" : undefined}` — wizard step rail, `aria-current="step"` is more precise than `aria-pressed` for a step navigator
**Ring:** `ring-ring` — neutral parent, `bg-foreground` is the pill's own fill
**Tier:** segmented filter `[0.97]`
**Transition:** `transition-all` (FLIP from `transition-colors` — gaining scale)
**FLIP:** YES

### C) CategoryPicker disclosure trigger (L362)
**Before:** `"mt-1 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/40 transition"`
**After:** `"mt-1 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/40 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
**Aria:** ADD `aria-expanded={open}`
**Ring:** `ring-ring` — own `bg-background` neutral, parent neutral
**Tier:** wide bordered control `[0.98]`
**Transition:** bare `transition` already includes transform — NO flip
**FLIP:** No

### D) Category chips (L378, mapped template)
**Before:** `"text-[11px] font-bold px-2.5 py-1.5 rounded-full border transition"`
**After:** `"text-[11px] font-bold px-2.5 py-1.5 rounded-full border transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
**Aria:** NONE — one-shot set-value-and-close (panel closes immediately), NOT a persistent in-place filter
**Ring:** `ring-ring` — `bg-ig-gradient` own fill on neutral panel parent
**Tier:** medium chip `[0.98]`
**Transition:** bare `transition` — NO flip
**FLIP:** No

### E) Reusable `Chip` component (L570, mapped template × many instances)
**Before:** `"px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all"`
**After:** `"px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
**Aria:** ADD `aria-pressed={active}` — persistent single-select segmented filter, bg-conveyed selection
**Ring:** `ring-ring` — `bg-ig-gradient` own fill on neutral card parent
**Tier:** segmented filter `[0.97]`
**Transition:** `transition-all` already present — NO flip
**FLIP:** No

### F) Edit-tier text button (L615)
**Before:** `"text-[10px] font-bold text-primary px-2 py-1 hover:underline"`
**After:** `"text-[10px] font-bold text-primary px-2 py-1 hover:underline active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
**Aria:** NONE — one-shot nav
**Ring:** `ring-ring` — neutral parent
**Tier:** small text-link `[0.97]`
**Transition:** `transition-transform` — scale is sole animated prop, `hover:underline` toggles instantly
**FLIP:** No

### G) Delete-tier text button (L616)
**Before:** `"text-[10px] font-bold text-destructive px-2 py-1 hover:underline"`
**After:** `"text-[10px] font-bold text-destructive px-2 py-1 hover:underline active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
**Aria:** NONE — one-shot destructive with visible text
**Ring:** `ring-ring` — neutral parent
**Tier:** small text-link `[0.97]`
**Transition:** `transition-transform` — scale sole animated prop
**FLIP:** No

### H) Cancel-edit text button (L628)
**Before:** `"text-[10px] font-bold text-muted-foreground hover:text-foreground"`
**After:** `"text-[10px] font-bold text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
**Aria:** NONE — one-shot
**Ring:** `ring-ring` — neutral parent
**Tier:** small text-link `[0.97]`
**Transition:** `transition-all` — hover:text-color + scale both animate
**FLIP:** No

### I) Pause/Resume promo-code text button (L868)
**Before:** `"text-[10px] font-bold text-muted-foreground hover:text-foreground"`
**After:** `"text-[10px] font-bold text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
**Aria:** NONE — dynamic action-label toggle ("Pause"/"Resume") → double-announce risk with `aria-pressed`
**Ring:** `ring-ring` — neutral parent
**Tier:** small text-link `[0.97]`
**Transition:** `transition-all` — hover:text-color + scale
**FLIP:** No

### J) Delete promo-code text button (L871)
**Before:** `"text-[10px] font-bold text-destructive"`
**After:** `"text-[10px] font-bold text-destructive active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
**Aria:** NONE — one-shot destructive with visible text
**Ring:** `ring-ring` — neutral parent
**Tier:** small text-link `[0.97]`
**Transition:** `transition-transform` — scale sole animated prop, no hover
**FLIP:** No

## Controls to LEAVE untouched (confirmed)
- All shadcn `<Button>` (L278 Back, L281 Next, L341 Save, L424 Start verification, L756 Create tier, L854 Create code, L969 Enroll)
- shadcn `<Switch>` L913
- shadcn `<Input>`/`<Textarea>`/`<Label>` (form fields)
- `UnifiedPayoutCard` L451 (separate component)
- Progress bar `motion.div` L184 + step-content `motion.div` L222 (animation, presentational)
- Tier-list rows L589 + program rows L956 + promo-code rows L861 (plain `<div>`s, no onClick)
- Badges/icons (decorative)

## Diff

```diff
--- a/src/pages/CreatorSetupPage.tsx
+++ b/src/pages/CreatorSetupPage.tsx
@@ -170,7 +170,7 @@ export default function CreatorSetupPage() {
       {/* Header */}
       <div className="sticky top-0 safe-area-top z-30 bg-background/85 backdrop-blur-xl border-b border-border/30">
         <div className="flex items-center gap-3 px-4 py-3">
-          <button type="button" onClick={() => navigate("/creator-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
+          <button type="button" onClick={() => navigate("/creator-dashboard")} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="h-5 w-5" />
           </button>
           <div className="flex-1 min-w-0">
@@ -198,7 +198,7 @@ export default function CreatorSetupPage() {
               <button type="button"
                 key={s.key}
                 onClick={() => { setActive(s.key); setParams({ step: s.key }); }}
-                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors touch-manipulation ${
+                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation ${
                   isActive
                     ? "bg-foreground text-background border-foreground"
                     : s.done
@@ -206,6 +206,7 @@ export default function CreatorSetupPage() {
                       : "bg-card text-muted-foreground border-border/40"
                 }`}
+                aria-current={isActive ? "step" : undefined}
               >
                 {s.done ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 text-center">{i + 1}</span>}
                 {s.label}
@@ -359,7 +360,7 @@ function CategoryPicker({ value, onChange }: { value: string; onChange: (v: str
       <button
         type="button"
         onClick={() => setOpen((o) => !o)}
-        className="mt-1 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/40 transition"
+        className="mt-1 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/40 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
+        aria-expanded={open}
       >
         <span className={value ? "text-foreground" : "text-muted-foreground"}>
           {value || "Tap to choose a category"}
@@ -375,7 +376,7 @@ function CategoryPicker({ value, onChange }: { value: string; onChange: (v: str
                 <button type="button"
                   key={c}
                   onClick={() => { onChange(c); setOpen(false); }}
-                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border transition ${
+                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                     active
                       ? "bg-ig-gradient text-white border-primary"
                       : "bg-background text-foreground border-border hover:bg-accent"
@@ -567,7 +568,7 @@ function TierStep({ tiers, userId, onSaved }: any) {
   const Chip = ({ active, onClick, children }: any) => (
     <button
       type="button"
       onClick={onClick}
-      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
+      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
         active
           ? "bg-ig-gradient text-white border-primary"
           : "bg-card text-muted-foreground border-border/60 hover:border-border"
       }`}
+      aria-pressed={active}
     >
       {children}
     </button>
@@ -612,9 +613,9 @@ function TierStep({ tiers, userId, onSaved }: any) {
               </div>
-              <button type="button" onClick={() => startEdit(t)} className="text-[10px] font-bold text-primary px-2 py-1 hover:underline">Edit</button>
-              <button type="button" onClick={() => remove(t.id)} className="text-[10px] font-bold text-destructive px-2 py-1 hover:underline">Delete</button>
+              <button type="button" onClick={() => startEdit(t)} className="text-[10px] font-bold text-primary px-2 py-1 hover:underline active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Edit</button>
+              <button type="button" onClick={() => remove(t.id)} className="text-[10px] font-bold text-destructive px-2 py-1 hover:underline active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Delete</button>
             </div>
           ))}
         </div>
@@ -625,7 +626,7 @@ function TierStep({ tiers, userId, onSaved }: any) {
           {editingId && (
-            <button type="button" onClick={reset} className="text-[10px] font-bold text-muted-foreground hover:text-foreground">Cancel</button>
+            <button type="button" onClick={reset} className="text-[10px] font-bold text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
           )}
         </div>
@@ -865,9 +866,9 @@ function PromoCodesManager({ userId }: { userId: string }) {
-              <button type="button" onClick={() => toggle(c.id, c.is_active)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground">
+              <button type="button" onClick={() => toggle(c.id, c.is_active)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                 {c.is_active ? "Pause" : "Resume"}
               </button>
-              <button type="button" onClick={() => remove(c.id)} className="text-[10px] font-bold text-destructive">Delete</button>
+              <button type="button" onClick={() => remove(c.id)} className="text-[10px] font-bold text-destructive active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Delete</button>
             </div>
           ))}
         </div>
```

## Guard Grep Verification

After applying, run:
```
grep -c 'active:scale' src/pages/CreatorSetupPage.tsx
grep -c 'focus-visible:ring' src/pages/CreatorSetupPage.tsx
grep -c 'aria-label="Back"' src/pages/CreatorSetupPage.tsx
grep -c 'aria-current=' src/pages/CreatorSetupPage.tsx
grep -c 'aria-expanded=' src/pages/CreatorSetupPage.tsx
grep -c 'aria-pressed=' src/pages/CreatorSetupPage.tsx
grep -c 'transition-colors' src/pages/CreatorSetupPage.tsx
```

Expected: `active:scale`=10 (A `95`, B `[0.97]`, C `[0.98]`, D `[0.98]`, E `[0.97]`, F `[0.97]`, G `[0.97]`, H `[0.97]`, I `[0.97]`, J `[0.97]`), `focus-visible:ring`=10, `aria-label="Back"`=1, `aria-current=`=1, `aria-expanded=`=1, `aria-pressed=`=1 (E only), `transition-colors`=0 (B was the only one — FLIPPED to `transition-all`).

## Owner Verification

1. Run `npm run update` — must pass (type-check + worker type-check + build)
2. Preview at 375/768/1280 widths — verify step rail scrolls horizontally, category panel opens/closes, tier chips select, promo code buttons toggle
3. Confirm no double press effects (no control has both framer `whileTap` AND CSS `active:scale` — verified by inspection: none of these 10 controls use `whileTap`)
4. Confirm `aria-current="step"` on the active step pill announces correctly (screen reader should say "step
