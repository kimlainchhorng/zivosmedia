# MiMo run — 2026-06-14T12:06:06.733Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Verdict: All 15 edits CORRECT ✅ — 0 fixes needed. File is ready to commit as-is.

---

### Per-edit audit

| # | Control | Tier | Action | Verdict |
|---|---------|------|--------|---------|
| 1 | "Switch Account" btn | link/chip | DON'T-CHURN ring-only; `transition-transform` kept (static `bg-primary/10`, no hover/active pseudo → scale sole animated prop) | ✅ |
| 2 | "Copy Link" btn | chip | DON'T-CHURN ring-only (`active:scale-[0.97] transition-all` pre-existing) | ✅ |
| 3 | "Share" btn | chip | DON'T-CHURN ring-only (same as #2) | ✅ |
| 4 | QR btn | icon-only | DON'T-CHURN ring + `aria-label="Show profile QR code"` (no visible text) | ✅ |
| 5 | roleOptions btn ×N | tile | DON'T-CHURN ring-only (`active:scale-[0.96] transition-all` pre-existing) | ✅ |
| 6 | ZIVO+ `<Link>` | wrapper-Link | wrapper-ring: Link gets `block rounded-2xl focus-visible:ring-ring`; inner `motion.div whileTap` kept (NO 2nd scale) | ✅ |
| 7 | quickLinks `<Link>` | wrapper-Link display:contents | **group-focus-visible**: Link `contents group focus-visible:outline-none`; motion.div `group-focus-visible:ring-2 group-focus-visible:ring-ring` | ✅ |
| 8 | "Driver/Truck Mode" btn | wide row w/ own surface | FLIP `transition-colors`→`transition-all` + `active:scale-[0.98]` + ring | ✅ |
| 9 | "Payroll + ROI" btn | wide row w/ own surface | Same as #8 | ✅ |
| 10 | Admin `<Link>` | wrapper-Link display:contents | Same group-focus-visible pattern as #7 | ✅ |
| 11 | "Sign out" btn | wide row w/ own surface | DON'T-CHURN ring-only (`active:scale-[0.98] transition-all` pre-existing) | ✅ |
| 12 | "Close" btn | bare text-link | Fresh `rounded-md transition-transform active:scale-[0.97]` + ring (no colour animates → `transition-transform`) | ✅ |
| 13 | Sheet "Become a Driver" btn | chip w/ own surface | DON'T-CHURN ring-only (`transition-colors` + `active:scale-[0.98]` pre-existing) | ✅ |
| 14 | Sheet partner Links ×N | chip w/ own surface | DON'T-CHURN ring-only (same pattern) | ✅ |
| 15 | Dialog switch-btns ×N | chip w/ own surface | DON'T-CHURN ring-only (same pattern) | ✅ |

**Guard tally: 15 className edits + 1 new aria-label (#4); 0 aria-pressed (no persistent single-select bg-conveyed tabs); 0 aria-expanded (no disclosures); focus-visible:ring=15, ring-ring=15 (all OUTWARD), ring-inset=0; `group-focus-visible:ring`=2 (#7 motion.div + #10 inner div); FLIPs=2 (#8, #9); fresh scale=2 (#12 active:scale-[0.97], #8/#9 active:scale-[0.98]); DON'T-CHURN preserved=11 (#1–6, #11, #13–15); wrapper-ring-only (no 2nd scale)=2 (#6, #10); `contents group`=2 (#7, #10); competing 2nd press added=0; `disabled` touched=0; every `onClick`/`navigate`/`signOut`/`setShow*`/`useState`/`useAuth`/hook/supabase cast/`to`/`href` byte-identical, 0 logic lines touched.**

---

### Answers to key questions

**(2) group-focus-visible for display:contents wrapper-Links — correct house approach?**

**Yes — group-focus-visible is the correct pattern.** Rationale:

- `display:contents` removes the Link's box model → you cannot paint a ring on it directly.
- `contents→block` in **#7** would break the 2-col `grid grid-cols-2` layout: the `<Link>` becomes a grid item, and the `motion.div` becomes a nested child of that grid item — the grid would size/position the Link (with no intrinsic dimensions), not the card. Layout breakage.
- `contents→block` in **#10** (Admin) IS layout-safe (standalone full-width button, not in a grid) but `group-focus-visible` is consistent with #7 and works correctly here too (the `<a>` is the DOM parent of the inner `<div>`, so `.group:focus-visible .group-focus-visible\:ring-2` matches).
- `group-focus-visible:*` on the partner Fragment case is inert (no `.group` ancestor) — harmless.
- Modern browser support for `:focus-visible` is Chrome 86+, Firefox 85+, Safari 15.4+ — adequate for this PWA.

**Recommended house rule:** for `<Link className="contents">` wrapper patterns in grid layouts, use `group-focus-visible` on the visible child. No structural change needed.

**(3) #1 `transition-transform` correct?** ✅ Yes. `bg-primary/10` is a static utility fill with no `:hover`/`:active` pseudo → it is NOT an animated CSS property. Scale is the sole animated prop → `transition-transform`.

**(4) #8/#9 FLIP correct?** ✅ Yes. `active:bg-muted/30` is a real `:active`-pseudo colour change. Adding `active:scale-[0.98]` introduces a second animated property (transform). `transition-colors` alone would not animate the scale; `transition-all` is the superset covering both.

**(5) #12 `transition-transform` correct?** ✅ Yes. The bare "Close" text button has no `hover:bg`, no `active:bg`, no `border-color` change — only the new `active:scale-[0.97]` → `transition-transform` is the precise transition.

**(6) Missed controls or mis-tier?** **None.** Full scan confirms exactly the controls listed: 15 raw `<button>`s + 8 raw `<a>`s (Link) in the main shell, plus 1 "Become a Driver" button + N partner Links + N switch-Dialog buttons in the Sheet/Dialog = all 15 edit groups covered. TranslateButton, Sheet/SheetContent/Dialog/DialogContent, Avatar, DriverAppDownloadSheet, all presentational motion.divs, progress bar, lucide icons, and text elements correctly SKIPPED.

**(7) Partner clickable-div FLAG?** ✅ **Correct to FLAG.** The partner card's `<motion.div onClick>` is not keyboard-focusable (no `<button>` or `<a>` wrapper, no `role`/`tabIndex`/`onKeyDown`). Adding `role="button"` + `tabIndex={0}` + `onKeyDown` Enter/Space handler would be structural → correctly out of scope.

---

### Minor pre-existing observations (NOT this edit's problem — DON'T-CHURN)

- **#13/#14/#15 `transition-colors` + `active:scale-[0.98]`**: the scale transform won't smoothly transition (only colour properties transition). Pre-existing pattern across the Sheet/Dialog controls. A separate cleanup pass could FLIP these to `transition-all`, but that's beyond this ring-addition scope.
- **#7 `cursor-pointer`** on the motion.div: redundant with `touch-manipulation` on touch devices but harmless. Pre-existing.

---

### No proposed diff needed

The file as provided already contains all 15 edits correctly applied. **No changes required.** Ready for `npm run update` verification and commit.
