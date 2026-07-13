# MiMo run — 2026-06-13T23:35:49.227Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze a HIGH-TRAFFIC customer-facing PUBLIC profile page — src/pages/PublicProfilePage.tsx (1746 lines; route /user/:id; the social public profile: mobile sticky header with Back/Share/menu, an optional adult-content gate, a profile action cluster Follow/Friend/Message/Tip/Edit/Share rendered as framer-motion buttons in BOTH desktop and mobile layouts, post tabs, a feed-view post list with Like/Comment/Share/Bookmark bars, a grid-view of post thumbnails, and an Instagram-style post-detail overlay with its own action bar; data via profiles + friendships queries and react-query) — for PREMIUM + RESPONSIVE interaction-token parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase query/RPC/react-query key, navigation/routing, or component/handler logic — propose ONLY JSX/Tailwind className changes plus tiny display-only attrs (aria-label/aria-expanded). The page currently has 0 focus-visible rings on ALL its raw + motion controls — that is the primary gap. KEY RULE — framer-motion buttons: many controls are motion.button with whileTap={{scale:...}}; for those add the focus RING ONLY (focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring) and do NOT add CSS active:scale (it double-applies against the motion transform). Raw <button>/<a> get the full token set. Control inventory to confirm/correct: (A) 3 header icon-<button>s ~L1000 Back / ~L1007 Share / ~L1011 menu-toggle (all share active:scale-95 transition + aria-label, MISSING ring) -> add ring only; (B) the menu-dismiss backdrop <button className=fixed inset-0 z-40> ~L1021 -> invisible click-catcher, SKIP (confirm); (C) 3 dropdown menu-item <button>s ~L1023 Share-profile / ~L1026 Report-profile / ~L1027 Block-user (w-full px-4 py-3 text-left hover:bg-muted/60, inside an overflow-hidden rounded menu) -> active:scale-[0.99] + transition-all + focus-visible ring-INSET; (D) 2 adult-gate <button>s ~L1058 Go-back / ~L1059 I-am-18+ (rounded-xl, transition-colors, hover:bg) -> active:scale-[0.98] + transition-all + ring; (E) ~13 profile-action motion.buttons (desktop ~L1113 Follow/L1122 Friend/L1133 Message/L1140 Tip/L1150 Edit/L1151 Share, mobile ~L1189 Follow/L1198 Friend/L1208 Tip/L1217 Message/L1228 Edit/L1229 Share, plus ~L1254 locked friend-request) all whileTap -> RING ONLY; (F) post-tab motion.button ~L1284 (whileTap, transition-colors) -> RING ONLY; (G) shared-post Follow raw <button> ~L1403 (text-primary text-[13px] font-semibold, no scale/ring) -> small text-link tier active:scale-[0.97] + rounded-sm + transition-all + ring; (H) 4 feed interaction-bar raw <button>s ~L1509 Like/L1512 Comment/L1515 Share/L1519 Bookmark (touch-manipulation active:scale-90 transition-transform, MISSING ring) -> add ring only, keep existing active:scale-90; (I) grid-thumbnail motion.button ~L1543 (whileTap scale 0.97, className has overflow-hidden) -> RING ONLY + ring-INSET (overflow-hidden clips a normal ring); (J) post-overlay raw <button>s ~L1601 Close/L1612 Share (44px icon, no scale/ring) + ~L1639 Like/L1657 Comment/L1666 Share (icon+count, no scale/ring) -> icon tier active:scale-95 + transition-transform + ring (+rounded-md on the paddingless inline ones for a clean ring boundary). SKIP (confirm): shadcn AlertDialogCancel/AlertDialogAction ~L1709-1710, the CommentsSheet/TipSheet/ReportSheet children, the overlay drag-handle <div onPointerDown> ~L1593. FLAG: clickable <div onClick=navigate('/reels/...')> at ~L1433 and ~L1490 are non-focusable (no tabIndex/role) so a ring would be dead CSS + they are keyboard-inaccessible — flag for owner (not a className fix). Tasks: (1) confirm/correct every tier + the ring-only vs full-token split; flag any control I missed across all 1746 lines. (2) responsive issues at 375/768/1280 (the desktop/mobile action clusters, the post tabs, the grid cols, the overlay). (3) call out transition-transform vs transition-all per control given its hover state. Return a CONCISE line-referenced punch list of exact className edits with before/after — do NOT reprint the whole component. Keep under ~700 tokens.
- files: src/pages/PublicProfilePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## 1 · Plan

Confirm every control across all 1746 lines, split ring-only (motion) vs full-token (raw), flag misses, call out responsive/transition issues, then deliver a concise line-referenced punch list of exact className edits.

---

## 2 · Control inventory — corrections & confirmations

Your inventory is **correct and exhaustive**. A few notes:

**Missed (caught):** The locked-section friend-request `motion.button` at ~L1254 is in your group E count (~13). ✅ Already covered.

**Flagged (owner, not a className fix):** The two clickable `<div onClick=navigate('/reels/…')>` at ~L1433 and ~L1490 are **non-focusable** — no `tabIndex`, no `role="button"`, no keyboard handler. A focus ring would be dead CSS. The keyboard-inaccessibility is a real a11y gap that needs `tabIndex={0}`, `role="button"`, and an `onKeyDown` handler — **owner task**.

