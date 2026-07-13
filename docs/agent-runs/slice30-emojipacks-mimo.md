# MiMo run — 2026-06-14T01:50:50.682Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control changes are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/EmojiPacksPage.tsx  (route /emoji-packs — browse public + your own custom emoji packs; backed by `custom_emoji_packs`, react-query key ["custom-emoji-packs", user?.id]; a gradient hero stat card, a 3-tab segmented control (all/mine/public), and a list of expandable pack cards each with an accordion toggle that reveals an emoji grid)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, aria-expanded). Please keep all data logic exactly as it is: the Supabase query, the react-query key, the setTab state, the toggleExpand/expanded Set logic, the navigate() target, the stats/filtered derivations, and all prop wiring should stay byte-identical. Only advise on className tokens and the display-only attributes listed above.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] + rounded-sm ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip/tab -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (visible-text controls do not need it).
- aria-pressed on a toggle-style control whose selected state is conveyed only by background/color (so screen readers can tell selected from unselected). aria-expanded on a disclosure control that shows/hides content.
- Don't-churn rule: if a control already has a valid existing active:scale or transition value, keep it rather than renumbering it to the nominal tier.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- A RAW <button> is natively focusable -> a CSS focus ring works, and a CSS active:scale works (no inline transform to override it).
- When a RAW <button> has a hover:bg and currently uses transition-colors, and we add a CSS active:scale (a transform), flip transition-colors -> transition-all so the new scale eases alongside the hover bg (otherwise the scale would snap).

MY PLANNED EDITS (please confirm each is right, or correct it):

