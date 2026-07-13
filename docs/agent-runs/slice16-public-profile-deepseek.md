# DeepSeek run — 2026-06-13T23:45:16.564Z

- model: deepseek-chat
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/PublicProfilePage.tsx (1747 lines, route /user/:userId -- the large social public profile: cover/avatar, stats bar, follow/friend/message/tip actions desktop+mobile, OF-creator 18+ age gate, privacy-locked state, sticky swipeable post tabs All/Photos/Videos, feed + grid post views, shared-post embeds, fullscreen post-detail overlay with like/comment/share/bookmark, creator subscribe/PPV/tip components).

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

CRITICAL edit-shape rule:
- RAW <button>/<a> (NOT framer-motion) => CSS active:scale WORKS => add FULL token set (transition-* + active:scale-[tier] + focus-visible ring; aria-label if icon-only).
- framer-motion motion.button that ALREADY has whileTap={{scale}} => CSS active:scale is DEAD (motion inline transform overrides) => add focus-visible ring ONLY. Do NOT add active:scale. Do NOT add transition-all (it can fight framer's release spring).
- shadcn <Button>/<Card>/<Avatar>/<AlertDialog*> already compliant => never touch.
- overflow-hidden + flush control => focus-visible:ring-inset.

HARD RULE: className + display-only attribute (aria-label) changes ONLY. Do NOT change any onClick / navigate target / mutation (followMutation, friendMutation) / RPC / react-query key / useState / useEffect / handleTabSwipe / openViewer / renderImageGrid / handleLike / handleBookmark / handleSharePost logic.

MY PLAN -- validate or correct each item:

[A] ALREADY DONE (skip, do not re-touch): header Back/Share/More-options icon-buttons (focus ring added, kept active:scale-95 transition); dropdown Share/Report/Block menu items (transition-all active:scale-[0.99] + ring + ring-inset); age-gate "Go back" / "I am 18+" (transition-colors->transition-all + active:scale-[0.98] + ring); desktop Follow/Friend/Message/Tip motion.buttons (ring already present in committed HEAD).

[B] motion.buttons => ADD focus-visible RING ONLY: (1) desktop own-profile Edit Profile; (2) desktop own-profile Share (icon, ALSO add aria-label="Share profile"); (3) mobile Follow; (4) mobile Friend; (5) mobile Tip (icon, has aria-label already); (6) mobile Message; (7) mobile own-profile Edit Profile; (8) mobile own-profile Share (icon, ALSO add aria-label="Share profile"); (9) locked-state "Send Friend Request"; (10) sticky post tabs x3 (keep transition-colors, add ring); (11) post-grid thumbnail motion.button (overflow-hidden rounded-lg flush in gap-1 grid => add ring with ring-inset).

[C] RAW buttons => FULL TOKENS: (12) embedded shared-post "Follow" raw <button> (text link, className "text-primary text-[13px] font-semibold ml-2 shrink-0" => add rounded-sm transition-all active:scale-[0.97] + ring); (13) interaction-bar Like/Comment/Share/Bookmark x4 (already "touch-manipulation active:scale-90 transition-transform" => just APPEND ring; have aria-labels); (14) overlay header Close (icon "min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2" => transition-transform active:scale-95 + ring); (15) overlay header Share (icon, same base className => same); (16) overlay action-bar Like raw <button> "flex items-center gap-1.5" => rounded-md transition-transform active:scale-95 + ring; (17) overlay action-bar Comment same; (18) overlay action-bar Share raw <button> has NO className => add className="transition-transform active:scale-95 + ring rounded-md".

[D] FLAG-not-fix (out of className-only scope, advise if you disagree): clickable <div onClick> media regions (post video wrapper "relative w-full flex justify-center bg-muted overflow-hidden" L1433/L1490; renderImageGrid tiles) are NOT keyboard-focusable (no tabIndex/role) => a focus ring would be DEAD CSS and a real fix needs role/tabIndex/onKeyDown (logic, out of scope). Post-grid thumbnail <img> has alt="" (no accessible name) -- flag only. The invisible "fixed inset-0" dismiss backdrop button => skip (no tokens).

QUESTIONS:
(1) Is the motion.button=ring-only vs raw-button=full-token split applied to the RIGHT elements? Any element I mislabeled (a raw button I called motion, or a motion.button I called raw)?
(2) Thumbnail focus ring: is ring-inset correct, or is a normal outward ring fine (box-shadow rings are not clipped by the element's own overflow-hidden, only by ancestors)?
(3) Clickable media <div onClick>: agree to FLAG/skip rather than add active:scale (full-bleed media scaling = churn; ring is dead without focusability)? Or is active:scale-[0.98] transition-transform (no ring) worth adding?
(4) Responsive at 375/768/1280: mobile action grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] (Follow/Friend/Tip), the 4-cell flex stats bar, sticky tabs grid-cols-3, post grid grid-cols-3 (photos)/grid-cols-2 (videos). Any crush or horizontal overflow at 375px?

Be concise. Cite classNames not line numbers. Give before->after for any correction you propose. If my plan is correct as-is, say so plainly per item.
- files: src/pages/PublicProfilePage.tsx

---

# Plan

Your plan is **correct as-is** for all items. Here's my validation:

## [A] ALREADY DONE — ✅ Confirmed skip
All 4 groups (header Back/Share/More-options, dropdown menu items, age-gate buttons, desktop motion.buttons) already have the correct tokens in the committed code. No re-touch needed.

## [B] motion.buttons → ring ONLY — ✅ Correct split

All 11 items are correctly identified as `motion.button` with `whileTap={{ scale: ... }}`:
1. Desktop Edit Profile — `motion.button` ✅ ring only
2. Desktop Share — `motion.button` ✅ ring + `aria-label="Share profile"`
3. Mobile Follow — `motion.button` ✅ ring only
4. Mobile Friend — `motion.button` ✅ ring only
5. Mobile Tip — `motion.button` ✅ ring only (has `aria-label` already)
6. Mobile Message — `motion.button` ✅ ring only
7. Mobile Edit Profile — `motion.button` ✅ ring only
8. Mobile Share — `motion.button` ✅ ring + `aria-label="Share profile"`
9. Locked "Send Friend Request" — `motion.button` ✅ ring only
10. Sticky post tabs x3 — `motion.button` ✅ ring only (keep `transition-colors`)
11. Post-grid thumbnail — `motion.button` ✅ **ring-inset** (correct — `overflow-hidden rounded-lg` in a `gap-1 grid`)

## [C] RAW buttons → FULL tokens — ✅ Correct split

All 7 items are correctly identified as raw `<button>` (no framer-motion):
12. Shared-post "Follow" — raw `<button>` ✅ `rounded-sm transition-all active:scale-[0.97]` + ring
13. Interaction bar Like/Comment/Share/Bookmark x4 — raw `<button>` ✅ just append ring (already have `active:scale-90 transition-transform`)
14. Overlay header Close — raw `<button>` ✅ `transition-transform active:scale-95` + ring
15. Overlay header Share — raw `<button>` ✅ same
16. Overlay action-bar Like — raw `<button>` ✅ `rounded-md transition-transform active:scale-95` + ring
17. Overlay action-bar Comment — raw `<button>` ✅ same
18. Overlay action-bar Share — raw `<button>` (no className) ✅ add `className="transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"`

## Answers to your questions

### (1) motion.button vs raw — ✅ Correct
I verified every element against the source. No mislabeling. The split is clean.

### (2) Thumbnail focus ring: ring-inset — ✅ Correct
`box-shadow` rings are **not** clipped by the element's own `overflow-hidden` — they render outside the element. However, the thumbnail is inside a `gap-1 grid` where adjacent thumbnails are flush. A normal outward ring would overlap into the adjacent cell's space. **`ring-inset` is the correct choice** here.

### (3) Clickable media `<div onClick>` — ✅ AGREE: FLAG/skip
- `active:scale` on a full-bleed media div would cause visual churn (the entire image shifts on press — looks broken)
- Focus ring is dead CSS without `tabIndex`/`role`/`onKeyDown`
- The real fix needs logic changes (out of scope)
- **Skip entirely**

### (4) Responsive at 375px — ✅ No crush
- Mobile action grid `grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px]`: Follow (flex-1) + Friend (flex-1) + Tip (44px) — the `minmax(0,1fr)` ensures they shrink to fit. At 375px with ~16px gap, each fr gets ~157px. Button text "Following" or "Add Friend" truncates via `truncate` class. ✅ Fits.
- Stats bar: 4 cells with `flex-1`, each gets ~87px at 375px. Labels are `text-[9px]` uppercase. ✅ Fits.
- Sticky tabs `grid-cols-3`: each ~117px. Icons + short labels. ✅ Fits.
- Post grid `grid-cols-3` (photos) / `grid-cols-2` (videos): standard Instagram layout. ✅ Fits.

## Proposed diff

Only the items in [B] and [C] need changes. Here's the exact diff:

```diff
--- a/src/pages/PublicProfilePage.tsx
+++ b/src/pages/PublicProfilePage.tsx
@@ -X,7 +X,7 @@
               <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate("/account/profile-edit")}
-                className="flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-extrabold text-foreground">
+                className="flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-extrabold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                 Edit Profile
               </motion.button>
               <motion.button whileTap={{ scale: 0.96 }} onClick={handleShare}
-                className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-card text-foreground">
+                className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
+                aria-label="Share profile"
                 <Share2 className="h-4 w-4" />
               </motion.button>
```

*(Repeat for each of the 11 motion.buttons — add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`; add `aria-label="Share profile"` to the two Share buttons)*

```diff
--- a/src/pages/PublicProfilePage.tsx
+++ b/src/pages/PublicProfilePage.tsx
@@ -X,7 +X,7 @@
               {/* Shared-post "Follow" raw button */}
               <button
                 onClick={...}
-                className="text-primary text-[13px] font-semibold ml-2 shrink-0"
+                className="text-primary text-[13px] font-semibold ml-2 shrink-0 rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
```

*(Repeat for each of the 7 raw buttons in [C] with their respective tier values)*

## What the owner must verify
- Run `npm run update` — must pass (type-check + worker + build)
- Preview at 375px, 768px, 1280px — verify no layout crush
- Test keyboard navigation on all edited controls (Tab through, verify focus rings visible)
- The clickable media `<div onClick>` regions remain non-keyboard-accessible — this is a
