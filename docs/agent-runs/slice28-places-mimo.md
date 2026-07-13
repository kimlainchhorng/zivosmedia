# MiMo run — 2026-06-14T01:39:56.737Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control changes are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/PlacesPage.tsx  (route /places — a Foursquare-style place directory; backed by the real `places` table, react-query key ["places-catalog"]; a search input, a horizontal category filter-chip row, and a list of result cards that deep-link to a place via /places/:id)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap). Please keep all data logic exactly as it is: the Supabase query, the react-query key, the setQuery/setActiveCategory state, the navigate() targets, the categories/filtered useMemo derivations, and all prop wiring should stay byte-identical. Only advise on className tokens and the display-only attributes listed above.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] + rounded-sm ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (visible-text controls do not need it).
- aria-pressed only on a control that shows a persistent SELECTED/toggle state AND is a real button (native <button> or role="button"); not on one-shot actions.
- Don't-churn rule: if a control already has a valid existing active:scale (or whileTap) or transition value, keep it rather than renumbering/reflipping it to the nominal tier.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- A native <input> that already has its own focus ring -> leave untouched (never add active:scale to an input).
- A raw <button>/<a> gets the full token set; if it already has a valid transition (e.g. transition-all), we keep it and only add the missing pieces (scale + ring + any aria).
- A framer-motion element WITH whileTap: CSS active:scale is overridden by motion's inline transform, so we do NOT add a CSS scale; we add the focus ring via box-shadow ring only. If the element already has a CSS transition that animates only color/background (e.g. transition-colors for a hover:bg), that does not conflict with motion's transform, so we keep it as-is.

MY PLANNED EDITS (please confirm each is right, or correct it):

1. Category filter chips, line ~123 (a .map over `categories`; each is a RAW <button type="button"> with onClick={() => setActiveCategory(c)} and a cn() className: base "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize" + conditional `${activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"}`; the selected chip is conveyed ONLY by background; the visible label is the category text c):
   plan: add aria-pressed={activeCategory === c} AND insert  active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  into the cn() base (segmented filter-chip tier [0.97]); DON'T-CHURN the existing transition-all (already present, animates the hover:bg-muted alongside the press); visible text -> NO aria-label; the chip row (line ~121) is `flex gap-2 overflow-x-auto scrollbar-hide` so I plan a normal OUTWARD ring (overflow-x-auto clips horizontal content, not the element's own ~2px box-shadow ring). Correct?

2. Result cards, line ~163 (a .map over `filtered`; each is a framer-motion motion.button WITH whileTap={{ scale: 0.985 }} + a per-row entrance/stagger animation, onClick={() => navigate(`/places/${p.id}`)}, className "w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"; content = cover image + place name + optional verified badge + category + address + rating; NO existing aria-label):
   plan: append  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  ONLY (ring-only — whileTap already owns the press-scale, so no CSS active:scale); KEEP whileTap={{ scale: 0.985 }} (don't-churn); KEEP the existing transition-colors (it animates only the hover:bg-secondary/40 and does not conflict with motion's transform); NO aria-label (the row has visible child text — name/category/address/rating — which provides the accessible name naturally); normal OUTWARD ring (the row is itself rounded-2xl and is a direct child of a space-y-2 list that is NOT overflow-hidden). Correct?

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none of these need a change):
- Back button, line ~82: shadcn <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> — labeled, ships tokens.
- Search input, line ~111: a native <input type="search"> that ALREADY has focus:outline-none focus:ring-2 focus:ring-rose-500/30 — leave as-is, never active:scale an input.
- Hero stat card, line ~95: a motion.div with an entrance animation and NO onClick — presentational.
- Loading skeletons (line ~139), empty-state (line ~147), and the no-match text (line ~156) — non-interactive.
- The cover <img> (line ~175), the verified <ShieldCheck aria-label="Verified"> (line ~186), and the MapPin/Star/ChevronRight icons — decorative children inside the row button, not separate controls.

