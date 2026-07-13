# MiMo run — 2026-06-14T02:33:54.308Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/CreatorPayoutsPage.tsx (176 lines, "Payout history for creators", READ-ONLY view backed by creator_payouts). Reads payouts (key ["creator-payouts-me", user?.id]; select id,creator_id,amount_cents,fee_cents,net_cents,method,reference_id,status,period_start,period_end,paid_at,created_at; eq creator_id; order created_at desc). stats/filtered useMemo derivations; tab useState ("all"|"paid"|"pending"). statusMeta/formatDate pure helpers. Layout: SwipeBackContainer + SEOHead(noIndex); sticky header (shadcn back <Button> + Banknote badge + "Creator Payouts" title); gradient hero summary (motion.div, Paid-out/Pending stat columns, NO onClick); a 3-tab segmented row (All/Paid/Pending); loading skeletons + empty-state card; a vertical list of payout ROWS (each a presentational motion.div — status icon + amount + status badge + period/method/paid-date/fee meta, NO onClick). NO bottom nav (SwipeBackContainer page). IMPORTANT: this is a read-only history page — there are NO "request payout"/"withdraw"/financial-action buttons (no mutation at all; only the useQuery read).

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 3 RAW <button type="button"> (the tab triplet, one control) + 1 shadcn <Button> (back); 0 motion.button; the payout ROWS are motion.DIV (presentational, NO onClick).
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={navigate(-1)}> (L96) => SKIP (ships tokens, labeled).
- (A) Tab triplet (L127/L128/L129, THREE explicit RAW <button type="button"> — NOT a .map): onClick={() => setTab("all"|"paid"|"pending")}, each cn() base "flex-1 h-10 rounded-xl text-xs font-bold transition-all" + conditional tab===X ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"; label = constant WORD ("All"/"Paid"/"Pending") + a varying count badge "(N)". HAS transition-all; NO active:scale; NO ring; NO aria-pressed. Sits in a flex gap-2 row (L126), NOT overflow-hidden. === segmented flex-1 tab pattern (GiftHistoryPage/AMAPage/CollabsPage/EmojiPacksPage precedent).
- Hero summary motion.div (L109, entrance anim, NO onClick) => presentational. Payout-row motion.div (L148, entrance anim, NO onClick) => presentational (status icon tile + amount + status badge span + meta — all display children). Loading-skeleton divs (L132) + empty-state card div (L135) non-interactive. Banknote/Sparkles/Clock/DollarSign/CheckCircle2/Loader2/XCircle/AlertCircle icons decorative.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. DON'T-CHURN: if a raw button ALREADY has transition, ADD ring (+aria) ONLY — do NOT re-flip an existing valid transition. aria-pressed for toggles/segmented whose state is conveyed ONLY by color/bg (a constant label WORD per button STILL qualifies; a varying count badge does NOT disqualify) — NOT for one-shot nav/action. ring-inset ONLY when flush (zero clearance) inside an overflow-hidden rounded PARENT; OUTWARD is default.

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / setTab / navigate / useQuery / supabase from/select/eq/order / useMemo (stats/filtered) / useState (tab) / statusMeta / formatDate / the conditional render guards / any logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(A) Tab triplet (L127-129; THREE RAW buttons; HAS transition-all, NO scale/ring/aria-pressed): for EACH of the 3 buttons ADD aria-pressed={tab === "all"|"paid"|"pending"} (after its onClick) + APPEND active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to the cn() BASE string; KEEP transition-all (don't re-flip — it eases the inactive hover:bg-muted color alongside the new scale). before base (×3, identical): "flex-1 h-10 rounded-xl text-xs font-bold transition-all" -> after base (×3): "flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". segmented flex-1 tier => [0.97]. aria-pressed VALID (selection conveyed ONLY by bg: active = gradient+white, inactive = secondary; the label WORD is constant per tab — the varying "(N)" count does NOT disqualify). visible text => NO aria-label. OUTWARD ring (flex gap-2 row, not overflow-hidden). OK?

QUESTIONS:
(1) Tab triplet (A): aria-pressed + [0.97] + ring on all 3, KEEP transition-all (append-not-flip), OUTWARD ring — same as GiftHistoryPage tabs. AGREE? Confirm aria-pressed is valid here despite the varying "(N)" count badge (the documented rule says a constant label WORD qualifies and a varying count does NOT disqualify — confirm).
(2) Inventory exhaustive (exactly 3 RAW buttons + 1 shadcn Button, 0 motion.button)? back <Button> L96 correctly SKIP? Hero summary motion.div L109 + payout-row motion.div L148 (both NO onClick) correctly presentational/leave? Note the payout ROWS are motion.DIV not motion.button — confirm they are display-only and should NOT become interactive (no onClick to add — that's logic/out of scope).
(3) Responsive 375/768/1280: header (back + Banknote + title); hero (grid-cols-2 Paid-out/Pending stat columns, text-2xl $ amounts); 3-tab segmented row (flex gap-2, 3× flex-1 h-10 each holding WORD + "(N)"); payout row (status-icon tile h-10 w-10 + flex-1 min-w-0 amount/badge/period/method/paid/fee meta — all flex-wrap). Any crush @375 (esp the hero's 2 stat columns with text-2xl $ amounts, or the tab labels "Pending (12)" in a ~109px flex-1 pill, or the row's wrapping meta)? sub-44px tap targets to FLAG (tabs h-10 40px; back h-10 w-10 40px)?
(4) Any a11y note: tabs get aria-pressed; back labeled; rows are non-interactive motion.div (correct — no fake button affordance); no financial-action control on this page (read-only). Anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/CreatorPayoutsPage.tsx

---

**All four items confirmed correct.** Here's the validation, plan, and diff.

---

## (1) Tab triplet — ✅ AGREE

`aria-pressed` is valid: the label WORD per tab is constant ("All" / "Paid" / "Pending"), the varying "(N)" count badge does NOT disqualify — identical to GiftHistoryPage tabs (constant WORD + varying count badge, same precedent). `[0.97]` = segmented flex-1 tier. KEEP `transition-all` (append-only, it eases `hover:bg-muted` color alongside the new scale). OUTWARD ring (`flex gap-2` row, not `overflow-hidden`). All confirmed.

## (2) Inventory — ✅ Exhaustive

3 RAW `<button>` + 1 shadcn `<Button>` (back) = all controls. Back L96 correctly SKIP. Hero `motion.div` L109 + payout-row `motion.div` L148 are presentational (NO `onClick`) — correctly left alone. Payout rows as `motion.div` (not `motion.button`) is correct for a read-only page — no fake button affordance.

## (3) Responsive — ✅ Clean at 375/768/1280

- **Header:** back 40px + gap-3 + Banknote 28px + "Creator Payouts" title → fits easily.
- **Hero:** `p-5` inside `max-w-2xl mx-auto px-4` (~343px inner). `grid-cols-2 gap-3` → each column ~165px. `text-2xl` "$1,234.56" (~112px) → fits comfortably.
- **Tabs:** 3 × `flex-1 h-10` = ~109px each. "Pending (12)" at `text-xs` ≈ ~85px → fits. Even "Pending (123)" is fine.
- **Payout row:** icon 40px + gap 12px + `flex-1 min-w-0` (~279px). Amount + badge inline, period/method and paid/fee meta with `flex-wrap` → wrap gracefully.
- **Sub-44px flag (established repo pattern, not per-page fix):** tabs `h-10` ~40px, back `h-10 w-10` ~40px.

## (4) A11y — ✅ Clean

Tabs get `aria-pressed`; back labeled; rows are non-interactive `motion.div` (correct, no fake button affordance); no mutation controls; nothing else to flag.

---

## Proposed Diff

**File:** `src/pages/CreatorPayoutsPage.tsx`
**Diff:** 3 ins / 3 del (+0 net). All className + display-only-attr. Logic-guard CLEAN.

```diff
--- a/src/pages/CreatorPayoutsPage.tsx
+++ b/src/pages/CreatorPayoutsPage.tsx
@@ -124,9 +124,9 @@
 
         <div className="flex gap-2">
-          <button type="button" onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({payouts.length})</button>
-          <button type="button" onClick={() => setTab("paid")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "paid" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Paid ({stats.paidCount})</button>
-          <button type="button" onClick={() => setTab("pending")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "pending" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Pending ({stats.pendingCount})</button>
+          <button type="button" onClick={() => setTab("all")} aria-pressed={tab === "all"} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({payouts.length})</button>
+          <button type="button" onClick={() => setTab("paid")} aria-pressed={tab === "paid"} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "paid" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Paid ({stats.paidCount})</button>
+          <button type="button" onClick={() => setTab("pending")} aria-pressed={tab === "pending"} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "pending" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Pending ({stats.pendingCount})</button>
         </div>
```

**Per button:** add `aria-pressed={tab === "X"}` after its `onClick` + append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the `cn()` base string. KEEP `transition-all`. No other changes.

**Owner must:** run `npm run update` (must pass = 0 type errors + production build). No deploy command — owner commits.
