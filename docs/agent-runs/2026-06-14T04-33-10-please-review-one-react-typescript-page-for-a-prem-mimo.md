# MiMo run — 2026-06-14T04:33:10.508Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and confirm whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/AffiliateHubPage.tsx (an "Affiliate Hub" earnings page reached by in-app navigation; `useAuth`; two real `useQuery`s [`["my-referrals", user?.id]` from `referrals` and `["affiliate-wallet", user?.id]` from `wallets`]; derived `totalEarnings`/`completedReferrals`/`pendingReferrals`/`convRate`/`stats`; a `copyLink()` that writes to clipboard + fires `trackMarketingEvent` + a sonner toast; a static `programs` array. Layout: sticky header [RAW icon-only back button + "Affiliate Hub" title + a decorative Gift icon]; a referral-link card [a mono link span + a RAW icon-only Copy button + a row of two wide flex-1 buttons: a "Copy Link" button using a custom `.zivo-btn-signature` class + a "Share" button]; a 2-col stats grid [presentational motion.divs]; an "Affiliate Programs" list [presentational motion.div cards, each with a decorative "Join" span or a ChevronRight — NO onClick on the cards]; a "How It Works" numbered list [presentational motion.divs]; a 2-col "Quick Actions" grid of 4 react-router `<Link to=...>` cards [each `<Link>` wraps a `.zivo-card-organic` div]; a footer.)

CUSTOM CSS CLASS FACTS (from src/index.css, important):
- `.zivo-btn-signature` (the "Copy Link" button L122): ships `border-radius:16px; font-weight:700; transition: all 0.3s ease;` AND `.zivo-btn-signature:active { transform: scale(0.97); }`. Its fill is a GREEN gradient `linear-gradient(135deg, hsl(142 71% 45%), hsl(158 64% 51%))`. So this button ALREADY ships transition-all + an active press-scale(0.97) via the class; it ships NO focus ring.
- `.zivo-card-organic` (the 4 Quick-Action `<Link>` cards + the presentational stat/program/how-it-works cards): ships `border-radius:20px; overflow:hidden; transition: transform ..., box-shadow ...;` AND `.zivo-card-organic:active { transform: scale(0.97); }`. So these cards ALREADY ship a transition + an active press-scale(0.97); they ship NO focus ring. The 4 Quick-Action `<Link>` anchors do NOT reset their outline anywhere (no `outline-none`).

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: the two useQueries, `copyLink`, `trackMarketingEvent`, `navigator.share`, the toast, every onClick, every navigate/Link href, the `programs`/`stats` arrays. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we apply consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset only when the control is a flush edge child of a rounded overflow-hidden parent.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the ONLY animated property; transition-all when there is ALSO a hover:bg/text/opacity that should animate alongside the press; transition-opacity when only opacity animates. If a control ALREADY ships transition-all (or a custom class whose `transition` already covers transform), append the ring (don't re-flip / don't manufacture a duplicate transition).
- NO-OP / pre-existing-press policy: if a control already ships a press affordance (active:scale-95 / active:scale-90 / active:scale-0.97 via a class), KEEP it and do NOT renumber or manufacture a different scale.
- aria-label ONLY on icon-only / image-only controls (a control with rich visible text gets NO aria-label). aria-pressed ONLY on a persistent toggle/segmented control with selection conveyed by bg; NOT on one-shot actions or navigation.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale / transition, keep it.

RING COLOR: --ring resolves to BLACK in this app. An OUTWARD ring renders against the control's PARENT surface (not its own fill). A control whose outward ring renders against a neutral bg-card/bg-background/bg-muted parent uses ring-ring; a control whose ring renders ON a gradient/image surface uses ring-white/70. NOTE: a gradient-FILLED button (e.g. the green `.zivo-btn-signature`) sitting on a NEUTRAL card still uses ring-ring, because its OUTWARD ring renders against the neutral card parent, not its own green fill.

COMPONENT-TYPE RULES we follow:
- A RAW <button> (plain HTML) ships NO tokens.
- A react-router `<Link>` renders a native `<a>` which is natively keyboard-focusable and (unless its outline is reset) shows a browser-native focus outline. A native form control (`<input type=checkbox>`) that has NOT reset its native outline is left untouched (native focus indicator) per don't-churn.
- A framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.

