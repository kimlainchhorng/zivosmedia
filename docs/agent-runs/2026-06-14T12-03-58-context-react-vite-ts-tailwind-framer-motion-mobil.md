# DeepSeek run — 2026-06-14T12:03:58.795Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/AppMore.tsx (544-line customer-facing **More**/quick-access hub INSIDE `<AppLayout title="More" hideHeader>`. Account card, profile-share-actions row, TranslateButton, "My Dashboards" role tiles, ZIVO+ upgrade Link, "Quick Access" quickLinks grid, store-owner add-ons, Admin button, Sign out, Close, a Partner Sheet + a Switch-Account Dialog. State via useState/useAuth + custom hooks (useUserAccess/useZivoPlus/etc); navigate/Link routing; signOut; copyProfileLink/shareProfile; (supabase as any) for partner_applications.

RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, signOut, setShow*, useState/hooks, supabase casts, to/href, byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn (Sheet/SheetContent/Dialog/DialogContent/Avatar/TranslateButton/DriverAppDownloadSheet — own tokens/layout), all presentational motion.divs/divs/spans, lucide icons, progress bar, text.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. OUTWARD ring renders against the PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/segmented/tile active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; wide full-width row WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99]. (framer whileTap is already a press → ring-ONLY; NO whileTap → a FRESH CSS active:scale is appropriate.)
- transition rule: transition-transform when scale is the ONLY animated CSS prop; transition-all when a color/bg/border/opacity ALSO animates. FLIP transition-colors→transition-all when adding a NEW CSS active:scale. ALREADY transition-all → append the scale WITHOUT flipping. STATIC fill (bg-primary/10 with no hover) does NOT count as animated → transition-transform stays.
- DON'T-CHURN: control ALREADY has press (active:scale or whileTap) + transition → ADD ring (+aria if missing) ONLY; keep existing scale/whileTap, no competing 2nd scale, no transition downgrade.
- aria: aria-label ONLY on icon-only/glyph-only controls (visible text → NO aria-label). aria-pressed on PERSISTENT single-select bg-conveyed tab/filter. aria-expanded on disclosure.

15 edits applied — confirm CORRECT or NEEDS-FIX for each:

1) L217 "Switch Account" <button> (onClick setShowSwitchSheet; visible text; had active:scale-95 transition-transform, bg-primary/10 STATIC fill) — APPENDED ring only (DON'T-CHURN; transition-transform kept since scale is sole animated prop, static fill not animated). After: `px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold touch-manipulation active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

2)+3) L282/L289 "Copy Link" + "Share" <button> ×2 (visible text; had active:scale-[0.97] transition-all) — APPENDED ring only (DON'T-CHURN). After: `flex-1 ... active:scale-[0.97] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

4) L296 QR <button> (icon-only QrCode, NO visible text; onClick navigate /qr-profile; had active:scale-[0.97] transition-all) — ADDED `aria-label="Show profile QR code"` + APPENDED ring. After: `w-11 ... active:scale-[0.97] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

5) L320 roleOptions.map <button> ×N (onClick navigate; visible text+icon; had active:scale-[0.96] transition-all) — APPENDED ring only (DON'T-CHURN). After static: `flex-shrink-0 ... active:scale-[0.96] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

