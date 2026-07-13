# MiMo run — 2026-06-14T10:26:33.196Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopPerformancePage.tsx (252-line merchant "Performance Reviews" page inside <AppLayout title="Performance" hideHeader>; useAuth + react-query useQuery "shop-performance" (feedback_submissions category=shop_performance); handleSave via supabase.from().insert; an add-review form with a single-select PERIOD chip group, a 1-5 STAR rating button group, 3 native textareas; framer-motion AnimatePresence). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, .insert, react-query keys, disabled, setState byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn AppLayout. LEAVE raw native form fields (input/textarea) with their existing focus ring.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring. An OUTWARD ring on a control with its OWN tinted/gradient fill STILL renders against the neutral PARENT → ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF (or an existing transition-colors animating such a change ON ITSELF). A hover/transition on a CHILD does NOT count for the BUTTON.
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover/active color/bg/border pseudo ON ITSELF → use transition-all (FLIP). A render-driven conditional (ternary) selected-bg with NO transition utility and NO hover/active pseudo is NOT a FLIP trigger → keep transition-transform (preserve the author's instant color snap).
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter. aria-expanded on a disclosure.

SIX edits applied — confirm each CORRECT or NEEDS-FIX:

A) L108 BACK icon button — was `w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center` (icon-only ArrowLeft; navigate(-1); NO hover/transition/scale/ring; NO aria) → ADDED aria-label="Go back" + active:scale-95 + transition-transform (scale sole prop → NOT flip) + ring. Final: `w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Go back".

B) L112 PLUS/open-form icon button — was `w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center` (icon-only Plus; setShowForm(true); own tinted fill; NO aria) → ADDED aria-label="New performance review" + active:scale-95 + transition-transform + ring (OUTWARD ring-ring against neutral header despite own bg-primary/10). Final: `w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="New performance review".

C) L147 X-CLOSE icon button — was a BARE `<button onClick={() => setShowForm(false)}>` with NO className (icon-only X glyph; in the form card header bg-card) → ADDED className from scratch: rounded-full (tight ring trace, no padding → layout byte-identical) + aria-label="Close" + active:scale-95 + transition-transform + ring. Final className: `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Close".

D) L157 PERIOD chips (Monthly/Quarterly/Annual) — was `cn("px-3 py-1 rounded-full text-xs font-medium border", form.period === p ? "bg-ig-gradient text-white border-primary" : "border-border bg-muted/40")` (PERSISTENT SINGLE-SELECT period toggle; setForm period; visible text; **NO existing transition, NO hover/active pseudo — only a render-driven ternary selected-bg**; NO scale/ring/aria) → ADDED aria-pressed={form.period === p} (single-select segmented toggle) + chip-tier active:scale-[0.97] + transition-transform (NOT a FLIP: no hover/active pseudo ON ITSELF and no prior transition-colors → ternary bg stays instant; scale sole CSS-animated prop) + ring (OUTWARD ring-ring against bg-card form parent). Final base: `px-3 py-1 rounded-full text-xs font-medium border transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + conditional + aria-pressed. **CONFIRM transition-transform (NOT transition-all/FLIP) — same reasoning as prior slices' no-prior-transition single-select chips.**

E) L169 STAR RATING buttons (1-5) — **NEW PATTERN, KEY JUDGMENT.** Was a BARE `<button type="button" key={r} onClick={() => setForm({ ...form, rating: r })}>` with NO className, wrapping `<Star className={cn("w-7 h-7 transition-colors", r <= form.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")} />`. So: icon-only (Star glyph, no text); single-select rating (each button sets form.rating to its value); the button itself has NO className/transition; the transition-colors lives ON THE STAR CHILD (cumulative fill r <= form.rating), NOT on the button. → ADDED a className from scratch on the BUTTON: `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label={`${r} ${r === 1 ? "star" : "stars"}`} (icon-only → needs a label) + aria-pressed={form.rating === r} (single-select; exactly one star = the chosen value is pressed). Rationale for transition-transform (NOT transition-all): the only animated prop ON THE BUTTON is scale; the Star's transition-colors is on a CHILD and does NOT count toward the button's transition rule → transition-transform. **CONFIRM ALL FOUR: (1) adding className from scratch to the bare star button is in-scope (className edit, not logic); (2) active:scale-95 icon-only tier is correct; (3) transition-transform correct (child Star color change does NOT make it a FLIP — hover/transition on a CHILD doesn't count); (4) aria: aria-label per star + aria-pressed={form.rating === r} — is aria-pressed correct/safe here for a 5-star rating (single-select among 5, exactly one pressed = the selected value), OR should I drop aria-pressed and FLAG that a proper radiogroup role is the structural fix (role is out of scope)? Note the visual fill is CUMULATIVE (r <= form.rating) but aria-pressed marks only the EXACT selected star (form.rating === r). Is that mismatch acceptable, or is aria-checked semantics / no-aria-pressed better? Give your recommendation.** Ring: OUTWARD ring-ring against the bg-card form parent (correct?).

F) L197 SAVE button (form) — was `w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50` (visible text; handleSave; disabled={saving}; w-full with own gradient surface; has disabled:opacity-50) → ADDED active:scale-[0.98] (full-width WITH own surface tier) + transition-transform (scale sole INTERACTIVE prop; disabled:opacity is a static state pseudo, not interactive → NOT flip) + ring; NO aria (visible text). Final: `w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

