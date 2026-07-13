# DeepSeek run — 2026-06-14T00:29:50.829Z

- model: deepseek-chat
- task: SLICE 20 — SOCIAL CLUSTER: CloseFriendsPage + ActivityFeedPage
==============================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to two customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) pages. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it for the owner — do NOT add the keyboard logic yourself.

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width / menu-rows / wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-* (color fade) or underline; transition-transform for pure icon-scale with no hover color. If transition-all already present, just append active:scale + ring.
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens to them.
- framer-motion motion.button WITH whileTap -> focus RING ONLY (CSS active:scale is DEAD under motion's inline transform). A motion.button WITHOUT whileTap -> CSS active:scale is LIVE and may be kept/used.
- Non-interactive div/span/img with no onClick -> NOTHING.
- A clickable <div> (incl. shadcn <Badge> which renders a div) with onClick but NO tabIndex/role is keyboard-inaccessible -> add aria-pressed + active:scale (NO ring — a ring is dead CSS without role/tabIndex), and FLAG the keyboard gap to owner. (This is the established "BadgesPage precedent.")
- ring-inset only inside overflow-hidden rounded parents where a plain outward ring would clip.

============================================================
FILE 1: src/pages/CloseFriendsPage.tsx (303 lines, /close-friends)
============================================================
Only ONE control needs review (Back = shadcn Button skip; Search = native input already has focus:ring-2 focus:ring-rose-500/30 skip; "Browse feed" = shadcn Button skip).

Friend-row toggle, L246-288:
  <motion.button
    type="button"
    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay: ... }}
    onClick={() => toggle(f.user_id)}
    disabled={pendingId === f.user_id}
    className={cn(
      "w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left active:scale-[0.98]",
      isCF ? "bg-secondary/40" : "hover:bg-secondary/40",
    )}
    aria-pressed={isCF}
  >
Facts: it is a motion.button WITHOUT whileTap (so the CSS active:scale-[0.98] is LIVE). It ALREADY has aria-pressed and active:scale-[0.98]. It has transition-colors and a conditional hover:bg-secondary/40 (color change on hover). It is a full-width wide row.

