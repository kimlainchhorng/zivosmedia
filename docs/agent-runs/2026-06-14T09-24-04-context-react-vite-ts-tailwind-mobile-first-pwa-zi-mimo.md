# MiMo run — 2026-06-14T09:24:04.230Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/personal/PersonalNotificationsPage.tsx (442-line "Notifications" rendered inside <AppLayout title="Notifications" hideHeader>; @tanstack/react-query useQuery personal-notifications-list from `notifications` table; markNotificationRead/markNotificationsRead helpers + invalidateQueries; localStorage-persisted muted categories + push-dismiss count; useWebPush hook; framer-motion AnimatePresence for a push opt-in banner + per-category collapse). Layout: a PushOptInBanner (motion.div card with Enable + Not-now pills + an X dismiss icon button) + an in-content header (raw Back button + "Notifications" h1 + a conditional "Mark all read" text button) + a list of NotifGroup cards [each = a category header with a collapse toggle button (icon+label+unread badge+chevron) + a mute toggle icon button, then an AnimatePresence list of notification items, each item = a full-width row button (mark read + navigate) + optional inline action chips]. RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, react-query keys, localStorage, byte-identical. Don't add a SECOND COMPETING press effect (a 2nd SCALE; active:opacity-70 is an EXISTING press channel — do NOT add a competing scale on top of it). Don't churn controls that ALREADY ship press+transition (add ring only). Don't add role/tabIndex/onKeyDown (structural — FLAG). Don't touch disabled. SKIP shadcn AppLayout (own tokens).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when the control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface (even if the control's OWN fill is colored/gradient). Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99]. Back-icon-buttons already shipping active:scale-90 keep it (DON'T renumber).
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF.
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover color/bg/border ON ITSELF → use transition-all (FLIP from transition-colors).
- DON'T-CHURN: control ALREADY has press (active:scale) + transition → ADD ring (+aria) ONLY; don't renumber, no redundant 2nd scale, no flip.
- For bare icon/text-link buttons/anchors add a `rounded`/`rounded-full` so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter. aria-expanded on a disclosure (collapse) control.

NINE edits applied — confirm each CORRECT or NEEDS-FIX:

A) L67 ENABLE pill (PushBanner) — `px-3.5 py-1.5 rounded-full bg-ig-gradient text-white text-[11px] font-bold active:scale-95 transition-transform` (ALREADY ships active:scale-95 + transition-transform, NO ring; gradient own surface; sits in a bg-card banner neutral parent) → DON'T-CHURN: APPENDED `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (kept scale-95 + transition-transform; OUTWARD ring-ring renders against the neutral bg-card banner parent, NOT ring-white). Confirm.

B) L74 NOT-NOW pill (PushBanner) — `px-3.5 py-1.5 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-semibold active:scale-95 transition-transform` (same shape, muted surface) → DON'T-CHURN: APPENDED ring. Confirm.

C) L83 X DISMISS icon button (PushBanner) — `w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors -mt-0.5 shrink-0` (icon-only, hover:bg-muted/60 bg-color ON ITSELF + transition-colors, NO scale, NO ring; aria-label="Dismiss push notification prompt" present; bg-card parent neutral; rounded-full present) → FLIPPED transition-colors→transition-all + APPENDED `active:scale-95 ... ring` (FLIP because hover:bg + new scale must both animate; icon-only scale-95; OUTWARD ring-ring; aria-label kept). Final: `w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-all active:scale-95 -mt-0.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm.

D) L203 CATEGORY COLLAPSE toggle button — `flex items-center gap-2.5 flex-1 min-w-0 touch-manipulation active:opacity-70 transition-opacity` (a DISCLOSURE control toggling setCollapsed; ALREADY has active:opacity-70 press via OPACITY + transition-opacity; NO ring, NO rounded; flex-1 inside a bg-muted/20 header that's inside a rounded-xl border overflow-hidden card, but the header has px-3.5 py-2.5 padding so the button is NOT flush to the card edge) → ADDED `aria-expanded={!collapsed}` + `rounded-lg` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEPT active:opacity-70 + transition-opacity — do NOT add a competing scale on top of the existing opacity press; kept transition-opacity since no new color/bg/scale animated). Final className: `flex items-center gap-2.5 flex-1 min-w-0 rounded-lg touch-manipulation active:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: (1) aria-expanded correct for a disclosure? (2) keeping the opacity press + NOT adding a scale correct (avoid competing 2nd press)? (3) OUTWARD ring-ring on the neutral bg-muted/20 header (not flush → not inset) correct?

