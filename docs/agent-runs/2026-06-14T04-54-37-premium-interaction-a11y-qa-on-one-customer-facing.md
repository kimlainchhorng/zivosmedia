# DeepSeek run — 2026-06-14T04:54:37.679Z

- model: deepseek-chat
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/OrderDisputesPage.tsx (214 lines, "Disputes you've opened on food orders", REAL Supabase order_disputes table — NOT mock; AUTH-GATED via useAuth; RLS customer+merchant+admin). Backed by one useQuery ["order-disputes-me", user?.id] from order_disputes (.select/.eq("created_by", user.id)/.order("created_at" desc), enabled !!user?.id). tab useState<Tab> ("all"|"open"|"resolved"). stats useMemo (total/open/refunded). filtered useMemo (by tab). tabs array [{id,label,count}]. STATUS_META const map. formatRelative util. Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + Gavel badge + "Order Disputes" title); gradient hero stat motion.div ({stats.total} disputes / open / refunded, NO onClick); a segmented filter tab row (3 RAW buttons in tabs.map); loading skeletons; empty-state card; then a list of dispute cards (each presentational motion.div [entrance anim, NO onClick] containing: a status-icon tile + a flex-1 column [reason + status badge span + optional Urgent badge + relative-time + optional description line-clamp-2] + optional right-aligned refund amount; plus an optional resolution-notes block). NO bottom nav.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 1 RAW <button type="button"> kind (the tab button, rendered 3x in tabs.map) + 1 shadcn back <Button>. 0 motion.button.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={navigate(-1)}> (L105) => SKIP (ships tokens, labeled).
- (A) Filter tab button (L132, RAW in tabs.map, key={t.id}): onClick={() => setTab(t.id)}, children = a label <span>{t.label}</span> [constant WORD per tab: All/Open/Resolved] + a count <span>{t.count}</span> badge [varying number], cn() base "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5" + active/inactive conditional bg [active: "bg-ig-gradient text-white shadow-sm" / inactive: "bg-secondary text-foreground hover:bg-muted"]. HAS transition-all, NO scale, NO ring, NO aria-pressed. Sits in a flex gap-2 row (3 equal flex-1 tabs) on the neutral page bg, NOT overflow-hidden.

TOKEN TIERS (this repo): wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when the control ALSO has hover:bg/text/opacity OR underline; transition-transform for PURE press-scale with NO hover. DON'T-CHURN: if a raw button ALREADY has active:scale + a transition, ADD ring (+aria) ONLY. When transition-all is ALREADY present and we add a scale, APPEND (don't flip). aria-pressed for persistent toggle/segmented/filter state conveyed by bg/color (constant label WORD per button STILL qualifies; a varying count badge does NOT disqualify) — NOT for one-shot nav/action. ring-inset ONLY when flush inside an overflow-hidden rounded PARENT; OUTWARD default.

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / setTab / navigate / useQuery / useMemo / useAuth / STATUS_META / tabs array / any logic. Do NOT add onClick to a no-op control (FLAG it).

MY PLAN -- validate or correct:

(A) Filter tab button (L132; RAW in tabs.map; HAS transition-all; selection conveyed by bg [active gradient vs inactive secondary+hover:bg-muted]; constant label WORD + varying count badge): ADD aria-pressed={tab === t.id} (after onClick) + APPEND to the cn() base "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (SEGMENTED tier [0.97]; APPEND-not-flip — transition-all already present, eases the inactive hover:bg-muted color alongside the new scale; aria-pressed VALID — toggle/filter tabs, selection by bg, constant WORD per tab, varying count badge doesn't disqualify; visible text → NO aria-label; OUTWARD ring — tabs on neutral page bg, flex gap-2 row, NOT overflow-hidden). before base: "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5" -> after base: "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) Filter tabs (A): aria-pressed (NOT role="tab"/aria-selected — these are toggle-filter buttons, the established repo pattern uses aria-pressed like BrandDeals/AffiliateLinks chips)? APPEND active:scale-[0.97] segmented tier + ring + append-not-flip (transition-all already present)? OUTWARD ring? AGREE or advise.
(2) Confirm the varying count badge ({t.count}) does NOT disqualify aria-pressed (the label WORD All/Open/Resolved is constant per tab; selection is conveyed by bg).
(3) Inventory exhaustive (1 RAW tab button [x3] + 1 shadcn back)? hero stat motion.div L118 + dispute-card motion.div L167 correctly presentational (NO onClick)? loading skeletons L147 + empty-state L149 + the status/urgent badge spans + resolution-notes block non-interactive?
(4) Responsive 375/768/1280: header; hero stat; 3-tab segmented row (each flex-1 h-10 with label + count badge); dispute card (status tile 40px + flex-1 [reason + badges flex-wrap + time + desc] + right refund amount). Any crush @375 (3 equal tabs ~110px each; the dispute card flex row with a right-aligned refund column)? sub-44px tap targets to FLAG (back h-10 40px; tabs h-10 40px)?
(5) Owner flags (logic/out of scope, FLAG not fix): the dispute card has no tap-through to an order/dispute-detail view (fully presentational — no way to view full dispute thread or reply); the supabase cast type-workaround; anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/OrderDisputesPage.tsx

---

## Plan

Single edit to `src/pages/OrderDisputesPage.tsx`: add `aria-pressed` + scale + ring to the 3 filter tab buttons. Everything else is already correct.

## Proposed change

**File:** `src/pages/OrderDisputesPage.tsx`, line 132

**Before:**
```tsx
className={cn(
  "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5",
  tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
```

**After:**
```tsx
aria-pressed={tab === t.id}
className={cn(
  "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
```

## Validation per your questions

**(1) Filter tabs (A):** AGREE. `aria-pressed` is correct — these are toggle-filter buttons (persistent selection state conveyed by bg), matching the established repo pattern (BrandDeals/AffiliateLinks chips). `active:scale-[0.97]` is the correct segmented tier. Append-not-flip is correct since `transition-all` already exists. Outward ring is correct — the flex gap-2 row is NOT overflow-hidden.

**(2) Varying count badge:** AGREE — does NOT disqualify `aria-pressed`. The label WORD (All/Open/Resolved) is constant per button; the count is supplementary. Selection is conveyed by bg gradient vs secondary, which `aria-pressed` communicates to SR.

**(3) Inventory exhaustive:** CONFIRMED — exactly 1 RAW button kind (tab button ×3) + 1 shadcn back `<Button>`. Hero stat `motion.div` (L118) has NO onClick → presentational. Dispute card `motion.div` (L167) has NO onClick → presentational. Loading skeletons (L147), empty-state card (L149), status/urgent badge spans, resolution-notes block — all non-interactive. Correct.

**(4) Responsive @375/768/1280:** Clean. 3 equal `flex-1` tabs at ~110px each within `max-w-2xl mx-auto px-4` — label + count badge fits. Dispute card: status tile `h-10 w-10` (40px) + flex-1 column (reason + badges `flex-wrap` + time + desc `line-clamp-2`) + optional right refund column — fits at 375. **Flag:** back button `h-10 w-10` (40px) and tabs `h-10` (40px) are sub-44px tap targets — repo-wide compact pattern, not introduced here.

**(5) Owner flags:** (a) Dispute cards are fully presentational — no tap-through to a dispute detail/reply view (existing behavior, not in scope). (b) `supabase as unknown as {…}` hand-rolled cast for `order_disputes` (clean up when types regenerate). (c) The `formatRelative` shows "today" for <24h, "Xd ago" for <7d, then date — no edge-case issues.

## What the owner must verify

1. Run `npm run update` — must pass (type-check + worker + build).
2. Preview at `/order-disputes` (auth-gated; sign in first) — verify the 3 tab buttons have keyboard focus rings and press scale.
3. Commit and deploy.
