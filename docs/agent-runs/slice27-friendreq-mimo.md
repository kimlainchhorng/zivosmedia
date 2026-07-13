# MiMo run — 2026-06-14T01:26:48.847Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/FriendRequestsPage.tsx (249 lines, route /friend-requests -- manage incoming + outgoing friend requests, backed by `friendships` (status="pending"), key ["friend-requests", user?.id]; accept => UPDATE status="accepted", decline/cancel => DELETE; optimistic qc.setQueryData + invalidate on error). Layout: sticky header (shadcn back <Button> + UserPlus badge + "Friend Requests" title); a gradient hero stat card (incoming/outgoing counts, motion.div, NO onClick); loading skeletons; empty state; an "Incoming (N)" section of rows (each motion.div [NO onClick] with avatar + name + relative-time + Accept icon btn + Decline icon btn); a "Sent (N)" section of rows (each motion.div [NO onClick] with avatar + name + "Waiting" + Cancel text btn).

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 3 raw <button type="button">, 0 motion.button. shadcn back <Button aria-label="Back" variant="ghost" size="icon"> (L133) => SKIP (ships tokens). All 3 raw buttons ALREADY have `active:scale-95 transition-all` + an `aria-label` => this is a DON'T-CHURN ring-only slice (add ring ONLY, ZERO new attributes). The hero motion.div (L146) + each incoming row motion.div (L181) + each outgoing row motion.div (L221) have entrance initial/animate but NO onClick => presentational, leave alone. <img> avatars (alt="") decorative. Loading skeletons non-interactive.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. DON'T-CHURN: if a raw <button> ALREADY has active:scale + a transition, ADD ring (+aria) ONLY -- don't change existing scale/transition. ring-inset ONLY when a control is flush inside an overflow-hidden rounded parent.

HARD RULE: className + display-only attr ONLY. Do NOT change any onClick / accept / decline / navigate / qc.setQueryData / invalidateQueries / supabase / useQuery / useMemo / state / any logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(1) Accept button (L197, icon-only Check; onClick={() => accept(r.id)}; ALREADY aria-label="Accept"; className="h-9 w-9 rounded-full bg-ig-gradient text-white inline-flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm") -> APPEND " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" ONLY. DON'T-CHURN: keep active:scale-95 (icon tier, already correct) + transition-all (eases hover:opacity-90). aria already present => NO aria change. Ring: button is h-9 w-9 rounded-full inside the row motion.div "flex items-center gap-3 p-3 rounded-2xl bg-card border" (NOT overflow-hidden) => NORMAL OUTWARD ring, rounded-full gives ring shape, gap-3+p-3 clearance. OK?

(2) Decline button (L200, icon-only X; onClick={() => decline(r.id)}; ALREADY aria-label="Decline"; className="h-9 w-9 rounded-full bg-secondary text-foreground hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center justify-center active:scale-95 transition-all") -> APPEND ring ONLY. DON'T-CHURN: keep active:scale-95 + transition-all (eases hover:bg-rose-500/15 + hover:text-rose-600). aria present => no change. Same row => NORMAL OUTWARD ring. OK?

(3) Cancel button (L237, text "Cancel"; onClick={() => decline(r.id)}; ALREADY aria-label="Cancel" AND visible text "Cancel" [redundant but matching -- leave aria as-is, removing = churn]; className="h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold active:scale-95 transition-all") -> APPEND ring ONLY. DON'T-CHURN: keep active:scale-95 (do NOT renumber to chip [0.97] -- it already has a valid scale, the InterestsPage Remove-X "kept active:scale-90, no renumber" precedent) + transition-all (eases hover:bg-muted). visible text = accessible name (aria-label matches) => no aria change. In the outgoing row motion.div (same structure, NOT overflow-hidden) => NORMAL OUTWARD ring (rounded-full present). OK?

