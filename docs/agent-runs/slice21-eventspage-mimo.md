# MiMo run — 2026-06-14T00:36:53.635Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/EventsPage.tsx (312 lines, route /events -- discover/create/RSVP events: sticky header (back + create-"+" toggle, create gated on `user`), search <input>, horizontal-scroll category-tabs (9 cats), events list (motion.div cards: cover img + title/desc/category-chip + meta row + per-card RSVP button gated on `user && !past`), bottom create-event sheet (title <input> + desc <textarea> + location <input> + datetime <input> + category <select> + Create submit), ZivoMobileNav).

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (grep-confirmed): exactly 5 raw <button type="button">, 0 motion.button, 0 shadcn <Button>. The 5 form controls in the create sheet: title/location/datetime <input> (3) + desc <textarea> (1) ALL already ship "focus:outline-none focus:ring-2 focus:ring-primary/20" => LEAVE as-is (repo rule: raw input/textarea w/ existing focus:ring-primary/20 => don't touch). The search <input> ALSO has focus:ring-primary/20 => LEAVE. The category <select> has ONLY "focus:outline-none" with NO replacement ring (see Q4). Cover <img alt={event.title}> => fine. The event cards are motion.div with NO onClick (non-interactive wrapper) => nothing. The create-sheet backdrop motion.div has onClick={() => setShowCreate(false)} (click-catcher, non-focusable) + inner sheet motion.div has onClick stopPropagation => both presentational, nothing.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when a bg/color also animates OR general raw-button standard. aria-label for icon-only; aria-pressed for segmented buttons whose selection is conveyed ONLY by background (AchievementsPage/ChallengesPage/CoinTransfers precedent). ring-inset only when a control is flush inside an overflow-hidden rounded parent.

CRITICAL edit-shape rule: RAW <button> (these 5) => FULL token set. shadcn => never touch. motion.div => nothing. raw <input>/<textarea> => never active:scale; if already focus:ring-primary/20, LEAVE.

HARD RULE: className + display-only attr (aria-label/aria-pressed/aria-expanded) ONLY. Do NOT change any onClick / navigate / setSelectedCategory / setSearchQuery / setShowCreate / setNewEvent / rsvpMutation / createMutation / queryClient / supabase / useQuery / useMutation / disabled logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(1) Header back (icon ArrowLeft) -- before: "p-2 -ml-2 rounded-full hover:bg-muted/50" -> append " transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" + add aria-label="Go back" (icon tier; transition-all so hover:bg fades; rounded-full -> normal ring).
(2) Header create "+" (icon Plus; gated on `user`; onClick setShowCreate(true)) -- before: "p-2 rounded-full bg-ig-gradient text-white" -> append " transition-all active:scale-95 ...ring" + add aria-label="Create event" (icon tier; static gradient/no hover but transition-all zero-cost per prior slices).
(3) Category tabs (.map'd raw button; template-literal base has transition-all ALREADY; selection bg-ig-gradient vs bg-muted/50; onClick setSelectedCategory(cat)) -- before static base: "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all" -> append " active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to the static base + add aria-pressed={selectedCategory === cat} (segmented tier; cat text = accessible name; row is "flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none" -- same as GroceryPage store tabs Slice 20).
(4) Per-card RSVP (wide w-full; template-literal base has transition-all ALREADY; onClick rsvpMutation.mutate(event.id); disabled={rsvpMutation.isPending}; toggles label "RSVP — I'm Going" <-> "Cancel RSVP") -- before static base: "w-full py-2.5 rounded-xl text-sm font-semibold transition-all" -> append " active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to the static base (wide tier; visible text = accessible name => NO aria-label; see Q1 re aria-pressed).
(5) Create-sheet "Create Event" submit (wide w-full; NO transition; onClick createMutation.mutate(); disabled={!title||!start_time||isPending}) -- before: "w-full py-3.5 rounded-2xl bg-ig-gradient text-white font-bold text-sm disabled:opacity-50" -> append " transition-all active:scale-[0.98] ...ring" (ADD transition-all; wide tier; disabled:opacity-50 preserved; visible text => no aria-label).

QUESTIONS:
(1) Per-card RSVP (4): it's a TOGGLE (RSVP <-> Cancel RSVP) but the state is conveyed by the VISIBLE TEXT change ("RSVP — I'm Going" vs "Cancel RSVP") AND a bg swap (bg-ig-gradient vs bg-muted) -- since visible text already conveys state, I say NO aria-pressed (matching the CommunitiesPage Join/Leave precedent Slice 19, which had visible text + got wide-tier + ring, no aria-pressed). Agree, or add aria-pressed={isRsvpd} anyway?
(2) Category tabs (3): is aria-pressed right (segmented selector), and is the standard outward ring safe inside the "flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none" row (same overflow-x-auto situation Slice 20 resolved -> normal ring no inset)? Confirm same, or ring-inset?
(3) RSVP button (4) sits inside a motion.div card with "bg-card rounded-2xl border border-border/30 overflow-hidden" -- but the button is inside the card's "p-4" (16px) wrapper, far from the rounded-2xl edge -> I say normal ring, NO ring-inset (same as Slice 20 cart-drawer overflow-hidden + p-4 controls). Agree?
(4) The category <select> (create sheet) has className "...rounded-xl bg-muted/40 text-sm focus:outline-none" -- it KILLS the outline with NO replacement ring, unlike its 4 sibling form controls which all have "focus:outline-none focus:ring-2 focus:ring-primary/20". This is a focus-invisible a11y regression. Should I add " focus:ring-2 focus:ring-primary/20" to the <select> to match siblings (className-only, display-only, fixes a real keyboard-focus-visibility gap, NEVER active:scale on a native select)? I lean YES. Or is a native <select> out of scope (leave it)?
(5) Tiers: icons (back/create) 95, category tabs [0.97], RSVP + Create-Event [0.98] -- right?
(6) Responsive 375/768/1280: header back + flex-1 title + create-+; search full-width; category tabs overflow-x-auto (scroll, 9 cats); event cards full-width (cover img h-36 + p-4 body + meta flex-wrap + RSVP w-full); create sheet max-w-md rounded-t-3xl px-5 (full-width at 375). Any crush at 375px?

ALSO confirm: (a) the event cards are motion.div with NO onClick -> there's NO card->EventDetailPage navigation (a browse+RSVP-only list, no way to open event detail from here) -- FLAG only (adding navigation is logic, out of my className scope)? (b) inventory exhaustive (exactly 5 raw <button>, no missed control)? (c) lines ~175-179 (the cover <img> attributes) use TAB indentation while neighbors use spaces -- cosmetic, leave it?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/EventsPage.tsx

---

## Plan

**6 controls / 6 line-edits**, all className + display-only-attr. Five raw `<button>` + one native `<select>` (focus-ring fix).

| # | Control | Tier | Token append | Attr add |
|---|---------|------|-------------|----------|
| 1 | Header back (icon) | icon `95` | `transition-all active:scale-95` + ring | `aria-label="Go back"` |
| 2 | Header create "+" (icon) | icon `95` | `transition-all active:scale-95` + ring | `aria-label="Create event"` |
| 3 | Category tabs (9× segmented) | chip `[0.97]` | `active:scale-[0.97]` + ring (`transition-all` already) | `aria-pressed={selectedCategory === cat}` |
| 4 | Per-card RSVP (wide toggle) | wide `[0.98]` | `active:scale-[0.98]` + ring (`transition-all` already) | — (visible text conveys state) |
| 5 | Create-sheet submit (wide) | wide `[0.98]` | `transition-all active:scale-[0.98]` + ring (ADD `transition-all`) | — |
| 6 | Category `<select>` (focus fix) | native | `focus:ring-2 focus:ring-primary/20` | — |

---

## Answers to your questions

**(1) RSVP — NO `aria-pressed`.** ✅ Agree. CommunitiesPage Join/Leave (Slice 19) is the exact precedent: visible text ("RSVP — I'm Going" ↔ "Cancel RSVP") + bg swap already conveys toggle state. No `aria-pressed`.

**(2) Category tabs — `aria-pressed` + normal ring.** ✅ Both confirmed. `aria-pressed` is correct (segmented selector, same as Achievements/Challenges/CoinTransfers). `overflow-x:auto` clips overflowing *content*, not the button's own ~2px outward ring — identical to GroceryPage store tabs (Slice 20). **NO `ring-inset`.**

**(3) RSVP inside `overflow-hidden` card — normal ring.** ✅ Agree. Button sits inside `p-4` (16px clearance), far from the `rounded-2xl` edge. Same as Slice 20 cart-drawer controls. **NO `ring-inset`.**

**(4) Category `<select>` — YES, add `focus:ring-2 focus:ring-primary/20`.** ✅ This is a real keyboard-focus-visibility regression: `focus:outline-none` kills the outline with no replacement, while its 4 sibling form controls all carry `focus:ring-2 focus:ring-primary/20`. Pure className, display-only, fixes a genuine a11y gap, no `active:scale` on a native select. **Do it.**

**(5) Tiers — confirmed.** Icons 95, tabs `[0.97]`, RSVP + Create-Event `[0.98]`.

**(6) Responsive 375px — no crush.** Header: back(~36) + `gap-3` + `flex-1` title + `gap-3` + create(~36) ≈ 96px fixed → 247px for "Events". Search full-width. Tabs `overflow-x-auto`. Cards single-col. Create sheet `max-w-md` → full-width at 375. Clean.

**(a) Cards no onClick — flag only.** ✅ Correct. `motion.div` with no `onClick` → no card→detail navigation exists. Adding navigation is logic, out of className scope. **Owner flag.**

**(b) Inventory exhaustive.** ✅ Confirmed: exactly 5 raw `<button>`, 0 `motion.button`, 0 shadcn `<Button>`. The `<select>` is the 6th touch (non-button).

**(c) TAB indentation on cover `<img>` — cosmetic, leave it.** ✅ Confirmed.

---

## Proposed diff

**File:** `src/pages/EventsPage.tsx`

```diff
--- a/src/pages/EventsPage.tsx
+++ b/src/pages/EventsPage.tsx
@@ HEADER BACK @@
-          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
+          <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
@@ HEADER CREATE "+" @@
-            <button type="button" onClick={() => setShowCreate(true)} className="p-2 rounded-full bg-ig-gradient text-white">
+            <button type="button" onClick={() => setShowCreate(true)} aria-label="Create event" className="p-2 rounded-full bg-ig-gradient text-white transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
@@ CATEGORY TABS @@
-            <button type="button"
+            <button type="button" aria-pressed={selectedCategory === cat}
               key={cat}
               onClick={() => setSelectedCategory(cat)}
-              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
+              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
@@ PER-CARD RSVP @@
-                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
+                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
@@ CATEGORY SELECT (focus fix) @@
-                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none"
+                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
@@ CREATE-SHEET SUBMIT @@
-                  className="w-full py-3.5 rounded-2xl bg-ig-gradient text-white font-bold text-sm disabled:opacity-50"
+                  className="w-full py-3.5 rounded-2xl bg-ig-gradient text-white font-bold text-sm disabled:opacity-50 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### Precise line-by-line before → after

**Edit 1 — Header back (L~86):**
```
// BEFORE
<button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50">

// AFTER
<button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Edit 2 — Header create "+" (L~89):**
```
// BEFORE
<button type="button" onClick={() => setShowCreate(true)} className="p-2 rounded-full bg-ig-gradient text-white">

// AFTER
<button type="button" onClick={() => setShowCreate(true)} aria-label="Create event" className="p-2 rounded-full bg-ig-gradient text-white transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Edit 3 — Category tabs (L~107–113):**
```
// BEFORE
            <button type="button"
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat

// AFTER
            <button type="button" aria-pressed={selectedCategory === cat}
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selectedCategory === cat
```

**Edit 4 — Per-card RSVP (L~168–171):**
```
// BEFORE
                    <button type="button"
                      onClick={() => rsvpMutation.mutate(event.id)}
                      disabled={rsvpMutation.isPending}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${

// AFTER
                    <button type="button"
                      onClick={() => rsvpMutation.mutate(event.id)}
                      disabled={rsvpMutation.isPending}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
```

**Edit 5 — Category `<select>` (L~226):**
```
// BEFORE
                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none"

// AFTER
                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
```

**Edit 6 — Create-sheet submit (L~233):**
```
// BEFORE
                  className="w-full py-3.5 rounded-2xl bg-ig-gradient text-white font-bold text-sm disabled:opacity-50"

// AFTER
                  className="w-full py-3.5 rounded-2xl bg-ig-gradient text-white font-bold text-sm disabled:opacity-50 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Owner flags (NOT className-fixable)

1. **No card→detail navigation** — event cards are `motion.div` with no `onClick`; there's no way to open an event detail page from this list. Adding navigation is logic, out of scope.
2. **TAB indent** on cover `<img>` attributes (~L175–179) — cosmetic whitespace inconsistency vs space-indented neighbors.

## Verify

Run `npm run update` (type-check + worker type-check + production build — must be TRUE EXIT 0). Advisors DeepSeek + MiMo should be consulted per slice protocol.