MY PLANNED EDITS (please confirm each is right, or correct it):

A. Header back button (L94, RAW, ICON-ONLY ArrowLeft, NO aria-label, onClick={() => navigate("/more")}, className "p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation" — HAS hover:bg color fade, NO transition/scale/ring; in sticky header on neutral bg):
   plan: ADD aria-label="Go back" + APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — hover:bg-muted/50 color fade; icon tier scale-95; OUTWARD ring-ring on neutral header bg).

B. Copy-icon button (L117, RAW, ICON-ONLY Copy, NO aria-label, onClick={copyLink}, className "p-1.5 rounded-lg bg-primary/10 touch-manipulation active:scale-95" — HAS active:scale-95, NO transition, NO ring; bg-primary/10 tint on the neutral card):
   plan: ADD aria-label="Copy referral link" + APPEND `transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (transition-transform — scale is the only animated prop, no hover color; KEEP active:scale-95 [pre-existing, no renumber]; OUTWARD ring-ring).

C. "Copy Link" wide button (L122, RAW, VISIBLE TEXT "Copy Link" [Copy icon + text], onClick={copyLink}, className "flex-1 zivo-btn-signature py-2.5 text-xs flex items-center justify-center gap-1.5 touch-manipulation" — the `.zivo-btn-signature` class ALREADY ships transition-all + active:scale(0.97) + a GREEN gradient fill; NO ring; flex-1 wide, sits in a flex row inside the neutral referral card):
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ring-only (the class already covers transition-all + the press-scale -> do NOT add transition-transform, do NOT manufacture an active:scale; visible text -> NO aria-label; OUTWARD ring-ring — the outward ring renders against the neutral card parent, NOT the button's own green fill, so ring-ring not ring-white/70).

D. "Share" wide button (L125, RAW, VISIBLE TEXT "Share" [Share2 icon + text], onClick fires trackMarketingEvent + navigator.share else copyLink, className "flex-1 py-2.5 rounded-2xl bg-muted/60 text-foreground text-xs font-bold touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 border border-border/30" — HAS active:scale-95, NO transition, NO hover color, NO ring; flex-1 wide):
   plan: APPEND `transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (transition-transform — scale only, no hover color; KEEP active:scale-95 [pre-existing press affordance -> do NOT renumber to a wide [0.99] tier]; visible text -> NO aria-label; OUTWARD ring-ring on the neutral card).

EDGE CASE I want your verdict on:

E (QUESTION Q-E). The 4 "Quick Actions" `<Link to={href}>` cards (L237, each `<Link>` wraps `<div className="zivo-card-organic p-3.5 flex items-center gap-3 touch-manipulation">` with an icon + a label). The inner `.zivo-card-organic` div ALREADY ships an active:scale(0.97) press affordance + a transition via the class. The `<Link>` is a native `<a>` (natively keyboard-focusable) and does NOT reset its outline anywhere -> it retains the browser-native focus outline. Should I (a) LEAVE them untouched — they already have a press affordance (class scale) AND retain the native anchor focus outline (no outline reset), exactly like the native-checkbox don't-churn precedent (native control with an intact native focus indicator -> leave); or (b) ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the `<Link>` itself (the `<a>`) [note: the `<a>` is inline-by-default wrapping a block card, so the design-token ring may render on an awkward inline box unless I also add `block rounded-[20px]` to match the card] for a uniform design-token ring; or (c) something else? Pick the single most consistent option with the don't-churn + native-focus-indicator precedent.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- The mono referral-link span L114 (non-interactive text), the "Join" span L189 (a decorative span, NOT a button, the program card has NO onClick), the ChevronRight L191 (decorative icon).
- All motion.div cards: referral-link card L104, the 4 stat cards L146, the 6 program cards L169, the 4 how-it-works cards L210 — entrance anim, NO onClick -> presentational -> leave.
- All icons + all h1/h2/p/span text -> decorative.

