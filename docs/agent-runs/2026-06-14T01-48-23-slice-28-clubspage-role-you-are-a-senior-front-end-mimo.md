# MiMo run — 2026-06-14T01:48:23.903Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 28 — ClubsPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props (do NOT add whileTap). If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it for the owner.

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for pure icon-scale with no hover color. If transition-all already present, just append active:scale + ring (DON'T-CHURN). If a raw control has transition-colors AND a hover color AND we are adding active:scale, FLIP transition-colors -> transition-all. If a raw control has an EXISTING valid active:scale, KEEP it (DON'T renumber to the nominal tier).
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens. RAW <input>/<textarea> that ALREADY carry their own focus:ring (e.g. focus:ring-2 focus:ring-rose-500/30) -> LEAVE AS-IS (never active:scale).
- ring-inset KEY CSS FACT: overflow-hidden clips an element's DESCENDANTS, not its OWN box-shadow/ring. ring-inset is needed when the focusable control sits FLUSH/a few px INSIDE a SEPARATE overflow-hidden rounded ancestor. A control with ample padding clearance (e.g. p-3/p-4) inside an overflow-hidden container does NOT need ring-inset.
- Toggle/segmented controls whose pressed-state is conveyed ONLY by background also get aria-pressed (display-only). Disclosure/expand-collapse controls get aria-expanded. Controls with visible text get their accessible name from text (no aria-label); icon-only controls need aria-label.

PAGE: src/pages/ClubsPage.tsx (302 lines, /clubs, useAuth, SwipeBackContainer). "Clubs" directory: hero stat card + search input + horizontal category-chip filter row + a list of club cards; each club card = avatar + name/privacy/meta/description + a Join/Leave toggle button. Backed by clubs + club_members.

SKIP (confirm): Back shadcn <Button aria-label="Back" variant="ghost" size="icon"> L157 (ships tokens, labeled); the search <input type="search"> L185 (RAW but ALREADY focus:outline-none focus:ring-2 focus:ring-rose-500/30 -> leave as-is); all presentational motion.div (hero L170, club-card wrapper L243 — no onClick) + img/span/p + the skeleton/empty-state divs.

TWO controls:

(A) Category chips, L198-208 — RAW <button type="button">, .map over categories, onClick={() => setActiveCategory(c)}. cn() base = "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize" + (activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"). transition-all ALREADY. Selection conveyed ONLY by bg. Visible label {c} (the category name, CONSTANT per button). Parent `flex gap-2 overflow-x-auto scrollbar-hide` (horizontal scroll chip row).
Q-A: append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` into the cn base (after capitalize) + add `aria-pressed={activeCategory === c}` (chip/segmented tier [0.97]; DON'T-CHURN transition-all; selection-by-bg-only -> aria-pressed; label constant per button -> aria-pressed valid; visible text -> NO aria-label; OUTWARD ring not inset — this is the EXACT TrendingTopicsPage L133/L141 precedent: chips in `flex gap-2 overflow-x-auto scrollbar-hide` use plain ring-ring, the slight vertical ring overlap with the scroll row is the accepted house standard, NOT ring-inset)? Confirm.

(B) Join/Leave toggle button, L281-293 — RAW <button type="button">, disabled={busy}, onClick={() => (joined ? leaveMutation.mutate(c.id) : joinMutation.mutate(c.id))}. cn() base = "shrink-0 h-9 px-3 rounded-full text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all" + (joined ? "bg-secondary text-foreground hover:bg-muted" : "bg-ig-gradient text-white shadow-sm shadow-rose-500/25 hover:opacity-90"). ALREADY active:scale-95 + transition-all + hover (opacity/bg). NO ring. Content = visible "Join" OR (Check icon + "Joined") — the VISIBLE LABEL FLIPS with state. Sits on the right of a club-card `flex items-center gap-3 p-3 rounded-2xl bg-card border` (NOT overflow-hidden), p-3 clearance.
Q-B: append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (DON'T-CHURN — already has active:scale-95 + transition-all eases hover; KEEP active:scale-95, do NOT renumber to [0.97] [existing valid scale]; visible text label -> NO aria-label; p-3 card not overflow-hidden -> normal OUTWARD ring). a11y JUDGMENT CALL: I am NOT adding aria-pressed here because the ACCESSIBLE NAME ITSELF FLIPS ("Join" -> "Joined") so the state is conveyed by VISIBLE TEXT (+icon +bg), NOT bg-only — the house rule scopes aria-pressed to controls conveyed ONLY by background (e.g. the chips in A). A label-flipping Join/Joined (Follow/Following-style) action button announces its state through its name. Do you AGREE (skip aria-pressed), or do you prefer ADDING aria-pressed={joined} anyway (treating Join/Joined as a toggle)? Pick one and say why. Note disabled preserved (:active/:focus-visible don't fire while disabled).

============================================================
DELIVERABLE: For each control (A)(B) give the EXACT final className string + any attrs. Note where you DIVERGE and why. Resolve B (aria-pressed: skip [my lean] vs add) explicitly. Flag any keyboard/logic gaps for the owner. Keep it tight.
- files: src/pages/ClubsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Two controls, both RAW `<button type="button">`. The page is straightforward — a chip row filter + a Join/Leave toggle per card. No shadcn collisions, no overflow-hidden clipping risk, no `motion.button` (the cards are `motion.div` wrappers with no `onClick`).

**Confirmed SKIP list:** Back shadcn `<Button>` (L157, ships tokens, labeled); search `<input type="search">` (L185, RAW but already `focus:ring-2 focus:ring-rose-500/30`); all presentational `motion.div` (hero L170, club-card wrapper L243 — no `onClick`); all `<img>`/`<span>`/`<p>`; skeletons + empty-state divs.

---

## Exact changes

### (A) Category chips — L198-208

**Before (the `cn()` first-arg string + the `<button>` opening):**
```tsx
<button
  key={c}
  type="button"
  onClick={() => setActiveCategory(c)}
  className={cn(
    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
    activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
  )}
>
```

**After:**
```tsx
<button
  key={c}
  type="button"
  onClick={() => setActiveCategory(c)}
  aria-pressed={activeCategory === c}
  className={cn(
    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
  )}
>
```

**Rationale (all confirmed):**
- **DON'T-CHURN `transition-all`** — already present; just append tokens after `capitalize`
- `active:scale-[0.97]` — chip/segmented-pill tier
- `aria-pressed={activeCategory === c}` — selection conveyed ONLY by background; visible label `{c}` is **constant per button** (the category name doesn't change) → `aria-pressed` is valid and meaningful
- Visible text → **NO `aria-label`**
- **OUTWARD ring, not `ring-inset`** — parent is `flex gap-2 overflow-x-auto scrollbar-hide` (not `overflow-hidden`); this is the exact **TrendingTopicsPage L133/L141 precedent**: chips in a horizontal-scroll row use plain `ring-ring`. The slight vertical ring overlap with the scroll row is the accepted house standard across 28+ slices (EventsPage chips, ChatMediaGallery chip rows, CustomFolders chips).

**Your Q-A: CONFIRM.** Exact match to the TrendingTopicsPage precedent.

---

### (B) Join/Leave toggle — L281-293

**Before (the `cn()` first-arg string):**
```tsx
<button
  type="button"
  disabled={busy}
  onClick={() => (joined ? leaveMutation.mutate(c.id) : joinMutation.mutate(c.id))}
  className={cn(
    "shrink-0 h-9 px-3 rounded-full text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all",
    joined
      ? "bg-secondary text-foreground hover:bg-muted"
      : "bg-ig-gradient text-white shadow-sm shadow-rose-500/25 hover:opacity-90",
  )}
>
```

**After:**
```tsx
<button
  type="button"
  disabled={busy}
  onClick={() => (joined ? leaveMutation.mutate(c.id) : joinMutation.mutate(c.id))}
  className={cn(
    "shrink-0 h-9 px-3 rounded-full text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    joined
      ? "bg-secondary text-foreground hover:bg-muted"
      : "bg-ig-gradient text-white shadow-sm shadow-rose-500/25 hover:opacity-90",
  )}
>
```

**Rationale (all confirmed):**
- **Ring-only** — append the two ring classes after `transition-all`; nothing else changes
- **DON'T-CHURN `active:scale-95`** — existing valid scale, do NOT renumber to `[0.97]` (InterestsPage Remove-X, CreatorGoalsPage Save/Cancel precedent)
- **DON'T-CHURN `transition-all`** — already eases both `hover:bg-muted` (color) and `hover:opacity-90` (opacity) alongside the existing `active:scale-95` transform; correct as-is
- `disabled` preserved — `:active`/`:focus-visible` don't fire while disabled → no conflict
- Visible text ("Join" / "Joined") → **NO `aria-label`**
- Card `flex items-center gap-3 p-3 rounded-2xl bg-card border` is **NOT `overflow-hidden`**; `p-3` clearance → **normal OUTWARD ring**

**The `aria-pressed` judgment: SKIP (agree with your lean).**

Here's why: the accessible name **itself** flips — "Join" vs "Joined" (+ Check icon + bg gradient change). A screen reader announces "Join, button" or "Joined, button" — the state is semantically embedded in the name. This is the established **Follow/Following** pattern used throughout the repo (FriendRequests Accept/Decline, CreatorSubscribers follow buttons) where label-flipping action buttons do NOT carry `aria-pressed`. The house rule scopes `aria-pressed` to controls whose state is conveyed **only** by background change (chips, segmented pills, toggles with static labels).

Strict ARIA pedantry says `aria-pressed` is "never wrong" for a toggle, and a future owner could add `{aria-pressed={joined}}` as a strengthener — but for this pass, SKIP is correct and consistent with the 28+ prior slices.

---

## Diff summary

| Control | `className` edit | New attrs | Churn |
|---------|-----------------|-----------|-------|
| (A) Category chips | Append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` after `capitalize` | +`aria-pressed={activeCategory === c}` | NONE — `transition-all` untouched |
| (B) Join/Leave | Append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` after `transition-all` | none | NONE — `active:scale-95` + `transition-all` untouched |

**Git diff: 3 ins / 2 del, +1 net** — the +1 is the new standalone `aria-pressed` attribute line on (A). The two `−`/`+` pairs are the className-string-only edits on (A) and (B).

---

## HARD RULE guard — logic untouched

Every `onClick`/`setActiveCategory`/`joined`/`busy`/`joinMutation.mutate`/`leaveMutation.mutate`/`disabled`/`setBusyId`/`useQuery` (both keys)/`useMutation` (`onMutate`/`onSettled`/`onSuccess`/`onError`)/`useMemo` (`joinedIds`/`categories`/`filtered`)/`useState`/`supabase…from("clubs")`+`from("club_members")` select/insert/delete/eq/order/`toast`/`cn` — **all left byte-identical**. The only changes are two className-string appends and one new standalone `aria-pressed` attribute.

---

## Responsive (375/768/1280 — clean)

- `max-w-2xl mx-auto px-4` → ~343px inner at 375px
- Category chips `flex gap-2 overflow-x-auto scrollbar-hide` — short labels ("All" + categories), fit or scroll cleanly
- Club card `flex items-center gap-3 p-3` → ~319px usable: avatar `h-12 w-12` 48px + gap 12px + Join `h-9 px-3` ~80px = ~140px fixed, leaving ~179px for the `flex-1 min-w-0` name/description column → **no crush**
- Hero stat card `p-5` → comfortable
- Search `h-11` → full width, comfortable

---

## Keyboard gaps to flag (NOT fixed — owner action)

**None beyond the established repo pattern.** Both controls are real `<button>` elements — natively focusable, rings now functional. The search `<input>` has its own existing focus ring. The club card `motion.div` wrapper has no `onClick` (it's not navigable to a detail page — this is a flat directory with Join/Leave only).

**Owner flag (established repo compact pattern, not a per-page fix):** sub-44px tap targets — Join/Leave `h-9` ~36px, category chips `py-1.5` ~30px, back `h-10 w-10` ~40px.

---

## Verification

Run `npm run update` — must pass (type-check + worker type-check + production build, TRUE EXIT 0). The page is auth-gated (`useAuth` needed for memberships query and Join/Leave) + needs `clubs` rows for non-empty list + needs `categories.length > 1` for the chip row to mount — so preview relies on the green gate + the guard-clean 3/2 className+aria-only diff + byte-identical token patterns proven on 28+ prior slices.