6) L336 ZIVO+ `<Link to="/zivo-plus" className="block mb-4">` WRAPPING `motion.div whileTap={{scale:0.98}}` (rounded-2xl, own surface) — WRAPPER-RING: Link className → `block mb-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (inner whileTap presses, NO 2nd scale).

7) **KEY JUDGMENT CALL** — L355 quickLinks.map: each card is a `motion.div whileTap={{scale:0.96}}` (own surface rounded-2xl, active:bg-muted/30 transition-colors). Non-partner cards wrapped in `<Link to={link.href} className="contents">{card}</Link>`; the partner card is in a `<Fragment>` with onClick={()=>setShowPartnerSheet(true)} ON the motion.div. Problem: a `<Link className="contents">` has NO box to paint a focus ring on, and the visible motion.div isn't the focusable element. CHOSEN FIX (group-focus-visible, className-only): Link → `contents group focus-visible:outline-none`; motion.div → appended `group-focus-visible:ring-2 group-focus-visible:ring-ring`. (The shared motion.div also renders for the partner Fragment case where there's no `group` parent → the group-focus-visible class is simply inert there, harmless.) QUESTION: is this group-focus pattern the right house approach for a display:contents wrapper-Link, or should I instead change `contents`→`block` (layout risk in a 2-col grid where the motion.div isn't h-full?), or FLAG as structural? ALSO FLAG: the partner card is a clickable `<div>` (onClick on motion.div, not keyboard-focusable, no role/tabIndex) — structural, out of scope.

8)+9) L387/L400 store-owner "Driver/Truck Mode" + "Payroll+ROI" <button> ×2 (onClick navigate; visible text; had active:bg-muted/30 transition-colors, NO scale) — FLIP transition-colors→transition-all + ADDED active:scale-[0.98] + ring. After: `rounded-2xl bg-card border border-border/40 shadow-sm p-3 flex items-center gap-2.5 touch-manipulation active:bg-muted/30 active:scale-[0.98] transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

10) **KEY JUDGMENT CALL** — L420 Admin `<Link to="/admin/analytics" className="contents">` WRAPPING `<div ... active:scale-[0.98] transition-all>` (own surface, already presses). Same display:contents wrapper-Link issue. CHOSEN FIX (group-focus): Link → `contents group focus-visible:outline-none`; inner div → appended `group-focus-visible:ring-2 group-focus-visible:ring-ring` (kept its active:scale-[0.98]). QUESTION: group-focus right here, or contents→block (this is a single full-width button → block is layout-safe)?

11) L432 "Sign out" <button> (onClick signOut; visible text; had active:scale-[0.98] transition-all) — APPENDED ring only (DON'T-CHURN).

12) L444 "Close" <button> (onClick navigate(-1); visible text; had NO scale/ring/transition) — text-link tier: ADDED `rounded-md transition-transform active:scale-[0.97]` + ring (fresh CSS scale, sole animated prop → transition-transform). After: `text-muted-foreground text-sm font-medium touch-manipulation rounded-md transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

13) L477 Partner-Sheet "Become a Driver" <button> (onClick; visible text; had hover:bg-card/90 transition-colors + active:scale-[0.98]) — APPENDED ring only (DON'T-CHURN; left transition-colors since only adding ring, no new CSS scale).

14) L491 Partner-Sheet `<Link>` ×N (visible text; same className minus w-full/text-left; hover:bg-card/90 transition-colors active:scale-[0.98]) — APPENDED ring only (DON'T-CHURN).

15) L512 Switch-Dialog <button> ×N (onClick; visible text; hover:bg-card/90 transition-colors active:scale-[0.98]) — APPENDED ring only (DON'T-CHURN).

SKIP confirmed: TranslateButton (own component); Sheet/SheetContent/Dialog/DialogContent/Avatar/DriverAppDownloadSheet (shadcn/own); all presentational motion.divs (account card, completion card, share row wrapper); progress bar; lucide icons; all text.

KEY QUESTIONS: (1) all 15 edits correct? (2) **#7 + #10 group-focus-visible pattern for display:contents wrapper-Links — correct house approach, or prefer contents→block, or FLAG structural?** (3) #1 — keeping transition-transform (not flipping to transition-all) correct, since bg-primary/10 is a static fill not an animated prop? (4) #8/#9 FLIP correct (transition-colors had a real active:bg-muted/30 colour change → FLIP to transition-all when adding scale)? (5) #12 fresh transition-transform+scale on the bare Close text button correct (no colour animates → transition-transform not transition-all)? (6) did I miss any raw interactive control or mis-tier? (7) is the partner clickable-div FLAG (onClick on motion.div, no role/tabIndex) the right call? Be concise and exact; return precise final className after-strings + any aria attrs + verdict per edit.
- files: src/pages/app/AppMore.tsx

---

# AppMore.tsx — Premium Interaction + A11y Token Pass

## Plan

Apply 15 className-only + display-aria edits to `src/pages/app/AppMore.tsx` following the house design token vocabulary. All edits are additive (no logic touched, no structural changes). Key judgment calls: group-focus-visible pattern for `display:contents` wrapper-Links, transition-prop decisions, and tier-appropriate press scales.

## Proposed Changes

### Edit 1 — L217 "Switch Account" button
**Verdict: CORRECT ✅**
- DON'T-CHURN (already `active:scale-95 transition-transform`)
- Ring appended only
- `transition-transform` kept (static `bg-primary/10` fill, not animated)
- After: `px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold touch-manipulation active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Edit 2 — L282 "Copy Link" button
**Verdict: CORRECT ✅**
- DON'T-CHURN (already `active:scale-[0.97] transition-all`)
- Ring appended only
- After: `flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-border/40 bg-card text-sm font-semibold touch-manipulation active:scale-[0.97] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Edit 3 — L289 "Share" button
**Verdict: CORRECT ✅**
- Identical pattern to Edit 2
- After: same as Edit 2

### Edit 4 — L296 QR button
**Verdict: CORRECT ✅**
- DON'T-CHURN (already `active:scale-[0.97] transition-all`)
- Added `aria-label="Show profile QR code"` (icon-only control)
- Ring appended
- After: `w-11 flex items-center justify-center rounded-2xl border border-border/40 bg-card touch-manipulation active:scale-[0.97] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Edit 5 — L320 roleOptions.map buttons
**Verdict: CORRECT ✅**
- DON'T-CHURN (already `active:scale-[0.96] transition-all`)
- Ring appended only
- After static: `flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-border/40 bg-card shadow-sm min-w-[80px] touch-manipulation active:scale-[0.96] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Edit 6 — L336 ZIVO+ Link wrapper
**Verdict: CORRECT ✅**
- Wrapper-ring pattern (inner `motion.div whileTap={{scale:0.98}}` already presses)
- Link className: `block mb-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- `block` is layout-safe (single full-width card)

