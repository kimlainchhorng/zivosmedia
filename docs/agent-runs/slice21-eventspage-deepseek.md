# DeepSeek run — 2026-06-14T00:35:38.600Z

- model: deepseek-chat
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

# EventsPage Premium Interaction + Responsive QA — Plan & Diff

## Plan

Apply the repo's standard interaction tokens to **5 raw `<button>` controls** on `src/pages/EventsPage.tsx`. All edits are className + display-only `aria-*` attributes. No logic changes. Fix the `<select>` focus-ring regression. Flag the missing card-navigation gap.

## Proposed Diff

```diff
--- a/src/pages/EventsPage.tsx
+++ b/src/pages/EventsPage.tsx
@@ -68,7 +68,7 @@ export default function EventsPage() {
       <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
         <div className="flex items-center gap-3 px-4 py-3">
-          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
+          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Go back">
             <ArrowLeft className="h-5 w-5" />
           </button>
           <h1 className="text-lg font-bold flex-1">Events</h1>
           {user && (
-            <button type="button" onClick={() => setShowCreate(true)} className="p-2 rounded-full bg-ig-gradient text-white">
+            <button type="button" onClick={() => setShowCreate(true)} className="p-2 rounded-full bg-ig-gradient text-white transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Create event">
               <Plus className="h-4 w-4" />
             </button>
           )}
@@ -89,7 +89,7 @@ export default function EventsPage() {
             <button type="button"
               key={cat}
               onClick={() => setSelectedCategory(cat)}
-              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
+              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                 selectedCategory === cat
                   ? "bg-ig-gradient text-white"
                   : "bg-muted/50 text-muted-foreground hover:bg-muted"
@@ -97,6 +97,7 @@ export default function EventsPage() {
             >
               {cat}
             </button>
+            aria-pressed={selectedCategory === cat}
           ))}
         </div>
       </div>
@@ -140,7 +141,7 @@ export default function EventsPage() {
                   {user && !past && (
                     <button type="button"
                       onClick={() => rsvpMutation.mutate(event.id)}
-                      disabled={rsvpMutation.isPending}
+                      disabled={rsvpMutation.isPending}
                       className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                         isRsvpd
                           ? "bg-muted text-foreground"
@@ -148,6 +149,7 @@ export default function EventsPage() {
                       }`}
+                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
+                        isRsvpd
+                          ? "bg-muted text-foreground"
+                          : "bg-ig-gradient text-white"
+                      }`}
                     >
                       {isRsvpd ? "Cancel RSVP" : "RSVP — I'm Going"}
                     </button>
@@ -185,7 +187,7 @@ export default function EventsPage() {
                 <select
                   value={newEvent.category}
                   onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
-                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none"
+                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                 >
                   {CATEGORIES.filter((c) => c !== "All").map((c) => (
                     <option key={c} value={c}>{c}</option>
@@ -195,7 +197,7 @@ export default function EventsPage() {
                 <button type="button"
                   onClick={() => createMutation.mutate()}
                   disabled={!newEvent.title || !newEvent.start_time || createMutation.isPending}
-                  className="w-full py-3.5 rounded-2xl bg-ig-gradient text-white font-bold text-sm disabled:opacity-50"
+                  className="w-full py-3.5 rounded-2xl bg-ig-gradient text-white font-bold text-sm disabled:opacity-50 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 >
                   {createMutation.isPending ? "Creating..." : "Create Event"}
                 </button>
```

## Answers to Your Questions

**(1) RSVP toggle — NO `aria-pressed`.** Correct. The visible text changes ("RSVP — I'm Going" ↔ "Cancel RSVP") AND the background swaps (bg-ig-gradient ↔ bg-muted). This matches the CommunitiesPage Join/Leave precedent (Slice 19) — visible text + bg swap = no `aria-pressed` needed.

**(2) Category tabs — `aria-pressed` is correct; outward ring is safe.** Same `overflow-x-auto` row as GroceryPage store tabs (Slice 20). The `overflow-x: auto` clips overflowing *content*, not the button's ~2px outward ring. **No `ring-inset`.**

**(3) RSVP button — normal ring, NO `ring-inset`.** The button sits inside `p-4` (16px padding), far from the card's `rounded-2xl overflow-hidden` edge. Same geometry as Slice 20 cart-drawer controls.

**(4) `<select>` focus-ring regression — YES, add `focus:ring-2 focus:ring-primary/20`.** This is a real keyboard-focus-visibility gap. The 4 sibling form controls all have `focus:ring-2 focus:ring-primary/20`; the `<select>` only has `focus:outline-none` with no replacement. Adding the ring is className-only, matches siblings, and fixes a genuine a11y regression. **No `active:scale`** on a native `<select>`.

**(5) Tiers — correct.** Icons (back/create) = `active:scale-95`; category tabs = `active:scale-[0.97]`; RSVP + Create-Event = `active:scale-[0.98]`.

**(6) Responsive 375/768/1280 — no crush.** Header: back (36px) + `flex-1` title + create (36px) ≈ 72px fixed, ~271px title in 343px content. Search full-width. Category tabs: 9 chips × ~55px + 8 gaps × 8px ≈ 559px → scrolls. Event cards: full-width with `flex-wrap` meta row. Create sheet: `max-w-md` → full-width at 375px, `px-5` = 313px inner, all inputs fit.

**(a) Card navigation gap — FLAG only.** The event cards are `motion.div` with NO `onClick` — users can't open an event detail page from here. This is a UX gap (adding navigation is a logic/behavior change, out of className scope).

**(b) Inventory — exhaustive.** Exactly 5 raw `<button>` controls: header back, header create "+", category tabs (1 template × 9 instances), per-card RSVP (1 template × N instances), create-sheet submit. No missed controls.

**(c) TAB indentation on `<img>` (~L175-179) — cosmetic, leave it.** Not a className fix.

## Owner Verify

1. Run `npm run update` — must pass (type-check + worker + build).
2. Preview at `/events` on localhost (375/768/1280 widths).
3. Verify: back button has ring on focus; "+" button has ring + `aria-label="Create event"`; category tabs have `aria-pressed` + ring + press-scale; RSVP button has ring + press-scale; `<select>` has focus ring; Create Event button has ring + press-scale.
4. Confirm the card-navigation gap is acceptable (or add `onClick={() => navigate(/events/${event.id})}` + `role="button"` + `tabIndex={0}` + `onKeyDown` in a follow-up).
