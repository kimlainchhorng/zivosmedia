# MiMo run — 2026-06-14T01:22:23.669Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 26 — PollsPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it for the owner.

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for pure icon-scale with no hover color. If transition-all already present, just append active:scale + ring. If a raw control has active:scale but NO transition utility (scale snaps), ADD transition-(all|transform). If a raw control has transition-colors AND a hover color AND we are adding active:scale, FLIP transition-colors -> transition-all (transition-colors won't ease a transform). If a raw control has NO transition utility AND a hover color, ADD transition-all.
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens. RAW <input>/<textarea> that ALREADY carry their own focus:ring (e.g. focus:ring-2 focus:ring-rose-500/30) -> LEAVE AS-IS (don't touch, never active:scale).
- framer-motion motion.button WITH whileTap -> focus RING ONLY. motion.button WITHOUT whileTap -> CSS active:scale is LIVE.
- Non-interactive div/span/img with no onClick -> NOTHING.
- ring-inset KEY CSS FACT: overflow-hidden clips an element's DESCENDANTS, not its OWN box-shadow/ring. ring-inset is needed when the focusable control sits flush/a few px INSIDE a SEPARATE overflow-hidden rounded ancestor (outward ring would clip), OR a tight grid gutter would bleed. A control with ample padding clearance (e.g. p-4) inside an overflow-hidden container does NOT need ring-inset.
- Toggle/segmented controls whose pressed-state is conveyed ONLY by background also get aria-pressed (display-only). Controls with visible text get their accessible name from text (no aria-label); icon-only controls need aria-label.

PAGE: src/pages/PollsPage.tsx (423 lines, /polls, ProtectedRoute via useAuth, SwipeBackContainer). IG-style poll manager (create poll w/ up to 4 options, anonymity, live results). Backed by social_polls + social_poll_votes.

SKIP (confirm): Back shadcn <Button> L190 (labeled); "New" shadcn <Button> L200; "Post poll" shadcn <Button> L306; "Create your first poll" shadcn <Button> L333; the question <textarea> L246 (RAW but ALREADY focus:outline-none focus:ring-2 focus:ring-rose-500/30 -> leave as-is); the option <input> L257 (RAW but ALREADY focus:ring-2 focus:ring-rose-500/30 -> leave as-is); the anonymity <input type="checkbox"> L303 (native checkbox inside a <label> -> native browser focus, NOT in the raw-button/link token scope, active:scale would be wrong -> I lean LEAVE AS-IS; confirm or do you want a focus-visible ring on it?); all presentational motion.div (banner L214, create-form container L229, poll card L349, result bar L386 — no onClick).

The create-form container (L229) is `overflow-hidden` (for the AnimatePresence height collapse) but has `p-4` — controls A/B/C/D inside it have ample padding clearance from the overflow-hidden edge, so OUTWARD rings (NOT ring-inset) — confirm.

FIVE controls:

(A) Cancel "X" (create form header), L237-244 — RAW <button type="button">, aria-label="Cancel" ALREADY, onClick closes the form. className = "h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground". Icon-only (X). Has hover:bg-secondary. NO transition/scale/ring. Parent `flex items-center justify-between` (inside the p-4 overflow-hidden create form).
Q-A: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon tier scale-95; transition-all because hover:bg-secondary must fade alongside the press; normal OUTWARD ring — rounded-full ring shape, ample p-4 clearance), aria-label already present (no change)? Confirm.

(B) Remove option "X", L266-273 — RAW <button type="button">, aria-label="Remove option" ALREADY, onClick removes the option. className = "h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center". Icon-only (X). Has hover:text-destructive + hover:bg-destructive/10. NO transition/scale/ring. Parent `flex items-center gap-2`.
Q-B: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon tier; transition-all for the hover color/bg fade; OUTWARD ring), aria-label already present? Confirm.

