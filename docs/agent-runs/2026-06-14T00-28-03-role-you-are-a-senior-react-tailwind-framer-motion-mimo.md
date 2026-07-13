# MiMo run — 2026-06-14T00:28:03.880Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: ROLE
You are a senior React/Tailwind/framer-motion reviewer auditing ONE file in a production React+Vite+TS PWA (Capacitor-wrapped → same web bundle ships to iOS + Android). We are adding a PREMIUM + RESPONSIVE interaction-token pass: focus rings, press-scale, and ARIA on interactive controls. This is part of a slice-by-slice marathon; reference standard is src/pages/hubs/JobPostingDetailPage.tsx.

FILE UNDER AUDIT
src/pages/NotificationsPage.tsx (customer-facing notifications feed, 867 lines).

THE HARD RULE (non-negotiable)
Changes must be className-only OR display-only-attribute additions. Preserve byte-identical: all supabase queries/RPC/mutations, react-query keys, routing/navigate targets, onClick handler bodies, filter/sort/count logic, pricing, conditionals. Display-only attributes that ARE allowed: aria-label, aria-pressed, aria-expanded, aria-haspopup, framer-motion whileTap/whileHover. NOTHING else. Do not refactor, rename, reorder, extract, or "improve" logic. If you spot a logic/content bug, FLAG it in a separate "Owner flags" section — do NOT fix it.

HOUSE TOKEN STANDARD (apply consistently)
- Ring token appended to EVERY interactive control: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (NO ring-offset anywhere).
- Ring-inset nuance: a control FLUSH against an overflow-hidden rounded parent must use focus-visible:ring-inset (else the corners clip). A control whose OWN element is the rounded one (parent NOT overflow-hidden) uses a normal outward ring.
- Press-scale tier convention: icon-only → active:scale-95; medium/contained chip → active:scale-[0.98]; large/full-width flush card → active:scale-[0.99]; small inline text-link → active:scale-[0.97] + rounded-sm.
- transition choice: transition-transform when press-scale is the ONLY animated property (makes the focus ring appear instantly); transition-all when there is ALSO a hover:bg-*/hover:border/underline that must animate alongside.
- aria discipline: aria-label ONLY on icon-only controls (no visible text). Controls with visible text get NO aria-label (it clobbers the accessible name). aria-pressed on filter/toggle tabs. aria-haspopup="dialog" only for a button that opens a modal/dialog.

