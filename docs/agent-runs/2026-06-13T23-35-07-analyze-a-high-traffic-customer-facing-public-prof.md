# DeepSeek run — 2026-06-13T23:35:07.685Z

- model: deepseek-chat
- task: Analyze a HIGH-TRAFFIC customer-facing PUBLIC profile page — src/pages/PublicProfilePage.tsx (1746 lines; route /user/:id; the social public profile: mobile sticky header with Back/Share/menu, an optional adult-content gate, a profile action cluster Follow/Friend/Message/Tip/Edit/Share rendered as framer-motion buttons in BOTH desktop and mobile layouts, post tabs, a feed-view post list with Like/Comment/Share/Bookmark bars, a grid-view of post thumbnails, and an Instagram-style post-detail overlay with its own action bar; data via profiles + friendships queries and react-query) — for PREMIUM + RESPONSIVE interaction-token parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase query/RPC/react-query key, navigation/routing, or component/handler logic — propose ONLY JSX/Tailwind className changes plus tiny display-only attrs (aria-label/aria-expanded). The page currently has 0 focus-visible rings on ALL its raw + motion controls — that is the primary gap. KEY RULE — framer-motion buttons: many controls are motion.button with whileTap={{scale:...}}; for those add the focus RING ONLY (focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring) and do NOT add CSS active:scale (it double-applies against the motion transform). Raw <button>/<a> get the full token set. Control inventory to confirm/correct: (A) 3 header icon-<button>s ~L1000 Back / ~L1007 Share / ~L1011 menu-toggle (all share active:scale-95 transition + aria-label, MISSING ring) -> add ring only; (B) the menu-dismiss backdrop <button className=fixed inset-0 z-40> ~L1021 -> invisible click-catcher, SKIP (confirm); (C) 3 dropdown menu-item <button>s ~L1023 Share-profile / ~L1026 Report-profile / ~L1027 Block-user (w-full px-4 py-3 text-left hover:bg-muted/60, inside an overflow-hidden rounded menu) -> active:scale-[0.99] + transition-all + focus-visible ring-INSET; (D) 2 adult-gate <button>s ~L1058 Go-back / ~L1059 I-am-18+ (rounded-xl, transition-colors, hover:bg) -> active:scale-[0.98] + transition-all + ring; (E) ~13 profile-action motion.buttons (desktop ~L1113 Follow/L1122 Friend/L1133 Message/L1140 Tip/L1150 Edit/L1151 Share, mobile ~L1189 Follow/L1198 Friend/L1208 Tip/L1217 Message/L1228 Edit/L1229 Share, plus ~L1254 locked friend-request) all whileTap -> RING ONLY; (F) post-tab motion.button ~L1284 (whileTap, transition-colors) -> RING ONLY; (G) shared-post Follow raw <button> ~L1403 (text-primary text-[13px] font-semibold, no scale/ring) -> small text-link tier active:scale-[0.97] + rounded-sm + transition-all + ring; (H) 4 feed interaction-bar raw <button>s ~L1509 Like/L1512 Comment/L1515 Share/L1519 Bookmark (touch-manipulation active:scale-90 transition-transform, MISSING ring) -> add ring only, keep existing active:scale-90; (I) grid-thumbnail motion.button ~L1543 (whileTap scale 0.97, className has overflow-hidden) -> RING ONLY + ring-INSET (overflow-hidden clips a normal ring); (J) post-overlay raw <button>s ~L1601 Close/L1612 Share (44px icon, no scale/ring) + ~L1639 Like/L1657 Comment/L1666 Share (icon+count, no scale/ring) -> icon tier active:scale-95 + transition-transform + ring (+rounded-md on the paddingless inline ones for a clean ring boundary). SKIP (confirm): shadcn AlertDialogCancel/AlertDialogAction ~L1709-1710, the CommentsSheet/TipSheet/ReportSheet children, the overlay drag-handle <div onPointerDown> ~L1593. FLAG: clickable <div onClick=navigate('/reels/...')> at ~L1433 and ~L1490 are non-focusable (no tabIndex/role) so a ring would be dead CSS + they are keyboard-inaccessible — flag for owner (not a className fix). Tasks: (1) confirm/correct every tier + the ring-only vs full-token split; flag any control I missed across all 1746 lines. (2) responsive issues at 375/768/1280 (the desktop/mobile action clusters, the post tabs, the grid cols, the overlay). (3) call out transition-transform vs transition-all per control given its hover state. Return a CONCISE line-referenced punch list of exact className edits with before/after — do NOT reprint the whole component. Keep under ~700 tokens.
- files: src/pages/PublicProfilePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# PublicProfilePage — Premium Interaction Pass Plan