(C) "Add option" text button, L278-284 — RAW <button type="button">, onClick adds an option, visible text "Add option" + Plus icon = accessible name. className = "text-xs font-bold text-ig-gradient inline-flex items-center gap-1". NO padding, NO rounding, NO transition/scale/ring, NO hover-color.
Q-C: add `transition-transform active:scale-[0.97] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (small text-link tier [0.97]; transition-transform — no hover-color → pure scale; rounded-sm added so the ring has a shape on the unpadded inline text [SmartSearch "Clear" precedent]; OUTWARD ring; visible text → NO aria-label; NO aria-pressed — it's an action)? Confirm tier [0.97] + rounded-sm (vs rounded-md).

(D) Duration segmented pills, L288-300 — RAW <button type="button">, .map over ["1d","3d","7d","none"], onClick={() => setDuration(d)}. cn() base = "px-3 py-1.5 rounded-full text-xs font-bold transition-all" + (duration === d ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"). transition-all ALREADY present. Selection conveyed ONLY by bg. Visible label = accessible name. Parent `flex flex-wrap items-center gap-2` (gap-2 = 8px).
Q-D: append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn base (segmented tier [0.97]; transition-all already present) + add `aria-pressed={duration === d}` (selection by bg only); normal OUTWARD ring (gap-2 = 8px comfortable, not overflow-hidden at this level)? Confirm.

(E) Delete poll "Trash", L367-374 — RAW <button type="button">, aria-label="Delete poll" ALREADY, onClick confirms + deletes. className = "shrink-0 h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors". Icon-only (Trash2). Has transition-colors + hover:text-destructive + hover:bg-destructive/10. NO scale, NO ring. Inside the poll card `rounded-2xl bg-card border p-4` (NOT overflow-hidden).
Q-E: FLIP transition-colors -> transition-all (so the added active:scale eases; transition-colors won't transition a transform) + append `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon tier; OUTWARD ring — card not overflow-hidden), aria-label already present? Confirm the transition-colors->transition-all flip.

============================================================
DELIVERABLE: For each control (A)(B)(C)(D)(E) give the EXACT final className string + any attrs. Note where you DIVERGE and why. Resolve the checkbox-skip and C rounding (rounded-sm vs rounded-md) explicitly. Flag any keyboard/logic gaps for the owner. Keep it tight.
- files: src/pages/PollsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

5 raw `<button>` controls, all className-only (plus 1 new `aria-pressed`). No logic/handler/state changes. Confirm the three open questions (checkbox skip, C rounding, overflow-hidden ring direction), then apply.

---

## Confirmations

**Checkbox `<input type="checkbox">` (L303): LEAVE AS-IS.** Native checkbox inside a `<label>` — `active:scale` on a toggle indicator feels wrong (small square, not a pressable button). The browser's native focus ring handles keyboard visibility. If the owner wants a styled focus ring to match the design system, that's a separate styling decision (not a raw-button/link token scope issue).

**Control (C) rounding: `rounded-sm`.** The "Add option" text is `text-xs font-bold inline-flex items-center gap-1` with **zero padding**. The inline box is ~16px tall (text line-height only). `rounded-sm` (2px) is proportionate to the unpadded box; `rounded-md` (6px) would look odd on a bare inline text element. SmartSearch "Clear" precedent confirms this.

**Create-form `overflow-hidden`: OUTWARD ring (NOT ring-inset).** The container has `p-4` = 16px padding. Buttons sit inside the content area, 16px from the container's clipping edge. A 2px outward ring easily fits in that clearance. `overflow-hidden` clips at the padding-box boundary; the ring doesn't reach it.

---

## Exact diffs (one file: `src/pages/PollsPage.tsx`)

### (A) Cancel "X" — L237–244

```diff
                 <button
                   type="button"
                   aria-label="Cancel"
                   onClick={() => { setCreating(false); setQuestion(""); setOptionsDraft(["", ""]); }}
-                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
+                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 >
```

Tokens: `transition-all` (hover:bg-secondary fade) · icon tier `scale-95` · outward ring (`rounded-full` shape) · aria-label already present — **0 attr changes**.

---

### (B) Remove option "X" — L266–273

```diff
                       <button
                         type="button"
                         aria-label="Remove option"
                         onClick={() => setOptionsDraft((p) => p.filter((_, i) => i !== idx))}
-                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center"
+                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                       >
```

Tokens: `transition-all` (hover:text + hover:bg fade) · icon tier `scale-95` · outward ring · aria-label already present — **0 attr changes**.

---

### (C) "Add option" text button — L278–284

