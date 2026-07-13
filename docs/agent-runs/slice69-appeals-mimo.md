# MiMo run — 2026-06-14T07:30:51.240Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/ModerationAppealsPage.tsx (358-line "Appeals" — shows moderation actions taken against the user + the user's appeals: REAL Supabase `useQuery ["moderation-actions-me", user.id]` reading `moderation_actions` (eq target_user_id, order created_at desc) + a 2nd `useQuery ["appeal-requests-me", user.id]` reading `appeal_requests` (eq user_id); AUTH-aware via useAuth, `enabled` gating, staleTime 30s; `useMemo appealsByAction`; `useState appealingId/appealText/submitting`; `submitAppeal` calls the `moderation-appeal-submit` EDGE FUNCTION via `supabase.functions.invoke` then `qc.invalidateQueries`; sticky header [shadcn ghost-icon Back + ig-gradient "Appeals" title] + an ig-gradient account-standing banner + a list of moderation-action cards [each: action label/badges/reason/notes + EITHER a submitted-appeal status block OR an inline appeal FORM (textarea + Cancel + Submit appeal buttons) OR an "Appeal this action" trigger button] + an "Other appeals" section of standalone appeal cards). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setAppealingId/setAppealText/submitAppeal, useQuery/Supabase queries, supabase.functions.invoke, qc.invalidateQueries, toast, byte-identical. Don't add a SECOND competing press effect (framer whileTap vs CSS active:scale). Don't churn already-polished controls. Don't churn shadcn <Button> (ships own focus/scale tokens). Don't renumber an existing scale (the buttons already carry active:scale-95 / active:scale-[0.98] — LEAVE those numbers).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when the control is a flush edge child of a rounded overflow-hidden PARENT, OR a flush media tile in a near-gapless grid.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT = ring-white/70. A gradient-FILLED button (bg-ig-gradient) on a NEUTRAL parent still uses ring-ring (the ring renders against the neutral parent, not the button's own fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab active:scale-[0.97]; wide full-width row/button WITH its own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border/opacity OR existing color wash. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. ALREADY transition-all → append without flipping. ALREADY transition-transform with NO hover → append ring without flipping. ALREADY framer whileTap → append the focus ring ONLY.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, cancel, submit, open-form).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L293 CANCEL button (raw `<button>`, inside the inline appeal FORM, one-shot `onClick={() => { setAppealingId(null); setAppealText(""); }}` closes the form, VISIBLE text "Cancel", base `h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold active:scale-95 transition-all`, ALREADY active:scale-95 + transition-all + hover:bg, NO focus/aria). Parent = the form's `flex gap-1.5` button row inside the action card `bg-card border border-border` (neutral). → plan: ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (LEAVE active:scale-95 — don't renumber; transition-all present → NO flip; OUTWARD ring-ring — bg-secondary fill on neutral bg-card parent; NO aria — visible text, one-shot). Confirm ring color + no-flip + no-aria + keep scale.

B) L300 SUBMIT-APPEAL button (raw `<button>`, inside the same inline form, `disabled={submitting || appealText.trim().length < 12}`, one-shot `onClick={() => submitAppeal(a.id)}`, VISIBLE text "Submitting…"/"Submit appeal", base `h-8 px-4 rounded-full bg-ig-gradient text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all shadow-sm`, ALREADY active:scale-95 + transition-all + hover:opacity, NO focus/aria). Parent = same `flex gap-1.5` row inside the card `bg-card`. → plan: ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (LEAVE active:scale-95; transition-all → NO flip; OUTWARD ring-ring — bg-ig-gradient is the button's OWN fill, ring renders against the neutral bg-card parent; NO aria — visible text, one-shot submit). Confirm.

C) L312 "APPEAL THIS ACTION" trigger button (raw `<button>`, shown when `canAppeal`, one-shot `onClick={() => { setAppealingId(a.id); setAppealText(""); }}` opens the inline form, VISIBLE text "Appeal this action" + FileText icon, base `mt-3 w-full h-9 rounded-xl bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm`, ALREADY active:scale-[0.98] + transition-all + hover:opacity, NO focus/aria). Parent = the action card `bg-card border border-border` (neutral). → plan: ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (LEAVE active:scale-[0.98] — don't renumber, full-width button with own surface tier; transition-all → NO flip; OUTWARD ring-ring — bg-ig-gradient own fill on neutral bg-card; NO aria — visible text, one-shot open-form). OPEN QUESTION: does this trigger warrant `aria-expanded` (it opens an inline appeal form that mounts in the same card)? Per the house rule aria-expanded belongs on a disclosure trigger that reveals UI AND PERSISTS in the DOM — but here the trigger UNMOUNTS when the form opens (it's an `isAppealing ? <form> : canAppeal ? <trigger>` branch, the trigger is replaced by the form, not toggled alongside it). Resolve: aria-expanded vs LEAVE (per the NutritionPage precedent — a trigger that unmounts when its target opens does NOT get aria-expanded).