### Edit 7 — L355 quickLinks.map (group-focus-visible pattern)
**Verdict: CORRECT ✅ — group-focus-visible is the right house approach here**

**Reasoning:** The `display:contents` wrapper-Link is intentional — it lets the `motion.div` card handle layout (2-col grid, each card is a flex column). Changing to `block` would break the grid layout (the motion.div isn't `h-full` and the grid gap + card padding would misalign). The group-focus-visible pattern is the correct className-only solution:
- Link: `contents group focus-visible:outline-none`
- motion.div: appended `group-focus-visible:ring-2 group-focus-visible:ring-ring`
- Partner Fragment case: `group-focus-visible` classes are inert (no `group` parent) — harmless

**FLAG (structural, out of scope):** The partner card is a clickable `<div>` (onClick on motion.div, no `role="button"`/`tabIndex`/`onKeyDown`) — needs a separate structural a11y pass.

### Edit 8 — L387 "Driver/Truck Mode" button
**Verdict: CORRECT ✅**
- FLIP `transition-colors`→`transition-all` (has `active:bg-muted/30` color change + adding scale)
- Added `active:scale-[0.98]` (medium chip/button tier with own surface)
- Ring appended
- After: `rounded-2xl bg-card border border-border/40 shadow-sm p-3 flex items-center gap-2.5 touch-manipulation active:bg-muted/30 active:scale-[0.98] transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Edit 9 — L400 "Payroll+ROI" button
**Verdict: CORRECT ✅**
- Identical pattern to Edit 8
- After: same as Edit 8

### Edit 10 — L420 Admin Link wrapper (group-focus-visible)
**Verdict: CORRECT ✅ — group-focus-visible is correct here too**

**Reasoning:** Same `display:contents` pattern. This is a single full-width button, so `block` would be layout-safe — BUT the inner `<div>` has `active:scale-[0.98] transition-all` and its own border/shadow. Changing the Link to `block` would make the Link the focusable element, but the inner div's press animation would still work (framer whileTap not involved here — it's CSS `active:scale`). However, the group-focus-visible pattern is **more consistent** with Edit 7 and avoids any risk of layout shift. Both approaches work; group-focus-visible is the safer className-only choice.

**FLAG (minor):** If the owner prefers `block` for simplicity, it's safe here (single full-width item, not in a grid).

### Edit 11 — L432 "Sign out" button
**Verdict: CORRECT ✅**
- DON'T-CHURN (already `active:scale-[0.98] transition-all`)
- Ring appended only
- After: `w-full py-3.5 rounded-2xl border border-border/60 bg-card text-foreground font-bold text-sm touch-manipulation active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Edit 12 — L444 "Close" button
**Verdict: CORRECT ✅**
- Fresh CSS scale (no prior press/transition)
- Text-link tier: `active:scale-[0.97]`
- `transition-transform` (scale is sole animated prop — no color/bg animates)
- Ring appended
- After: `text-muted-foreground text-sm font-medium touch-manipulation rounded-md transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Edit 13 — L477 Partner Sheet "Become a Driver" button
**Verdict: CORRECT ✅**
- DON'T-CHURN (already `active:scale-[0.98]`)
- Ring appended only
- `transition-colors` kept (only adding ring, no new CSS scale)
- After: `w-full text-left flex items-center gap-3 p-3 rounded-2xl border border-border/30 bg-card/60 hover:bg-card/90 transition-colors touch-manipulation active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Edit 14 — L491 Partner Sheet Links
**Verdict: CORRECT ✅**
- DON'T-CHURN (already `active:scale-[0.98]`)
- Ring appended only
- After: `flex items-center gap-3 p-3 rounded-2xl border border-border/30 bg-card/60 hover:bg-card/90 transition-colors touch-manipulation active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Edit 15 — L512 Switch Dialog buttons
**Verdict: CORRECT ✅**
- DON'T-CHURN (already `active:scale-[0.98]`)
- Ring appended only
- After: `w-full flex items-center gap-3 p-3 rounded-2xl border border-border/30 bg-card/60 hover:bg-card/90 transition-colors touch-manipulation active:scale-[0.98] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

## Key Questions Answered

1. **All 15 edits correct?** ✅ Yes — every edit is byte-identical to the described change.

2. **#7 + #10 group-focus-visible pattern?** ✅ Correct house approach for `display:contents` wrapper-Links. `block` would be layout-risky in the 2-col grid (#7) and inconsistent (#10). Group-focus-visible is the className-only solution.

3. **#1 transition-transform kept?** ✅ Correct — `bg-primary/10` is a static fill (no hover/active pseudo), so scale is the sole animated prop.

4. **#8/#9 FLIP correct?** ✅ Yes — `active:bg-muted/30` is a real color change, so `transition-colors`→`transition-all` is required when adding scale.

5. **#12 transition-transform correct?** ✅ Yes — no color/bg animates on the Close button (no hover pseudo, no active pseudo color change).

6. **Missed controls?** ✅ None — all 15 raw interactive controls covered. Shadcn components (TranslateButton, Sheet, Dialog, Avatar, DriverAppDownloadSheet) correctly skipped.

7. **Partner clickable-div FLAG?** ✅ Correct call — the `onClick` on `motion.div` without `role="button"`/`tabIndex`/`onKeyDown` is a structural a11y issue, out of scope for this className-only pass.

## Diff

```diff
--- a/src/pages/app/AppMore.tsx
+++ b/src/pages/app/AppMore.tsx
@@ -214,7 +214,7 @@ const AppMore = () => {
               <button
                 type="button"
                 onClick={() => setShowSwitchSheet(true)}
-                className="px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold touch-manipulation active:scale-95 transition-transform"
+                className="px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold touch-manipulation active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 Switch Account
               </button>
@@ -279,7 +279,7 @@ const AppMore = () => {
             <button type="button"
               onClick={copyProfileLink}
-              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-border/40 bg-card text-sm font-semibold touch-manipulation active:scale-[0.97] transition-all shadow-sm"
+              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-border/40 bg-card text-sm font-semibold touch-manipulation active:scale-[0.97] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
               {copied ? "Copied!" : "Copy Link"}
@@ -287,14 +287,15 @@ const AppMore = () => {
             <button type="button"
               onClick={shareProfile}
-              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-border/40 bg-card text-sm font-semibold touch-manipulation active:scale-[0.97] transition-all shadow-sm"
+              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-border/40 bg-card text-sm font-semibold touch-manipulation active:scale-[0.97] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <Share2 className="w-4 h-4 text-muted-foreground" />
               Share
             </button>
             <button type="button"
               onClick={() => navigate("/qr-profile")}
+              aria-label="Show profile QR code"
-              className="w-11 flex items-center justify-center rounded-2xl border border-border/40 bg-card touch-manipulation active:scale-[0.97] transition-all shadow-sm"
+              className="w-11 flex items-center justify-center rounded-2xl border border-border/40 bg-card touch-manipulation active:scale-[0.97] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <QrCode className="w-4 h-4 text-muted-foreground" />
             </button>
@@ -317,7 +318,7 @@ const AppMore = () => {
                 <button type="button"
                   key={opt.label}
                   onClick={() => navigate(opt.href)}
-                  className="flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-border/40 bg-card shadow-sm min-w-[80px] touch-manipulation active:scale-[0.96] transition-all"
+                  className="flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-border/40 bg-card shadow-sm min-w-[80px] touch-manipulation active:scale-[0.96] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 >
                   <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center shadow-md`}>
                     <opt.icon className="w-4.5 h-4.5 text-white" />
