# DeepSeek run — 2026-06-14T02:03:52.691Z

- model: deepseek-chat
- task: SLICE 30 — PollHistoryPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for the ONE interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props (do NOT add/remove whileTap). If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it for the owner.

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for pure icon-scale with no hover color. If transition-all already present, just append (DON'T-CHURN). If a raw control has transition-colors AND a hover color AND we are adding active:scale, FLIP transition-colors -> transition-all.
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens.
- ring-inset KEY CSS FACT: overflow-hidden clips an element's DESCENDANTS, NOT its OWN box-shadow/ring. ring-inset is only needed when the focusable control sits FLUSH/a few px INSIDE a SEPARATE overflow-hidden rounded ancestor. A control in a non-overflow-hidden parent does NOT need ring-inset.
- Toggle/segmented controls whose pressed-state is conveyed ONLY by background get aria-pressed (display-only). Controls with visible text get their accessible name from text (no aria-label); icon-only controls need aria-label. For a segmented tab carrying a count badge (N), aria-pressed is STILL valid if the label WORD is constant per button (AMAPage/CreatorSubscribers/CollabsPage precedent).

PAGE: src/pages/PollHistoryPage.tsx (239 lines, /my-polls, useAuth, SwipeBackContainer). "My Polls" = polls & quizzes you've created. Backed by poll_posts (key ["my-polls", user?.id], .eq("user_id", user.id), .order created_at desc). annotated/stats/filtered useMemo; tab state ("all"|"poll"|"quiz"|"active"). Layout: sticky header (shadcn Back + Vote badge + "My Polls" title), gradient hero stat card, a 4-tab segmented row with count badges, loading skeletons + empty state, then a list of poll cards (each motion.div, NO onClick = icon + question + meta chips + vote count + an option-results bar). The poll cards are NOT clickable (presentational).

SKIP (confirm): Back shadcn <Button aria-label="Back" variant="ghost" size="icon"> L109 (ships tokens, labeled); hero motion.div L122 (no onClick); each poll-card motion.div L168 (NO onClick -> presentational); the option-results bars L208-230 (presentational divs); img/span/p/icons; skeleton/empty-state divs.

ONE control:

(A) Tabs (all/active/poll/quiz), L136-147 — RAW <button type="button">, .map over tabs, onClick={() => setTab(t.id)}. cn() base = "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5" + (tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"). transition-all ALREADY. Selection conveyed ONLY by bg. Visible label <span>{t.label}</span> ("All"/"Active"/"Polls"/"Quizzes" — CONSTANT per button) + a separate count <span>{t.count}</span>. Parent `flex gap-2 overflow-x-auto scrollbar-hide`.
Q-A: append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` into the cn base (after gap-1.5) + add `aria-pressed={tab === t.id}` (segmented-pill-tab tier [0.97]; DON'T-CHURN transition-all; selection-by-bg-only -> aria-pressed; the count changes but the LABEL is constant per button so aria-pressed still valid [AMAPage/CreatorSubscribers/CollabsPage precedent]; visible text -> NO aria-label; overflow-x-auto scrollbar-hide -> normal OUTWARD ring, TrendingTopicsPage/CollabsPage precedent). This is the EXACT CollabsPage (A) tabs pattern (slice 29) — identical cn base, identical label-span+count-span structure, identical overflow-x-auto parent. Confirm.

============================================================
DELIVERABLE: Give the EXACT final className string + the aria attr for (A). Note any DIVERGENCE and why. Confirm the SKIP list (esp. that the non-clickable poll-card motion.div rows need nothing). Flag any keyboard/logic gaps for the owner. Keep it tight — this is a single-control slice.
- files: src/pages/PollHistoryPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

This is a single-control slice. The page has exactly **one** interactive non-shadcn control: the 4-tab segmented row at L136-147. The poll cards are presentational `motion.div` rows with no `onClick` — they need nothing.

**Control (A) — Tabs:** RAW `<button>` `.map` over `tabs`, identical structure to the CollabsPage tabs (slice 29): same `cn()` base with `transition-all`, same `label`+`count` span structure, same `overflow-x-auto` parent. Apply the exact same treatment:
- Append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the `cn()` static base
- Add `aria-pressed={tab === t.id}` as a standalone attribute
- DON'T-CHURN `transition-all` (already present)
- OUTWARD ring (overflow-x-auto doesn't force inset — TrendingTopicsPage/CollabsPage precedent)

## Proposed Change

**File:** `src/pages/PollHistoryPage.tsx`

**Before (L136-147):**
```tsx
<button
  key={t.id}
  type="button"
  onClick={() => setTab(t.id)}
  className={cn(
    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
    tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
  )}
>
```

**After:**
```tsx
<button
  key={t.id}
  type="button"
  onClick={() => setTab(t.id)}
  aria-pressed={tab === t.id}
  className={cn(
    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
  )}
>
```

**Diffstat:** 2 ins / 1 del (+1 net = the new `aria-pressed` line)

## Verification

- **HARD RULE honored:** Only className + `aria-pressed` changed. `onClick={() => setTab(t.id)}`, `key`, `type`, and all logic remain byte-identical.
- **Token tier:** `[0.97]` — segmented-pill-tab tier, matches CollabsPage/EventsPage/TrendingTopicsPage precedent.
- **Ring shape:** OUTWARD — the `overflow-x-auto` parent does NOT clip the button's own ring (TrendingTopicsPage precedent).
- **`aria-pressed`:** Valid — selection conveyed ONLY by background/gradient; label word ("All"/"Active"/"Polls"/"Quizzes") is constant per button; the count badge varies but doesn't disqualify (AMAPage/CreatorSubscribers/CollabsPage precedent).
- **SKIP list confirmed:** Back shadcn `<Button>` (L109, ships tokens); hero `motion.div` (L122, no onClick); poll-card `motion.div` rows (L168, no onClick — presentational); option bars (L208-230, presentational divs); skeletons/empty-state/icons — all correctly skipped.
- **No keyboard gaps to flag:** The tabs are real `<button>` elements (natively focusable; added rings functional). The poll cards have no `onClick` so no keyboard gap there either.
- **Responsive:** `max-w-2xl mx-auto px-4` → ~343px inner; 4 tabs in `flex gap-2 overflow-x-auto` — "All (N)" / "Active (N)" / "Polls (N)" / "Quizzes (N)" at `text-xs` with `px-3.5 py-1.5` each fit comfortably or scroll horizontally. No crush.
- **Owner flag (established compact pattern):** Sub-44px tap targets — tabs `py-1.5` ~30px. This is the repo-wide pattern, not a per-page fix.

## Deploy

No deploy needed — this is a className-only change. Run `npm run update` to verify, then commit.