ALSO CONFIRM I should LEAVE these: the shadcn ghost-icon Back `<Button>` L164 (aria-label="Back" already, own tokens); the appeal `<textarea>` L282 (already carries `focus:outline-none focus:ring-2 focus:ring-rose-500/30` — native form field, not migrated to ring-ring); SwipeBackContainer/SEOHead (wrappers/non-visual); the account-standing banner motion.div L177 (entrance anim, NO onClick); the action cards motion.div L218 (entrance anim, NOT clickable — presentational); the submitted-appeal status block L265 + standalone "Other appeals" cards L340 (non-interactive divs); the loading skeleton divs L193; the Auto/duration/status badge `<span>`/`<div>`s (non-interactive); ShieldAlert/Sparkles/Clock/MessageSquare/CheckCircle2/XCircle/Hourglass/FileText/ArrowLeft icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Resolve C's aria-expanded open question explicitly (trigger unmounts when form opens).
- files: src/pages/ModerationAppealsPage.tsx

---

## Plan

3 raw `<button>`s, all already carry `active:scale-*` + `transition-all` + `hover:*`. Ring-ONLY append on all three. Zero flips, zero new aria, zero logic touched. 0-aria diff (all have visible text, one-shot actions; C's trigger unmounts → no `aria-expanded`).

## Controls — confirmed

| # | Control | After-string to append | Ring color + reason | Press | Transition | Inset? | Aria |
|---|---------|----------------------|---------------------|-------|------------|--------|------|
| A | L293 Cancel | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | OUTWARD ring-ring — bg-secondary fill on neutral bg-card parent | LEAVE active:scale-95 | transition-all kept → NO flip | Outward | None (visible text, one-shot) |
| B | L300 Submit-appeal | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | OUTWARD ring-ring — bg-ig-gradient OWN fill, ring against neutral bg-card | LEAVE active:scale-95 | transition-all kept → NO flip | Outward | None (visible text, one-shot) |
| C | L312 Appeal this action | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | OUTWARD ring-ring — bg-ig-gradient own fill on neutral bg-card | LEAVE active:scale-[0.98] | transition-all kept → NO flip | Outward | **None** — trigger UNMOUNTS when form opens (branch swap, not coexistence; NutritionPage precedent applies) |

**C's `aria-expanded` resolved → LEAVE.** The trigger and the form are in a ternary branch (`isAppealing ? <form> : canAppeal ? <trigger> : null`). The trigger doesn't exist in the DOM alongside the form, so `aria-expanded` would never be read alongside the content it "expands." Adding it would be misleading semiotics on a control that's about to unmount.

## Diff — `src/pages/ModerationAppealsPage.tsx`

**A — L293 Cancel button**
```diff
-                            className="h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold active:scale-95 transition-all"
+                            className="h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**B — L300 Submit-appeal button**
```diff
-                            className="h-8 px-4 rounded-full bg-ig-gradient text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all shadow-sm"
+                            className="h-8 px-4 rounded-full bg-ig-gradient text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**C — L312 Appeal this action trigger**
```diff
-                      className="mt-3 w-full h-9 rounded-xl bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
+                      className="mt-3 w-full h-9 rounded-xl bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

## LEAVE list (confirmed — do not touch)

- **Shadcn ghost-icon Back** L164 — own tokens, `aria-label="Back"` present ✓
- **Appeal `<textarea>`** L282 — native form field, already `focus:ring-2 focus:ring-rose-500/30` ✓
- **SwipeBackContainer / SEOHead** — wrappers/non-visual ✓
- **Account-standing banner** `motion.div` L177 — entrance anim, no onClick ✓
- **Action cards** `motion.div` L218 — entrance anim, not clickable ✓
- **Submitted-appeal status block** L265 + **Other appeals cards** L340 — non-interactive divs ✓
- **Loading skeletons** L193 — presentational ✓
- **Badge `<span>`/`<div>`s** (Auto, duration, status) — non-interactive ✓
- **All icons** (ShieldAlert, Sparkles, Clock, MessageSquare, CheckCircle2, XCircle, Hourglass, FileText, ArrowLeft) — decorative ✓

## Guard grep summary

- `−`/`+` className edits: **3** (A, B, C)
- `focus-visible:ring`: 3, all `ring-ring` (OUTWARD on neutral `bg-card`)
- `ring-inset`: 0
- `ring-white/70`: 0
- `aria-*` added: 0
- `aria-expanded`: 0 (trigger unmounts — resolved LEAVE)
- FLIPs: 0 (all three already `transition-all`)
- New `active:scale-*`: 0 (all preserved, not renumbered)
- Logic touched: 0 lines

## Verification

Owner applies the diff, then runs `npm run update` (type-check + worker type-check + production build must pass). No commit/deploy until owner says so.
