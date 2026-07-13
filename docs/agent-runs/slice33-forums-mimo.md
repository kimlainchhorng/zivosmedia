# MiMo run — 2026-06-14T02:11:13.869Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 33 — ForumsPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props (do NOT add/remove whileTap). If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it for the owner (do not fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for PURE icon/press-scale with NO hover color. If transition-all already present, just append (DON'T-CHURN). If a raw control has transition-colors AND a hover color AND we are adding active:scale, FLIP transition-colors -> transition-all. If a raw control has an EXISTING valid active treatment, KEEP it.
- framer-motion: a motion.button WITH whileTap -> CSS active:scale is DEAD (framer inline transform overrides it) -> add focus RING ONLY, do NOT add active:scale, KEEP whileTap. If such a motion.button has transition-colors + hover color, KEEP transition-colors (do NOT flip to transition-all — transition:transform would fight whileTap's inline transform -> jitter; NotificationsPage/PlacesPage/ProfileViewsPage motion.button-row precedent).
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens. RAW <input>/<textarea> that ALREADY carry their own focus:ring (e.g. focus:ring-2 focus:ring-rose-500/30) -> LEAVE AS-IS (never active:scale).
- ring-inset KEY CSS FACT: overflow-hidden clips an element's DESCENDANTS, NOT its OWN box-shadow/ring. ring-inset is only needed when the focusable control sits FLUSH/a few px INSIDE a SEPARATE overflow-hidden rounded ancestor. A control with ample padding clearance (e.g. p-3/p-4/p-5) inside an overflow-hidden container does NOT need ring-inset.
- Controls with visible text get their accessible name from text (no aria-label); icon-only controls need aria-label. aria-pressed only for toggle/segmented controls whose pressed-state is conveyed ONLY by background. aria-expanded only for inline disclosure (accordion/expand-collapse adjacent region) — NOT for a button that opens a MODAL DIALOG (that's aria-haspopup territory, out of scope here).

PAGE: src/pages/ForumsPage.tsx (324 lines, /forums, SwipeBackContainer, NO useAuth). "Forums" = discussion-board directory. Backed by forums (key ["forums-list"], .order sort_order asc) + forum_threads (key ["forum-threads", openForumId], .eq forum_id .order last_reply_at desc .limit 25, enabled !!openForumId). query/openForumId useState; filtered useMemo. Layout: sticky header (shadcn Back + MessageSquare badge + "Forums" title), gradient hero stat card (motion.div NO onClick), a RAW search input, loading skeletons + empty/no-match states, a list of forum rows (each a motion.button that opens a threads sheet). The threads sheet = an AnimatePresence overlay: a backdrop motion.div (onClick close) + a panel motion.div (onClick stopPropagation) with a gradient header (icon + name + a Close button) + a scrollable thread list of ThreadRowCard (plain <div>, NOT clickable). ThreadRowCard is a presentational subcomponent.

SKIP (confirm): Back shadcn <Button aria-label="Back" variant="ghost" size="icon"> L123 (ships tokens, labeled); the RAW search <input type="search"> L152 (ALREADY focus:outline-none focus:ring-2 focus:ring-rose-500/30 -> leave as-is); hero stat motion.div L136 (no onClick); the sheet panel motion.div L241 (onClick=stopPropagation only, presentational container, not a control); ThreadRowCard <div> L297 (NOT a button, no onClick -> presentational); all img/span/p/icons; skeleton/empty-state divs.

TWO controls + ONE flag:

(A) Forum row, L186-225 — motion.button type="button", ALREADY whileTap={{ scale: 0.985 }}, entrance anim (initial/animate/transition delay), onClick={() => setOpenForumId(f.id)} (opens the threads sheet). className = "w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left". Rich visible child text (forum name + description + category/thread-count/last-post meta) + a trailing ChevronRight. motion.button WITH whileTap + transition-colors + hover:bg-secondary/40, NO ring. Sits in a `space-y-2` stack inside `max-w-2xl mx-auto px-4` (NOT overflow-hidden).
Q-A: append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (motion.button + whileTap -> RING ONLY, NO active:scale [would be dead under framer's inline transform]; KEEP whileTap; KEEP transition-colors — do NOT flip to transition-all [whileTap owns the transform, transition:transform would fight it -> jitter; NotificationsPage/PlacesPage/ProfileViewsPage precedent]; rich visible text -> NO aria-label; OUTWARD ring — rounded-2xl row in space-y-2, parent not overflow-hidden). a11y JUDGMENT: I am NOT adding aria-expanded — the row opens a MODAL/portal sheet (fixed-overlay), not an inline adjacent disclosure region; aria-expanded is for accordions, the ideal here would be aria-haspopup="dialog" which is out of the display-only allowlist + a separate concern. Do you AGREE (ring-only, keep whileTap + transition-colors, no aria-expanded), or do you prefer adding aria-expanded={openForumId === f.id}? Pick one and say why.

(B) Close button (threads-sheet header), L257-264 — RAW <button type="button" aria-label="Close">, onClick={() => setOpenForumId(null)}. className = "h-9 w-9 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center". RAW icon-only (X icon), NO transition, NO active, NO ring, NO hover color. Sits in the sheet's gradient header `bg-ig-gradient text-white p-5 relative` (NOT overflow-hidden itself); the header's PARENT panel L246 IS `rounded-3xl ... overflow-hidden`, but the Close button sits inside the header's p-5 (20px) padding -> ample clearance from the panel's rounded edge.
Q-B: append `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier scale-95; PURE press-scale, NO hover color -> transition-TRANSFORM not transition-all [no color/opacity to ease]; aria-label="Close" already present -> no attr change; OUTWARD ring — the button has p-5 (20px) clearance from the overflow-hidden panel edge, well beyond a 2px ring, so NOT clipped -> no ring-inset). Confirm transition-transform (vs transition-all) and OUTWARD-not-inset.

(FLAG, do not fix) The threads sheet is a modal dialog: backdrop motion.div L234 has onClick={() => setOpenForumId(null)} (click-outside-to-close scrim) but is a non-focusable <div> (no role/tabIndex); the panel lacks role="dialog"/aria-modal; there is no focus-trap and no Escape-to-close (the Close button [B] is the only keyboard-accessible dismiss). This is the standard redundant-scrim pattern + a dialog-semantics gap — all role/tabIndex/onKeyDown/focus-management is LOGIC, OUT of my className+display-only scope. Confirm this is a correct FLAG-not-fix for the owner.

============================================================
DELIVERABLE: For each control (A)(B) give the EXACT final className string + any attrs. Resolve A (aria-expanded: skip [my lean] vs add) and B (transition-transform vs transition-all; outward vs inset ring) explicitly. Confirm the SKIP list + the dialog-semantics FLAG. Keep it tight.
- files: src/pages/ForumsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## (1) Plan

Two surgical className appends. Zero new lines, zero logic changes.

| # | Control | Type | Tier | Edit |
|---|---------|------|------|------|
| **(A)** | Forum row | `motion.button` + `whileTap` | ring-only (whileTap owns the transform) | Append ring; keep `transition-colors`; keep `whileTap`; no `aria-expanded` |
| **(B)** | Close button | RAW icon-only `<button>` | icon-only `scale-95` | Append `transition-transform active:scale-95` + ring |

**Total: 2 lines edited (in-place className appends), 0 added, 0 deleted.**

---

## (2) Proposed diffs

### (A) Forum row — ring-only, keep whileTap + transition-colors

**Before** (className on the `motion.button`):
```
className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
```

**After**:
```
className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:**
- `motion.button` + `whileTap={{ scale: 0.985 }}` → CSS `active:scale` is **DEAD** (framer inline transform overrides) → **ring ONLY**, no `active:scale`
- `transition-colors` + `hover:bg-secondary/40` → **KEEP `transition-colors`** — do NOT flip to `transition-all` (`transition:transform` would fight `whileTap`'s inline transform → jitter; NotificationsPage/PlacesPage/ProfileViewsPage `motion.button`-row precedent)
- `whileTap` kept as-is
- Rich visible child text (forum name + description + category/thread-count/last-post meta) → **NO `aria-label`**
- `space-y-2` stack, parent NOT `overflow-hidden` → **OUTWARD ring** (no `ring-inset`)
- **`aria-expanded` — SKIP (my lean = your lean).** The row opens a **modal/portal sheet** (fixed overlay `z-[1600]`), not an inline adjacent disclosure region. `aria-expanded` is semantically for accordions/disclosure panels; the correct ARIA here would be `aria-haspopup="dialog"` which is outside the display-only allowlist. Adding `aria-expanded` would be technically misleading — it signals "the next sibling region is expanded/collapsed," but the threads sheet is a sibling of nothing in the DOM tree. **AGREE: ring-only + keep whileTap + keep transition-colors + no aria-expanded.**

### (B) Close button — full icon-only token set

**Before**:
```
className="h-9 w-9 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center"
```

**After**:
```
className="h-9 w-9 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:**
- RAW icon-only, NO existing transition/active/ring/hover → **full token set**
- **`transition-transform`** (NOT `transition-all`) — pure press-scale, no hover color/opacity to ease (the only visual change is the scale transform itself; `transition-transform` is the minimal correct easing)
- Icon-only tier → `active:scale-95`
- `aria-label="Close"` already present → no attr change
- **OUTWARD ring** — the button sits inside the gradient header's `p-5` (20px) padding; the parent panel `rounded-3xl overflow-hidden` clips its *descendants* but the Close button's own `box-shadow` ring extends *outward from itself* and is NOT clipped by the panel's `overflow-hidden` (overflow clips descendant content, not ancestor box-shadows) → **no `ring-inset` needed**. The 20px clearance is ample.

---

## (3) SKIP list — confirmed ✅

| Control | Location | Reason |
|---------|----------|--------|
| Back `<Button>` | L123 | shadcn → ships tokens, already `aria-label="Back"` |
| Search `<input type="search">` | L152 | Already has `focus:outline-none focus:ring-2 focus:ring-rose-500/30` → leave as-is (RAW input with own focus ring; never `active:scale` on inputs) |
| Hero stat `motion.div` | L136 | Entrance anim only, NO `onClick` → presentational |
| Sheet panel `motion.div` | L241 | `onClick={stopPropagation}` only → presentational container, not a control |
| ThreadRowCard `<div>` | L297 | Plain `<div>`, NOT clickable → presentational subcomponent |
| All `<img>`/`<span>`/`<p>`/icons | various | Decorative/display |
| Skeleton/empty-state `<div>`s | various | Non-interactive |

---

## (4) FLAG for the owner — dialog semantics gap (do NOT fix) 🔴

The threads sheet is a **modal dialog** but lacks proper semantics:

1. **Backdrop** `motion.div` L234 has `onClick={() => setOpenForumId(null)}` but is a non-focusable `<div>` — no `role="dialog"`, no `tabIndex`, no focus management.
2. **Panel** L241 lacks `role="dialog"` and `aria-modal="true"`.
3. **No focus trap** — focus can tab behind the sheet into the page content.
4. **No Escape-to-close** — the Close button `[B]` is the only keyboard-accessible dismiss (clicking the backdrop works for pointer users but not keyboard users since the backdrop div isn't focusable and has no keyboard handler).
5. **Focus is not moved** into the sheet when it opens, so keyboard users must tab through the entire page to reach it.

This is the standard "redundant scrim + missing dialog semantics" pattern. All `role`/`tabIndex`/`onKeyDown`/focus-trap/`aria-modal` changes are **LOGIC**, outside my className+display-only scope. **Correct FLAG-not-fix.** Recommended owner fix: wrap the sheet in a proper `<dialog>` element or add `role="dialog"` + `aria-modal="true"` + focus-trap + Escape handler (or use a headless dialog library like `@radix-ui/react-dialog` which shadcn already provides).

---

## Verification

After applying (A) + (B), run:
```bash
npm run update
```
Expected: type-check 0 errors + worker type-check pass + production build success.

**Diff stats: 2 lines edited (className in-place appends), 0 added, 0 deleted, +0 net lines.**