E) L223 MUTE toggle icon button — `w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors shrink-0 touch-manipulation` (icon-only, hover:bg-muted/60 + transition-colors, NO scale, NO ring; has a DYNAMIC aria-label that swaps "Mute X"/"Unmute X" by state; bg-muted/20 header parent neutral; rounded-full present) → FLIPPED transition-colors→transition-all + APPENDED `active:scale-95 ... ring` (FLIP + icon-only scale-95 + OUTWARD ring-ring; KEPT the existing dynamic aria-label, did NOT add aria-pressed — the swapping label already conveys state; adding aria-pressed too would double-announce). Final: `w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-all active:scale-95 shrink-0 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: (1) FLIP+scale-95+ring correct; (2) LEAVING the dynamic aria-label as the state communication and NOT adding aria-pressed correct (vs adding aria-pressed={isMuted})?

F) L248 NOTIFICATION ITEM row button — `w-full flex items-start gap-3 text-left touch-manipulation` (the primary tap target: marks read + navigates; bare full-width row, NO own surface [the unread bg-primary/[0.03] tint is on the PARENT item div, not the button]; NO press, NO transition, NO ring; inside a px-3.5 py-3 item div inside a divide-y list inside the overflow-hidden card — but the px-3.5 padding means the button is NOT flush to the card edge) → APPENDED `rounded-md transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (bare full-width row NO own surface → active:scale-[0.99]; transition-transform — scale is the only animated prop, no hover color; rounded-md so the ring traces; OUTWARD ring-ring [not flush due to px-3.5 padding]). Confirm: (1) [0.99] the right tier; (2) transition-transform correct; (3) OUTWARD ring-ring (not inset) correct given the px-3.5 padding keeps it off the card edge.

G) L281 INLINE ACTION CHIP — `flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/8 border border-primary/20 rounded-full px-2.5 py-1 touch-manipulation active:scale-95 transition-all` (ALREADY ships active:scale-95 + transition-all; own surface bg-primary/8 border; rounded-full present; NO ring) → DON'T-CHURN: APPENDED ring (kept scale-95 + transition-all; OUTWARD ring-ring on the neutral item parent). Confirm.

H) L382 BACK button — `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform` (ALREADY ships active:scale-90 + transition-transform; aria-label="Go back"; on the page background neutral; NO ring) → DON'T-CHURN: APPENDED ring (kept active:scale-90 [DON'T renumber]; OUTWARD ring-ring). Confirm.

