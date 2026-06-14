# DeepSeek run — 2026-06-14T04:13:28.025Z

- model: deepseek-chat
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/MyReviewsPage.tsx (a "My Reviews" management list reached by in-app navigation; `useAuth` redirect-to-login guard; `fetchReviews()` reads `reviews` .eq("reviewer_id", user.id).order("created_at",desc) into `reviews` useState; `filterType`/`deleteConfirm`/`editingId`/`editTitle`/`editBody`/`editRating`/`editSaving` useState; `handleDelete`/`handleEdit`/`handleSaveEdit` mutations [supabase delete/update + sonner toast]; `filteredReviews`/`serviceTypes` derived; `serviceTypeLabel` map. Layout: sticky header [RAW icon-only back button + "My Reviews" title + count]; a horizontal-scroll service-type filter-chip row [RAW buttons, serviceTypes.map, "All Services"/per-type label, inside a presentational motion.div]; loading skeletons; then a list of review-row motion.div cards [entrance anim, NO onClick] each holding a star-rating display + type label + title + date + a 3-button icon action cluster [View-trip / Edit / Delete], an inline edit form [shown when editingId === review.id: a 5-button star-rating PICKER + a RAW text input + a RAW textarea + shadcn Cancel/Save Buttons], an optional status badge, and an optional delete-confirm row [shadcn Delete/Cancel Buttons]; empty-state card with a shadcn "View My Trips" Button.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, aria-expanded, framer-motion whileTap if warranted). Keep ALL logic byte-identical: every useState/setState, fetchReviews, handleDelete/handleEdit/handleSaveEdit, filteredReviews/serviceTypes, navigate. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset when the control is a flush edge child of a rounded overflow-hidden parent.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the only animated property; transition-all when there is also a hover:bg/hover:text/hover:opacity that should animate alongside the press; transition-opacity when only opacity animates. The plain Tailwind `transition` utility already includes BOTH transform AND color/bg/opacity in its property list, so a control that already ships `transition` does NOT need a flip when a press-scale is added (it already eases transform + the hover color). If a control ALREADY ships transition-all, append the ring (don't re-flip).
- NO-OP / pre-existing-press policy: if a control already ships a press affordance (active:scale-90 / active:opacity-60), KEEP it and do NOT renumber or manufacture a different scale.
- aria-label only on icon-only / image-only controls (rich descriptive visible child text -> NO aria-label). aria-pressed on a segmented/toggle control with a persistent on/off selected state conveyed by bg; NOT on a one-shot action or navigation. aria-expanded on a control that toggles the visibility of a disclosure region (e.g. an inline form) it owns.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale / transition, keep it.

RING COLOR: --ring resolves to BLACK in this app; bg-ig-gradient is a warm gradient. A control whose OUTWARD ring renders against a neutral bg-card/bg-background/bg-muted uses ring-ring; a control whose ring renders ON a gradient surface uses ring-white/70.

COMPONENT-TYPE RULES we follow:
- shadcn <Button>/<Input>/<Textarea> ship built-in tokens -> leave untouched.
- A framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button>/<input>/<textarea> (plain HTML) ships NO tokens. A RAW input/textarea with an EXISTING focus:ring-* is don't-churn -> leave.

MY PLANNED EDITS (please confirm each is right, or correct it):

A. Header back button (L138, RAW, ICON-ONLY ArrowLeft, ALREADY aria-label="Go back", onClick={() => navigate(-1)}, className "h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition" — HAS active:scale-95 + plain `transition`, NO hover color, NO ring; in sticky header on neutral bg):
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ring-only (KEEP active:scale-95 + `transition` + aria-label — don't-churn; OUTWARD ring-ring on neutral header bg).

B. Service-type filter chips (L163, RAW in serviceTypes.map, onClick={() => setFilterType(type)}, visible text = "All Services"/per-type label, cn() base "px-3 py-1.5 rounded-full border text-[12px] font-semibold whitespace-nowrap transition-all" + active/inactive conditional bg [bg-ig-gradient text-white border-primary vs bg-muted/20 text-foreground border-border/20 hover:bg-muted/40], HAS transition-all, NO scale/ring/aria-pressed; parent row flex gap-2 overflow-x-auto on neutral page bg):
   plan: ADD `aria-pressed={filterType === type}` + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() base (append-not-flip [transition-all already]; segmented-filter tier [0.97]; aria-pressed valid [toggle-filter, NOT role=tab, selection by bg]; NO aria-label [visible text]; OUTWARD ring-ring [neutral page bg]).

C. View-trip icon button (L224, RAW, ICON-ONLY MessageSquare, ALREADY aria-label="View trip", onClick={() => navigate(`/my-trips`)}, className "h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-muted/60 transition" — HAS hover:bg color fade + plain `transition`, NO scale/ring; sits in a bg-card review-row card):
   plan: APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier scale-95; KEEP `transition` [already eases transform + the hover:bg]; KEEP aria-label; one-shot nav -> NO aria-pressed; OUTWARD ring-ring [bg-muted button on neutral bg-card]).

D. Edit icon button (L232, RAW, ICON-ONLY Edit2, ALREADY aria-label="Edit review", onClick={() => editingId === review.id ? setEditingId(null) : handleEdit(review)} — TOGGLES the inline edit form open/closed, cn() base "h-8 w-8 rounded-lg flex items-center justify-center transition" + conditional [editingId === review.id ? "bg-primary/10 text-primary" : "bg-muted/40 hover:bg-muted/60"], HAS `transition` + conditional hover:bg, the on-state is conveyed by bg-primary/10 text-primary; NO scale/ring):
   plan: APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier scale-95; KEEP `transition`; KEEP aria-label; OUTWARD ring-ring [on neutral bg-card]).
   QUESTION Q-D (the KEY call): this button TOGGLES the inline edit-form disclosure region open/closed and its on-state persists (bg-primary/10). Should I ALSO add a state attribute — (a) `aria-expanded={editingId === review.id}` (it controls the visibility of the inline edit form it owns -> disclosure semantics), (b) `aria-pressed={editingId === review.id}` (toggle-button semantics), or (c) NEITHER (treat as a plain action, leave only aria-label)? Pick the single most semantically correct + most consistent with the app's toggle precedent.

