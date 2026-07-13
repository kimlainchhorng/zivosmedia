# MiMo run — 2026-06-14T02:04:19.667Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## (1) Plan

Single control: the **4-tab segmented row** (L136–147). Exact same `cn()` base, label-span + count-span structure, and `overflow-x-auto scrollbar-hide` parent as the **CollabsPage tabs** (slice 29). One precedent-matched edit.

---

## (2) Proposed diff

**File:** `src/pages/PollHistoryPage.tsx`, L140–144 (the `<button>` inside the `.map`)

**Before (L140–144):**
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

**Summary of changes (1 control / 3 edits):**
| Change | Detail |
|--------|--------|
| `aria-pressed={tab === t.id}` | New attr, own line after `onClick` (segmented tab, selection-by-bg-only, label word constant per button) |
| `active:scale-[0.97]` | Appended into cn static base (segmented-pill-tab tier) |
| `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | Appended after the scale |
| `transition-all` | **DON'T-CHURN** — already present, kept byte-identical |

**Ring shape:** **OUTWARD** — parent `flex gap-2 overflow-x-auto scrollbar-hide` is NOT `overflow-hidden`; box-shadow ring is not affected by scrollable overflow (TrendingTopicsPage/CollabsPage precedent). No `ring-inset`.

**`aria-pressed` validity:** The count badge `{t.count}` varies, but the label **word** (`"All"` / `"Active"` / `"Polls"` / `"Quizzes"`) is constant per button → `aria-pressed` is valid per AMAPage / CreatorSubscribers / CollabsPage precedent.

---

## (3) SKIP list confirmation

| Element | Skip? | Reason |
|---------|-------|--------|
| Back `<Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full">` L109 | ✅ SKIP | shadcn, ships tokens, labeled |
| Hero `motion.div` L122 | ✅ SKIP | `initial`/`animate` only, NO `onClick` — presentational |
| Poll-card `motion.div` L168 | ✅ SKIP | NO `onClick` — presentational (icon + question + meta + vote count + option bars) |
| Option-results bars L208–230 | ✅ SKIP | Presentational `div`s with percentage bars |
| Skeletons / empty-state | ✅ SKIP | Non-interactive |
| `<span>` / `<img>` / icons / decorative elements | ✅ SKIP | Display-only |

The poll-card `motion.div` rows are **presentational only** — they render content (question, type badge, time, vote count, option-result bars) but have **no `onClick`** handler and **no link/navigation**. They need nothing.

---

## Keyboard / logic gaps for the owner

**Flag-not-fix:** The segmented tab buttons are keyboard-inaccessible as `<div>`-like elements rendered as raw `<button>`s — wait, they ARE real `<button type="button">` elements, so they **are natively focusable and keyboard-operable** (Enter/Space triggers `onClick`). The added `focus-visible:ring` is functional. ✅ No keyboard gap here.

**No other gaps** — this is a clean single-control slice.

---

## Verification note

Must pass `npm run update` (type-check + worker type-check + production build). The diff is **className string + one display-only attribute** (`aria-pressed`), touching only the static base of a `cn()` call — zero logic/routing/supabase risk.