Q1a: Add focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring? (It's a real <button>, focusable, so the ring is functional — not dead CSS.)
Q1b: Change transition-colors -> transition-all so the existing active:scale-[0.98] actually animates (transition-colors does NOT animate transform)? Or leave transition-colors and let the scale snap?
Q1c: Is [0.98] the right tier for a full-width row, or should it be the [0.99] wide-row value? (Note it's pre-existing at [0.98]; I will not change it unless you give a strong reason.)

============================================================
FILE 2: src/pages/ActivityFeedPage.tsx (241 lines, /activity)
============================================================
Only ONE control needs review (Back = shadcn Button skip; ActivityRow = motion.div with NO onClick -> nothing; LoadFailureCard/DegradedDataBanner = child components own their controls skip).

Filter chips, L148-153:
  {filters.map((f) => (
    <Badge key={f} variant={filter === f ? "default" : "outline"}
      className="cursor-pointer capitalize shrink-0"
      onClick={() => setFilter(f)}>
      {f}
    </Badge>
  ))}
Facts: shadcn <Badge> renders a <div> (or <span>) — NOT a button. It has onClick but NO role/tabIndex -> keyboard-inaccessible. These are segmented filter chips whose selection is conveyed only by variant (default vs outline bg).

Q2a: Confirm the BadgesPage precedent applies: add aria-pressed={filter === f} + transition-all active:scale-[0.97], and do NOT add a focus ring (dead CSS without tabIndex/role). Yes/no + any tweak.
Q2b: Confirm I should FLAG to the owner that these filter chips need tabIndex={0} + role="button" + onKeyDown for keyboard access (out of scope for this className-only pass).

============================================================
DELIVERABLE: For each control, give the EXACT final className string (and any attrs to add). Note where you DIVERGE from my proposed answers above and why. Keep it tight.
- files: src/pages/CloseFriendsPage.tsx, src/pages/ActivityFeedPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 20 — SOCIAL CLUSTER: CloseFriendsPage + ActivityFeedPage

## Plan

Two pages, one control each, both className-only + display-only attrs:

1. **CloseFriendsPage** — friend-row toggle (`motion.button` without `whileTap`, already has `active:scale-[0.98]` + `aria-pressed` + `transition-colors`). Need: add focus ring, fix `transition-colors` → `transition-all` so the press-scale animates.
2. **ActivityFeedPage** — filter chips (shadcn `<Badge>` rendering a `<div>` with `onClick`). Need: `aria-pressed` + `active:scale-[0.97]` + `transition-all` per BadgesPage precedent. No ring (dead CSS). Flag keyboard gap.

---

## Proposed changes

### FILE 1: `src/pages/CloseFriendsPage.tsx`

**Control:** friend-row toggle (L246-288)

**Current className:**
```
"w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left active:scale-[0.98]"
```

**Proposed className:**
```
"w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Changes:**
- `transition-colors` → `transition-all` (so the existing `active:scale-[0.98]` actually animates instead of snapping)
- Append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (functional ring on a real `<button>`)

**Q1a answer:** YES — add the ring. It's a real `<button>` (natively focusable), so the ring is functional CSS, not dead.

**Q1b answer:** YES — change to `transition-all`. The control has `hover:bg-secondary/40` (color fade) AND `active:scale-[0.98]` (transform). `transition-colors` only animates color properties — the scale would snap. `transition-all` covers both.

**Q1c answer:** KEEP `[0.98]`. This is a pre-existing value, and it's the established "wide row" tier from the house style (JobPostingDetailPage's owner close/reopen button uses `[0.99]` for a full-width flush button, but this row has `p-2.5` padding + `rounded-xl` + an inner Avatar/check indicator — `[0.98]` is appropriate for a padded row vs a flush CTA). No change needed.

**Diff:**
```diff
--- a/src/pages/CloseFriendsPage.tsx
+++ b/src/pages/CloseFriendsPage.tsx
@@ -278,7 +278,7 @@ export default function CloseFriendsPage() {
                   disabled={pendingId === f.user_id}
                   className={cn(
-                    "w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left active:scale-[0.98]",
+                    "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                     isCF ? "bg-secondary/40" : "hover:bg-secondary/40",
                   )}
                   aria-pressed={isCF}
```

---

### FILE 2: `src/pages/ActivityFeedPage.tsx`

**Control:** filter chips (L148-153)

**Current:**
```tsx
<Badge key={f} variant={filter === f ? "default" : "outline"}
  className="cursor-pointer capitalize shrink-0"
  onClick={() => setFilter(f)}>
  {f}
</Badge>
```

**Proposed:**
```tsx
<Badge key={f} variant={filter === f ? "default" : "outline"}
  className="cursor-pointer capitalize shrink-0 transition-all active:scale-[0.97]"
  aria-pressed={filter === f}
  onClick={() => setFilter(f)}>
  {f}
</Badge>
```

**Changes:**
- Append `transition-all active:scale-[0.97]` to className
- Add `aria-pressed={filter === f}` (display-only attr, same pattern as AchievementsPage/ChallengesPage/CoinTransfersPage filter tabs)
- **NO focus ring** — `<Badge>` renders a `<div>`, so `focus-visible:ring` would be dead CSS without `tabIndex`/`role`

**Q2a answer:** YES — BadgesPage precedent applies exactly. Add `aria-pressed` + `transition-all active:scale-[0.97]`. No ring. No tweaks needed.

**Q2b answer:** YES — flag the keyboard gap. These chips need `tabIndex={0}` + `role="button"` + `onKeyDown={(e) => e.key === 'Enter' && setFilter(f)}` for keyboard accessibility. Out of scope for this className-only pass.

**Diff:**
```diff
--- a/src/pages/ActivityFeedPage.tsx
+++ b/src/pages/ActivityFeedPage.tsx
@@ -148,7 +148,8 @@ export default function ActivityFeedPage() {
         <div className="flex gap-2 overflow-x-auto no-scrollbar">
           {filters.map((f) => (
             <Badge key={f} variant={filter === f ? "default" : "outline"}
-              className="cursor-pointer capitalize shrink-0"
+              className="cursor-pointer capitalize shrink-0 transition-all active:scale-[0.97]"
+              aria-pressed={filter === f}
               onClick={() => setFilter(f)}>
               {f}
             </Badge>
```

---

## Owner flags

1. **ActivityFeedPage filter chips keyboard gap** — the `<Badge>` renders a `<div>` with `onClick` but no `tabIndex`/`role`/`onKeyDown`. Keyboard users cannot reach or activate the filter. Fix: add `tabIndex={0}` + `role="button"` + `onKeyDown={(e) => e.key === 'Enter' && setFilter(f)}`. (Same pattern as the BadgesPage `<Badge>` filter flagged in Slice 18.)

2. **Verify** — run `npm run update` before committing. Both changes are className-only + one `aria-pressed` attr; no logic, no handlers, no supabase touched. Should pass clean.

---

## Summary

| File | Control | Changes | Ring? | Scale tier |
|------|---------|---------|-------|------------|
| `CloseFriendsPage.tsx` | Friend-row toggle (`motion.button`, no whileTap) | `transition-colors`→`transition-all` + ring | ✅ Yes (real `<button>`) | `[0.98]` (kept) |
| `ActivityFeedPage.tsx` | Filter chips (`<Badge>` = `<div>`) | `aria-pressed` + `transition-all active:scale-[0.97]` | ❌ No (dead CSS on `<div>`) | `[0.97]` (chip tier) |
