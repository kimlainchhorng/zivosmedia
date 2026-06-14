# MiMo run — 2026-06-14T02:07:08.579Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

Two controls need tokens. Both already have `transition-all` + correct `active:scale` — **ring-only (+ aria-pressed on chips)**. Total diff: **+1 new line + 2 in-place className appends**.

---

## Proposed diff — `src/pages/CouponsPage.tsx`

### (1) Filter chips (~L122) — ADD `aria-pressed` + ring into cn() base

**Before:**
```tsx
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
                filter === f ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
```

**After:**
```tsx
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize",
                filter === f ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
```

**What changed:** +1 standalone line (`aria-pressed`); 1 className append (`active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` inserted after `transition-all`); `transition-all` kept as-is (DON'T-CHURN, already covers the new scale); `capitalize` position unchanged.

### (2) Copy button (~L196) — RING-ONLY append into cn() base

**Before:**
```tsx
                          "shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-95",
```

**After:**
```tsx
                          "shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

**What changed:** className append only (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`). `transition-all` + `active:scale-95` preserved (DON'T-CHURN). No new attrs.

---

## Answers to your questions

**(1) Filter chips** — **All correct as-is.** `aria-pressed` qualifies (selection-by-bg-only, label word "Active"/"Expiring soon"/"All" constant per chip — DraftsPage/AMAPage precedent). DON'T re-flip `transition-all` (already present, already covers the new `[0.97]` scale). OUTWARD ring (container `overflow-x-auto`, not `overflow-hidden`; box-shadow ignored for scrollable overflow per CSS spec). `[0.97]` segmented tier correct.

**(2) Copy button** — **All correct as-is.** RING-ONLY (transition-all + active:scale-95 already present and icon-tier correct → don't-churn). NO `aria-pressed` (one-shot action, not toggle; dynamic `aria-label` already present). `disabled` left as-is. OUTWARD ring (button sits with 14px `p-3.5` clearance inside the `overflow-hidden` card — the 2px ring stays within that margin, so no clipping, no `ring-inset` needed).

**(3) SKIPs + inventory** — **All correct.** Back `<Button>` (L92): ships tokens, labeled → SKIP. Filter `<Button>` (L101): ships tokens, labeled, but **no `onClick`** (dead stub) → correctly OUT OF SCOPE (handler = logic) → **owner-FLAG**. All coupon-row + hero `motion.div`s: entrance-only, no `onClick` → presentational → SKIP. Notch `aria-hidden` → decorative. Skeletons/empty states → non-interactive. **Inventory exhaustive:** exactly 2 raw `<button>` + 0 `motion.button` + 2 shadcn `<Button>`. No missed control.

**(4) Responsive** — **Clean at 375/768/1280.** Coupon card math: card = 343px inner (`px-4` at 375). `w-24` discount side (96px) + `p-3.5` content area (247px, 219px inner after padding) − Copy `h-9` + `gap-3` (48px) = **171px for text column** — code `text-xs font-mono truncate` + discount `text-sm font-bold` both fit. Filter chips: 3 pills ~178px total, well within 343px, `overflow-x-auto` as safety. **Sub-44px tap targets (flag-not-fix, established pattern):** chips `py-1.5` ~28px, Copy `h-9 w-9` 36px, back/Filter `h-10 w-10` 40px.

**(5) a11y** — Copy `disabled={exp.expired}`: ring won't fire on disabled (correct native behavior). Dynamic `aria-label={`Copy code ${c.code}`}`: good. Nothing else to flag.

---

## Owner action items

1. **FLAG: Filter `<Button>` (L101)** — dead stub with no `onClick`. Owner decides: wire to toggle a filter dropdown, or remove if decorative-only.
2. Run `npm run update` — must pass (0 type errors + worker type-check + production build).