QUESTIONS:
Q1. Category chips (edit #1): is aria-pressed={activeCategory === c} + active:scale-[0.97] + ring + DON'T-CHURN transition-all correct for a RAW <button> selection chip? And is a normal OUTWARD ring right for a chip inside an overflow-x-auto row (no ring-inset)?
Q2. Result cards (edit #2): is ring-ONLY correct (whileTap owns the scale)? Is KEEPING transition-colors right (it only animates the hover bg, doesn't touch transform)? And — since this row has NO existing aria-label and relies on its visible child text (name/category/address/rating) for its accessible name — is leaving it WITHOUT an aria-label the right call (vs adding one)? Is whileTap={{ scale: 0.985 }} a sensible press for these full-width cards, or would you nudge it?
Q3. Confirm the untouched list is correct (back shadcn Button labeled; search input with its own focus ring; hero/skeleton/empty/no-match non-interactive; cover img + verified ShieldCheck + decorative icons are children of the row button).
Q4. Anything missed? At a 375px-wide phone viewport: does the category chip row (overflow-x-auto) scroll cleanly, and do the result cards (16x16 cover + name/verified/category/address/rating column + trailing chevron) lay out without crushing?

Please answer Q1-Q4 and give me any corrected className strings. Keep all data/query logic unchanged. Thank you.
- files: src/pages/PlacesPage.tsx

---

## Review: PlacesPage.tsx — Interaction Polish Pass

I've audited the file line-by-line against your token system, component-type rules, and prior slice patterns (PollsPage segmented pills, MentionsPage motion.button rows, CreatorSubscribersPage chip rows, etc.). Here are my answers:

---

### Q1. Category filter chips — ✅ CORRECT, no changes needed

Every call is right:

| Decision | Rationale |
|---|---|
| `aria-pressed={activeCategory === c}` | Real `<button>`, persistent selection conveyed only by bg → exactly the segmented-pill precedent (PollsPage duration pills, EventsPage tabs, CreatorSubscribersPage tabs). |
| `active:scale-[0.97]` | Segmented filter-chip tier. Correct nominal value. |
| `transition-all` DON'T-CHURN | Already present; needed for `hover:bg-muted` on unselected chips alongside the press scale. |
| NO `aria-label` | Visible text label `{c}` = accessible name. |
| Normal OUTWARD ring | `rounded-full` gives ring shape; `gap-2` (8px) provides clearance from siblings; `overflow-x-auto` clips horizontal overflow content but the 2px box-shadow ring is well within that tolerance — this is the exact EventsPage / GroceryPage / ChatMediaGallery `overflow-x-auto` tab precedent. `ring-inset` would look wrong on a pill. |

**One micro-note:** you said "segmented filter-chip tier `[0.97]`" — the nominal tier is actually `active:scale-[0.97]` which you have. Just confirming the exact string matches.

---

### Q2. Result cards — ✅ CORRECT, no changes needed

| Decision | Rationale |
|---|---|
| Ring-ONLY (no CSS `active:scale`) | `whileTap={{ scale: 0.985 }}` owns the press transform via framer-motion's inline style. A CSS `active:scale-*` would be DEAD (overridden by motion's inline `transform`). Exactly the MentionsPage `motion.button` row precedent. |
| KEEP `transition-colors` | It animates `hover:bg-secondary/40` (color/bg only). It does NOT touch `transform`. Motion's inline transform is independent. Keeping `transition-colors` is actually *safer* than flipping to `transition-all` — the latter would add a CSS `transition: transform` that tries to interpolate alongside motion's inline transform, potentially causing jitter on press/release. |
| KEEP `whileTap={{ scale: 0.985 }}` | Don't-churn. 0.985 is a subtle, pleasant press for a full-width row — in the same neighborhood as the CSS nominal `active:scale-[0.99]` wide-card tier. I would **not** nudge it. |
| NO `aria-label` | The button has rich visible child text (name, category, address, rating, verified badge). An `aria-label` would *replace* all of that as the accessible name. Leaving it absent lets the full content flow through to the screen reader. Correct. |
| Normal OUTWARD ring | `rounded-2xl` button, direct child of `space-y-2` list, NOT overflow-hidden. Ring draws cleanly. |

---

### Q3. Untouched list — ✅ ALL CORRECT

| Control | Skip reason | Confirmed |
|---|---|---|
| Back `<Button>` (L~82) | shadcn, `aria-label="Back"` present, ships tokens | ✅ |
| Search `<input>` (L~111) | Native input with `focus:ring-2 focus:ring-rose-500/30` — never `active:scale` an input | ✅ |
| Hero stat `motion.div` (L~95) | Entrance animation only, no `onClick` — presentational | ✅ |
| Loading skeletons (L~139) | `animate-pulse` divs, non-interactive | ✅ |
| Empty-state (L~147) | Icon + text card, non-interactive | ✅ |
| No-match text (L~156) | `<p>` tag, non-interactive | ✅ |
| Cover `<img>` (L~175) | Inside the row button, `alt={p.name}` — child, not a separate control | ✅ |
| `<ShieldCheck aria-label="Verified">` (L~186) | Decorative-with-purpose icon inside the row button; existing `aria-label` is fine | ✅ |
| MapPin / Star / ChevronRight icons | Decorative children inside the row button | ✅ |

---

### Q4. 375px layout — ✅ CLEAN, nothing missed

**Category chip row** (`flex gap-2 overflow-x-auto scrollbar-hide`):
- Inner width: 375px − 32px (`px-4`) = **343px**
- Each chip: `px-3.5 py-1.5 rounded-full text-xs font-bold` ≈ 55–85px depending on label length ("All" ≈ 55px, "Restaurant" ≈ 85px)
- ~3–5 chips visible, rest scroll cleanly via `overflow-x-auto`; `scrollbar-hide` keeps it tidy on mobile
- The `py-1.5` (~24px height) is below the 44px tap-target guideline — owner flag (established repo compact pattern, not a per-page fix)

**Result cards** (`flex items-center gap-3 p-3`):
- Content width: 343px − 24px (`p-3`×2) = **319px**
- Fixed: cover 64px (`w-16`) + gap 12px + chevron 16px + gap 12px = **104px**
- Flexible content column (`flex-1 min-w-0`): **215px** for name (line-clamp-1) / category (line-clamp-1) / address (line-clamp-1 with MapPin icon) / rating row (Star + text) → all single-line truncating, **no crush**
- The cover's `alt={p.name}` also contributes to the button's accessible name naturally — bonus

**Nothing missed.** The file has exactly 2 interactive surface categories (chips + cards) and you've covered both exhaustively.

---

### Proposed Diff

**File:** `src/pages/PlacesPage.tsx`

**Edit 1 — Category filter chips** (the `<button>` inside the `.map`):

```diff
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
+               aria-pressed={activeCategory === c}
                className={cn(
-                 "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
+                 "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
```

**Edit 2 — Result cards** (the `<motion.button>` inside the `.map`):

```diff
              <motion.button
                key={p.id}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate(`/places/${p.id}`)}
-               className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
+               className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
```

**That's it.** Two controls, two edits. `git diff` should be **2 ins / 2 del, +0 net** (one new standalone `aria-pressed` line + one className append; two replaced lines).

---

### Verification Protocol

Before marking done:
1. `npm run update` — must pass (type-check + worker type-check + production build, TRUE EXIT 0).
2. Preview at 375px — category chips scroll horizontally; result cards lay out cleanly; tap a chip → press-scale + selection state announced; tap a card → whileTap press + navigate.
3. Guard grep — confirm zero logic-bearing lines (`onClick`/`navigate`/`setActiveCategory`/`setQuery`/`useQuery`/`supabase`/`useMemo`/`useState`) appear on the `−` side of the diff.

No data logic changes. No new dependencies. Ship-ready pending the green gate.