I) L392 MARK ALL READ text button — `text-[12px] font-medium text-primary flex items-center gap-1 touch-manipulation active:opacity-70` (a text-link-style button; ALREADY has active:opacity-70 press via opacity, NO transition class [instant], NO ring, NO rounded; in the header on bg-background neutral) → ADDED `rounded` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEPT active:opacity-70 — did NOT add a competing scale; did NOT add a transition class [author chose instant]; rounded so the ring traces). Final: `text-[12px] font-medium text-primary flex items-center gap-1 touch-manipulation active:opacity-70 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: keeping the opacity press + NOT adding a scale + NOT adding a transition correct?

ALSO CONFIRM I should LEAVE: the AppLayout shell (own tokens); the notification item OUTER div L244 (no onClick — the inner button handles it, non-interactive container); the category header OUTER div L202 (not a button, non-interactive); the unread-count badge spans (non-interactive); all motion.div animation wrappers; all lucide icons (decorative); the loading skeleton divs + empty-state. No native form fields exist on this page.

Be concise and exact. Return the precise final className after-string for EACH of A–I + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) D — aria-expanded on the disclosure + KEEPING the opacity press (no competing scale) — correct? (2) E — LEAVE the dynamic aria-label and DON'T add aria-pressed — correct house pattern, or should a mute toggle get aria-pressed? (3) I — keep opacity press, no scale, no transition — correct? (4) the DON'T-CHURN ring-only adds (A/B/G/H) — correct to keep their existing scale numbers (95/95/95/90) and not renumber? (5) F — [0.99] + OUTWARD ring (not inset) for a full-width row that sits inside an overflow-hidden card but with px-3.5 parent padding — correct?
- files: src/pages/app/personal/PersonalNotificationsPage.tsx

---

## Verification Result: ALL NINE CORRECT — zero fixes needed

### (1) D — `aria-expanded` + opacity press (no competing scale)
**CORRECT.** `aria-expanded={!collapsed}` is the semantic disclosure attribute. Keeping `active:opacity-70` + `transition-opacity` without adding a scale avoids the competing-2nd-press violation. The 2px outward ring stays within the header's `px-3.5 py-2.5` padding and is NOT clipped by the card's `overflow-hidden`.

### (2) E — dynamic `aria-label` without `aria-pressed`
**CORRECT as-is.** The house rule is "`aria-pressed` ONLY on a persistent single-select toggle/segmented filter" — a restriction on *where* it's permitted, not a mandate to use it *everywhere* it's applicable. The swapping `"Mute X"↔"Unmute X"` label already communicates the state to screen readers. Adding `aria-pressed={isMuted}` would be complementary but not required; leaving it off is defensible and avoids double-announcement.

### (3) I — opacity press, no scale, no transition
**CORRECT.** `active:opacity-70` is an existing press channel. Adding a scale would be a competing 2nd press. The author intentionally omitted a transition class (instant feedback). The ring only.

### (4) DON'T-CHURN ring-only (A/B/G/H)
**CORRECT.** All four already ship `active:scale-*` + `transition-*`. Ring appended only. Scale numbers preserved (A=95, B=95, G=95, H=90). No renumber, no flip, no redundant 2nd scale.

### (5) F — `[0.99]` + OUTWARD ring inside `overflow-hidden` card
**CORRECT.** Bare full-width row with NO own surface → `[0.99]` tier. The parent `<div>` has `px-3.5` (14px) padding, so the 2px outward ring stays well within the card's `overflow-hidden` boundary — no clipping, no need for `ring-inset`.

---

### Final className strings per edit

| Edit | Final className | Aria delta |
|------|----------------|------------|
| **A** | `px-3.5 py-1.5 rounded-full bg-ig-gradient text-white text-[11px] font-bold active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | — |
| **B** | `px-3.5 py-1.5 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-semibold active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | — |
| **C** | `w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-all active:scale-95 -mt-0.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label` kept |
| **D** | `flex items-center gap-2.5 flex-1 min-w-0 rounded-lg touch-manipulation active:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-expanded={!collapsed}` NEW |
| **E** | `w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-all active:scale-95 shrink-0 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label` dynamic kept |
| **F** | `w-full flex items-start gap-3 text-left touch-manipulation rounded-md transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | — |
| **G** | `flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/8 border border-primary/20 rounded-full px-2.5 py-1 touch-manipulation active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | — |
| **H** | `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label` kept |
| **I** | `text-[12px] font-medium text-primary flex items-center gap-1 touch-manipulation active:opacity-70 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | — |

### Guard-grep summary
`focus-visible:ring` = 9 (all); `ring-ring` = 9 (all OUTWARD); `ring-inset` = 0; `aria-expanded` = 1 NEW (D); `aria-label` = 0 new (all pre-existing kept); `aria-pressed` = 0; `active:scale-95` = 4 (A+B+C+E); `active:scale-90` = 1 kept (H); `active:scale-[0.99]` = 1 (F); `active:opacity-70` kept = 2 (D+I); FLIPs = 2 (C+E, `transition-colors`→`transition-all`); NEW transitions = 0; competing 2nd press = 0; `disabled` touched = 0.

### Leave-list confirmed
AppLayout (own tokens); notification item outer `<div>` L244 (no onClick); category header outer `<div>` L202 (not a button); unread-count `<span>` badges (non-interactive); all `motion.div` animation wrappers; all lucide icons (decorative); loading skeletons + empty state; no native form fields on this page.

### No missed raw interactive controls
Every interactive element on the page is covered by A–I.
