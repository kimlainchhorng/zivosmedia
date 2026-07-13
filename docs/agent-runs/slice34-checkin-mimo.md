# MiMo run — 2026-06-14T02:18:21.472Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control treatment is complete, consistent, and correctly scoped. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/CheckInPage.tsx  (a social "check-in" feature page reached by in-app navigation; backed by the `check_ins` Supabase table; `loadCheckins` does a `.select(...).eq("is_public", true).order("created_at",{ascending:false}).limit(20)`; `handleCheckIn` does a `.insert(...)`; local `useState` holds `checkins`, `location`, `caption`, `tagInput`, `showCreate`, `loading`, `submitting`. Layout: a sticky header, a collapsible "create check-in" form, and a vertical list of check-in cards.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, aria-expanded, and framer-motion whileTap if warranted). Please keep ALL data logic exactly as it is: the Supabase queries/insert, the `loadCheckins`/`handleCheckIn` functions, every `useState`/`useEffect`/`useCallback`, the `navigate(-1)` target, and all the `onClick`/`onChange`/`disabled` handlers must stay byte-identical. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link / inline icon+count button -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls, OR on a control whose only visible child text is a bare number/count (a count alone is not a meaningful accessible name). A control with rich descriptive visible text does NOT get an aria-label (it would REPLACE that child text for the accessible-name computation).
- Don't-churn rule: if a control already has a valid existing value, keep it rather than renumbering/re-flipping it.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> / <Input> / <Card> already ship built-in focus/press tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> (plain HTML, not shadcn) ships NO tokens.

