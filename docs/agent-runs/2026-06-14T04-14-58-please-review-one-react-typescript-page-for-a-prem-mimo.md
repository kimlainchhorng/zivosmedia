# MiMo run — 2026-06-14T04:14:58.482Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Review: MyReviewsPage.tsx — Interaction + A11y Polish Pass

### Inventory Verification

Full-file read confirms your inventory is **complete and correct**:

| # | Control | Type | Interactive? | Edit? |
|---|---------|------|-------------|-------|
| A | Header back (L138) | RAW `<button>`, icon-only | ✓ | Yes |
| B | Filter chips (L163) | RAW `<button>` in `.map` | ✓ | Yes |
| C | View-trip (L224) | RAW `<button>`, icon-only | ✓ | Yes |
| D | Edit toggle (L232) | RAW `<button>`, icon-only | ✓ | Yes |
| E | Delete (L245) | RAW `<button>`, icon-only | ✓ | Yes |
| F | Star picker (L266) | RAW `<button>` in `.map` | ✓ | Yes |
| — | Edit-form input (L276) | RAW `<input>`, existing ring | ✓ | Skip |
| — | Edit-form textarea (L283) | RAW `<textarea>`, existing ring | ✓ | Skip |
| — | 4× shadcn `<Button>` | ships tokens | ✓ | Skip |
| — | "View My Trips" `<Button>` | ships tokens | ✓ | Skip |
| — | 5× `motion.div` | entrance anim, NO onClick | ✗ | Skip |
| — | Star display / text / icons | decorative | ✗ | Skip |

0 `motion.button`, 0 clickable `<div>`s missed.

---

### Q1 — Back button (A): ✅ Correct

Ring-only append. Plain `transition` already covers transform + color/bg (it's a superset of `transition-transform`); no flip needed. KEEP `active:scale-95` + `aria-label`. OUTWARD `ring-ring` on neutral header bg.

### Q2 — Filter chips (B): ✅ Correct & Consistent

`aria-pressed` (NOT `role=tab`) — identical pattern to GroupOrdersPage/MarketplaceOrdersPage/TransactionsPage/ReceiptsPage segmented filters. Append-not-flip (`transition-all` already). `[0.97]` segmented tier. Visible text → NO `aria-label`. Dynamic type label is DATA not state. OUTWARD `ring-ring` (neutral page bg behind the chips).

### Q3 — View-trip (C) & Delete (E): ✅ Correct

Both: icon-only → `active:scale-95`, `transition` already eases transform + hover color → no flip, KEEP `aria-label`, one-shot action → NO `aria-pressed`, OUTWARD `ring-ring` (bg-card parent).

### Q4 — Edit toggle (D): **(a) `aria-expanded={editingId === review.id}`**

This is the single most semantically correct attribute. Here's why:

- The button **discloses** the inline edit form — it's not a stateless toggle, it **owns a disclosure region** that appears/disappears below it.
- `aria-expanded` communicates **both** the toggle state AND the relationship to the revealed panel. Screen readers announce *"Edit review, collapsed/expanded"* — far more useful than *"pressed/not pressed"* for a form that materializes below.
- `aria-pressed` is for stateful toggles that don't reveal content (like the segmented filter chips in B — they swap a list filter, they don't open a panel).
- The WAI-ARIA disclosure pattern (trigger → `aria-expanded`) is the canonical spec for "button that shows/hides a section."

So the edit button gets: **`aria-expanded={editingId === review.id}`** + `active:scale-95` + ring + KEEP `transition` + KEEP `aria-label`.

Ring color: both states (off `bg-muted/40`, on `bg-primary/10`) sit on `bg-card` → OUTWARD `ring-ring`.

### Q5 — Star picker (F): ✅ Correct

Ring-only append. Pre-existing `active:scale-90` → do NOT renumber. KEEP `transition-transform`. KEEP `aria-label`. OUTWARD `ring-ring` on bg-card.

### Q6 — Skipped controls: ✅ All Correct

- **Input (L276)** + **textarea (L283)**: existing `focus:ring-1 focus:ring-primary/30` → don't-churn.
- **5× shadcn `<Button>`**: ship tokens.
- **5× `motion.div`**: entrance anim, NO onClick → presentational.
- **Star display / text / icons / status badge**: decorative.