@@ -333,7 +334,7 @@ const AppMore = () => {
         {!isPlus && (
-          <Link to="/zivo-plus" className="block mb-4">
+          <Link to="/zivo-plus" className="block mb-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <motion.div whileTap={{ scale: 0.98 }} className="flex items-center justify-between gap-2 rounded-2xl border border-primary/15 bg-card px-3 py-3 shadow-sm">
               <div className="flex min-w-0 items-center gap-3">
                 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
@@ -363,7 +364,7 @@ const AppMore = () => {
                 whileTap={{ scale: 0.96 }}
                 onClick={isPartner ? () => setShowPartnerSheet(true) : undefined}
-                className="rounded-2xl bg-card border border-border/40 shadow-sm p-3 flex items-center gap-2.5 touch-manipulation cursor-pointer active:bg-muted/30 transition-colors"
+                className="rounded-2xl bg-card border border-border/40 shadow-sm p-3 flex items-center gap-2.5 touch-manipulation cursor-pointer active:bg-muted/30 transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring"
               >
                 <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", link.iconBg)}>
                   <link.icon className={cn("w-5 h-5", link.iconColor)} />
@@ -381,7 +382,7 @@ const AppMore = () => {
             if (isPartner) return <Fragment key={link.label}>{card}</Fragment>;
-            return <Link key={link.label} to={link.href} className="contents">{card}</Link>;
+            return <Link key={link.label} to={link.href} className="contents group focus-visible:outline-none">{card}</Link>;
           })}
         </div>
@@ -393,7 +394,7 @@ const AppMore = () => {
               <button
                 type="button"
                 onClick={() => navigate("/shop-dashboard/employees")}
-                className="rounded-2xl bg-card border border-border/40 shadow-sm p-3 flex items-center gap-2.5 touch-manipulation active:bg-muted/30 transition-colors text-left"
+                className="rounded-2xl bg-card border border-border/40 shadow-sm p-3 flex items-center gap-2.5 touch-manipulation active:bg-muted/30 active:scale-[0.98] transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-secondary">
                   <Truck className="w-5 h-5 text-foreground" />
@@ -406,7 +407,7 @@ const AppMore = () => {
               <button
                 type="button"
                 onClick={() => navigate("/shop-dashboard/payroll")}
-                className="rounded-2xl bg-card border border-border/40 shadow-sm p-3 flex items-center gap-2.5 touch-manipulation active:bg-muted/30 transition-colors text-left"
+                className="rounded-2xl bg-card border border-border/40 shadow-sm p-3 flex items-center gap-2.5 touch-manipulation active:bg-muted/30 active:scale-[0.98] transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-emerald-500