## Summary
Apply the same interaction-token pattern from `JobPostingDetailPage` to all raw `<button>`/`<a>` and framer-motion controls across this 1746-line social profile page. **No logic changes, no query changes, no routing changes.**

## Control Inventory (confirmed across all 1746 lines)

### Group A — Header icon buttons (3 controls, ~L1000-1011)
**Tier:** icon-only (motion NOT used — raw `<button>` with CSS `active:scale-95 transition`)
**Fix:** add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
**Why ring-only:** they already have `active:scale-95 transition` — correct, keep it.

### Group B — Menu backdrop (~L1021)
**Decision:** SKIP — invisible click-catcher `<button className="fixed inset-0 z-40">`, no visual feedback needed.

### Group C — Dropdown menu items (3 controls, ~L1023-1027)
**Tier:** raw `<button>` inside `overflow-hidden rounded-2xl` container
**Fix:** `active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset`
**Why `ring-inset`:** parent has `overflow-hidden` — normal ring clips.

### Group D — Adult-gate buttons (2 controls, ~L1058-1059)
**Tier:** raw `<button>` with `transition-colors hover:bg-muted`
**Fix:** `active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
**Why `transition-all`:** they have `hover:bg-*` that needs smooth fade.

### Group E — Profile action motion.buttons (~13 controls, ~L1113-1254)
**Tier:** framer-motion `motion.button` with `whileTap={{ scale: 0.96 }}`
**Fix:** RING ONLY — `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
**Why no CSS `active:scale`:** motion's inline transform overrides it.

### Group F — Post tab motion.button (~L1284)
**Tier:** framer-motion `motion.button` with `whileTap`
**Fix:** RING ONLY — same as Group E.

### Group G — Shared-post Follow raw `<button>` (~L1403)
**Tier:** raw `<button>` with `text-primary text-[13px] font-semibold`, no scale/ring
**Fix:** `active:scale-[0.97] rounded-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Group H — Feed interaction bar (4 controls, ~L1509-1519)
**Tier:** raw `<button>` with `active:scale-90 transition-transform touch-manipulation`
**Fix:** RING ONLY — `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
**Why ring-only:** they already have `active:scale-90 transition-transform` — correct, keep it.

### Group I — Grid thumbnail motion.button (~L1543)
**Tier:** framer-motion `motion.button` with `whileTap={{ scale: 0.97 }}`, parent has `overflow-hidden`
**Fix:** RING ONLY + `focus-visible:ring-inset` — `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset`