**Responsive:** The page is structurally clean — `lg:` split for desktop/mobile action clusters, `grid-cols-3` post-tabs, `grid-cols-3` thumbnail grid. The post-overlay is fullscreen at all widths. No crush risks found.

**`transition-transform` vs `transition-all`:** The 3 header icon-buttons + 3 dropdown items + 2 adult-gate buttons all carry `hover:bg-*` — need **`transition-all`** (not `transition-transform`) so the hover bg fades smoothly. The 4 feed interaction-bar buttons already have `transition-transform` and no `hover:bg-*` — keep `transition-transform`, just append ring. The 2 overlay close/share raw buttons have no hover state — `transition-transform` suffices.

---

## 3 · Punch list — exact className edits

### GROUP 1 · Ring-only on `whileTap` motion.buttons (13 profile + 1 tab + 1 grid = 15 instances)

Append to each className: ` focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

| # | ~Line | Control | Extra note |
|---|-------|---------|------------|
| 1 | 1113 | Desktop Follow | |
| 2 | 1122 | Desktop Friend | |
| 3 | 1133 | Desktop Message | |
| 4 | 1140 | Desktop Tip | |
| 5 | 1150 | Desktop Edit Profile | |
| 6 | 1151 | Desktop Share | |
| 7 | 1189 | Mobile Follow | |
| 8 | 1198 | Mobile Friend | |
| 9 | 1208 | Mobile Tip | |
| 10 | 1217 | Mobile Message | |
| 11 | 1228 | Mobile Edit Profile | |
| 12 | 1229 | Mobile Share | |
| 13 | 1254 | Locked friend-request | |
| 14 | ~1284 | Post tab `motion.button` | |
| 15 | ~1543 | Grid thumbnail | **Also** add `ring-inset` → `focus-visible:ring-inset` (parent has `overflow-hidden`) |

### GROUP 2 · Ring-only on raw icon-buttons (already have `active:scale-95 transition`)

**Before (all three, identical pattern):**
```
… shadow-sm active:scale-95 transition"
```
**After:**
```
… shadow-sm active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

| ~Line | Control |
|-------|---------|
| 1000 | Header Back |
| 1007 | Header Share |
| 1011 | Header menu-toggle |

### GROUP 3 · 3 dropdown menu-items (add scale + transition-all + ring-inset)

**Before (each):**
```html
className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-muted/60"
```
**After (each):**
```html
className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-muted/60 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
```

`ring-inset` because the parent `<div className="… overflow-hidden rounded-2xl …">` clips a normal outward ring.

| ~Line | Control |
|-------|---------|
| 1023 | Share profile |
| 1026 | Report profile |
| 1027 | Block user |

### GROUP 4 · 2 adult-gate buttons (add scale + transition-all + ring)

**"Go back" before → after:**
```
… rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
→
… rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**"I am 18+" before → after:**
```
… rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors"
→
… rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### GROUP 5 · 1 shared-post Follow raw button (full token set)

**Before (~L1403):**
```
className="text-primary text-[13px] font-semibold"
```
**After:**
```
className="text-primary text-[13px] font-semibold rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### GROUP 6 · 4 feed interaction-bar raw buttons (ring only — keep existing `active:scale-90`)

**Before (each — pattern varies slightly):**
```
… active:scale-90 transition-transform touch-manipulation"
```
**After (each):**
```
… active:scale-90 transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Keep `transition-transform` (no `hover:bg-*` on these — the only animated property is the press scale).

| ~Line | Control |
|-------|---------|
| 1509 | Like |
| 1512 | Comment |
| 1515 | Share |
| 1519 | Bookmark |

### GROUP 7 · 5 post-overlay raw icon buttons (full token set)

**Close (~L1601) + Share (~L1612)** — 44px icon-only, no existing scale:
```
… (no existing transition/scale) → append: transition-transform active:scale-95 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
`rounded-md` gives a clean ring boundary on paddingless inline buttons.

**Like (~L1639) / Comment (~L1657) / Share (~L1666)** — icon+count, no existing scale:
```
… (no existing transition/scale) → append: transition-transform active:scale-95 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### SKIP (confirmed)
- AlertDialogCancel/AlertDialogAction ~L1709–1710 (shadcn — ships tokens)
- CommentsSheet / TipSheet / ReportSheet children (own controls)
- `<div onPointerDown>` drag handle ~L1593 (SwipeGrabHandle, non-focusable gesture zone)
- `<button className="fixed inset-0 z-40">` ~L1021 (invisible menu-dismiss backdrop)

---

**Total: 33 edits** (15 ring-only motion + 3 header ring-only + 3 dropdown + 2 adult-gate + 1 follow + 4 feed-bar + 5 overlay). All are pure className/display-only-attr — zero logic/query/routing changes.

**Owner must verify:** `npm run update` (type-check + worker type-check + production build → 0 errors). The clickable `<div onClick>` at ~L1433/~L1490 keyboard-inaccessibility is flagged for a separate task (needs `tabIndex`/`role`/`onKeyDown`, not a className fix).