```diff
                 {optionsDraft.length < 4 && (
                   <button
                     type="button"
                     onClick={() => setOptionsDraft((p) => [...p, ""])}
-                    className="text-xs font-bold text-ig-gradient inline-flex items-center gap-1"
+                    className="text-xs font-bold text-ig-gradient inline-flex items-center gap-1 transition-transform active:scale-[0.97] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   >
```

Tokens: **`transition-transform`** (no hover-color → pure scale) · small text-link tier `[0.97]` · **`rounded-sm`** (ring shape on unpadded inline box; SmartSearch "Clear" precedent) · outward ring · visible "Add option" text = accessible name → **NO aria-label** · **NO aria-pressed** (action, not toggle) — **0 attr changes**.

---

### (D) Duration segmented pills — L288–300

```diff
                 {(["1d", "3d", "7d", "none"] as const).map((d) => (
                   <button
                     key={d}
                     type="button"
+                    aria-pressed={duration === d}
                     onClick={() => setDuration(d)}
                     className={cn(
-                      "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
+                      "px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                       duration === d ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                     )}
```

Tokens: `transition-all` already present ✓ · segmented tier `[0.97]` · outward ring (parent `flex flex-wrap gap-2` NOT overflow-hidden, 8px gutter = comfortable) · **`aria-pressed={duration === d}`** (selection conveyed ONLY by bg) · visible label = accessible name → NO aria-label — **1 new attr line**.

---

### (E) Delete poll "Trash" — L367–374

```diff
                     <button
                       type="button"
                       aria-label="Delete poll"
                       onClick={() => { if (confirm("Delete this poll?")) deleteMutation.mutate(p.id); }}
-                      className="shrink-0 h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
+                      className="shrink-0 h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                     >
```

Tokens: **FLIP `transition-colors` → `transition-all`** (hover:text + hover:bg need fade; added `active:scale` won't ease under `transition-colors`) · icon tier `scale-95` · outward ring (poll card `rounded-2xl bg-card border p-4` — NOT `overflow-hidden`) · aria-label already present — **0 attr changes**.

---

## Summary

| Control | className lines | new attrs | Notes |
|---------|----------------|-----------|-------|
| (A) Cancel X | 1 modified | 0 | `transition-all` added (hover:bg) |
| (B) Remove X | 1 modified | 0 | `transition-all` added (hover:text+bg) |
| (C) Add option | 1 modified | 0 | `transition-transform` + `rounded-sm` (no hover) |
| (D) Duration pills | 1 modified | 1 new (`aria-pressed`) | `transition-all` pre-existing |
| (E) Delete trash | 1 modified | 0 | `transition-colors` → `transition-all` flip |

**git diff: 6 ins / 5 del (+1 net)** — the +1 is the standalone `aria-pressed` line.

**HARD RULE:** Every `onClick` / `setCreating` / `setQuestion` / `setOptionsDraft` / `setDuration` / `createMutation.mutate` / `deleteMutation.mutate` / `confirm` / `supabase` / `useQuery` / `useMutation` / `useState` / `useMemo` / `useNavigate` / `qc.invalidateQueries` / `toast` — all left byte-identical. Only the 5 className strings modified + 1 standalone `aria-pressed` attribute added.

**Responsive 375/768/1280 — clean:** (A) `h-8 w-8` in a `flex justify-between` header row; (B) `h-8 w-8` in `flex items-center gap-2` with `flex-1` input — 32px + 8px gap fits; (C) inline text auto-sizes; (D) `flex flex-wrap gap-2` — 4 pills wrap to 2 rows at 375px; (E) `shrink-0 h-8 w-8` beside `flex-1 min-w-0` question text. **No crush.**

**No keyboard gaps** — all 5 controls are real `<button>` elements (natively focusable; added rings are functional, not dead CSS).

**Owner flags (NOT className-fixable):**
1. **Poll result bars are non-interactive** — the option result rows (`motion.div` bars at ~L380–400) have no `onClick`/`role`/`tabIndex`. Users can create polls but can't VOTE from this page (only view results). If voting is intended here, that's a logic addition.
2. **Sub-44px tap targets** (established repo compact pattern): cancel/remove/delete buttons `h-8 w-8` = 32px, "Add option" `text-xs` ~16px tall, duration pills `py-1.5` ~30px. Flag, not a per-page fix.

**Verify:** `npm run update` must pass (0 TypeScript errors + production build).