### Group J — Post overlay raw `<button>`s (6 controls, ~L1601-1666)
**Tier:** raw `<button>` with no scale/ring
**Fix:** `active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (+ `rounded-md` on paddingless inline ones for clean ring boundary)

### SKIP confirmed:
- shadcn `AlertDialogCancel`/`AlertDialogAction` (~L1709-1710) — already ship tokens
- `CommentsSheet`/`TipSheet`/`ReportSheet` children — separate components
- Overlay drag-handle `<div onPointerDown>` (~L1593) — non-focusable, no `onClick`

### FLAG for owner:
- Clickable `<div onClick={navigate('/reels/...')}>` at ~L1433 and ~L1490 — non-focusable, no `tabIndex`/`role="button"`, keyboard-inaccessible. Needs `role="button" tabIndex={0} onKeyDown` to be accessible.

## Responsive Check
- **375px:** Desktop action cluster hidden (`hidden lg:flex`), mobile grid `grid-cols-[1fr_1fr_44px]` holds fine. Post tabs `flex-wrap` safe. Grid thumbnails `grid-cols-3` at 375px — fine.
- **768px:** Same as 375px. Stats bar `flex-1` with `truncate` labels — fine.
- **1280px:** Desktop action cluster visible with 5 buttons — `gap-2` with `px-5` on text buttons + `w-10` on icon buttons fits comfortably.

## Proposed Diff

**File:** `src/pages/PublicProfilePage.tsx`

```diff
--- a/src/pages/PublicProfilePage.tsx
+++ b/src/pages/PublicProfilePage.tsx
@@ -997,7 +997,7 @@ export default function PublicProfilePage() {
           <button
             type="button"
             onClick={handleBack}
-            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/60 bg-card/90 shadow-sm active:scale-95 transition"
+            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/60 bg-card/90 shadow-sm active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <ArrowLeft className="h-5 w-5 text-foreground" />
           </button>
@@ -1007,7 +1007,7 @@ export default function PublicProfilePage() {
           <button
             type="button"
             onClick={handleShare}
-            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/60 bg-card/90 shadow-sm active:scale-95 transition"
+            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/60 bg-card/90 shadow-sm active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <Share2 className="h-5 w-5 text-foreground" />
           </button>
@@ -1018,7 +1018,7 @@ export default function PublicProfilePage() {
               onClick={() => setShowProfileMenu((prev) => !prev)}
               aria-label="Profile actions"
-              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/60 bg-card/90 shadow-sm active:scale-95 transition"
+              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/60 bg-card/90 shadow-sm active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <MoreHorizontal className="h-5 w-5 text-foreground" />
             </button>
@@ -1028,9 +1028,9 @@ export default function PublicProfilePage() {
                 <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
-                  <button type="button" onClick={handleShare} className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-muted/60">Share profile</button>
+                  <button type="button" onClick={handleShare} className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-muted/60 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">Share profile</button>
                   {!isOwnProfile && (
                     <>
-                      <button type="button" onClick={handleReportProfile} className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-muted/60">Report profile</button>
+                      <button type="button" onClick={handleReportProfile} className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-muted/60 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">Report profile</button>
                       <button
                         type="button"
                         onClick={() => void handleBlockProfile()}
                         disabled={blockingUser}
-                        className="w-full px-4 py-3 text-left text-sm font-semibold text-destructive hover:bg-muted/60 disabled:opacity-60"
+                        className="w-full px-4 py-3 text-left text-sm font-semibold text-destructive hover:bg-muted/60 disabled:opacity-60 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                       >
                         {blockingUser ? "Blocking..." : "Block user"}
                       </button>
@@ -1058,8 +1058,8 @@ export default function PublicProfilePage() {
                 <div className="flex gap-3 w-full mt-2">
-                  <button onClick={() => navigate(-1)} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">Go back</button>
-                  <button onClick={() => void adultGate.confirm()} className="flex-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors">I am 18+</button>
+                  <button onClick={() => navigate(-1)} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Go back</button>
+                  <button onClick={() => void adultGate.confirm()} className="flex-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">I am 18+</button>
                 </div>
               </div>
             </div>
@@ -1113,7 +1113,7 @@ export default function PublicProfilePage() {
                       <motion.button
                         whileTap={{ scale: 0.96 }}
                         onClick={() => { if (isFollowing) { setConfirmAction({ action: "unfollow", label: `Unfollow ${resolvedProfile?.full_name}?` }); } else { followMutation.mutate(); } }}
-                        className={cn("flex h-10 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold shadow-sm transition", isFollowing ? "border border-border bg-muted text-foreground" : "bg-ig-gradient text-white")}
+                        className={cn("flex h-10 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isFollowing ? "border border-border bg-muted text-foreground" : "bg-ig-gradient text-white")}
                       >
                         {followMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={cn("h-4 w-4", isFollowing && "fill-primary text-primary")} />}
                         {followMutation.isPending ? "Updating" : isFollowing ? "Following" : "Follow"}
@@ -1122,7 +1122,7 @@ export default function PublicProfilePage() {
                       <motion.button
                         whileTap={{ scale: 0.96 }}
                         onClick={() => { if (friendBtn.action === "cancel") setConfirmAction({ action: "cancel", label: "Cancel this friend request?" }); else if (friendBtn.action === "unfriend") setConfirmAction({ action: "unfriend", label: `Unfriend ${resolvedProfile?.full_name}?` }); else friendMutation.mutate(friendBtn.action); }}
-                        className={cn("flex h-10 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-extrabold transition",
+                        className={cn("flex h-10 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                           friendshipStatus === "friends" ? "border-primary/30 bg-primary/10 text-primary" : friendshipStatus === "request_sent" ? "border-border bg-muted text-muted-foreground" : friendshipStatus === "request_received" ? "border-primary bg-ig-gradient text-white" : "border-border bg-card text-foreground"
                         )}>
                           {friendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <friendBtn.icon className="h-4 w-4" />}
@@ -1133,7 +1133,7 @@ export default function PublicProfilePage() {
                         <motion.button
                           whileTap={{ scale: 0.96 }}
                           onClick={() => navigate(`/chat`, { state: { openChat: { recipientId: targetUserId, recipientName: resolvedProfile?.full_name || "User", recipientAvatar: resolvedProfile?.avatar_url } } })}
-                          className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-extrabold text-foreground transition"
+                          className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-extrabold text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                         >
                           <MessageCircle className="h-4 w-4" />
                           Message
@@ -1142,7 +1142,7 @@ export default function PublicProfilePage() {
                       <motion.button
                         whileTap={{ scale: 0.96 }}
                         onClick={() => { if (!user) { toast.error("Sign in to tip"); navigate("/auth"); return; } setTipOpen(true); }}
-                        className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md"
+                        className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                       >
                         <Gift className="h-4 w-4" />
                       </motion.button>
@@ -1150,8 +1150,8 @@ export default function PublicProfilePage() {
                   {isOwnProfile && (
                     <div className="hidden lg:flex items-center gap-2 ml-auto pb-1">
-                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate("/account/profile-edit")} className="flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-extrabold text-foreground">Edit Profile</motion.button>
-                      <motion.button whileTap={{ scale: 0.96 }} onClick={handleShare} className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-card text-foreground"><Share2 className="h-4 w-4" /></motion.button>
+                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate("/account/profile-edit")} className="flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-extrabold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Edit Profile</motion.button>
+                      <motion.button whileTap={{ scale: 0.96 }} onClick={handleShare} className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Share2 className="h-4 w-4" /></motion.button>
                     </div>
                   )}
                 </div>
@@ -1189,7 +1189,7 @@ export default function PublicProfilePage() {
                       <motion.button
                         whileTap={{ scale: 0.96 }}
                         onClick={() => { if (isFollowing) { setConfirmAction({ action: "unfollow", label: `Unfollow ${resolvedProfile?.full_name}?` }); } else { followMutation.mutate(); } }}
-                        className={cn("flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 text-sm font-extrabold shadow-sm transition", isFollowing ? "border border-border bg-muted text-foreground" : "bg-ig-gradient text-white")}
+                        className={cn("flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 text-sm font-extrabold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isFollowing ? "border border-border bg-muted text-foreground" : "bg-ig-gradient text-white")}
                       >
                         {followMutation.isPending ? <
