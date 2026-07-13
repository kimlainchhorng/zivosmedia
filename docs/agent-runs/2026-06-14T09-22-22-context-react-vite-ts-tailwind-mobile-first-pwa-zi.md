# DeepSeek run — 2026-06-14T09:22:22.870Z

- model: deepseek-chat
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

# PersonalNotificationsPage — Interaction Token Review

## Plan

Review the 9 proposed edits (A–I) against the house standard, confirm each is correct or flag issues, then produce the final diff.

---

## Per-Edit Confirmation

### A) L67 ENABLE pill (PushBanner)
**CORRECT.** DON'T-CHURN ring-only. Keeps `active:scale-95` + `transition-transform`. OUTWARD `ring-ring` on the neutral `bg-card` banner parent (the gradient button's own surface is `bg-ig-gradient`, but the ring renders against the parent — correct). No renumber, no flip, no competing press.

### B) L74 NOT-NOW pill (PushBanner)
**CORRECT.** Identical pattern to A. DON'T-CHURN ring-only. Keeps `active:scale-95` + `transition-transform`. OUTWARD `ring-ring`.

### C) L83 X DISMISS icon button (PushBanner)
**CORRECT.** FLIP `transition-colors`→`transition-all` (required — `hover:bg-muted/60` bg-color ON THE ELEMENT + new `active:scale-95` must both animate). Icon-only `active:scale-95`. OUTWARD `ring-ring`. `aria-label` kept. Final className matches the house pattern exactly.

### D) L203 CATEGORY COLLAPSE toggle button
**CORRECT.** Three-part verdict:
1. **`aria-expanded={!collapsed}`** — CORRECT. This is a disclosure control (toggles visibility of the notification list). `aria-expanded` is the correct attribute. The value `!collapsed` is semantically correct (expanded when NOT collapsed).
2. **Keeping `active:opacity-70` + NOT adding a scale** — CORRECT. The existing opacity press is the author's chosen feedback channel. Adding a competing `active:scale` on top would be a 2nd press effect — explicitly banned. The rule says "do NOT add a competing scale on top of it."
3. **OUTWARD `ring-ring`** — CORRECT. The button has `rounded-lg` and sits inside a `px-3.5 py-2.5` header, which is inside a `rounded-xl border overflow-hidden` card. The `px-3.5` padding keeps the button ~3.5px from the card edge, so it is NOT flush to the overflow-hidden parent. OUTWARD is correct.

### E) L223 MUTE toggle icon button
**CORRECT.** Two-part verdict:
1. **FLIP + `active:scale-95` + ring** — CORRECT. `hover:bg-muted/60` bg-color ON THE ELEMENT + new scale → `transition-all`. Icon-only `scale-95`. OUTWARD `ring-ring`.
2. **LEAVING the dynamic `aria-label` + NOT adding `aria-pressed`** — CORRECT. The house standard says `aria-pressed` is for "a persistent single-select toggle/segmented filter." A mute toggle is a binary state, but the dynamic `aria-label` ("Mute X" / "Unmute X") already conveys the state to screen readers. Adding `aria-pressed` would double-announce the state change. The swapping label is the correct house pattern for icon-only toggles that have clear label text.

### F) L248 NOTIFICATION ITEM row button
**CORRECT.** Three-part verdict:
1. **`active:scale-[0.99]`** — CORRECT. This is a bare full-width row with NO own surface (the `bg-primary/[0.03]` tint is on the PARENT `<div>`, not the button itself). `[0.99]` is the correct tier.
2. **`transition-transform`** — CORRECT. Scale is the only animated prop. No hover color/bg/border on the button element itself.
3. **OUTWARD `ring-ring`** — CORRECT. The button sits inside a `px-3.5 py-3` item `<div>`, which is inside a `divide-y` list inside the `overflow-hidden` card. The `px-3.5` padding keeps the button ~3.5px from the card edge → NOT flush → OUTWARD is correct.

### G) L281 INLINE ACTION CHIP
**CORRECT.** DON'T-CHURN ring-only. Keeps `active:scale-95` + `transition-all`. OUTWARD `ring-ring` on the neutral item parent. No renumber.

### H) L382 BACK button
**CORRECT.** DON'T-CHURN ring-only. Keeps `active:scale-90` (DON'T renumber to 95). Keeps `transition-transform`. OUTWARD `ring-ring`. Correct.

### I) L392 MARK ALL READ text button
**CORRECT.** Three-part verdict:
1. **Keeping `active:opacity-70`** — CORRECT. The author chose opacity as the press channel. No competing scale added.
2. **NOT adding a transition class** — CORRECT. The author chose instant feedback (no transition). Adding `transition-opacity` would change the feel of the control. The house rule says "preserve ALL logic" — the absence of a transition is an intentional design choice.
3. **`rounded` + ring** — CORRECT. `rounded` so the ring traces the inline text button tightly. OUTWARD `ring-ring`.

---

## Controls to LEAVE (confirmed)

| Control | Reason |
|---------|--------|
| `AppLayout` shell | Own tokens (shadcn) |
| Notification item OUTER `<div>` L244 | No `onClick` — non-interactive container |
| Category header OUTER `<div>` L202 | Not a button — non-interactive |
| Unread-count badge `<span>` | Non-interactive |
| All `motion.div` animation wrappers | Animation containers |
| All lucide icons | Decorative |
| Loading skeleton divs | Non-interactive |
| Empty-state div | Non-interactive |
| No native form fields exist | N/A |

---

## Missed Controls Check

Scanning the full file for any other raw interactive controls:

- **PushBanner Bell icon wrapper** (L93) — `<div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">` — non-interactive `<div>`, no `onClick`. LEAVE.
- **PushBanner text paragraphs** (L95–97) — non-interactive. LEAVE.
- **NotifGroup category header icon wrapper** (L215) — `<div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", meta.iconBg)}>` — non-interactive `<div>`. LEAVE.
- **NotifGroup category header label `<span>`** (L218) — non-interactive. LEAVE.
- **NotifGroup unread badge `<span>`** (L219–221) — non-interactive. LEAVE.
- **NotifGroup chevron icons** (L222–226) — decorative children of the collapse button. LEAVE.
- **Notification item unread dot `<div>`** (L258–261) — non-interactive. LEAVE.
- **Notification item title/body `<p>`s** — non-interactive. LEAVE.
- **Notification item timestamp `<p>`** — non-interactive. LEAVE.
- **"Mark all read" `CheckCheck` icon** — decorative child of the button. LEAVE.

**No missed raw interactive controls.** All interactive elements are covered.

---

## Final Diff

```diff
--- a/src/pages/app/personal/PersonalNotificationsPage.tsx
+++ b/src/pages/app/personal/PersonalNotificationsPage.tsx
@@ -64,11 +64,11 @@ function PushOptInBanner() {
                 <button
                   type="button"
                   onClick={handleEnable}
-                  className="px-3.5 py-1.5 rounded-full bg-ig-gradient text-white text-[11px] font-bold active:scale-95 transition-transform"
+                  className="px-3.5 py-1.5 rounded-full bg-ig-gradient text-white text-[11px] font-bold active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 >
                   Enable
                 </button>
                 <button
                   type="button"
                   onClick={handleDismiss}
-                  className="px-3.5 py-1.5 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-semibold active:scale-95 transition-transform"
+                  className="px-3.5 py-1.5 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-semibold active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 >
                   Not now
                 </button>
@@ -80,7 +80,7 @@ function PushOptInBanner() {
               type="button"
               aria-label="Dismiss push notification prompt"
               onClick={handleDismiss}
-              className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors -mt-0.5 shrink-0"
+              className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-all active:scale-95 -mt-0.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <X className="w-3.5 h-3.5" />
             </button>
@@ -200,7 +200,8 @@ function NotifGroup({
         <button
           type="button"
           onClick={() => setCollapsed((v) => !v)}
-          className="flex items-center gap-2.5 flex-1 min-w-0 touch-manipulation active:opacity-70 transition-opacity"
+          aria-expanded={!collapsed}
+          className="flex items-center gap-2.5 flex-1 min-w-0 rounded-lg touch-manipulation active:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
         >
           <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", meta.iconBg)}>
             <Icon className={cn("w-3.5 h-3.5", meta.iconColor)} />
@@ -220,7 +221,7 @@ function NotifGroup({
           type="button"
           onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
           aria-label={isMuted ? `Unmute ${meta.label} notifications` : `Mute ${meta.label} notifications`}
-          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors shrink-0 touch-manipulation"
+          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-all active:scale-95 shrink-0 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
         >
           {isMuted ? <BellOff className="w-3.5 h-3.5 text-rose-400" /> : <Bell className="w-3.5 h-3.5" />}
         </button>
@@ -245,7 +246,7 @@ function NotifGroup({
                     onClick={() => {
                       if (!n.is_read) onMarkRead(n.id);
                       if (n.action_url) onNavigate(n.action_url);
                     }}
-                    className="w-full flex items-start gap-3 text-left touch-manipulation"
+                    className="w-full flex items-start gap-3 text-left touch-manipulation rounded-md transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   >
                     <div
                       className={cn(
@@ -278,7 +279,7 @@ function NotifGroup({
                           <button type="button"
                             key={action.label}
                             onClick={() => onNavigate(action.to)}
-                            className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/8 border border-primary/20 rounded-full px-2.5 py-1 touch-manipulation active:scale-95 transition-all"
+                            className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/8 border border-primary/20 rounded-full px-2.5 py-1 touch-manipulation active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                           >
                             <ActionIcon className="w-3 h-3" />
                             {action.label}
@@ -379,7 +380,7 @@ export default function PersonalNotificationsPage() {
           <button
             type="button"
             aria-label="Go back"
             onClick={() => navigate(-1)}
-            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
+            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <ArrowLeft className="w-4 h-4" />
           </button>
@@ -389,7 +390,7 @@ export default function PersonalNotificationsPage() {
             <button
               type="button"
               onClick={markAllRead}
-              className="text-[12px] font-medium text-primary flex items-center gap-1 touch-manipulation active:opacity-70"
+              className="text-[12px] font-medium text-primary flex items-center gap-1 touch-manipulation active:opacity-70 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <CheckCheck className="w-3.5 h-3.5" /> Mark all read
             </button>
```

---

## Summary

| Edit | Control | Type | Verdict |
|------|---------|------|---------|
| A | ENABLE pill | DON'T-CHURN ring-only | ✅ CORRECT |
| B | NOT-NOW pill | DON'T-CHURN ring-only | ✅ CORRECT |
| C | X DISMISS icon button | FLIP + scale-95 + ring | ✅ CORRECT |
| D | Category collapse toggle | aria-expanded + rounded + ring (keep opacity press) | ✅ CORRECT |
| E | Mute toggle icon button | FLIP + scale-95 + ring (keep dynamic aria-label, no aria-pressed) | ✅ CORRECT |
| F | Notification item row button | [0.99] + transition-transform + OUTWARD ring | ✅ CORRECT |
| G | Inline action chip | DON'T-CHURN ring-only | ✅ CORRECT |
| H | Back button | DON'T-CHURN ring-only (keep scale-90) | ✅ CORRECT |
| I | Mark all read text button | rounded + ring (keep opacity press, no transition) | ✅ CORRECT |

**All 9 edits CORRECT. No missed controls. No corrections needed.** The diff is ready to apply. Run `npm run update` after applying.