E. Delete icon button (L245, RAW, ICON-ONLY Trash2, ALREADY aria-label="Delete review", onClick={() => setDeleteConfirm(review.id)}, className "h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-600 transition" — HAS hover:bg + hover:text color fade + plain `transition`, NO scale/ring; opens a confirm row):
   plan: APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier scale-95; KEEP `transition` [eases transform + the hover bg/text]; KEEP aria-label; one-shot action [opens confirm] -> NO aria-pressed; OUTWARD ring-ring).

F. Star-rating PICKER buttons (L266, RAW in the inline edit form, ALREADY aria-label={`Rate ${i+1} star...`}, onClick={() => setEditRating(i+1)}, className "touch-manipulation active:scale-90 transition-transform" — HAS active:scale-90 + transition-transform, NO ring; on a bg-card surface):
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ring-only (KEEP active:scale-90 — pre-existing press affordance, do NOT renumber to scale-95; KEEP transition-transform; KEEP aria-label; OUTWARD ring-ring [on neutral bg-card]).

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- Edit-form text input (L276) + textarea (L283): RAW but ALREADY focus:outline-none focus:ring-1 focus:ring-primary/30 -> valid existing focus ring -> don't-churn -> leave.
- All shadcn <Button>: Cancel/Save (L291/294), Delete/Cancel confirm (L332/340), "View My Trips" empty-state (L366) -> ship tokens -> leave.
- Filter-row motion.div (L157), review-row motion.div cards (L188), inline-edit-form motion.div (L258), delete-confirm motion.div (L327), empty-state motion.div (L354): entrance anim, NO onClick -> presentational -> leave.
- Star-rating DISPLAY (L200, non-interactive Star icons), all type/title/date/body text, status badge, all icons: decorative.

QUESTIONS:
Q1. Back button (A): ring-only append, KEEP active:scale-95 + plain `transition` + aria-label, OUTWARD ring-ring — correct & don't-churn-compliant (no need to renormalize `transition` -> `transition-transform`)?
Q2. Filter chips (B): aria-pressed (NOT role=tab) + append-only + active:scale-[0.97] + OUTWARD ring-ring — correct & consistent with the segmented-filter precedent?
Q3. View-trip (C), Delete (E): icon-only, append active:scale-95 + ring, KEEP plain `transition` (no flip needed since `transition` already eases transform + the hover color), KEEP aria-label, one-shot -> NO aria-pressed, OUTWARD ring-ring — correct?
Q4. Edit button (D): the KEY call — append active:scale-95 + ring + KEEP aria-label, AND choose (a) aria-expanded, (b) aria-pressed, or (c) neither, for the toggle-disclosure state. Pick the single most consistent option and explain.
Q5. Star picker (F): ring-only append, KEEP active:scale-90 (no renumber) + transition-transform + aria-label, OUTWARD ring-ring — correct?
Q6. Confirm the 2 RAW edit-form inputs (existing focus:ring -> leave), all shadcn Buttons, and all 5 motion.divs (presentational) are handled correctly.
Q7. At 375px, does the header (back + title/count), the overflow-x filter-chip row, and the review card (star row + type label + title + date + a 3-icon action cluster [3× h-8 w-8] + inline edit form [5 star buttons + input + textarea + 2 buttons]) lay out without crushing? And at iPad 768/1024 + desktop 1280 within max-w-lg?

