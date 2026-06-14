# DeepSeek run — 2026-06-14T08:17:34.199Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/account/AccountSubscriptionsPage.tsx (327-line "My subscriptions" — manage creator subscriptions at /account/subscriptions. REAL Supabase + @tanstack/react-query: useQuery over `creator_subscriptions` (by subscriber_id) + Promise.all hydration of `subscription_tiers` + `profiles`; cancelMutation calls a Stripe edge function `cancel-creator-subscription`; useState tab/confirmCancel; filters active/ended; computes monthlySpend. Layout: a sticky header [raw icon Back + Heart + "My subscriptions"] + a monthly-spend card + a 2-tab segmented control [active/ended] + (Loader2 OR empty-state [shadcn "Discover creators" Button] OR a list of subscription cards). Each card = a motion.div [rounded-2xl border bg-card overflow-hidden] containing a big clickable creator-row <button> ON TOP [avatar+name+tier badge+price] + a footer row [border-t: a "Renews/Cancelled/Since" date <p> + a raw "Cancel" OR "Resubscribe" text-link <button>]. A shadcn AlertDialog confirms cancel. RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setTab/setConfirmCancel, useQuery/useMutation, edge-function invoke, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button>/AlertDialog*/Avatar (own focus/scale tokens). Don't add role/tabIndex/onKeyDown. Don't renumber an existing scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when control is a flush edge child of a rounded overflow-hidden PARENT, OR a flush media tile in a near-gapless grid.
- Ring color: --ring resolves BLACK. OUTWARD ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/IMAGE surface AS THE PARENT (or ring over media) = ring-white/70. A gradient/tinted-FILLED button on a NEUTRAL parent still uses ring-ring. For an INSET ring it renders over the control's OWN content/surface — an image-dominant tile → ring-white/70; a neutral bg-card row surface (text + a small avatar, NOT image-dominant) → ring-ring.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab/single-select picker active:scale-[0.97]; wide full-width row/button WITH own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99]. Don't renumber an existing scale.
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. ALREADY transition-all → append without flipping. NO transition + scale-only + NO hover ON THE BUTTON → transition-transform NEW. Adding ONLY a focus ring (no new animated prop) → leave the existing transition class as-is. NOTE: hover:underline is text-DECORATION (not a smoothly-animatable bg/text-color/border/opacity), so it does NOT by itself force transition-all — a NEW scale next to a hover:underline is still scale-sole-animated → transition-transform NEW.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a PERSISTENT single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, cancel, resubscribe). For custom tabs without role=tablist/tab structure, aria-pressed is the house pattern.

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP/NEW, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L141 HEADER BACK button (raw <button>, icon-only ArrowLeft, one-shot onClick={() => navigate(-1)}, ALREADY aria-label="Back", base `p-2 -ml-2 rounded-lg hover:bg-muted/60`, NO transition/scale/focus). Parent = sticky header `bg-background/85 backdrop-blur` (neutral). → my plan: KEEP aria-label="Back" + APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only scale-95; transition-all NEW — the button has hover:bg-muted/60 AND gains a scale transform → BOTH animate → transition-all not transition-transform; OUTWARD ring-ring on neutral header; no aria-pressed — one-shot nav). Confirm transition-all (hover present) + scale-95 + keep-aria.

