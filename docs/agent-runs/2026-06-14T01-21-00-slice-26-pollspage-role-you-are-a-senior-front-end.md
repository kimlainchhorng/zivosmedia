# DeepSeek run — 2026-06-14T01:21:00.996Z

- model: deepseek-chat
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

# SLICE 26 — PollsPage: Interaction Token + A11y Pass

## Plan

Apply className-only interaction tokens + display-only aria attributes to 5 raw controls on `src/pages/PollsPage.tsx`. No logic changes, no handler changes, no new framer props. Follow the house token rules from `JobPostingDetailPage.tsx` reference.

## Control-by-Control Analysis

### (A) Cancel "X" — L237-244
**Before:**
```tsx
className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
```
**After:**
```tsx
className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **Tier:** icon-only `scale-95`
- **transition-all** (has `hover:bg-secondary`)
- **OUTWARD ring** — `rounded-full` gives ring shape; parent `flex items-center justify-between` inside `p-4 overflow-hidden` container has ample clearance (the `p-4` padding is well beyond the ~2px ring)
- **aria-label="Cancel"** already present → no change
- **Confirmed ✓**

### (B) Remove option "X" — L266-273
**Before:**
```tsx
className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center"
```
**After:**
```tsx
className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **Tier:** icon-only `scale-95`
- **transition-all** (has `hover:text-destructive` + `hover:bg-destructive/10`)
- **OUTWARD ring** — same reasoning as (A); `rounded-full` ring shape, ample padding
- **aria-label="Remove option"** already present → no change
- **Confirmed ✓**

### (C) "Add option" text button — L278-284
**Before:**
```tsx
className="text-xs font-bold text-ig-gradient inline-flex items-center gap-1"
```
**After:**
```tsx
className="text-xs font-bold text-ig-gradient inline-flex items-center gap-1 transition-transform active:scale-[0.97] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **Tier:** small text-link `[0.97]`
- **transition-transform** — no hover-color/bg → pure scale animation
- **rounded-sm** — gives the ring a subtle shape on the unpadded inline text (SmartSearch "Clear" precedent). `rounded-sm` is correct here because the button has no padding and sits inline with text; `rounded-md` would look too large for the tiny text size
- **OUTWARD ring** — parent `space-y-2` not overflow-hidden
- **NO aria-label** — visible "Add option" text = accessible name
- **NO aria-pressed** — it's an action (adds an option), not a toggle
- **Confirmed ✓**

### (D) Duration segmented pills — L288-300
**Before:**
```tsx
className={cn(
  "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
  duration === d ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
```
**After:**
```tsx
className={cn(
  "px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  duration === d ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
```
Plus add `aria-pressed={duration === d}` to the `<button>` element.

- **Tier:** segmented pill `[0.97]`
- **transition-all** already present → just append `active:scale-[0.97]` + ring
- **OUTWARD ring** — parent `flex flex-wrap items-center gap-2` has 8px gap, comfortable clearance; not overflow-hidden at this level
- **aria-pressed** — selection conveyed ONLY by background color (no text change, no icon)
- **Confirmed ✓**

### (E) Delete poll "Trash" — L367-374
**Before:**
```tsx
className="shrink-0 h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
```
**After:**
```tsx
className="shrink-0 h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **FLIP `transition-colors` → `transition-all`** — `transition-colors` won't animate the new `active:scale-95` transform; `transition-all` keeps the hover color/bg fade smooth AND eases the press scale
- **Tier:** icon-only `scale-95`
- **OUTWARD ring** — poll card `rounded-2xl bg-card border p-4` is NOT overflow-hidden
- **aria-label="Delete poll"** already present → no change
- **Confirmed ✓**

## Skip List (confirmed)

| Element | Line | Reason |
|---------|------|--------|
| Back `<Button>` | L190 | shadcn — ships tokens |
| "New" `<Button>` | L200 | shadcn — ships tokens |
| "Post poll" `<Button>` | L306 | shadcn — ships tokens |
| "Create your first poll" `<Button>` | L333 | shadcn — ships tokens |
| `<textarea>` question | L246 | RAW but ALREADY has `focus:outline-none focus:ring-2 focus:ring-rose-500/30` → leave as-is |
| `<input>` option | L257 | RAW but ALREADY has `focus:outline-none focus:ring-2 focus:ring-rose-500/30` → leave as-is |
| `<input type="checkbox">` anonymity | L303 | Native checkbox inside `<label>` — native browser focus, NOT in raw-button/link token scope. `active:scale` would be wrong on a checkbox. **LEAVE AS-IS** |
| All `motion.div` presentational | L214, L229, L349, L386 | No `onClick` → non-interactive |

## Proposed Diff

```diff
--- a/src/pages/PollsPage.tsx
+++ b/src/pages/PollsPage.tsx
@@ -238,7 +238,7 @@ export default function PollsPage() {
                 <button
                   type="button"
                   aria-label="Cancel"
-                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
+                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   onClick={() => { setCreating(false); setQuestion(""); setOptionsDraft(["", ""]); }}
                 >
                   <X className="h-4 w-4" />
@@ -266,7 +266,7 @@ export default function PollsPage() {
                       <button
                         type="button"
                         aria-label="Remove option"
-                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center"
+                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                         onClick={() => setOptionsDraft((p) => p.filter((_, i) => i !== idx))}
                       >
                         <X className="h-4 w-4" />
@@ -278,7 +278,7 @@ export default function PollsPage() {
                   <button
                     type="button"
                     onClick={() => setOptionsDraft((p) => [...p, ""])}
-                    className="text-xs font-bold text-ig-gradient inline-flex items-center gap-1"
+                    className="text-xs font-bold text-ig-gradient inline-flex items-center gap-1 transition-transform active:scale-[0.97] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   >
                     <Plus className="h-3 w-3" strokeWidth={3} /> Add option
                   </button>
@@ -290,6 +290,7 @@ export default function PollsPage() {
                   <button
                     key={d}
                     type="button"
+                    aria-pressed={duration === d}
                     onClick={() => setDuration(d)}
                     className={cn(
                       "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
@@ -367,7 +368,7 @@ export default function PollsPage() {
                     <button
                       type="button"
                       aria-label="Delete poll"
-                      className="shrink-0 h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
+                      className="shrink-0 h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                       onClick={() => { if (confirm("Delete this poll?")) deleteMutation.mutate(p.id); }}
                     >
                       <Trash2 className="h-3.5 w-3.5" />
```

## Owner Flags

1. **No keyboard gaps** — all 5 controls are real `<button>` elements (natively focusable); added rings are functional, not dead CSS.
2. **Sub-44px tap targets** (established repo compact pattern, not a per-page fix): Cancel X `h-8 w-8` (32px), Remove X `h-8 w-8` (32px), "Add option" inline text (~20px), duration pills `py-1.5` (~30px), Delete Trash `h-8 w-8` (32px).
3. **`rounded-sm` on (C)** — deliberate choice matching SmartSearch "Clear" precedent; the unpadded inline text button gets a subtle ring shape without looking oversized.
4. **`transition-colors` → `transition-all` flip on (E)** — necessary because `transition-colors` won't animate the new `active:scale-95` transform. The flip is safe: `transition-all` also covers the existing `hover:text-destructive` + `hover:bg-destructive/10` transitions.
5. **Checkbox skip confirmed** — native `<input type="checkbox">` inside `<label>` gets native browser focus ring; `active:scale` would be semantically wrong for a checkbox (it's not a pressable button). Leave as-is.
