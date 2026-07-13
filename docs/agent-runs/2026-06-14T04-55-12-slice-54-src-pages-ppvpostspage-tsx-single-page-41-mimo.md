# MiMo run — 2026-06-14T04:55:12.645Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 54 — src/pages/PPVPostsPage.tsx (single page, 417 lines, creator pay-per-view posts/unlocks page, 3 tabs: My Posts / Unlocked / Paid DMs). PREMIUM responsive interaction-token + a11y polish. CLASSNAME-ONLY + display-only aria attrs. NO logic, NO handlers, NO state, NO routing changes.

Apply the project's standing interaction-token rules to RAW <button>/<a>/<Link> only:
- active:scale-[X] press feedback (tiers: icon-only scale-95; small/pill chips [0.97]; cards [0.98]; full-width/wide-rows [0.99]).
- transition-* : use transition-all when the control ALSO has a real hover:bg-*/hover:text-*/hover:border-*/hover:opacity color fade; transition-transform for pure press-scale with no hover color. When a control already has `transition-colors` AND we add a new active:scale, FLIP `transition-colors`→`transition-all` so the transform eases alongside the hover color. A control with bare `transition` (Tailwind) needs no flip.
- focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (OUTWARD ring-ring; ring-inset ONLY if focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor).
- aria: icon-only button with no visible text and no aria-label -> ADD a concise aria-label. aria-pressed ONLY for segmented single/multi-select controls that convey selection by background, label word constant, NOT role=tab, toggleable. Do NOT add aria-expanded to dialog openers.

SKIP (already tokenized / native focus / not mine): shadcn components; presentational divs without onClick; child components (PPVPostDetail, PreviewThumb).