B) L165 TAB button (raw <button>, MAPPED ×2 over ["active","ended"], single-select tab, selection bg-conveyed `bg-background shadow-sm text-foreground` [active] vs `text-muted-foreground` [inactive] via template-literal conditional, one-shot onClick={() => setTab(t)}, VISIBLE text = tab name + count; base `flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all`, ALREADY transition-all, NO scale/focus/aria). Container = `flex gap-1 p-1 bg-muted/40 rounded-xl` (a segmented pill TRACK with p-1=4px inner padding; NOT overflow-hidden). → my plan: ADD `aria-pressed={tab === t}` (persistent single-select segmented tab, bg-conveyed, custom-tabs→aria-pressed) + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` with NO FLIP (segmented-tab tier [0.97]; ALREADY transition-all → append without flipping; OUTWARD ring-ring — the buttons sit inside the track's p-1 padding so a 2px outward ring renders in the padding against the neutral bg-muted/40 track [NOT clipped — track is not overflow-hidden], NOT inset; single edit hits both tabs). Confirm: aria-pressed + tier [0.97] + NO-flip (already transition-all) + OUTWARD ring-ring (not inset — p-1 padded non-overflow-hidden track).

C) L220 CREATOR-ROW top button (raw <button>, the big clickable avatar+name+tier+price region, one-shot onClick={() => navigate(`/user/${s.creator_id}`)}, base `w-full flex items-center gap-3 p-3 text-left active:bg-muted/30 transition-colors`, ALREADY active:bg-muted/30 + transition-colors [press via BACKGROUND wash], NO scale/focus/aria; CONTAINS a small `h-12 w-12` Avatar + name <p> + tier badge <span> + price). PARENT = the card `motion.div` `rounded-2xl border border-border/50 bg-card overflow-hidden`; the button is the FLUSH top child; BELOW it (still in the card) is a `border-t` footer row. → my plan: ring-ONLY append (DON'T add a scale — the row ALREADY presses via active:bg-muted/30; adding a scale would be a SECOND competing press; adding ONLY a ring = no new animated prop → leave active:bg-muted/30 + transition-colors as-is, NO flip). Ring placement: `focus-visible:ring-inset` — the button is a FLUSH top child of the rounded-2xl OVERFLOW-HIDDEN card, so an OUTWARD ring would be CLIPPED on the top/left/right edges; inset is correct. Ring color: the INSET ring renders over the control's OWN surface = the bg-card row (text + a SMALL h-12 avatar — NOT image-dominant, the surface is neutral bg-card) → `ring-ring` (NOT ring-white/70 — this is a neutral card row, not a media tile). So APPEND `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: ring-inset (overflow-hidden card parent) + ring-ring (neutral bg-card row surface, NOT ring-white/70) + ring-only (KEEP active:bg-muted/30 + transition-colors, NO new scale, NO flip) + no aria (visible name/content).

D) L273 "CANCEL" text-link button (raw <button>, inside the card footer row, shown when isActive, one-shot onClick={() => setConfirmCancel(s)} [opens the AlertDialog], VISIBLE text "Cancel", base `text-[11px] font-bold text-destructive hover:underline`, NO transition/scale/focus/aria). Parent = the footer row on bg-card (neutral). → my plan: APPEND `rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (small inline text-link tier [0.97]; transition-transform NEW — the only ANIMATED prop is the new scale [hover:underline is text-decoration, not smoothly-animatable, so it does NOT force transition-all]; `rounded` so the OUTWARD ring traces the inline link tightly; OUTWARD ring-ring on the neutral bg-card footer; NO aria — visible text "Cancel" conveys). Confirm: text-link [0.97] + transition-transform NEW (hover:underline does NOT force transition-all) + rounded + OUTWARD ring-ring + no-aria.

E) L282 "RESUBSCRIBE" text-link button (raw <button>, inside the card footer row, shown when !isActive, one-shot onClick={() => navigate(`/user/${s.creator_id}`)}, VISIBLE text "Resubscribe" + a decorative Crown icon, base `text-[11px] font-bold text-primary hover:underline flex items-center gap-1`, NO transition/scale/focus/aria). Parent = the footer row on bg-card (neutral). → my plan: identical pattern to D — APPEND `rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (text-link [0.97]; transition-transform NEW; rounded; OUTWARD ring-ring on neutral bg-card; NO aria — visible text "Resubscribe", the Crown is decorative). Confirm identical-to-D treatment.

ALSO CONFIRM I should LEAVE these: the shadcn "Discover creators" <Button> L195 (own focus/scale tokens); all AlertDialog* components L299-322 incl. AlertDialogCancel/AlertDialogAction (shadcn, own tokens); the Avatar/AvatarImage/AvatarFallback L225 (own tokens); the card `motion.div` wrapper L214 (entrance anim, NO onClick); ZivoMobileNav L324 (own file); the monthly-spend card <div> + tier badge <span>s + date <p>s + count <p>s (non-interactive); ArrowLeft/Heart/Crown/Loader2/Sparkles/Calendar/AlertCircle icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. 5 raw buttons: A back (transition-all NEW — hover:bg present), B tab ×2 (aria-pressed + [0.97] + NO flip [already transition-all] + OUTWARD ring-ring on padded track), C creator-row (ring-ONLY, ring-inset + ring-ring [neutral card row, NOT ring-white/70], KEEP active:bg-muted/30 + transition-colors, no scale), D Cancel + E Resubscribe (both text-link [0.97] + transition-transform NEW [hover:underline ≠ transition-all] + rounded + OUTWARD ring-ring). Resolve especially: A transition-all (hover present); B aria-pressed + NO-flip + inset-vs-outward on a p-1 padded non-overflow-hidden segmented track; C ring-inset + ring-ring (neutral bg-card row inset, NOT ring-white/70) + whether to add a scale (NO — already active:bg-muted/30); D/E transition-transform-NEW despite hover:underline.
- files: src/pages/account/AccountSubscriptionsPage.tsx