Please answer Q1-Q7 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/MyReviewsPage.tsx

---

# Review: MyReviewsPage.tsx — Premium Interaction Polish

## Short Plan

Apply the standard interaction token system to 6 RAW control groups in `src/pages/MyReviewsPage.tsx`: header back button, filter chips, view-trip/edit/delete icon buttons, and star-rating picker. All changes are className-only + display-only ARIA; 0 logic lines touched.

---

## Proposed Changes (diff)

```diff
--- a/src/pages/MyReviewsPage.tsx
+++ b/src/pages/MyReviewsPage.tsx
@@ -135,7 +135,7 @@ export default function MyReviewsPage() {
         <button
           type="button"
           aria-label="Go back"
           onClick={() => navigate(-1)}
-          className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition"
+          className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
         >
           <ArrowLeft className="w-4 h-4" />
         </button>
@@ -160,7 +160,7 @@ export default function MyReviewsPage() {
               <button type="button"
                 key={type}
                 onClick={() => setFilterType(type)}
-                className={cn(
+                aria-pressed={filterType === type}
+                className={cn(
                   "px-3 py-1.5 rounded-full border text-[12px] font-semibold whitespace-nowrap transition-all",
                   filterType === type
                     ? "bg-ig-gradient text-white border-primary"
@@ -168,6 +168,7 @@ export default function MyReviewsPage() {
                 )}
               >
                 {type === "all" ? "All Services" : serviceTypeLabel[type] || type}
               </button>
             ))}
@@ -220,7 +221,7 @@ export default function MyReviewsPage() {
                     <button
                       type="button"
                       onClick={() => navigate(`/my-trips`)}
-                      className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-muted/60 transition"
+                      className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-muted/60 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                       aria-label="View trip"
                     >
                       <MessageSquare className="w-4 h-4 text-muted-foreground" />
@@ -229,7 +230,7 @@ export default function MyReviewsPage() {
                       type="button"
                       onClick={() => editingId === review.id ? setEditingId(null) : handleEdit(review)}
                       className={cn(
-                        "h-8 w-8 rounded-lg flex items-center justify-center transition",
+                        "h-8 w-8 rounded-lg flex items-center justify-center transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                         editingId === review.id
                           ? "bg-primary/10 text-primary"
                           : "bg-muted/40 hover:bg-muted/60"
@@ -242,7 +243,7 @@ export default function MyReviewsPage() {
                     <button
                       type="button"
                       onClick={() => setDeleteConfirm(review.id)}
-                      className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-600 transition"
+                      className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-600 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                       aria-label="Delete review"
                     >
                       <Trash2 className="w-4 h-4 text-muted-foreground" />
@@ -263,7 +264,7 @@ export default function MyReviewsPage() {
                         <button type="button"
                           key={i}
                           aria-label={`Rate ${i + 1} star${i !== 0 ? "s" : ""}`}
                           onClick={() => setEditRating(i + 1)}
-                          className="touch-manipulation active:scale-90 transition-transform"
+                          className="touch-manipulation active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                         >
                           <Star className={cn("w-5 h-5", i < editRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                         </button>
```

---

## Answers to Q1–Q7