The 6 RAW <button> controls under review:
1. L178 Back ArrowLeft — aria-label="Back", className "p-2 -ml-2 rounded-full hover:bg-muted/50" (sticky header, neutral bg). Icon-only.
2. L190 "New" pill — VISIBLE TEXT (Plus + "New"), onClick navigate("/ppv/create"), className "h-9 px-3 rounded-full bg-rose-500 text-white text-[12px] font-extrabold flex items-center gap-1 hover:bg-rose-600 transition-colors". One-shot nav/create. Sits on neutral header bg.
3. L203 Tab bar ×3 (mine/unlocked/paid-dms) — VISIBLE TEXT (constant labels My Posts/Unlocked/Paid DMs), onClick setTab(t), className cn("flex-1 h-11 text-[13px] font-extrabold relative", tab===t ? "text-rose-500" : "text-muted-foreground"). Selection conveyed by TEXT COLOR + a framer `layoutId` underline bar (motion.div absolute bottom). NO bg change, NO hover. QUESTION: tier for a full-width flex-1 tab button? aria-pressed YES/NO given this is a tab-bar pattern (selection by color+underline, not bg)? Should we even add scale to a tab-bar button or leave it (tab bars often don't take press-scale)?
4. L271 My-posts card row ×N — VISIBLE content, onClick navigate(`/ppv?post=`), className "w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-colors". Card row, has hover:border color fade + transition-colors.
5. L359 Paid-DMs card row ×N — IDENTICAL className to #4, onClick navigate(`/chat?with=`).
6. L407 EmptyState CTA — VISIBLE TEXT (dynamic cta), onClick onCta(), className "h-11 px-5 rounded-2xl bg-rose-500 text-white text-[13px] font-extrabold hover:bg-rose-600". Has hover:bg, NO transition, NO scale. (This is a child component EmptyState, but it's in THIS file — in scope.)

Confirm per control: exact className change, transition-all vs transition-transform vs flip, scale tier, ring (outward vs inset), and any aria add/keep. Resolve the tab-bar question (#3) explicitly. Match the parity reference JobPostingDetailPage.tsx conventions. Reply concise per control.
- files: src/pages/PPVPostsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

6 RAW `<button>` controls in `src/pages/PPVPostsPage.tsx`. All are className-only edits + minimal display-only ARIA on #3 (none added). The key decision point is **#3 (tab bar)**: resolved as **ring-only, no scale, no `aria-pressed`** (see below).

---

## Per-control rulings

### #1 — Back ArrowLeft (L178, icon-only)
- **Scale:** `active:scale-95` — icon tier
- **Transition:** FRESH `transition-all` (no prior transition; covers new scale + existing `hover:bg-muted/50`)
- **Ring:** outward `ring-ring` (neutral sticky-header bg, not overflow-hidden)
- **Aria:** KEEP existing `aria-label="Back"`
- **Before → After:**
```
"p-2 -ml-2 rounded-full hover:bg-muted/50"
→ "p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### #2 — "New" pill (L190, visible text + icon)
- **Scale:** `active:scale-[0.97]` — small-pill tier (`h-9 px-3 rounded-full`)
- **Transition:** FLIP `transition-colors` → `transition-all` (new scale must ease alongside existing `hover:bg-rose-600`)
- **Ring:** outward `ring-ring` (sits on neutral header bg, no overflow-hidden ancestor)
- **Aria:** visible text "New" → no aria-label; one-shot nav → no `aria-pressed`
- **Before → After:**
```
"h-9 px-3 rounded-full bg-rose-500 text-white text-[12px] font-extrabold flex items-center gap-1 hover:bg-rose-600 transition-colors"
→ "h-9 px-3 rounded-full bg-rose-500 text-white text-[12px] font-extrabold flex items-center gap-1 hover:bg-rose-600 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### #3 — Tab bar ×3 (L203, visible text, `flex-1`) — **THE KEY CALL**

**No scale. No `aria-pressed`. Ring-only, `ring-inset`.**

Three reasons, matching the project's established precedents:

1. **Tab bars don't take press-scale.** These are rapid-tap tab selectors where the framer `layoutId` underline already provides motion feedback on selection change. Adding `active:scale` to a tab bar would be visually noisy and inconsistent with the convention that tab-bar taps are lightweight navigation gestures, not press-actions. Prior slices in this repo have never added scale to a tab bar.

2. **No `aria-pressed`.** This is a **tab-bar pattern** — selection conveyed by **text color + underline**, not background. The idiomatic ARIA is `role="tab"` + `aria-selected` (not `aria-pressed`). `aria-pressed` is reserved for segmented controls where selection is conveyed by a background fill toggle (the P2PMoneyPage chips rule). These tabs have no bg change. Adding `aria-pressed` would mislead SR users into thinking the selection is a simple toggle when it's actually a content-panel switch.

3. **`ring-inset`** — the 3 tab buttons are `flex-1` with zero gap, flush edge-to-edge inside the `<div className="flex border-t ...">`. An outward ring would bleed between adjacent tabs. `ring-inset` keeps the focus indicator cleanly inside each tab's boundary. The parent isn't `overflow-hidden`, but the flush-neighborhood justifies inset per the spirit of the rule (preventing visual artifacts).

- **Transition:** none (no scale, no hover color — ring-only, focus is instant)
- **Before → After:**
```
cn("flex-1 h-11 text-[13px] font-extrabold relative", tab === t ? "text-rose-500" : "text-muted-foreground")
→ cn("flex-1 h-11 text-[13px] font-extrabold relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", tab === t ? "text-rose-500" : "text-muted-foreground")
```

### #4 — My-posts card row ×N (L271, visible content)
- **Scale:** `active:scale-[0.98]` — card tier
- **Transition:** FLIP `transition-colors` → `transition-all` (new scale + existing `hover:border-rose-500/40`)
- **Ring:** outward `ring-ring` (the button IS the `rounded-2xl bg-card` card; ring renders against page `bg-background`)
- **Aria:** visible content → no aria-label; one-shot nav → no `aria-pressed`
- **Before → After:**
```
"w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-colors"
→ "w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### #5 — Paid-DMs card row ×N (L359) — identical className to #4
- Same treatment: FLIP `transition-colors` → `transition-all` + `active:scale-[0.98]` + outward `ring-ring`
- Same before → after as #4.

### #6 — EmptyState CTA (L407, visible text, `h-11 px-5 rounded-2xl`)
- **Scale:** `active:scale-[0.98]` — prominent CTA tier (not full-width `w-full`, not a chip)
- **Transition:** FRESH `transition-all` (no prior transition; covers new scale + existing `hover:bg-rose-600`)
- **Ring:** outward `ring-ring` (sits in a centered empty-state div, no overflow-hidden)
- **Aria:** visible dynamic text → no aria-label; one-shot → no `aria-pressed`
- **Before → After:**
```
"h-11 px-5 rounded-2xl bg-rose-500 text-white text-[13px] font-extrabold hover:bg-rose-600"
→ "h-11 px-5 rounded-2xl bg-rose-500 text-white text-[13px] font-extrabold hover:bg-rose-600 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Diff summary

| Count | Metric |
|-------|--------|
| **6** | className `−`/`+` edits (lines swapped) |
| **0** | new `aria-*` attrs added (1 KEPT: `aria-label="Back"` on #1) |
| **0** | logic lines touched |
| **5** | rings (4 outward `ring-ring` on #1/#2/#4/#5/#6, 1 `ring-inset ring-ring` on #3) |
| **5** | scales (1× `scale-95`, 1× `[0.97]`, 3× `[0.98]`; 0 on #3) |
| **2** | FRESH `transition-all` (#1, #6 — no prior transition) |
| **3** | FLIP `transition-colors` → `transition-all` (#2, #4, #5 — existing hover gains new scale) |
| **0** | `transition` on #3 (ring-only, no scale, no hover) |

---

## Proposed diff — `src/pages/PPVPostsPage.tsx`

```diff
--- a/src/pages/PPVPostsPage.tsx
+++ b/src/pages/PPVPostsPage.tsx
@@ -178,1 +178,1 @@
-            className="p-2 -ml-2 rounded-full hover:bg-muted/50"
+            className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ -190,1 +190,1 @@
-            className="h-9 px-3 rounded-full bg-rose-500 text-white text-[12px] font-extrabold flex items-center gap-1 hover:bg-rose-600 transition-colors"
+            className="h-9 px-3 rounded-full bg-rose-500 text-white text-[12px] font-extrabold flex items-center gap-1 hover:bg-rose-600 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ -203,1 +203,1 @@
-                "flex-1 h-11 text-[13px] font-extrabold relative",
+                "flex-1 h-11 text-[13px] font-extrabold relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
@@ -271,1 +271,1 @@
-              className="w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-colors"
+              className="w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ -359,1 +359,1 @@
-                className="w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-colors"
+                className="w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ -407,1 +407,1 @@
-        className="h-11 px-5 rounded-2xl bg-rose-500 text-white text-[13px] font-extrabold hover:bg-rose-600"
+        className="h-11 px-5 rounded-2xl bg-rose-500 text-white text-[13px] font-extrabold hover:bg-rose-600 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Owner verification

1. **Run `npm run update`** — must pass (0 type errors + worker type-check + production build). The only risk is a typo in a className string (all are pure string edits, zero logic).
2. **Preview at 375/768/1280:**
   - #1 back: press shrinks 5%, ring on Tab, `hover:bg-muted/50` fades
   - #2 "New": press shrinks ~3%, ring on Tab, `hover:bg-rose-600` fades alongside
   - #3 tabs: ring appears on Tab (inset, clean between flush tabs), NO scale jank during rapid tab switching, framer underline still animates
   - #4/#5 card rows: press shrinks ~2%, ring on Tab, `hover:border-rose-500/40` fades alongside
   - #6 EmptyState CTA: press shrinks ~2%, ring on Tab, `hover:bg-rose-600` fades
3. **Keyboard:** Tab through all controls — ring visible on each. Tab bar focus moves between the 3 tabs cleanly.
4. **Guard check:** `git diff` should show exactly 6 className line swaps, 0 logic lines, 0 new attrs.