1. The 3 segmented tab buttons, lines ~106-108 (each a RAW <button type="button"> onClick={() => setTab("all"|"mine"|"public")} with cn() base "flex-1 h-10 rounded-xl text-xs font-bold transition-all" + a conditional that swaps bg/gradient for the selected tab; visible text "All (N)" / "Mine (N)" / "Public"; transition-all ALREADY present):
   plan: add aria-pressed={tab === "all"} (resp. "mine"/"public") to each, and append  active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  into each cn() static base. Keep the existing transition-all (don't-churn). NO aria-label (visible text). The "(N)" count in two labels varies but the label word is constant per button — does that still qualify for aria-pressed? Container (line ~105) is flex gap-2 (not overflow-hidden) so I plan a normal OUTWARD ring. Correct?

2. The pack accordion toggle, line ~136 (a RAW <button type="button"> onClick={() => toggleExpand(p.id)} inside the .map over filtered packs; className "w-full text-left p-3.5 hover:bg-secondary/40 transition-colors"; clicking shows/hides the emoji grid below; a ChevronDown child icon rotates via its own separate transition-transform; isOpen = expanded.has(p.id)):
   plan: add aria-expanded={isOpen}; flip transition-colors -> transition-all and append  active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (wide full-width row tier). NO aria-label (visible pack-name text). Is aria-expanded the right semantic for this disclosure toggle, and is the transition-colors->transition-all flip correct given the hover:bg-secondary/40 (and does it conflict with the child ChevronDown's separate transition-transform)?

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none need a change):
- Back button, line ~80: shadcn <Button aria-label="Back" variant="ghost" size="icon"> — labeled, ships tokens.
- Hero stat card, line ~93: a motion.div with an entrance animation and NO onClick — presentational.
- Loading skeletons (line ~111), empty-state (line ~113) — non-interactive.
- The emoji grid tiles, line ~159: plain <div>s with NO onClick — display, not buttons.
- The ChevronDown indicator, line ~153: decorative, already has its own transition-transform rotate.

QUESTIONS:
Q1. Tabs (edits 1): is aria-pressed + active:scale-[0.97] + ring (keeping transition-all) right for these RAW segmented tab buttons? Does the varying "(N)" count disqualify aria-pressed, or is the constant label word enough?
Q2. Accordion toggle (edit 2): is aria-expanded the right attribute, and the transition-colors->transition-all flip + active:scale-[0.99] + ring correct for a wide full-width disclosure row? Any conflict with the child icon's separate transition-transform?
Q3. Confirm the untouched list is correct.
Q4. Anything missed? At a 375px-wide phone viewport: do the 3 tabs (flex-1 each) and the pack rows lay out without crushing?

Please answer Q1-Q4 and give me any corrected className strings. Keep all data/query logic unchanged. Thank you.
- files: src/pages/EmojiPacksPage.tsx

---

## Review: EmojiPacksPage.tsx — Interaction + a11y pass

### Short plan

**2 controls to edit, 5 untouched — 1 correction to your plan (ring shape on the accordion toggle).** Both edits are className + display-only-attribute; all data logic stays byte-identical.

---

### Q1. Segmented tab buttons — ✅ CONFIRMED as planned

Your plan is correct on every point:

- **`aria-pressed`**: Valid. The label **word** (`All` / `Mine` / `Public`) is constant per button; the varying `(N)` count is supplementary. This matches the AMAPage (Live/Upcoming/Past with count badges), GifLibraryPage (trending/favorites with counts), and CreatorSubscribers precedents.
- **`active:scale-[0.97]`**: Correct tier (segmented filter chip/tab).
- **`transition-all`**: Already present, keep it (don't-churn). The existing `hover:bg-muted` on the unselected variant already animates via `transition-all`; the new `active:scale` is a transform and will ease alongside it.
- **Focus ring**: Append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.
- **Ring shape**: **Normal OUTWARD** — container `flex gap-2` is not overflow-hidden, 8px gap clearance.
- **No `aria-label`**: Correct — visible text provides the accessible name.

**Before (each tab):**
```
cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")
```

**After (each tab):**
```
cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")
```
Plus `aria-pressed={tab === "all"}` (resp. `"mine"` / `"public"`) as a standalone attribute on each `<button>`.

---

### Q2. Accordion toggle — ✅ CONFIRMED with 1 correction (ring shape)

- **`aria-expanded={isOpen}`**: ✅ Correct. This is a textbook disclosure pattern (toggles visibility of the emoji grid). Same as AMAPage B2.
- **`transition-colors` → `transition-all` flip**: ✅ Correct. The existing `hover:bg-secondary/40` is a color/background transition; the new `active:scale-[0.99]` is a transform. Without the flip, the scale would snap. The flip makes both ease.
- **No conflict with child ChevronDown's `transition-transform`**: ✅ No conflict. CSS transitions are per-element. The parent's `transition-all` handles the button's own transform (the press-scale); the child's `transition-transform` independently handles the ChevronDown's rotation. They are on different DOM nodes and affect different CSS properties.
- **`active:scale-[0.99]`**: ✅ Correct per your "wide full-width row/card" tier. (The AMAPage disclosure header used `[0.98]` — card tier — because it was a taller, content-richer card with cover image; this pack row is a standard list disclosure, closer to the "wide row" tier.)
- **No `aria-label`**: ✅ Correct — the pack name + badges + emoji count are visible text children that provide the accessible name.
- **🔑 Correction — ring shape**: The button is the **flush top child** of its parent `motion.div` which has **`overflow-hidden`** and **`rounded-2xl`**. A 2px outward ring's top/left/right edges near the rounded corners would be **clipped**. Per the AMAPage disclosure-header (B1) and CreatorSubscribers card-main precedents, this should be **`ring-inset`**, not outward.

**Before:**
```tsx
<button type="button" onClick={() => toggleExpand(p.id)} className="w-full text-left p-3.5 hover:bg-secondary/40 transition-colors">
```

**After:**
```tsx
<button type="button" onClick={() => toggleExpand(p.id)} aria-expanded={isOpen} className="w-full text-left p-3.5 hover:bg-secondary/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
```

---

### Q3. Untouched list — ✅ ALL CORRECT

| Control | Line | Why skip |
|---------|------|----------|
| Back `<Button>` | ~80 | shadcn, `aria-label="Back"` present, ships tokens |
| Hero `motion.div` | ~93 | Entrance animation only, no `onClick` — presentational |
| Loading skeletons | ~111 | `animate-pulse` divs, non-interactive |
| Empty state | ~113 | Text + icon div, non-interactive |
| Emoji grid tiles | ~159 | Plain `<div>`s with `title=` only, no `onClick` — display |
| ChevronDown | ~153 | Decorative child icon inside the button, own `transition-transform` rotate — not a separate control |

No omissions found.

---

### Q4. Responsive 375px — ✅ No crush

- `max-w-2xl mx-auto px-4` → ~343px inner.
- 3 tabs `flex-1` in `flex gap-2` → (343 − 16) / 3 ≈ **109px** each. Comfortable for "All (12)" / "Mine (3)" / "Public".
- Pack row: `p-3.5` (14px) → ~315px usable; icon 40px + gap-3 (12px) + `flex-1 min-w-0` name column + ChevronDown 16px → name column gets ~231px with `line-clamp-1` truncation. No crush.
- Emoji grid: `grid grid-cols-8 gap-2` inside `p-3` → (343 − 24 − 56) / 8 ≈ **~33px/tile** `aspect-square`. Fine for emoji thumbnails.

---

### Proposed diff (both edits)

```diff
--- a/src/pages/EmojiPacksPage.tsx
+++ b/src/pages/EmojiPacksPage.tsx
@@ TAB BUTTONS — each of the 3 <button> elements @@
-          <button type="button" onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({stats.total})</button>
-          <button type="button" onClick={() => setTab("mine")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "mine" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Mine ({stats.mine})</button>
-          <button type="button" onClick={() => setTab("public")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "public" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Public</button>
+          <button type="button" onClick={() => setTab("all")} aria-pressed={tab === "all"} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({stats.total})</button>
+          <button type="button" onClick={() => setTab("mine")} aria-pressed={tab === "mine"} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "mine" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Mine ({stats.mine})</button>
+          <button type="button" onClick={() => setTab("public")} aria-pressed={tab === "public"} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "public" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Public</button>

@@ ACCORDION TOGGLE @@
-                  <button type="button" onClick={() => toggleExpand(p.id)} className="w-full text-left p-3.5 hover:bg-secondary/40 transition-colors">
+                  <button type="button" onClick={() => toggleExpand(p.id)} aria-expanded={isOpen} className="w-full text-left p-3.5 hover:bg-secondary/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
```

**Summary**: 4 controls edited (3 tabs + 1 disclosure), 5 ins / 4 del (the +1 net = the standalone `aria-expanded` line on the accordion toggle), 3 new `aria-pressed` lines + 1 new `aria-expanded` line. All className + display-only-attribute; zero logic changes.

---

### Owner verification checklist

1. Run `npm run update` — must pass (type-check + worker type-check + production build, TRUE EXIT 0).
2. Preview at 375px — verify tab row and pack list don't crush; accordion expand/collapse still animates; ChevronDown rotation unaffected.
3. Confirm `npm run update` passes before committing.