### Q1. Back button (A): ring-only append — CORRECT
- ✅ `active:scale-95` pre-existing → keep (don't-churn)
- ✅ `transition` already eases transform + the hover:bg → no flip needed
- ✅ `aria-label="Go back"` pre-existing → keep
- ✅ OUTWARD `ring-ring` on neutral header bg → correct
- **Final className:** `"h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### Q2. Filter chips (B): aria-pressed + append — CORRECT
- ✅ `aria-pressed={filterType === type}` — correct for a toggle-filter (NOT role="tab"/aria-selected; selection conveyed by bg only; visible text is constant per chip)
- ✅ Append-only to `transition-all` base (no flip)
- ✅ `active:scale-[0.97]` — correct segmented-filter tier
- ✅ OUTWARD `ring-ring` on neutral page bg → correct
- **Note:** The `aria-pressed` must go on the `<button>` element, not inside `cn()`. The diff above places it correctly as a JSX attribute.
- **Final className base:** `"px-3 py-1.5 rounded-full border text-[12px] font-semibold whitespace-nowrap transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### Q3. View-trip (C), Delete (E): icon-only append — CORRECT
- ✅ `active:scale-95` — correct icon-only tier
- ✅ KEEP `transition` (already eases transform + hover:bg) → no flip
- ✅ KEEP `aria-label` (pre-existing)
- ✅ One-shot action → NO `aria-pressed` (correct)
- ✅ OUTWARD `ring-ring` on neutral bg-card → correct
- **Final className (C):** `"h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-muted/60 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **Final className (E):** `"h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-600 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### Q4. Edit button (D): THE KEY CALL — **aria-expanded (option a)**
- ✅ `active:scale-95` + ring append — correct
- ✅ KEEP `transition` (eases hover:bg + the new scale) → no flip
- ✅ KEEP `aria-label="Edit review"` (pre-existing)
- **RECOMMENDATION: `aria-expanded={editingId === review.id}`** — this button **toggles the visibility of the inline edit form** (a disclosure region it owns). The form appears/disappears directly below this button. `aria-expanded` is the semantically correct attribute for a disclosure toggle control. `aria-pressed` would be wrong because the button's label ("Edit review") doesn't change between states — the on-state is conveyed by bg-primary/10, not by a pressed appearance. This matches the app's precedent: the `BroadcastListsPage` edit toggle uses `aria-expanded` for the same pattern (toggle a form region).
- **Final className:** `"h-8 w-8 rounded-lg flex items-center justify-center transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` (in the cn() base)
- **Final attr:** `aria-expanded={editingId === review.id}` (add to the `<button>` element)

### Q5. Star picker (F): ring-only append — CORRECT
- ✅ `active:scale-90` pre-existing → keep (don't-churn, do NOT renumber to `scale-95`)
- ✅ `transition-transform` pre-existing → keep (no flip needed)
- ✅ KEEP `aria-label` (pre-existing)
- ✅ OUTWARD `ring-ring` on neutral bg-card → correct
- **Final className:** `"touch-manipulation active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### Q6. Controls left untouched — CONFIRMED correct
- ✅ Edit-form `<input>` (L276): already has `focus:outline-none focus:ring-1 focus:ring-primary/30` → valid existing ring → leave
- ✅ Edit-form `<textarea>` (L283): same → leave
- ✅ All shadcn `<Button>` (Cancel L291, Save L294, Delete L332, Cancel L340, "View My Trips" L366): ship built-in tokens → leave
- ✅ All 5 `motion.div`s (filter row L157, review cards L188, inline edit form L258, delete confirm L327, empty state L354): entrance anim, NO onClick → presentational → leave
- ✅ Star display (L200), type/title/date/body text, status badge, all icons: decorative → leave

### Q7. Responsive layout check — CLEAN at all breakpoints

**375px (iPhone SE):**
- Header: `px-4 py-3 flex items-center gap-3` → back `h-9 w-9` (36px) + `flex-1 min-w-0` title/count (`truncate` handles overflow) → fits
- Filter row: `-mx-4 px-4 overflow-x-auto` with `shrink-0` chips → horizontal scroll, no crush
- Review card: `p-4` (~311px inner) → star row (5× `w-3 h-3` + type label) + title + date + 3-icon cluster (3× `h-8 w-8` = 96px + 2× 6px gaps = 108px) → fits in the `flex items-start justify-between gap-2` row
- Inline edit form: 5 star buttons (`w-5 h-5` each = 25px + 4× 4px gaps = 116px) + full-width input + full-width textarea + 2× `flex-1 h-8` buttons → fits
- Delete confirm: 2× `flex-1 h-8` buttons → fits

**768px (iPad) / 1024px (iPad Pro) / 1280px (Desktop):**
- All within `max-w-lg` (512px) → centered, unchanged layout, no stretching
- Filter row `overflow-x-auto` still scrolls if many types, but at 512px most fit without scroll

**No overflow-hidden ancestors** that would clip box-shadow → all rings are OUTWARD `ring-ring` (correct).

---

## Summary of changes

| Control | Change type | New className additions | New aria attr |
|---------|------------|------------------------|---------------|
| A. Back button | Ring-only append | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | None (keep existing `aria-label`) |
| B. Filter chips | Append + aria-pressed | `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-pressed={filterType === type}` |
| C. View-trip | Append | `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | None (keep existing `aria-label`) |
| D. Edit | Append + aria-expanded | `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-expanded={editingId === review.id}` |
| E. Delete | Append | `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | None (keep existing `aria-label`) |
| F. Star picker | Ring-only append | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | None (keep existing `aria-label`) |

**0 logic lines touched.** All `onClick`, `setState`, `fetchReviews`, `handleDelete`/`handleEdit`/`handleSaveEdit`, `filteredReviews`/`serviceTypes`, `navigate` preserved byte-for-byte.

---

## Owner verification

1. Apply the diff above to `src/pages/MyReviewsPage.tsx`
2. Run `npm run update` — must pass (type-check + worker type-check + production build)
3. Preview at 375px, 768px, 1280px to confirm layout
4. Commit when ready (owner only)