---

## Plan

5 raw `<button>` controls in `src/pages/account/AccountSubscriptionsPage.tsx`:

| Control | Line | Type | Tier | Transition | Ring | Aria |
|---------|------|------|------|------------|------|------|
| A) Header Back | 141 | icon-only | `scale-95` | `transition-all` NEW (has `hover:bg-muted/60`) | OUTWARD `ring-ring` on neutral header | keep `aria-label="Back"` |
| B) Tab ×2 | 165 | segmented tab | `scale-[0.97]` | NO FLIP (already `transition-all`) | OUTWARD `ring-ring` on padded track | ADD `aria-pressed={tab === t}` |
| C) Creator row | 220 | wide row | NO scale (already `active:bg-muted/30`) | NO change (leave `transition-colors`) | INSET `ring-ring` (overflow-hidden card, neutral bg-card surface) | none |
| D) Cancel | 273 | text-link | `scale-[0.97]` | `transition-transform` NEW (`hover:underline` ≠ transition-all) | OUTWARD `ring-ring` on neutral footer | none |
| E) Resubscribe | 282 | text-link | `scale-[0.97]` | `transition-transform` NEW (`hover:underline` ≠ transition-all) | OUTWARD `ring-ring` on neutral footer | none |

## Diff

```diff
--- a/src/pages/account/AccountSubscriptionsPage.tsx
+++ b/src/pages/account/AccountSubscriptionsPage.tsx
@@ -138,7 +138,7 @@ export default function AccountSubscriptionsPage() {
         <div className="flex items-center gap-3 px-3 h-14 max-w-3xl mx-auto">
-          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-lg hover:bg-muted/60">
+          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="h-5 w-5" />
           </button>
           <h1 className="text-base font-bold flex items-center gap-1.5">
@@ -159,7 +159,7 @@ export default function AccountSubscriptionsPage() {
             <button type="button"
               key={t}
               onClick={() => setTab(t)}
-              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
+              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                 tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
-              }`}
+              }`} aria-pressed={tab === t}
             >
               {t} {t === "active" ? `(${active.length})` : `(${ended.length})`}
             </button>
@@ -217,7 +217,7 @@ export default function AccountSubscriptionsPage() {
                   <button
                     type="button"
                     onClick={() => navigate(`/user/${s.creator_id}`)}
-                    className="w-full flex items-center gap-3 p-3 text-left active:bg-muted/30 transition-colors"
+                    className="w-full flex items-center gap-3 p-3 text-left active:bg-muted/30 transition-colors focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   >
                     <Avatar className="h-12 w-12 shrink-0">
                       <AvatarImage src={s.creator?.avatar_url || undefined} />
@@ -270,7 +270,7 @@ export default function AccountSubscriptionsPage() {
                       <button
                         type="button"
                         onClick={() => setConfirmCancel(s)}
-                        className="text-[11px] font-bold text-destructive hover:underline"
+                        className="text-[11px] font-bold text-destructive hover:underline rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                       >
                         Cancel
                       </button>
@@ -279,7 +279,7 @@ export default function AccountSubscriptionsPage() {
                       <button
                         type="button"
                         onClick={() => navigate(`/user/${s.creator_id}`)}
-                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
+                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                       >
                         <Crown className="h-3 w-3" />
                         Resubscribe
```

## Verification

Run `npm run update` before marking done. The diff touches **5 className strings + 1 aria attribute** — zero logic changes. All shadcn components (`Button`, `AlertDialog*`, `Avatar`) left untouched.
