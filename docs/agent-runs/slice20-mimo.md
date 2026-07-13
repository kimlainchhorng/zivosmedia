# MiMo run — 2026-06-14T00:30:55.818Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

Two pages, two controls total. Both are raw/motion buttons (not shadcn). Inventory confirmed exhaustive by line-by-line audit of each file.

---

## FILE 1: `src/pages/CloseFriendsPage.tsx` — Friend-row toggle (L285-296)

**Current** (L292-295, className):
```tsx
"w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left active:scale-[0.98]",
```

**Proposed:**
```tsx
"w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

**Changes (1 line, 2 edits on that line):**
1. `transition-colors` → `transition-all` — `transition-colors` does **not** animate `transform`, so the existing `active:scale-[0.98]` currently snaps with zero animation. `transition-all` makes the scale ease **and** preserves the `hover:bg-secondary/40` color fade.
2. Append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — this is a real `<button>` (motion.button without `whileTap` renders a native `<button>`), so keyboard focus is functional, not dead CSS.

**Answers to your specific questions:**

- **Q1a:** Yes, add the ring. It's a focusable `<button>`; the ring is real.
- **Q1b:** Yes, change `transition-colors` → `transition-all`. Without it, the pre-existing `active:scale-[0.98]` is a dead snap — no easing at all. This is the same fix applied on CommunityDetailPage's Join/Leave (`transition-colors`→`transition-all`).
- **Q1c:** Leave at `[0.98]`. Per the tier definition, `[0.99]` is technically for "full-width / menu-rows / wide-rows" and `[0.98]` for "wide/card." This row sits in the gray zone — it's `w-full` but it's a toggle CTA (tap to add/remove), not a navigational menu row. The CommunityDetailPage Join/Leave (same pattern: `w-full py-2.5 rounded-xl` toggle) also uses `[0.98]`. The visual delta is 1%. Not worth the churn.

**No other edits.** `aria-pressed={isCF}` already present. `disabled={pendingId === ...}` untouched. All `onClick`/`toggle`/`addMutation`/`removeMutation`/supabase queries left byte-identical.

---

## FILE 2: `src/pages/ActivityFeedPage.tsx` — Filter chips (L128-134)

**Current** (L129-131):
```tsx
<Badge key={f} variant={filter === f ? "default" : "outline"} className="cursor-pointer capitalize shrink-0"
  onClick={() => setFilter(f)}>
  {f}
</Badge>
```

**Proposed:**
```tsx
<Badge key={f} variant={filter === f ? "default" : "outline"} className="cursor-pointer capitalize shrink-0 transition-all active:scale-[0.97]"
  onClick={() => setFilter(f)}
  aria-pressed={filter === f}>
  {f}
</Badge>
```

**Changes (3 edits):**
1. Append `transition-all active:scale-[0.97]` to the existing className string.
2. Add `aria-pressed={filter === f}` attribute (display-only — conveys selection state that is currently only visible via `variant` bg change).

**Answers:**

- **Q2a:** **Yes, confirmed.** Identical to the BadgesPage precedent (slice 18): shadcn `<Badge>` renders a `<div>` with `onClick` → add `aria-pressed` + `transition-all active:scale-[0.97]`, **NO focus ring** (ring is dead CSS on a non-focusable `<div>`). Tier `[0.97]` = segmented filter chips, matching AchievementsPage/ChallengesPage/CoinTransfersPage filter tabs.
- **Q2b:** **Yes, flag it.** Owner must add `tabIndex={0}` + `role="button"` + `onKeyDown={(e) => e.key === 'Enter' && setFilter(f)}` for keyboard access. After which a `focus-visible:ring` can be added in a follow-up. This is the standard BadgesPage owner-flag — exact same pattern.

**No other edits.** `onClick={() => setFilter(f)}` byte-identical. `LoadFailureCard`/`DegradedDataBanner` = child components own their controls. `ActivityRow` = `motion.div` with no `onClick` = nothing.

---

## Summary diff (2 files, 2 controls, 2 lines changed + 1 attr added)

```diff
--- a/src/pages/CloseFriendsPage.tsx
+++ b/src/pages/CloseFriendsPage.tsx
@@ -292,1 +292,1
-                    "w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left active:scale-[0.98]",
+                    "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",

--- a/src/pages/ActivityFeedPage.tsx
+++ b/src/pages/ActivityFeedPage.tsx
@@ -129,3 +129,4 @@
-            <Badge key={f} variant={filter === f ? "default" : "outline"} className="cursor-pointer capitalize shrink-0"
-              onClick={() => setFilter(f)}>
+            <Badge key={f} variant={filter === f ? "default" : "outline"} className="cursor-pointer capitalize shrink-0 transition-all active:scale-[0.97]"
+              onClick={() => setFilter(f)}
+              aria-pressed={filter === f}>
               {f}
```

## Owner flags (NOT in scope — logic/structural)

1. **ActivityFeedPage `<Badge>` filter keyboard inaccessibility** — renders a `<div>` with `onClick` but no `tabIndex`/`role`/`onKeyDown`. Keyboard users cannot reach or activate the filter chips. Fix: `tabIndex={0}` + `role="button"` + `onKeyDown` handler, then add `focus-visible:ring` in a follow-up.

## Verification

Run `npm run update` (type-check + worker type-check + production build — must pass with 0 errors). Preview at 375/768/1280 on both `/close-friends` and `/activity`.