ALSO CONFIRM I should LEAVE: L149 raw native `<input>` (employee name) + L179/L185/L191 raw native `<textarea>` (strengths/improvements/goals) — they ALREADY have `focus:ring-1 focus:ring-primary/30`; house standard = LEAVE native form fields, do NOT swap to focus-visible:ring-ring, do NOT add press/scale; AppLayout shell; the 3 stats cards L120-128 (presentational divs, no onClick); all motion.div wrappers with no onClick (form L139, list items L217 — animation only); the read-only star DISPLAY in the records list L228 (plain Star icons inside a div, NOT buttons — presentational); the avatar div L220; all lucide icons (decorative); the h1 + all <p>/<span> text; loading + empty-state. No clickable divs with onClick beyond those edited.

Be concise and exact. Return the precise final className after-string for each of A–F + every aria attr. Flag any other in-scope raw interactive control I missed. KEY QUESTIONS: (1) E — the star-rating button group: confirm className-from-scratch + scale-95 + transition-transform (child Star color change is NOT a FLIP trigger) + aria-label-per-star + aria-pressed={form.rating === r}; or recommend dropping aria-pressed (FLAG radiogroup). (2) D — transition-transform (NOT FLIP) for the no-prior-transition single-select period chip. (3) E ring + F disabled:opacity → transition-transform. (4) the native input + 3 textareas — confirm LEAVE with existing focus:ring-1.
- files: src/pages/app/shop/ShopPerformancePage.tsx

---

## Audit Result: ALL 6 EDITS CORRECT — ZERO fixes needed

The file already has every edit applied. Full per-edit verification below.

---

### A — BACK icon button ✅

**Final:** `className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` + `aria-label="Go back"`

Correct. Icon-only → scale-95. Scale sole prop → `transition-transform`. OUTWARD ring against `bg-background/80` neutral sticky header.

---

### B — PLUS icon button ✅

**Final:** `className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` + `aria-label="New performance review"`

Correct. Same icon-tier pattern. OUTWARD `ring-ring` renders against the neutral header parent, NOT the button's own `bg-primary/10`.

---

### C — X-CLOSE bare button ✅

**Final:** `className="rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` + `aria-label="Close"`

Correct. className from scratch on bare button (in-scope). `rounded-full` only, no padding → ring traces tightly, layout byte-identical. OUTWARD ring against `bg-card` form parent.

---

### D — PERIOD chips ✅

**Final base:** `px-3 py-1 rounded-full text-xs font-medium border transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + conditional ternary + `aria-pressed={form.period === p}`

Correct. **`transition-transform` (NOT FLIP) is confirmed** — the conditional `bg-ig-gradient` selected-bg is a render-driven ternary with NO `transition-colors` and NO `hover:`/`active:` pseudo ON ITSELF → the author's instant color snap is preserved; scale is the sole CSS-animated prop. Chip-tier `scale-[0.97]`. OUTWARD `ring-ring` against `bg-card` form parent. `aria-pressed` on single-select segmented toggle. Matches the identical pattern from Slices 108/109/111/112.

---

### E — STAR RATING buttons ✅ (with recommendation)

**Final:** `className="rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` + `aria-label={...}` + `aria-pressed={form.rating === r}`

**All four judgments confirmed:**

