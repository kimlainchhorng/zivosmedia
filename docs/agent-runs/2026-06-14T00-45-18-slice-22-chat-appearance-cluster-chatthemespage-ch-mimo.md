# MiMo run — 2026-06-14T00:45:18.195Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 22 — CHAT-APPEARANCE CLUSTER: ChatThemesPage + ChatWallpapersPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to two customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) pages. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it for the owner — do NOT add the keyboard logic yourself.

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-* (color fade) or underline; transition-transform for pure icon-scale with no hover color. If transition-all already present, just append active:scale + ring.
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens.
- framer-motion motion.button WITH whileTap -> focus RING ONLY (CSS active:scale is DEAD under motion's inline transform). motion.button WITHOUT whileTap -> CSS active:scale is LIVE.
- Non-interactive div/span/img with no onClick -> NOTHING.
- ring-inset ONLY inside overflow-hidden rounded parents where a plain OUTWARD ring would clip at the rounded corner. KEY CSS FACT: `overflow-hidden` clips an element's DESCENDANTS, NOT the element's OWN box-shadow/ring — so a ring on the overflow-hidden element ITSELF is NOT clipped; ring-inset is only needed when the focusable control sits a few px INSIDE a SEPARATE overflow-hidden rounded ancestor.
- When a control already has a conditional SELECTION ring (e.g. ring-2 ring-foreground when selected), a focus-visible:ring-ring OVERRIDES (not stacks) the ring color on focus (verified) — safe to add; match the selection ring's ring-offset for visual consistency.

============================================================
FILE 1: src/pages/ChatThemesPage.tsx (194 lines, /chat-themes, ProtectedRoute)
============================================================
SKIP: Back (shadcn Button L74). ONE control:

(A) Theme card, L125-182 — motion.button WITH whileTap={{ scale: 0.97 }}, onClick={() => apply(t)}. ALREADY has aria-pressed={isSelected} + aria-label={`Apply theme ${t.name}`}. className = cn("relative rounded-2xl overflow-hidden text-left transition-all", isSelected ? "ring-2 ring-transparent ring-offset-2 ring-offset-background bg-ig-gradient p-[2px]" : ""). So: real focusable <button>; transition-all already present; whileTap owns the press-scale; the element ITSELF is overflow-hidden (clips its inner preview children, NOT its own ring); when selected it carries an OUTWARD ring-2 (ring-transparent placeholder) + ring-offset-2 ring-offset-background + gradient p-[2px] border. Parent grid is `grid grid-cols-2 gap-3` (NOT overflow-hidden).

Q-A1: Add ONLY a focus ring (whileTap owns scale, keep transition-all)? Confirm NO active:scale.
Q-A2: Should the focus ring be a NORMAL OUTWARD ring (since overflow-hidden clips children, not the element's own ring — and the existing selection ring is already outward on this very element) rather than ring-inset? i.e. NOT ring-inset.
Q-A3: To match the selected-state ring-offset, use focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background (with offset, like the CollectionsPage color-swatch precedent)? Or plain no-offset? On selected cards focus-visible:ring-ring overrides the ring-transparent -> visible focus ring at the same offset; on unselected cards it's a fresh offset ring. Confirm.

============================================================
FILE 2: src/pages/ChatWallpapersPage.tsx (202 lines, /chat-wallpapers, ProtectedRoute)
============================================================
SKIP: Back (shadcn Button L113); wallpaper card motion.div L155 (NO onClick -> non-interactive wrapper -> nothing); wallpaper <img alt=""> L162 (decorative). TWO controls, BOTH raw <button type="button"> sitting in the card's bottom overlay `absolute inset-x-0 bottom-0 p-2` INSIDE the card motion.div which is `relative aspect-[3/4] rounded-xl overflow-hidden bg-muted group`:

(B) "Default" button, L177-183 — onClick={() => setAsDefault(w.id)}, className "flex-1 h-7 rounded-full bg-white text-black text-[10px] font-bold inline-flex items-center justify-center gap-0.5 active:scale-95 transition-all". ALREADY active:scale-95 + transition-all. Visible "Default" text + Check icon = accessible name. flex-1 (left side of the 2-button row), near the card's bottom-LEFT rounded-xl corner (~8px p-2 inset).
(C) "Remove" button, L185-192 — aria-label="Remove", onClick={() => remove(w.id)}, className "h-7 w-7 rounded-full bg-rose-500/80 hover:bg-rose-500 text-white inline-flex items-center justify-center active:scale-95 transition-all". ALREADY active:scale-95 + transition-all + aria-label. Rightmost, near the card's bottom-RIGHT rounded-xl corner (~8px p-2 inset).

Q-B/C: Both already have active:scale-95 + transition-all, so just APPEND a focus ring. Because both sit ~6-8px INSIDE a SEPARATE overflow-hidden rounded-xl (12px-radius) card, a plain outward ring would clip at the bottom rounded corners (the SavedPostsPage remove-button precedent, 6px inset inside rounded-xl). So append focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset to BOTH? Confirm ring-inset (not plain outward) is correct here, and that I keep the existing active:scale-95 untouched.

============================================================
DELIVERABLE: For each control (A)(B)(C) give the EXACT final className string + any attrs. Note where you DIVERGE from my proposals and why. Keep it tight.
- files: src/pages/ChatThemesPage.tsx, src/pages/ChatWallpapersPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Three controls across two files. All are className-only appends (focus rings). Zero logic/handler changes.

| # | File | Control | What | Why |
|---|------|---------|------|-----|
| A | ChatThemesPage | Theme card `motion.button` (L139) | Ring ONLY + ring-offset to match selection ring | `whileTap` owns press-scale; `overflow-hidden` on the element clips children not its own ring → outward ring safe; offset matches the selected-state `ring-offset-2 ring-offset-background` |
| B | ChatWallpapersPage | "Default" `raw <button>` (L177) | Ring-inset (keep existing `active:scale-95`) | ~8px inset inside `rounded-xl overflow-hidden` card → outward ring clips at bottom corner |
| C | ChatWallpapersPage | "Remove" `raw <button>` (L185) | Ring-inset (keep existing `active:scale-95`) | Same geometry as B |

**Inventory exhaustive** — confirmed no other interactive controls beyond the 1 shadcn `<Button>` (Back) in each file. Every other element is either non-interactive (`motion.div` no onClick, `<img alt="">`, presentational badges) or ships tokens already.

---

## Proposed Diffs

### FILE 1: `src/pages/ChatThemesPage.tsx`

**Control (A) — Theme card, L139 className base (line 1 of the `cn()` call)**

```diff
                   className={cn(
-                    "relative rounded-2xl overflow-hidden text-left transition-all",
+                    "relative rounded-2xl overflow-hidden text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                     isSelected ? "ring-2 ring-transparent ring-offset-2 ring-offset-background bg-ig-gradient p-[2px]" : "",
                   )}
```

**Rationale — answers to your Qs:**

- **Q-A1:** Confirmed. Ring ONLY. `whileTap={{ scale: 0.97 }}` owns the press-scale; adding a CSS `active:scale` would be dead (framer-motion's inline `transform` overrides). No `active:scale` added.
- **Q-A2:** Confirmed. **Normal outward ring**, NOT `ring-inset`. The `overflow-hidden` is on the element itself — it clips *descendants* (the chat preview bubbles), not its own `box-shadow`/outline. The existing selection ring (`ring-2 ring-transparent ring-offset-2`) is already outward on this same element, proving outward works. The parent grid (`grid grid-cols-2 gap-3`) has no overflow constraint.
- **Q-A3:** **With offset** — `focus-visible:ring-offset-2 focus-visible:ring-offset-background`. This matches the selected-state's own `ring-offset-2 ring-offset-background`, so the focus ring appears at the same visual spacing whether the card is selected or not (the CollectionsPage color-swatch precedent). On selected cards, `focus-visible:ring-ring` overrides `ring-transparent` via `:focus-visible` pseudo-class specificity (Tailwind ring utilities share `--tw-ring-*` custom properties — the more-specific variant wins). On unselected cards, it's a fresh focus ring at the same offset. Clean.

---

### FILE 2: `src/pages/ChatWallpapersPage.tsx`

**Control (B) — "Default" button, L180 className**

```diff
-                        className="flex-1 h-7 rounded-full bg-white text-black text-[10px] font-bold inline-flex items-center justify-center gap-0.5 active:scale-95 transition-all"
+                        className="flex-1 h-7 rounded-full bg-white text-black text-[10px] font-bold inline-flex items-center justify-center gap-0.5 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
```

**Control (C) — "Remove" button, L188 className**

```diff
-                      className="h-7 w-7 rounded-full bg-rose-500/80 hover:bg-rose-500 text-white inline-flex items-center justify-center active:scale-95 transition-all"
+                      className="h-7 w-7 rounded-full bg-rose-500/80 hover:bg-rose-500 text-white inline-flex items-center justify-center active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
```

**Rationale — answers to your Qs:**

- **Q-B/C:** Confirmed. **`ring-inset`** on both, not plain outward. Both buttons sit inside `absolute inset-x-0 bottom-0 p-2` (8px inset) inside a `rounded-xl overflow-hidden` parent `motion.div`. A plain outward `box-shadow` ring would clip at the bottom rounded corners (12px radius, buttons at ~8px inset — the ring extends ~2px outward from the button's edge, sitting at ~6px from the parent edge, intersecting the curve). This matches the SavedPostsPage remove-button precedent exactly (6px inset inside `rounded-xl`). Existing `active:scale-95 transition-all` kept untouched on both.

---

## Summary

| Metric | Value |
|--------|-------|
| Controls touched | 3 (A, B, C) |
| Lines changed | 3 ins / 3 del / 0 net |
| Attrs added | 0 new attrs (A already has `aria-pressed` + `aria-label`; C already has `aria-label`; B has visible text as accessible name) |
| Hard rule | ✅ Zero logic/handler/state/routing/supabase changes — className strings only |
| `npm run update` | Must pass (type-check + worker type-check + production build) |

**No divergences from your proposals.** All three answers confirm your analysis exactly — the only thing worth double-checking at build time is that the `focus-visible:ring-offset-*` utilities on (A) don't conflict with the conditional `ring-offset-*` from the selected state (they won't — `:focus-visible` specificity overrides the static variant, and when focus leaves, the static ring returns to `ring-transparent` = invisible).
