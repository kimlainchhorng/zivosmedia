# MiMo run — 2026-06-14T02:36:33.689Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 37 — StoryPollsPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props (do NOT add/remove whileTap). If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it for the owner (do NOT fix — adding role/tabIndex/onKeyDown is logic).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for PURE icon/press-scale with NO hover color. If transition-all already present, just append (DON'T-CHURN). If a raw control has transition-colors AND a hover color AND we are adding active:scale, FLIP transition-colors -> transition-all.
- shadcn <Button>/<Input>/<Textarea>/<Progress> already ship tokens -> DO NOT add className tokens. (Display-only ARIA attrs like aria-expanded MAY still be added to a shadcn Button if semantically warranted — that's a display attr, not a token.)
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset only when a focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor. Ample padding clearance -> outward ring.
- Controls with visible text get their accessible name from text (no aria-label); icon-only controls NEED aria-label. aria-pressed ONLY for toggle/segmented controls whose pressed-state is conveyed ONLY by background (valid on a real <button>). aria-expanded for INLINE disclosure (a trigger that expands/collapses an ADJACENT in-flow region — accordion, inline form) — NOT for a modal/portal (that's aria-haspopup, out of scope).

PAGE: src/pages/StoryPollsPage.tsx (224 lines, reached via in-app nav, NO SwipeBackContainer, useAuth). "Polls & Quizzes" = create + view your story polls/quizzes. Backed by feedback_submissions (category "story_poll"); loadPolls (useCallback) reads .eq category .eq user_id .order created_at desc .limit 20 into a local polls useState (JSON.parse each row.message into options/type/totalVotes); handleCreate .insert a new poll + toast + prepend. Local useState: polls/loading/showCreate/createType("poll"|"quiz")/question/options[]/correctIndex. addOption/removeOption/updateOption mutate the options array. Layout: sticky header (shadcn back Button + BarChart3 + "Polls & Quizzes" title + a shadcn "Create" Button that toggles showCreate); an AnimatePresence inline create-form (motion.div, height/opacity expand) containing: two clickable shadcn Badges (Poll/Quiz type selector) + a shadcn question Input + per-option rows (a quiz-only RAW radio <button> + a shadcn option Input + a shadcn "Remove option" icon Button) + a shadcn "Add option" Button + shadcn "Post to Story"/"Cancel" Buttons; then a polls list (each a presentational motion.div wrapping a shadcn Card with type/Active Badges, the question, poll-option result rows [plain divs + shadcn Progress], a votes count). Loading = a Loader2 spinner; empty-state = a shadcn "Create your first poll" Button.

SKIP (confirm): shadcn back Button L119 (aria-label="Back", ships tokens); shadcn "Remove option" Button L153 (aria-label="Remove option", ships tokens); shadcn "Add option"/"Post to Story"/"Cancel" Buttons L160/L163/L164 (visible text, ship tokens); shadcn "Create your first poll" Button L179 (visible text, ships tokens, one-way open CTA); shadcn question/option Inputs L143/L151 (ship tokens); shadcn Progress L210 (ships tokens); the create-form wrapper motion.div L133 (presentational, height/opacity anim, NO onClick); each poll card motion.div L182 (entrance anim, NO onClick -> presentational) + its shadcn Card L184; the poll.type + Active shadcn Badges L186/L190 (NO onClick -> presentational); poll-option result rows L202 (plain divs, NOT clickable); Loader2 spinner L173; all BarChart3/HelpCircle/CheckCircle/Send/Plus/Trash2/ArrowLeft icons + span/p text.

ONE edit (B) + ONE judgment (C) + ONE flag (A):

(B) Quiz correct-answer radio button, L147-149 — RAW <button type="button">, onClick={() => setCorrectIndex(i)}, quiz-only (rendered when createType==="quiz"), icon-only (a CheckCircle shows when i===correctIndex, else empty). className = template literal `h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${i === correctIndex ? "border-primary bg-primary" : "border-muted-foreground"}`. NO aria-label, NO transition, NO active, NO ring, NO hover color (the border/bg flip is STATE-driven [i===correctIndex], not a :hover). Sits in an option row `flex gap-2 items-center` (NOT overflow-hidden).
Q-B: append `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the STATIC prefix of the template literal (before the ${...}); add aria-label={`Mark option ${i + 1} as correct`}; add aria-pressed={i === correctIndex}. (icon-only tier -> scale-95; transition-TRANSFORM not transition-all [NO hover color — the selected border/bg is state-driven and snaps today; don't-churn that, ease only the new press-scale]; aria-label REQUIRED [icon-only, no visible text]; aria-pressed valid [real <button>, selected state conveyed to SR only by background since the CheckCircle glyph is decorative/SR-silent]; OUTWARD ring — option row is flex, not overflow-hidden). Confirm: scale-95, transition-transform (vs -all), aria-label wording, aria-pressed YES/NO (note: it's single-select/radio-like; role="radio"/aria-checked would be ideal but role is out of scope -> aria-pressed on the <button> is the best in-scope way to expose selection — agree?).

(C) "Create" header button, L125 — shadcn <Button size="sm" className="rounded-full gap-1">, onClick={() => setShowCreate(!showCreate)} (TOGGLES), visible text "Create" (+ Plus icon). It shows/hides the ADJACENT INLINE AnimatePresence create-form (motion.div that expands height in-flow directly below the header — NOT a modal/portal).
Q-C: my lean is ADD aria-expanded={showCreate} (display-only attr; the button toggles an inline in-flow disclosure region -> aria-expanded is the correct semantic, like an accordion header; NO className/token change since it's shadcn). Do you AGREE (add aria-expanded), or do you prefer NOT adding it (treat "Create" as a plain action button)? Pick one + why. (Note: the empty-state "Create your first poll" Button L179 is a ONE-WAY open [setShowCreate(true)], not a toggle -> no aria-expanded there.)

(A FLAG, do not fix) createType "Poll"/"Quiz" selectors, L136-141 — these are shadcn <Badge variant={...} className="cursor-pointer gap-1" onClick={() => setCreateType("poll"/"quiz")}>. shadcn Badge renders a <div> -> with onClick + cursor-pointer but NO role/tabIndex/onKeyDown -> KEYBOARD-INACCESSIBLE clickable divs (can't Tab to or activate via keyboard; selected state conveyed only by Badge variant default-vs-outline). Proper fix = role="button"/role="radio" + tabIndex + onKeyDown (LOGIC, out of my scope); aria-pressed alone is ineffective on a non-focusable div without a button role; a focus-visible ring never triggers on a non-focusable element. So I FLAG these for the owner (recommend converting to real <button>s or a shadcn ToggleGroup), and leave their className UNCHANGED. Confirm this is the correct FLAG-not-fix (and that I should NOT add tokens/aria to them).

============================================================
DELIVERABLE: Give the EXACT final className string + attrs for (B). Resolve (B) [scale-95; transition-transform vs -all; aria-label text; aria-pressed yes/no] and (C) [aria-expanded yes/no] explicitly with reasons. Confirm the (A) FLAG-not-fix + the SKIP list. Keep it tight.
- files: src/pages/StoryPollsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

One RAW `<button>` edit (B), one shadcn display-attr add (C), one owner flag (A). Total diff: ~4 ins / 2 del, +2 net.

---

## (B) Quiz correct-answer radio — L147-149

**Current** (single line):
```tsx
<button type="button" onClick={() => setCorrectIndex(i)} className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${i === correctIndex ? "border-primary bg-primary" : "border-muted-foreground"}`}>
```

**Proposed:**
```tsx
<button type="button" onClick={() => setCorrectIndex(i)} aria-label={`Mark option ${i + 1} as correct`} aria-pressed={i === correctIndex} className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i === correctIndex ? "border-primary bg-primary" : "border-muted-foreground"}`}>
```

**Rationale for every choice:**

| Decision | Resolution | Why |
|---|---|---|
| `active:scale-95` | icon-only tier | No visible text; the CheckCircle glyph is decorative/SR-silent |
| `transition-transform` | NOT `transition-all` | No `:hover` color/opacity — the border/bg flip is **state-driven** (`i === correctIndex`) and **snaps** today (no transition on those properties). Only the new `active:scale` transform needs easing. `transition-all` would introduce `transition: background-color, border-color` and start transitioning the state-snap, which is churn. |
| `aria-label="Mark option {i+1} as correct"` | REQUIRED | Icon-only button — no visible text provides an accessible name |
| `aria-pressed={i === correctIndex}` | YES | This is single-select/radio-like. Ideally `role="radio"` + `aria-checked` in a `role="radiogroup"`, but adding `role` is logic (out of scope). `aria-pressed` on the existing `<button type="button">` is the best in-scope approximation — SR announces "selected"/"not selected" per option. The label "Mark option {i+1} as correct" provides context so the user knows *what* is selected. |
| `focus-visible:ring-2 focus-visible:ring-ring` | OUTWARD | Sits in `flex gap-2 items-center` — NOT `overflow-hidden`. No ring-inset needed. |

---

## (C) "Create" disclosure toggle — L125

**Current:**
```tsx
<Button size="sm" className="rounded-full gap-1" onClick={() => setShowCreate(!showCreate)}>
  <Plus className="h-4 w-4" /> Create
</Button>
```

**Proposed:**
```tsx
<Button size="sm" className="rounded-full gap-1" onClick={() => setShowCreate(!showCreate)} aria-expanded={showCreate}>
  <Plus className="h-4 w-4" /> Create
</Button>
```

**Resolution: YES, add `aria-expanded={showCreate}`.**

Reasons:
1. The button **toggles** an **adjacent inline** `AnimatePresence` → `motion.div` that expands/collapses height **in-flow** directly below the header. This is a textbook inline disclosure (accordion pattern), NOT a modal/portal.
2. `aria-expanded` is the correct semantic — SR announces "Create, expanded" / "Create, collapsed".
3. Display-only attr, no className/token change (shadcn ships its own tokens).
4. Consistent with the disclosure-toggle precedent on ItinerariesPage (`aria-expanded={isOpen}` on the accordion toggle).

The empty-state "Create your first poll" Button L179 is ONE-WAY (`onClick={() => setShowCreate(true)}`), not a toggle → **no `aria-expanded`** there. Correct.

---

## (A) createType Poll/Quiz Badge selectors — L136-141 — **FLAG, not fix**

**Confirmed. Do NOT add tokens or aria attrs.**

shadcn `<Badge>` renders a `<div>`. With `onClick` + `cursor-pointer` but **no `role`, no `tabIndex`, no `onKeyDown`** → **keyboard-inaccessible clickable divs**. A keyboard user cannot Tab to them or activate them.

- Adding `aria-pressed` is **ineffective** on a non-focusable `<div>` without `role="button"` — screen readers won't announce it.
- Adding `focus-visible:ring-*` is **dead CSS** — the ring never triggers on a non-focusable element.
- Adding `active:scale-*` manufactures a press affordance for a control keyboard users can't reach.

**Owner recommendation:** Convert to real `<button>` elements styled to match (or a shadcn `ToggleGroup`), which natively gives focusability + keyboard activation. Minimal fix: swap `<Badge>` for `<button className="...">` with `aria-pressed={createType === "poll"}` + the same variant-based styling. Or wrap in `role="radiogroup"` with `role="radio"` + `aria-checked` for proper semantics.

---

## SKIP list — all confirmed

| Control | Why skip |
|---|---|
| shadcn back Button L119 | `aria-label="Back"`, ships tokens |
| shadcn "Remove option" Button L153 | `aria-label="Remove option"`, ships tokens |
| shadcn "Add option" Button L160 | Visible text, ships tokens |
| shadcn "Post to Story" Button L163 | Visible text, ships tokens |
| shadcn "Cancel" Button L164 | Visible text, ships tokens |
| shadcn "Create your first poll" Button L179 | One-way CTA, visible text, ships tokens |
| shadcn question Input L143 | Ships tokens |
| shadcn option Input L151 | Ships tokens |
| shadcn Progress L210 | Ships tokens |
| create-form wrapper motion.div L133 | Presentational (height/opacity anim), NO onClick |
| poll card motion.div L182 | Entrance anim, NO onClick → presentational |
| shadcn Card L184 | Non-clickable container |
| Poll.type + Active shadcn Badges L186/L190 | NO onClick → presentational |
| Poll-option result rows L202 | Plain divs, NOT clickable |
| Loader2 spinner L173 | Decorative |
| All icons/spans/p text | Display children |

---

## Exact diff

```diff
--- a/src/pages/StoryPollsPage.tsx
+++ b/src/pages/StoryPollsPage.tsx
@@ -123,7 +123,7 @@
             <h1 className="text-xl font-bold text-ig-gradient">Polls & Quizzes</h1>
           </div>
-          <Button size="sm" className="rounded-full gap-1" onClick={() => setShowCreate(!showCreate)}>
+          <Button size="sm" className="rounded-full gap-1" onClick={() => setShowCreate(!showCreate)} aria-expanded={showCreate}>
             <Plus className="h-4 w-4" /> Create
           </Button>
         </div>
@@ -146,7 +146,7 @@
               {options.map((opt, i) => (
                 <div key={i} className="flex gap-2 items-center">
                   {createType === "quiz" && (
-                    <button type="button" onClick={() => setCorrectIndex(i)} className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${i === correctIndex ? "border-primary bg-primary" : "border-muted-foreground"}`}>
+                    <button type="button" onClick={() => setCorrectIndex(i)} aria-label={`Mark option ${i + 1} as correct`} aria-pressed={i === correctIndex} className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i === correctIndex ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                       {i === correctIndex && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                     </button>
```

**Diff stats:** 2 lines changed, **+2 ins / 2 del**. All changes are className + display-only attrs. Zero logic/handler/state changes.

---

## Owner must verify

1. **Run `npm run update`** — must pass (types + worker types + production build).
2. **Flag (A):** The Poll/Quiz `<Badge>` type selectors (L136-141) are keyboard-inaccessible clickable `<div>`s. Recommend converting to real `<button>` elements or a shadcn `ToggleGroup`. This is a logic fix (out of scope for this pass).
3. **Preview at 375/768/1280** — the quiz radio button is only 20×20px (`h-5 w-5`), sub-44px tap target (established repo compact-pattern flag — not fixed per page).