THE CENTRAL JUDGMENT CALL (the main reason I'm asking):
The only two RAW <button> elements on this page are a "Like" button and a "Comment" button inside each check-in card (lines ~162 and ~165). They are real, natively-focusable <button type="button"> elements, each showing an icon + a count (Heart + likes, MessageCircle + comments). BUT both currently have NO onClick handler — they are non-functional placeholders (dead stubs); clicking them does nothing today. They also have NO focus ring and NO aria-label. Their only visible child text is the bare count number.

I see three defensible schools of thought and want your convergent recommendation:
- School A ("treat as real buttons"): they ARE focusable <button>s, so a keyboard user can Tab to them and currently gets no focus indicator (a real a11y gap regardless of the missing onClick), and their accessible name is just a number. So give them the full treatment: aria-label ("Like" / "Comment") + a press-scale (inline icon+count tier active:scale-[0.97]) + transition (they already have hover:text-red-500 / hover:text-blue-500, so transition-all) + focus ring.
- School B ("leave dead stubs alone"): a button with no onClick is non-functional; adding press-scale/ring implies an interactivity that does not exist and could mislead users. Leave them entirely untouched and instead flag the dead stubs to the owner to wire up (adding onClick is logic = out of scope for this className-only pass).
- School C ("a11y baseline only, no fake press"): give them a focus ring (they ARE focusable, so the no-focus-indicator gap is real today) + aria-label (the count alone is not a meaningful name), but NO active:scale (don't imply a press action that does nothing). Plus the owner flag from School B.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none need a change):
- Back button, line ~92: shadcn <Button aria-label="Back" variant="ghost" size="icon" onClick={navigate(-1)}> — labeled, ships tokens.
- "Check in" toggle, line ~96: shadcn <Button size="sm" onClick={setShowCreate(!showCreate)}> with visible text "Check in" — ships tokens, visible text.
- Create form (line ~102): motion.div with entrance animation, NO onClick — presentational wrapper.
- The three <Input>s, lines ~107/109/112: shadcn Input — ships tokens.
- The form's "Check in" submit (line ~115, shadcn Button, onClick=handleCheckIn, disabled logic), and "Cancel" (line ~119, shadcn Button, onClick=setShowCreate(false)) — ship tokens, visible text.
- The "Photo" button (line ~118): shadcn <Button size="sm" variant="outline"> with visible text "Photo" — ships tokens BUT has NO onClick (another dead stub). I plan to leave its className untouched (shadcn ships tokens) and simply flag the dead stub to the owner. Please confirm.
- Each check-in card (line ~141): motion.div with entrance animation, NO onClick — presentational.
- The <Card> (line ~142): shadcn Card, non-clickable — ships tokens.
- Avatar/MapPin/Clock/Users icons and all <span>/<p> display text — decorative children.

QUESTIONS:
Q1. For the Like/Comment RAW <button>s with NO onClick: which school (A, B, or C) is the right call for a className-only/display-only pass? Please pick one and explain briefly.
Q2. If A or C: confirm the exact tokens — for the Like button (currently className "flex items-center gap-1 text-xs hover:text-red-500 transition-colors") and the Comment button (currently "flex items-center gap-1 text-xs hover:text-blue-500 transition-colors"). Should the focus ring be OUTWARD or ring-inset? (They sit inside a shadcn <Card className="p-4"> via a flex row "flex items-center gap-4 text-muted-foreground"; the Card is not overflow-hidden at that inner row.) And if a press-scale is added, is transition-all correct (since they already have a hover:text-* color transition)?
Q3. Confirm the untouched list is correct — especially that the shadcn "Photo" button with no onClick should keep its className as-is (shadcn ships tokens) and just be owner-flagged, not restyled.
Q4. Anything missed? At a 375px-wide phone viewport, do the check-in cards (avatar + name/time + location + caption + the Like/Comment row) lay out without crushing?

Please answer Q1-Q4 and, if you land on School A or C, give me the corrected className string(s) plus the exact aria-label values. Keep all data/query/handler logic unchanged. Thank you.
- files: src/pages/CheckInPage.tsx

---

## Review: CheckInPage.tsx — Interaction + Accessibility Pass

### Plan

Two edits, both on the same line group (~L162-165): the Like and Comment RAW `<button>` elements. All other controls confirmed untouched (full inventory below). No data/query/handler logic touched.

---

### Q1. School recommendation: **School C** (a11y baseline only, no fake press)

**Reasoning:**

The buttons are real `<button type="button">` elements — natively focusable. A keyboard user *will* Tab to them and currently sees zero focus indication (real gap). Their accessible name is just a bare number (`{checkin.likes}` = `0`), which is meaningless to a screen reader (real gap). Both gaps exist regardless of whether `onClick` is wired.

However, adding `active:scale` on a dead stub creates a *new* false interactivity signal that the current code doesn't have. The existing `hover:text-red-500` already implies interactivity (and we don't churn that away), but `active:scale` is a distinct "press me and something happens" tactile affordance — pressing and getting *nothing* is worse UX than no feedback at all. School A would be the right call the moment `onClick` is wired; today, School C is the honest middle ground.

**Precedent:** CouponsPage's Filter `<Button>` (dead stub, shadcn, no `onClick`) was left className-unchanged + owner-flagged. But that was shadcn (ships tokens). Here we have RAW `<button>`s that ship *nothing*, so the baseline a11y gap (focus ring + accessible name) is real and should be fixed.

---

### Q2. Exact tokens for Like and Comment buttons

**Ring direction: OUTWARD.** Both buttons sit inside `<Card className="p-4">` via `<div className="flex items-center gap-4 text-muted-foreground">`. Shadcn `Card` is not `overflow-hidden` by default; the `p-4` (16px) clearance from the Card edge is well beyond a 2px ring. No `ring-inset` needed.

**Don't-churn:** Both already have `transition-colors` easing `hover:text-*`. Since we are NOT adding `active:scale` (no new animated property), we keep `transition-colors` — no flip needed.

#### Like button (~L162)

**Before:**
```tsx
<button type="button" className="flex items-center gap-1 text-xs hover:text-red-500 transition-colors">
```

**After:**
```tsx
<button type="button" aria-label="Like" className="flex items-center gap-1 text-xs hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**What changed:**
- `aria-label="Like"` added — icon-only + bare-count control, no meaningful accessible name otherwise
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended — fixes keyboard-focus gap
- `transition-colors` kept (don't-churn — no new animated property)
- No `active:scale` (dead stub — School C)
- No `ring-inset` (OUTWARD — Card not `overflow-hidden`, `p-4` clearance)

#### Comment button (~L165)

**Before:**
```tsx
<button type="button" className="flex items-center gap-1 text-xs hover:text-blue-500 transition-colors">
```

**After:**
```tsx
<button type="button" aria-label="Comment" className="flex items-center gap-1 text-xs hover:text-blue-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Same treatment** — `aria-label="Comment"` + ring append, `transition-colors` kept, no scale.

---

### Q3. Untouched-controls confirmation

| Line | Control | Decision | Reason |
|------|---------|----------|--------|
| ~92 | shadcn `<Button aria-label="Back">` | ✅ SKIP | Ships tokens, already labeled |
| ~96 | shadcn `<Button size="sm">` "Check in" toggle | ✅ SKIP | Ships tokens, visible text |
| ~102 | `motion.div` (create form wrapper) | ✅ SKIP | Entrance anim only, no `onClick` → presentational |
| ~107/109/112 | shadcn `<Input>` ×3 | ✅ SKIP | Ships tokens |
| ~115 | shadcn `<Button>` "Check in" submit | ✅ SKIP | Ships tokens, `disabled` logic correct |
| ~118 | shadcn `<Button size="sm" variant="outline">` "Photo" | ✅ SKIP + ⚠️ **owner flag** | Ships tokens (shadcn), but has **no `onClick`** — dead stub. Out of scope for this pass; owner to wire or remove. |
| ~119 | shadcn `<Button size="sm" variant="ghost">` "Cancel" | ✅ SKIP | Ships tokens, visible text |
| ~141 | `motion.div` (card entrance) | ✅ SKIP | Entrance anim only, no `onClick` → presentational |
| ~142 | shadcn `<Card className="p-4">` | ✅ SKIP | Non-clickable container |
| various | Avatar, MapPin, Clock, Users, Heart, MessageCircle icons + `<span>`/`<p>` text | ✅ SKIP | Decorative children |

**Every item confirmed correct.** The Photo dead stub gets the same owner-flag pattern as CouponsPage's Filter `<Button>` — shadcn ships its own tokens, className untouched, flagged for wiring.

---

### Q4. Responsive check at 375px

Tracing the layout with ~343px inner (`px-4` = 16px × 2):

- **Header:** back `h-10 w-10` (40px) + `gap-2` (8px) + MapPin (20px) + `gap-2` (8px) + "Check-in" title `text-xl` (~72px) + flex-1 + "Check in" shadcn `size="sm"` `rounded-full` (~96px) ≈ 244px + padding 32px = ~276px. **Fits.** ✅
- **Create form button row:** `flex gap-2` → "Check in" (~80px) + "Photo" (~70px) + "Cancel" (~60px) + 2×gap (16px) ≈ 226px. **Fits.** ✅
- **Check-in card:** `p-4` → ~311px usable.
  - User row: avatar `h-8 w-8` (32px) + `gap-2` (8px) + `flex-1` name/time. **Clean.** ✅
  - Location row: MapPin `h-3 w-3` (12px) + `gap-1` (4px) + text. **Clean.** ✅
  - Caption: `text-sm`, wraps naturally. ✅
  - **Like/Comment row:** `flex items-center gap-4` → Heart(12px) + `gap-1`(4px) + "0" + `gap-4`(16px) + MessageCircle(12px) + `gap-1`(4px) + "0" ≈ **~52px**. Comfortable within 311px. ✅

**No crushing at any width.** The card content is a simple single-column stack with generous padding.

---

### Summary diff

**File:** `src/pages/CheckInPage.tsx`

```
2 line-edits (aria-label attr + className append on each button)
0 new logic lines, 0 handler changes
git diff ≈ 4 ins / 2 del (+2 net = the two new aria-label attribute lines)
```

**Owner flags:**
1. **Like/Comment dead stubs** — `onClick` not wired (hardcoded `likes: 0`, `comments: 0` in `loadCheckins` mapping). Owner to wire the like/comment actions + update the query to fetch real counts. Once wired, upgrade to School A (add `active:scale-[0.97]` + flip `transition-colors`→`transition-all`).
2. **"Photo" button dead stub** — no `onClick`. Owner to wire camera/upload or remove.

**Verify:** `npm run update` must pass (type-check + worker type-check + production build, true exit 0).
