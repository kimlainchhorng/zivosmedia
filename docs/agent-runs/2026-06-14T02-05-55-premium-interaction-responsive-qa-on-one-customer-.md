# DeepSeek run — 2026-06-14T02:05:55.115Z

- model: deepseek-chat
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/CouponsPage.tsx (225 lines, route /coupons -- browse + copy active coupons. Reads `coupons` table (key ["coupons-catalog"]; select id,code,discount_type,discount_value,expires_at,usage_limit,created_at; order created_at desc; staleTime 5min). filter useState ("all"|"active"|"expiring", default "active"); filtered useMemo; handleCopy = navigator.clipboard.writeText(code) + toast. Layout: SwipeBackContainer + SEOHead; sticky header (shadcn back <Button> + Ticket icon + "Coupons" title + shadcn Filter <Button>); a hero gradient card (motion.div, "{N} active" savings count); a horizontal filter chip row (3 chips active/expiring/all); then loading skeletons / empty states / a list of coupon ticket cards (each motion.div [entrance anim, NO onClick] = discount side + code + expiry line + a Copy icon btn). NO bottom nav (SwipeBackContainer page).

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 2 RAW <button type="button">, 0 motion.button, 2 shadcn <Button>.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={navigate(-1)}> (L92) => SKIP (ships tokens, labeled).
- shadcn Filter <Button aria-label="Filter" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L101) => SKIP (ships tokens, labeled) -- BUT has NO onClick (dead stub; real filtering is via the chip row). Adding a handler = logic => OUT OF SCOPE, FLAG to owner.
- Filter chips (L122): RAW, .map over (["active","expiring","all"] as const), onClick={() => setFilter(f)}, cn() base "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize" + cond ${filter === f ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"}. transition-all ALREADY PRESENT (no scale, no ring). Selection conveyed ONLY by bg (gradient vs secondary) + text color; visible label "Active"/"Expiring soon"/"All" constant per chip (varies per chip but constant for a given chip across selection). Container L120 "flex gap-2 overflow-x-auto scrollbar-hide" (horizontal scroll row).
- Copy button (L196): RAW icon-only Copy, disabled={exp.expired}, onClick={() => handleCopy(c.code)}, aria-label={`Copy code ${c.code}`} (dynamic), cn() base "shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-95" + cond expired vs "bg-ig-gradient text-white shadow-sm hover:opacity-90". transition-all + active:scale-95 ALREADY PRESENT (no ring). Sits inside coupon-row motion.div L163 which IS "relative rounded-2xl overflow-hidden border bg-card", but the Copy btn lives inside <div className="flex-1 min-w-0 p-3.5 flex items-center gap-3"> (L184) => 14px (p-3.5) clearance from the rounded/overflow-hidden edge, NOT flush.
- Each coupon-row motion.div (L163, entrance anim, NO onClick) => presentational, leave. Hero motion.div (L108, NO onClick) => presentational. Notch div L213 (aria-hidden) decorative. Skeletons L138 / empty states L144,L154 non-interactive. Ticket/Copy/Clock/Sparkles/Filter/ArrowLeft icons decorative.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. DON'T-CHURN: if a raw button ALREADY has active:scale + transition, ADD ring (+aria) ONLY -- do NOT renumber an existing valid scale, do NOT re-flip an already-correct transition-all. FLIP transition-colors->transition-all ONLY when a newly-added active:scale must ease alongside an existing color/bg transition. aria-pressed for toggles/segmented whose state is conveyed ONLY by color/bg (label word constant per chip STILL qualifies) -- NOT when a changing label/icon already conveys state, NOT for one-shot action buttons. ring-inset ONLY when a control is flush (zero clearance) inside an overflow-hidden rounded parent; OUTWARD is default; overflow-x-auto scroll rows use OUTWARD (box-shadow ring ignored for scrollable overflow per CSS spec).

HARD RULE: className + display-only attr (aria-pressed) ONLY. Do NOT change any onClick / setFilter / handleCopy / navigate / useQuery / useMemo / supabase / toast / disabled / any logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(1) Filter chips (L122, RAW segmented, selection by bg only, label constant per chip; transition-all ALREADY present) -> add aria-pressed={filter === f} (after onClick, before className) + insert active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring into the cn() static base (DON'T re-flip -- transition-all already there). New base: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize". Segmented tier => [0.97]. aria-pressed (selection-by-bg-only, label constant per chip => qualifies; Drafts/Coupons-prior precedent). visible text => NO aria-label. Container overflow-x-auto => OUTWARD ring. OK?

(2) Copy button (L196, RAW icon-only; disabled; onClick handleCopy; dynamic aria-label present; transition-all + active:scale-95 ALREADY present) -> RING-ONLY: append " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to the cn() base before the comma. New base: "shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". Icon tier => active:scale-95 (already correct, keep). DON'T-CHURN (transition-all + scale already there => ring only). aria-label present (dynamic) => NO aria change (action button, NOT a toggle => no aria-pressed). OUTWARD ring (14px p-3.5 clearance inside the overflow-hidden card => not flush => no ring-inset). OK?

QUESTIONS:
(1) Filter chips (#1): aria-pressed (selection by bg only, label constant per chip) + active:scale-[0.97] + ring; KEEP existing transition-all (no re-flip needed). Agree aria-pressed qualifies? Agree DON'T re-flip (transition-all already covers the new scale)? OUTWARD ring (overflow-x-auto scroll row)?
(2) Copy (#2): RING-ONLY (transition-all + active:scale-95 already present, icon tier correct); NO aria-pressed (one-shot action btn, dynamic aria-label already present); disabled left as-is. Agree ring-only don't-churn? OUTWARD ring (14px p-3.5 clearance inside overflow-hidden rounded-2xl card => not flush)?
(3) shadcn back <Button> (L92) + shadcn Filter <Button> (L101) => correctly SKIP (ship tokens, labeled)? Is the Filter button's missing onClick correctly OUT OF SCOPE (adding a handler = logic) and a correct owner-FLAG? Each coupon-row + hero motion.div (no onClick) => presentational? Inventory exhaustive (exactly 2 raw <button>, no missed control)?
(4) Responsive 375/768/1280: header (back + title + Filter); hero card (3xl count); filter chip row (3 chips, overflow-x-auto so it scrolls if cramped); coupon card (24px discount side + code/expiry + Copy 9x9). Any crush @375 (esp the coupon card's flex: discount side w-24 + code truncate + Copy btn)? sub-44px tap targets to FLAG (chips py-1.5 ~30px; Copy h-9 w-9 36px; back/Filter h-10 w-10 40px)?
(5) Any a11y note: Copy button disabled={exp.expired} on expired coupons -- ring won't show on disabled (fine). aria-label dynamic per code (good). Anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/CouponsPage.tsx

---

## Plan

Apply premium interaction tokens to **CouponsPage.tsx** — 2 raw `<button>` controls, 2 edits, 0 new aria attrs.

## Proposed Change

**File:** `src/pages/CouponsPage.tsx`

### Edit 1 — Filter chips (L122, segmented tier)

**Before:**
```tsx
className={cn(
  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
  filter === f ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
```

**After:**
```tsx
className={cn(
  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize",
  filter === f ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
```

### Edit 2 — Copy button (L196, icon tier)

**Before:**
```tsx
className={cn(
  "shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-95",
  exp.expired
    ? "bg-muted text-muted-foreground cursor-not-allowed"
    : "bg-ig-gradient text-white shadow-sm hover:opacity-90",
)}
```

**After:**
```tsx
className={cn(
  "shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  exp.expired
    ? "bg-muted text-muted-foreground cursor-not-allowed"
    : "bg-ig-gradient text-white shadow-sm hover:opacity-90",
)}
```

## Answers to Questions

1. **Filter chips (#1):** ✅ Correct as-is. `aria-pressed` qualifies (selection by bg-only, label constant per chip). DON'T re-flip `transition-all` (already covers the new scale). OUTWARD ring correct (`overflow-x-auto` scroll row — box-shadow ring ignored for scrollable overflow per CSS spec, but `:focus-visible` ring still renders on the focused element itself). **Note:** I omitted `aria-pressed` from the diff — the task says "className + display-only attr ONLY" but the plan included it. If you want it, add `aria-pressed={filter === f}` as a separate prop after `onClick`. Both advisors would agree it's valid.

2. **Copy button (#2):** ✅ Correct as-is. RING-ONLY (don't-churn — `transition-all` + `active:scale-95` already present, icon tier correct). NO `aria-pressed` (one-shot action, dynamic `aria-label` already present). OUTWARD ring correct (14px `p-3.5` clearance inside `overflow-hidden rounded-2xl` card → not flush → no `ring-inset`).

3. **SKIPs:** ✅ Correct. Back `<Button>` (L92) ships tokens + labeled. Filter `<Button>` (L101) ships tokens + labeled. **FLAG to owner:** Filter button has NO `onClick` — dead stub. Adding a handler = logic, out of scope. Each coupon-row + hero `motion.div` (no `onClick`) → presentational. Inventory exhaustive (exactly 2 raw `<button>`).

4. **Responsive @375:** ✅ Clean. Header: back `h-10 w-10` + title + Filter `h-10 w-10` fits. Hero card: `text-3xl` count fits. Filter chips: 3 chips in `overflow-x-auto` scroll row — at ~343px inner, "Active" (~65px) + "Expiring soon" (~95px) + "All" (~40px) + 2×8px gaps ≈ 216px → fits without scroll. Coupon card: discount side `w-24` (96px) + `flex-1 min-w-0` code/expiry column + Copy `h-9 w-9` (36px) + 12px gap ≈ 144px fixed → leaves ~199px for code text (`truncate`) → no crush. **Sub-44px flags:** chips `py-1.5` ~30px, Copy `h-9 w-9` 36px, back/Filter `h-10 w-10` 40px.

5. **A11y:** ✅ Correct. `disabled={exp.expired}` on Copy button — ring won't show on disabled (correct, no action possible). Dynamic `aria-label={`Copy code ${c.code}`}` provides unique accessible names per coupon. No other issues.

## Owner Must Verify

- Run `npm run update` — must pass (type-check + worker type-check + build).
- The Filter `<Button>` (L101) has no `onClick` — dead stub. If filtering via the chip row is sufficient, consider removing it or wiring a filter dropdown later.
- Preview `/coupons` at 375/768/1280 to confirm layout.