1. **className from scratch** — in-scope (className edit, not logic). ✅
2. **`active:scale-95` icon-only tier** — correct (Star glyph, no visible text). ✅
3. **`transition-transform` (NOT FLIP)** — correct. The `transition-colors` lives on the **child** `<Star>` element, NOT on the button. Per the house rule: "A hover/transition on a CHILD does NOT count for the BUTTON." Scale is the sole animated prop ON THE BUTTON. ✅
4. **`aria-pressed={form.rating === r}` — KEEP IT.** Here's the analysis:

   The cumulative visual fill (`r <= form.rating`) is a UI convention meaning "the rating IS N," not "stars 1 through N are each independently selected." `aria-pressed` marking only the EXACT value (`form.rating === r`) correctly communicates single-select semantics — exactly one star is the chosen rating. If you marked stars 1–3 all as `aria-pressed="true"` when rating=3, that would incorrectly imply three independent selections.

   **Recommendation: KEEP `aria-pressed` as-is.** It's the best className+display-aria approximation for a single-select button group. **FLAG for owner:** the structural fix would be `role="radiogroup"` on the container + `role="radio"` + `aria-checked` on each button (proper single-select semantics), but role is structural and out of scope for this pass.

5. **Ring:** OUTWARD `ring-ring` against `bg-card` form parent. ✅

---

### F — SAVE button ✅

**Final:** `className="w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

Correct. Wide full-width WITH own gradient surface → `scale-[0.98]`. `disabled:opacity-50` is a static disabled-STATE pseudo, NOT an interactive hover/active change → scale stays the sole INTERACTIVE animated prop → `transition-transform` (NOT flip). ✅ Matches the identical Save-button pattern from Slices 108–112. OUTWARD `ring-ring` against parent. No aria (visible text).

---

### LEAVE confirmations ✅

All correct — no edits needed:

| Control | Reason |
|---------|--------|
| L149 raw native `<input>` (employee name) | Has `focus:ring-1 focus:ring-primary/30`; house standard = leave native form fields |
| L179/185/191 raw native `<textarea>` (strengths/improvements/goals) | Same `focus:ring-1 focus:ring-primary/30` |
| `AppLayout` shell | Shadcn, skip |
| 3 stats cards L120–128 | Presentational divs, no onClick |
| `motion.div` wrappers (form L139, list items L217) | Animation only, no onClick |
| Star display in records list L228 | Plain Star icons inside a div, NOT buttons — presentational |
| Avatar div L220, all lucide icons | Decorative/presentational |
| h1 + all `<p>`/`<span>` text | Non-interactive |
| Loading + empty-state | Non-interactive |

---

### Missed controls scan: NONE

Full-file scan of all interactive raw controls:

| Type | Count | Status |
|------|-------|--------|
| `<button>` (raw) | 6 (A/B/C/D×3/E×5/F) | All edited ✅ |
| `<button>` (shadcn) | 0 | N/A |
| `<a>` | 0 | N/A |
| `onClick` divs | 0 | N/A |
| `role="button"` / `cursor-pointer` divs | 0 | N/A |
| Native `<input>` | 1 | Left (form field) ✅ |
| Native `<textarea>` | 3 | Left (form fields) ✅ |

No missed controls.

---

### Guard grep summary

```
className edits:      6 (A/B/C/D/E/F)
new aria-label:       4 (A/B/C/E)
new aria-pressed:     2 (D/E)
focus-visible:ring:   6 (all)
ring-ring:            6 (all OUTWARD)
ring-inset:           0
aria-expanded:        0
active:scale-95:      4 (A/B/C/E icon-only)
active:scale-[0.97]:  1 (D chip)
active:scale-[0.98]:  1 (F wide-own-surface)
FLIPs:                0
non-FLIP transition-transform: 6 (all)
disabled touched:     0
logic lines touched:  0
```

---

### Owner verification

1. **Run `npm run update`** — must pass (type-check + worker type-check + production build). The edits are className + display-aria only, zero logic changes, so it should be clean.
2. **Preview at 375/768/1280** — the sticky header [Back + flex-1 h1 + Plus] fits at 375; the AnimatePresence form (1 input, 3 period chips, 5 star buttons, 3 textareas, Save) wraps cleanly; the reviews list (avatar + text + mini star display) scales well.
3. **Owner flags (logic, FLAG not fix):**
   - Reviews stored as JSON in `feedback_submissions.message` with `category="shop_performance"`, parsed with try/catch that silently drops malformed rows — confirm RLS scopes reads to `eq(user_id, user.id)`.
   - `handleSave` always inserts a new row with no de-dup (re-submitting creates duplicate reviews for the same employee/period) — existing behavior.
   - The `showForm(false)` + form reset on success doesn't await the query invalidation — existing behavior.
4. **Star rating structural FLAG:** the ideal a11y fix would be `role="radiogroup"` + `role="radio"` + `aria-checked` on the star group (out of scope for this pass, `aria-pressed` is the best available approximation).

**File is ready to commit as-is.** All 6 edits textbook correct, zero missed controls, zero logic changes.