EDIT-SHAPE RULE (critical — motion vs raw)
- RAW <button>/<a>/<Link> (NOT framer-motion): CSS active:scale WORKS → add the full token set (transition-* + active:scale-[tier] + ring + aria-label if icon-only).
- framer-motion motion.button with whileTap: CSS active:scale is DEAD (motion's inline transform overrides it) → add the focus RING ONLY (box-shadow ring is safe on motion), plus aria-label if icon-only and/or aria-pressed if a toggle. Do NOT add active:scale to a motion.button.
- shadcn <Button>/<Input>/<Badge>: ship built-in tokens → never touch (EXCEPT an icon-only shadcn Button still needs aria-label — but if it already has one, skip entirely).

MY CONTROL INVENTORY (verify each; correct me if I mislabeled motion-vs-raw, tier, inset, or aria)
1. FriendRequestCard ACCEPT — motion.button @L76, whileTap scale 0.85, onClick={onAccept}, icon-only <Check>, className "...hover:opacity-90 transition-opacity". → RING ONLY + aria-label. Proposed aria-label: "Accept friend request".
2. FriendRequestCard DECLINE — motion.button @L83, whileTap 0.85, onClick={onDecline}, icon-only <X>, "...hover:bg-destructive/10 hover:text-destructive transition-colors". → RING ONLY + aria-label "Decline friend request".
3. SocialNotifItem button — RAW <button> @L118, onClick, rich content (avatar+text), "w-full flex items-center gap-3 p-3 text-left touch-manipulation" (no transition/scale/ring). It is FLUSH inside GlassCard3D, which is `relative overflow-hidden rounded-2xl` (def @L40-45). → add transition-transform + active:scale-[0.99] + ring WITH ring-inset. NO aria-label (rich text).
4. Header BACK — RAW <button> @L487, onClick navigate(-1), icon-only ArrowLeft, ALREADY has aria-label="Go back", "...transition-colors hover:bg-muted". Parent header card @L484 is NOT overflow-hidden. → add active:scale-95 + ring (outward). Question: bump transition-colors → transition-all so the hover:bg AND the press-scale both animate? (Lean: yes.)
5. Header SETTINGS — shadcn <Button variant=ghost size=icon aria-label="Notification settings"> @L512. → SKIP.
6. Header MARK-ALL-READ — shadcn <Button variant=ghost size=sm> @L522 (visible text/icon). → SKIP.
7. Category TAB ×7 — motion.button @L548 (mapped over tabs), whileHover {scale 1.05,y -1} + whileTap 0.92, onClick setActiveTab, cn() base "...transition-colors touch-manipulation" + isActive branch. Inside GlassCard3D @L543 (overflow-hidden) but buttons sit in a `p-1.5` padded `overflow-x-auto` row and are NOT flush; the ACTIVE tab already renders an outward `ring-1 ring-primary/20` fine. → RING ONLY (motion) + aria-pressed={isActive}. Question: outward ring (my lean, matches existing active ring) or ring-inset given the overflow-x-auto scroll clip at the row's horizontal edges?
8. Quick-action MARK ALL — RAW <button> @L596, onClick handleMarkAllRead, has active:scale-[0.98], no transition/ring, icon+visible text. Parent grid @L594 not overflow-hidden. → add transition-transform + ring (outward). NO aria-label.
9. Quick-action CLEAR READ — RAW <button> @L605, same shape as 8. → transition-transform + ring.
10. Quick-action RULES — RAW <button> @L614, onClick navigate, active:scale-[0.98]. → transition-transform + ring.
11. Manage-notifications — RAW <button> @L844, onClick navigate, already has active:scale-[0.99] transition-transform, no ring. FLUSH (w-full p-4) inside GlassCard3D @L843 (overflow-hidden). → add ring WITH ring-inset only. NO aria-label (visible text).
PRESENTATIONAL (do nothing): GlassCard3D wrapper divs; SwipeableNotificationRow drag motion.divs (drag gesture, not a button — its inner NotificationItem is a separate component, OUT OF SCOPE); summary-stat motion.divs @L818 (whileHover only, no onClick); empty-state icon motion.divs.

OPEN QUESTIONS — answer each explicitly
Q1. Ring-inset for #3 (SocialNotifItem) and #11 (manage CTA): both buttons fully fill an overflow-hidden rounded-2xl GlassCard3D → ring-inset correct? Confirm.
Q2. Category tabs #7: outward ring vs ring-inset, given the overflow-x-auto scroll row? Which renders cleanly for the first/last tab at scroll extremes?
Q3. Header back #4: transition-colors → transition-all, yes/no?
Q4. aria-label wording for #1/#2 — "Accept friend request"/"Decline friend request" good, or do you prefer including the requester name (it's available as request.profile?.full_name)? Note: keep it static-safe; don't introduce a template literal that changes runtime behavior beyond the label string.
Q5. Responsive QA at 375px: the 7-tab `overflow-x-auto` row (each tab min-w-[4.9rem]) and the `grid grid-cols-3 gap-2` quick-action row — any wrap/overflow/tap-target concerns? Tap targets: the friend-request accept/decline are 36px (w-9 h-9), tabs ~36px tall — note sub-44px as a flag only (established repo pattern), do not resize.

OUTPUT FORMAT
A) Per-control verdict table: control #, my-label vs your-label (agree/correct), exact final className string to apply (or "ring only + aria"), and the exact attribute additions.
B) Answers to Q1–Q5.
C) Any motion-vs-raw or tier/inset corrections.
D) Owner flags (logic/content/a11y issues to NOT fix here).
Be precise and terse. Give exact strings I can paste.
- files: src/pages/NotificationsPage.tsx

---

The request was rejected because it was considered high risk