### Q7 — Responsive: ✅ Clean at All Breakpoints

**375px** (~343px inner after `px-4`):
- **Header**: back 36px + gap-3 12px + flex-1 title/count → fits.
- **Filter row**: `overflow-x-auto` horizontal scroll, `whitespace-nowrap` chips → no crush.
- **Review card** (311px inner after `p-4`): star row 5×12px=60px + type label on left; 3× `h-8 w-8` = 72px + gap-1.5 = 84px on right with `gap-2` → ~219px for text, `truncate` handles overflow.
- **Inline edit form**: `w-full` input/textarea + `flex-1` pair buttons (~149px each at 311px) + 5 star picker buttons (5×20px + gap-1 ≈ 120px) → all fit.

**768/1024/1280**: `max-w-lg` (512px) centered → same layout, no crush.

---

### Final Corrected Edit Strings

**A. Header back button** — append ring, KEEP everything:
```diff
- className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition"
+ className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
No attribute changes (KEEP `aria-label="Go back"`).

**B. Filter chips** — ADD `aria-pressed` + append to cn() base:
```diff
  <button type="button"
    key={type}
+   aria-pressed={filterType === type}
    onClick={() => setFilterType(type)}
    className={cn(
-     "px-3 py-1.5 rounded-full border text-[12px] font-semibold whitespace-nowrap transition-all",
+     "px-3 py-1.5 rounded-full border text-[12px] font-semibold whitespace-nowrap transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      filterType === type
        ? "bg-ig-gradient text-white border-primary"
        : "bg-muted/20 text-foreground border-border/20 hover:bg-muted/40"
    )}
```

**C. View-trip** — append, KEEP everything:
```diff
- className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-muted/60 transition"
+ className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-muted/60 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
No attribute changes (KEEP `aria-label="View trip"`).

**D. Edit toggle** — ADD `aria-expanded` + append to cn() base:
```diff
  <button
    type="button"
+   aria-expanded={editingId === review.id}
    onClick={() => editingId === review.id ? setEditingId(null) : handleEdit(review)}
    className={cn(
-     "h-8 w-8 rounded-lg flex items-center justify-center transition",
+     "h-8 w-8 rounded-lg flex items-center justify-center transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      editingId === review.id
        ? "bg-primary/10 text-primary"
        : "bg-muted/40 hover:bg-muted/60"
    )}
    aria-label="Edit review"
```
KEEP `aria-label="Edit review"` (the `aria-expanded` supplements, not replaces, the accessible name).

**E. Delete** — append, KEEP everything:
```diff
- className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-600 transition"
+ className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-600 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
No attribute changes (KEEP `aria-label="Delete review"`).

**F. Star picker** — ring-only, KEEP everything:
```diff
- className="touch-manipulation active:scale-90 transition-transform"
+ className="touch-manipulation active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
No attribute changes (KEEP `aria-label={`Rate ${i + 1} star${i !== 0 ? "s" : ""}`}`).

---

### Diff Summary

| Metric | Count |
|--------|-------|
| className line changes | 6 (`−`/`+` swaps) |
| New `aria-pressed` | 1 (B filter chips — renders N per serviceTypes.length) |
| New `aria-expanded` | 1 (D edit toggle) |
| New `aria-label` | 0 (all 3 icon-only controls already had one) |
| New `active:scale` | 4 (A `95`, C `95`, D `95`, E `95`) |
| Press-scales preserved | 1 (F `90` — don't-churn) |
| Transitions preserved | 6 (A/C/E plain `transition`, B `transition-all`, D `transition`, F `transition-transform` — none flipped) |
| Rings added | 6 (all OUTWARD `ring-ring`) |
| `ring-inset` | 0 |
| `ring-white/70` | 0 |
| Logic lines touched | 0 |

### Owner Verification

1. Run `npm run update` (type-check + worker type-check + production build) — must pass.
2. Preview at 375px / 768px / 1280px: verify filter chip scroll, edit form expansion, star picker taps, delete confirm row, all focus rings visible on keyboard Tab.
3. Screen reader spot-check: back announces "Go back, button"; edit button announces "Edit review, button, collapsed/expanded"; filter chips announce "All Services, toggle button, pressed/not pressed".