QUESTIONS:
(1) All 3 are DON'T-CHURN ring-only appends (each already has active:scale-95 + transition-all + aria-label) => git diff should be 3 ins / 3 del, +0 net, ZERO new attributes. Agree all 3 are ring-only (no scale renumber, no transition flip, no aria change)?
(2) Cancel (#3): keep active:scale-95 (don't renumber to [0.97] despite being a small text pill) -- the don't-churn rule says leave a valid existing scale. Agree? Or do you think a small text pill warrants flipping to [0.97]? (I lean keep -- don't-churn.)
(3) Normal OUTWARD ring for all 3 (rows are motion.div "rounded-2xl bg-card border", NOT overflow-hidden; buttons rounded-full with gap-3/p-3 clearance) -- agree, no ring-inset?
(4) Responsive 375/768/1280: header (back h-10 w-10 + badge + title); hero card p-5; incoming row "flex items-center gap-3 p-3" (avatar h-10 w-10 + name flex-1 min-w-0 line-clamp-1 + Accept h-9 w-9 + Decline h-9 w-9 -- that's 2 icon buttons ~72px + avatar 40px + gaps); outgoing row (avatar + name + Cancel h-8 px-3 pill). Any crush @375 esp the incoming row with avatar + name + TWO 36px action buttons?
(5) Inventory exhaustive (exactly 3 raw <button>, no missed control, no multi-line button hiding from grep)? shadcn back <Button> => correctly SKIP? hero + row motion.divs (no onClick) => correctly leave presentational? sub-44px tap targets to FLAG (Accept/Decline h-9 w-9 ~36px; Cancel h-8 ~32px; back h-10 w-10 40px)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/FriendRequestsPage.tsx

---

**All 5 items confirmed correct. No corrections.** Here's the validated plan + ready diff.

---

## Plan (ring-only, don't-churn)

Append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to 3 raw `<button>` className strings. Zero new attributes. Zero logic changes.

| # | Control | Line | Existing scale/transition | Ring | Notes |
|---|---------|------|--------------------------|------|-------|
| 1 | Accept (icon Check) | 197 | `active:scale-95 transition-all` ✅ keep | outward | `rounded-full` ring shape, row NOT `overflow-hidden`, `gap-3`+`p-3` clearance |
| 2 | Decline (icon X) | 200 | `active:scale-95 transition-all` ✅ keep | outward | same row |
| 3 | Cancel (text) | 237 | `active:scale-95 transition-all` ✅ keep | outward | don't renumber to `[0.97]` (InterestsPage Remove-X `kept scale-90` precedent) |

**Skip:** shadcn back `<Button>` (ships tokens); hero `motion.div` + row `motion.div`s (no `onClick`, presentational); skeletons; empty state.

---

## Diff

```diff
--- a/src/pages/FriendRequestsPage.tsx
+++ b/src/pages/FriendRequestsPage.tsx
@@ -197,1 +197,1 @@
-                    <button type="button" aria-label="Accept" onClick={() => accept(r.id)} className="h-9 w-9 rounded-full bg-ig-gradient text-white inline-flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm">
+                    <button type="button" aria-label="Accept" onClick={() => accept(r.id)} className="h-9 w-9 rounded-full bg-ig-gradient text-white inline-flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
@@ -200,1 +200,1 @@
-                    <button type="button" aria-label="Decline" onClick={() => decline(r.id)} className="h-9 w-9 rounded-full bg-secondary text-foreground hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center justify-center active:scale-95 transition-all">
+                    <button type="button" aria-label="Decline" onClick={() => decline(r.id)} className="h-9 w-9 rounded-full bg-secondary text-foreground hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center justify-center active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
@@ -237,1 +237,1 @@
-                    <button type="button" aria-label="Cancel" onClick={() => decline(r.id)} className="h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold active:scale-95 transition-all">
+                    <button type="button" aria-label="Cancel" onClick={() => decline(r.id)} className="h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Expected `git diff`: 3 ins / 3 del, +0 net, ZERO new attributes.** Every `onClick`/`aria-label` byte-identical on both sides.

---

## Answers to your questions

1. **All 3 ring-only — agree.** No scale renumber, no transition flip, no aria change. `git diff` = 3 ins / 3 del.

2. **Cancel keep `active:scale-95` — agree, don't-churn.** A valid existing scale is left alone (InterestsPage `kept scale-90` precedent). The `[0.97]` tier is the *default* for new small-text pills; an existing scale doesn't get renumbered.

3. **Normal outward ring for all 3 — agree.** Parent rows are `rounded-2xl bg-card border border-border` (NOT `overflow-hidden`); buttons are `rounded-full` giving the ring its shape; `gap-3` + `p-3` provide ample clearance.

4. **Responsive 375 — no crush.** Incoming row: 40 (avatar) + 12 (gap) + 36 (Accept) + 12 (gap) + 36 (Decline) + 24 (p-3 padding) = 160px fixed → **183px** for `flex-1 min-w-0 line-clamp-1` name. Outgoing: 40 + 12 + ~56 (Cancel `h-8 px-3`) + 24 = 132px → **211px** for name. Both comfortable.

5. **Inventory exhaustive — agree.** Exactly 3 raw `<button type="button">` (Accept L197, Decline L200, Cancel L237). No multi-line buttons, no `motion.button`. Shadcn back SKIP correct. Presentational `motion.div`s correctly untouched. **Owner flag (established pattern):** sub-44px tap targets — Accept/Decline `h-9 w-9` ~36px, Cancel `h-8` ~32px, back `h-10 w-10` ~40px.

---

## Owner verify

1. Apply the 3-line diff above to `src/pages/FriendRequestsPage.tsx`.
2. Run `npm run update` — must exit 0 (types + worker types + build).
3. Preview at `/friend-requests` (auth-gated; needs logged-in user with pending rows): Tab to Accept → ring visible; Tab to Decline → ring visible; Tab to Cancel (in Sent section) → ring visible. All rings outward, rounded, no clipping.