QUESTIONS:
Q1. Back (A): ADD aria-label + FRESH transition-all + active:scale-95 + OUTWARD ring-ring — correct?
Q2. Copy-icon (B): ADD aria-label + transition-transform + ring-ring + KEEP active:scale-95 — correct?
Q3. Copy Link (C): the KEY call — ring-ONLY append (because `.zivo-btn-signature` already ships transition-all + active:scale-0.97) + OUTWARD ring-ring (NOT ring-white/70, since the outward ring renders against the neutral card parent not the green fill) + NO aria-label (visible text) — correct? Or should the green-gradient-filled button use ring-white/70?
Q4. Share (D): transition-transform + ring-ring + KEEP active:scale-95 (no renumber to a wide tier) + NO aria-label — correct?
Q5 (Q-E). The 4 Quick-Action `<Link>` cards (E): (a) leave [native anchor focus outline + class press-scale, don't-churn like the native checkbox], (b) add a design-token ring to the `<a>`, or (c) something else? Pick the most consistent option and explain.
Q6. Confirm the leave-untouched list (the spans, the ChevronRight, all 4 groups of presentational motion.divs) is handled correctly.
Q7. At 375px, does the header (back + title + Gift), the referral card (link row + Copy-icon + the two flex-1 Copy Link/Share buttons), the 2-col stats grid, the program list rows, and the 2-col Quick-Actions Link grid lay out without crushing? And at iPad 768/1024 + desktop 1280 (the page is a mobile-width column with no max-w wrapper — it spans full width; flag if that is a concern)?

Please answer Q1-Q7 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/AffiliateHubPage.tsx

---

# AffiliateHubPage — Premium Interaction + A11y Review

## File: `src/pages/AffiliateHubPage.tsx`

---

## Control Inventory (exhaustive, full file read)

| # | Control | Type | Line | aria-label | Existing transition/scale | Existing ring | Edit? |
|---|---------|------|------|-----------|--------------------------|--------------|-------|
| A | Header back | RAW `<button>`, icon-only ArrowLeft | ~94 | **NONE** | `hover:bg-muted/50` color fade; NO transition class; NO scale | NONE | **YES** |
| B | Copy-icon | RAW `<button>`, icon-only Copy | ~117 | **NONE** | `active:scale-95`; NO transition class; NO hover color | NONE | **YES** |
| C | "Copy Link" | RAW `<button>`, visible text (Copy icon + "Copy Link") | ~122 | — | `.zivo-btn-signature` → class ships `transition: all 0.3s ease` + `:active { transform: scale(0.97) }` | NONE | **YES (ring only)** |
| D | "Share" | RAW `<button>`, visible text (Share2 icon + "Share") | ~125 | — | `active:scale-95`; NO transition class; NO hover color | NONE | **YES** |
| E | 4× Quick-Action links | react-router `<Link>` → native `<a>` wrapping `<div className="zivo-card-organic …">` | ~237 | — | `.zivo-card-organic` → class ships `transition: transform …` + `:active { transform: scale(0.97) }` | Native `<a>` outline intact (no reset) | **NO (leave)** |
| — | Mono referral-link span | `<span>`, non-interactive text | ~114 | — | — | — | NO |
| — | "Join" span | `<span className="zivo-btn-signature …">`, decorative (NO onClick, NO role) | ~189 | — | — | — | NO |
| — | ChevronRight | decorative icon inside program card | ~191 | — | — | — | NO |
| — | 18× `motion.div` cards | referral-link card (1) + stat cards (4) + program cards (6) + how-it-works cards (4) + Quick-Action Link wrappers (0 — those are `<Link>` → `<a>`) | various | — | entrance anim only, NO onClick | — | NO |
| — | All icons + text | decorative | various | — | — | — | NO |

**Totals: 4 RAW controls edited (A–D), 4 className changes + 2 new aria-labels, 0 logic lines touched.**

---

## Q1–Q7 Answers

### Q1. Back (A) — ✅ Correct

Your plan is exactly right:

**Before (L94):**
```
"p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation"
```

**After:**
```
"p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**+ ADD `aria-label="Go back"`** on the `<button>` element.

Rationale:
- `hover:bg-muted/50` → **FRESH `transition-all`** (the hover color fade needs a transition property to animate; `transition-all` covers both the color fade and the new transform).
- Icon-only → icon tier → `active:scale-95`.
- Neutral header bg → **OUTWARD `ring-ring`**.
- Missing icon-only accessible name → **ADD `aria-label="Go back"`** (consistent with the ~45+ prior slices' header-back pattern).

---

### Q2. Copy-icon (B) — ✅ Correct

**Before (L117):**
```
"p-1.5 rounded-lg bg-primary/10 touch-manipulation active:scale-95"
```

**After:**
```
"p-1.5 rounded-lg bg-primary/10 touch-manipulation active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**+ ADD `aria-label="Copy referral link"`** on the `<button>` element.

Rationale:
- `active:scale-95` is the **only** animated property (no `hover:bg-*`) → **`transition-transform`** (not `transition-all`).
- **KEEP `active:scale-95`** (pre-existing press affordance → no renumber).
- Neutral card bg → **OUTWARD `ring-ring`**.
- Missing icon-only accessible name → **ADD `aria-label="Copy referral link"`**.

---

### Q3. Copy Link (C) — the KEY call — ✅ Correct

**Before (L122):**
```
"flex-1 zivo-btn-signature py-2.5 text-xs flex items-center justify-center gap-1.5 touch-manipulation"
```

**After:**
```
"flex-1 zivo-btn-signature py-2.5 text-xs flex items-center justify-center gap-1.5 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**No aria-label** (visible text "Copy Link" gives the accessible name).

**Ring-only append** — confirmed correct. Here's the full reasoning:

1. **No transition addition:** `.zivo-btn-signature` already ships `transition: all 0.3s ease` via the CSS class. Do NOT add `transition-transform` or `transition-all` — that would manufacture a duplicate/conflicting transition.
2. **No active:scale addition:** The class ships `:active { transform: scale(0.97); }`. Do NOT add `active:scale-95` or any other scale — that would conflict with the class's scale.
3. **Ring color — `ring-ring` NOT `ring-white/70`:** The button has a GREEN gradient fill (`linear-gradient(135deg, hsl(142 71% 45%), hsl(158 64% 51%))`), but the **outward ring renders against the button's PARENT surface**, which is the neutral `zivo-card-organic` card (bg-card). Per the explicit rule: *"a gradient-FILLED button sitting on a NEUTRAL card still uses `ring-ring`, because its OUTWARD ring renders against the neutral card parent, not its own green fill."* → **`ring-ring`**, not `ring-white/70`.
4. **No aria-label:** Visible text "Copy Link" (Copy icon + text) provides the accessible name.

---

### Q4. Share (D) — ✅ Correct

**Before (L125):**
```
"flex-1 py-2.5 rounded-2xl bg-muted/60 text-foreground text-xs font-bold touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 border border-border/30"
```

**After:**
```
"flex-1 py-2.5 rounded-2xl bg-muted/60 text-foreground text-xs font-bold touch-manipulation active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center justify-center gap-1.5 border border-border/30"
```

**No aria-label** (visible text "Share" gives the accessible name).

Rationale:
- No `hover:bg-*` → **`transition-transform`** (scale is the only animated property).
- **KEEP `active:scale-95`** (pre-existing press affordance → do NOT renumber to a wide `[0.99]` tier). The don't-churn / no-OP policy is clear: if a control already ships a press affordance, keep it.
- Neutral card bg → **OUTWARD `ring-ring`**.
- Visible text → NO aria-label.

---

### Q5. Quick-Action `<Link>` cards (E) — **(a) Leave them untouched.**

**Recommendation: option (a) — leave.**

Reasoning, in order of priority:

1. **Don't-churn / native-focus-indicator precedent:** The `<Link>` renders a native `<a>` that does NOT reset its outline anywhere — the browser-native focus outline is intact. This is directly analogous to the native-checkbox precedent from the rulebook: *"A native form control (`<input type=checkbox>`) that has NOT reset its native outline is left untouched (native focus indicator) per don't-churn."* A native `<a>` with an intact native outline is the same case.

2. **Press affordance already exists:** The inner `.zivo-card-organic` div provides `active: scale(0.97)` + `transition: transform …` via the CSS class. The card already responds to press.

3. **Option (b) would require structural churn:** Adding a design-token ring to the `<a>` would need `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring block rounded-[20px]` on the `<Link>` to (i) suppress the native outline, (ii) add the design-token ring, and (iii) make the `<a>` a block-level element with matching border-radius so the ring follows the card's shape. That's three structural additions beyond a token pass — too much churn for a "leave vs. style" decision.

4. **Functional keyboard accessibility is present:** The `<a>` is natively Tab-focusable, the native outline provides a visible focus indicator, and the card has a press affordance. No keyboard gap exists.

**Verdict: leave all 4 `<Link>` elements and their inner `<div className="zivo-card-organic …">` untouched.**

---

### Q6. Leave-untouched list — ✅ Confirmed

All correct:
- ✅ Mono referral-link span (~L114) — non-interactive text, leave.
- ✅ "Join" span (~L189) — decorative `<span>` with `.zivo-btn-signature` styling but NO onClick, NO role, NO tabIndex. Looks like a button but isn't interactive. Leave (flag for owner: a non-interactive element styled as a button could confuse sighted users — product decision, not part of this pass).
- ✅ ChevronRight (~L191) — decorative icon inside a program card that has no navigation. Leave.
- ✅ All `motion.div` cards (referral-link card, 4 stat cards, 6 program cards, 4 how-it-works cards) — entrance animation only, NO onClick. Presentational → leave.
- ✅ All icons + h1/h2/p/span text → decorative → leave.

---

### Q7. Responsive layout — ✅ Clean at 375; ⚠️ flag at desktop

**At 375px — clean:**
- **Header:** `flex items-center gap-3 px-4 py-3` → back `p-2 -ml-2` (~36px) + flex-1 "Affiliate Hub" title + Gift icon (~20px) → fits comfortably in ~343px inner.
- **Referral card:** `zivo-card-organic p-5` → mono link span (`flex-1 truncate`) + Copy-icon → fit. The `flex gap-2` row of two `flex-1` buttons → each ~155px, plenty of room for "Copy Link" / "Share" at `text-xs`.
- **Stats grid:** `grid grid-cols-2 gap-2.5` → each cell ~165px, ample for the icon-pill + earnings text + label.
- **Program list:** `zivo-card-organic flex items-start gap-3 p-3.5` → icon (40px) + flex-1 text + Join span/ChevronRight → fits comfortably.
- **Quick-Actions:** `grid grid-cols-2 gap-2.5` → each cell ~165px, icon-pill (36px) + label text → fits.

**At 768/1024 — clean within full width:**
Same layout, just wider cells. The 2-col grids expand proportionally. No crush.

**At 1280 — ⚠️ existing concern (out of scope for this pass):**
The page has **no `max-w-*` wrapper** — it spans full viewport width. At 1280px, the content area is ~1248px wide (just `px-4` padding). The 2-col stats grid cells would be ~615px each, the program list rows span the full width, and the referral card stretches very wide. This is a **pre-existing layout issue** (not introduced by this interaction pass). Most comparable pages in the app use `max-w-lg` or `max-w-xl`. **Owner flag:** consider adding `max-w-xl mx-auto` (or similar) to the `px-4 py-5 space-y-6 zivo-aurora` content div to constrain the layout at wider viewports. Not in scope for this pass.

---

## Summary Diff (4 edits, 2 new aria-labels)

All in `src/pages/AffiliateHubPage.tsx`:

### Edit A — Back button (~L94)

```diff
-          <button type="button" onClick={() => navigate("/more")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
+          <button type="button" onClick={() => navigate("/more")} aria-label="Go back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit B — Copy-icon button (~L117)

```diff
-            <button type="button" onClick={copyLink} className="p-1.5 rounded-lg bg-primary/10 touch-manipulation active:scale-95">
+            <button type="button" onClick={copyLink} aria-label="Copy referral link" className="p-1.5 rounded-lg bg-primary/10 touch-manipulation active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit C — "Copy Link" button (~L122)

```diff
-            <button type="button" onClick={copyLink} className="flex-1 zivo-btn-signature py-2.5 text-xs flex items-center justify-center gap-1.5 touch-manipulation">
+            <button type="button" onClick={copyLink} className="flex-1 zivo-btn-signature py-2.5 text-xs flex items-center justify-center gap-1.5 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit D — "Share" button (~L125)

```diff
-              className="flex-1 py-2.5 rounded-2xl bg-muted/60 text-foreground text-xs font-bold touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 border border-border/30"
+              className="flex-1 py-2.5 rounded-2xl bg-muted/60 text-foreground text-xs font-bold touch-manipulation active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center justify-center gap-1.5 border border-border/30"
```

---

## Diff counts

| Token | Count | Where |
|-------|-------|-------|
| Rings added (all `ring-ring`, all outward) | 4 | A, B, C, D |
| `ring-inset` | 0 | — |
| `ring-white/70` | 0 | — |
| `active:scale-95` added | 2 | A, B |
|
