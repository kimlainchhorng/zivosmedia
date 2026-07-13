# DeepSeek run — 2026-06-13T21:48:09.613Z

- model: deepseek-chat
- task: Premium interaction and responsive QA pass on the public cafe ordering storefront at src/pages/cafe/PublicCafeOrderPage.tsx (route /cafe/:slug). Reference standard for interaction tokens: src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: className and display-only changes ONLY. Do NOT change any supabase query or RPC call (cafe_place_public_order, cafe_is_open_now, cafe_popular_items, cafe_public_review_summary, cafe_public_loyalty_balance, etc.), any mutation, state logic, routing, or pricing math. Identify genuine gaps only: (1) interactive controls missing active:scale press feedback or focus-visible rings — note the Pickup-time ASAP and Schedule buttons around line 1396-1413 use transition-colors only, unlike the tip preset buttons just above them which have active:scale-[0.97] plus a focus-visible ring; (2) responsive crush or overflow at 375px width; (3) any fetched-but-unused data fields; (4) contrast or legibility bugs; (5) accessibility gaps. For each finding give the exact line and exact before/after className. Keep it concise: this page is already heavily polished, so flag only real gaps, not a speculative redesign.
- files: src/pages/cafe/PublicCafeOrderPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# Plan

After reviewing `PublicCafeOrderPage.tsx` against the `JobPostingDetailPage.tsx` reference, I found **3 genuine gaps** — all are className-only, display-only changes that respect the hard rule:

1. **Pickup-time buttons (ASAP / Schedule) around line 1396-1413** — these use `transition-colors` only, missing `active:scale-[0.97]` press feedback and `focus-visible:ring-2 focus-visible:ring-ring` keyboard focus rings. The tip preset buttons just above them already have these tokens.

2. **Schedule datetime-local input** — no focus-visible ring on the `<input type="datetime-local">` that appears when "Schedule" is selected.

3. **Responsive crush at 375px** — the "Reserve a table" / "About" links in the header area use `flex-col items-end` which is fine, but the `gap-0.5` is too tight for touch targets. Minor.

No fetched-but-unused data fields found. No contrast bugs. No accessibility gaps beyond the missing focus rings.

---

# Proposed Diff

**File:** `src/pages/cafe/PublicCafeOrderPage.tsx`

## Change 1: Pickup-time buttons — add press feedback + focus rings

**Before (around line 1396-1413):**
```tsx
<button
  type="button"
  onClick={() => setScheduleMode("asap")}
  className={cn(
    "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
    scheduleMode === "asap"
      ? "border-primary bg-primary/10 font-semibold"
      : "border-border bg-card hover:bg-muted"
  )}
>
  ASAP
</button>
<button
  type="button"
  onClick={() => setScheduleMode("later")}
  className={cn(
    "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
    scheduleMode === "later"
      ? "border-primary bg-primary/10 font-semibold"
      : "border-border bg-card hover:bg-muted"
  )}
>
  Schedule
</button>
```

**After:**
```tsx
<button
  type="button"
  onClick={() => setScheduleMode("asap")}
  className={cn(
    "flex-1 rounded-lg border px-3 py-2 text-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    scheduleMode === "asap"
      ? "border-primary bg-primary/10 font-semibold"
      : "border-border bg-card hover:bg-muted"
  )}
>
  ASAP
</button>
<button
  type="button"
  onClick={() => setScheduleMode("later")}
  className={cn(
    "flex-1 rounded-lg border px-3 py-2 text-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    scheduleMode === "later"
      ? "border-primary bg-primary/10 font-semibold"
      : "border-border bg-card hover:bg-muted"
  )}
>
  Schedule
</button>
```

## Change 2: Schedule datetime-local input — add focus-visible ring

**Before (around line 1420-1430):**
```tsx
<input
  type="datetime-local"
  value={scheduledFor}
  onChange={(e) => setScheduledFor(e.target.value)}
  min={schedulePickerMin}
  max={schedulePickerMax}
  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
/>
```

**After:**
```tsx
<input
  type="datetime-local"
  value={scheduledFor}
  onChange={(e) => setScheduledFor(e.target.value)}
  min={schedulePickerMin}
  max={schedulePickerMax}
  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
/>
```

## Change 3: Header links — slightly larger gap for touch targets

**Before (around line 580-590):**
```tsx
<div className="pb-2 flex flex-col items-end gap-0.5 shrink-0 text-[11px]">
```

**After:**
```tsx
<div className="pb-2 flex flex-col items-end gap-1 shrink-0 text-[11px]">
```

---

# Verification & Deploy

1. **Run `npm run update`** — must pass (type-check + worker type-check + build).
2. **Preview at 375px width** on `/cafe/:slug` — verify:
   - ASAP/Schedule buttons have press feedback (momentary scale-down on click)
   - Tab to the buttons → visible focus ring appears
   - Tab to the datetime input → visible focus ring appears
   - Header "Reserve a table" / "About" links have comfortable touch spacing
3. **No behavior changes** — all supabase queries, mutations, state logic, routing, pricing math are untouched.
