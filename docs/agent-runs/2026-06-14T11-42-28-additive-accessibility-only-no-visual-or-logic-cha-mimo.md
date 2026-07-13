# MiMo run — 2026-06-14T11:42:28.438Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility only, no visual or logic change. This is the customer RateDriver post-trip rating page, English only, not bilingual. There is NO framer-motion in this file so no useReducedMotion is needed. There are two raw CSS animate-spin Loader2 icons: one in the isLoading full screen state next to visible Loading text, and one inside the Submit button next to visible Submitting text. Append motion-reduce colon animate-none to each of those two Loader2 classNames and add aria-hidden true to both since the visible text is the accessible label. Also add aria-hidden true to the two decorative Check icons in the round badge circles, one in the alreadyRated screen and one in the isSubmitted screen, both sit above visible heading text. The header back button is icon only with no visible text so add aria-label Back to the button element and aria-hidden true to its ArrowLeft icon. Heading hierarchy: the main rating screen already has an h1 Rate Your Experience followed by an h2 driver name which is correct, leave those. But the alreadyRated screen and the isSubmitted screen are separate full page early returns whose only heading is an h2 with no h1 above it, which is a heading hierarchy problem. Promote those two standalone h2 elements, the one reading Already Rated and the one reading Thank You, to h1, keeping the exact same className so there is zero visual change. Also the Additional comments label is a plain label element not associated with the Textarea, add htmlFor with a new id and add the matching id to the Textarea so the label is programmatically linked, this is additive and safe. Do not touch the imported StarRating or FeedbackTags child components or the shadcn Card Button Avatar Textarea components themselves beyond adding the id prop to Textarea.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/customer/RateDriver.tsx

---

## Plan

Nine additive accessibility edits to `src/pages/customer/RateDriver.tsx` — zero visual or logic changes:

| # | Change | Why |
|---|--------|-----|
| 1 | Loader2 (loading screen) — append `motion-reduce:animate-none` + `aria-hidden="true"` | Visible "Loading…" text is the accessible label; reduce-motion safe |
| 2 | Loader2 (submit button) — append `motion-reduce:animate-none` + `aria-hidden="true"` | Visible "Submitting…" text is the accessible label; reduce-motion safe |
| 3 | Check icon (alreadyRated badge) — `aria-hidden="true"` | Decorative, above visible heading |
| 4 | Check icon (isSubmitted badge) — `aria-hidden="true"` | Decorative, above visible heading |
| 5 | ArrowLeft icon (header back button) — `aria-hidden="true"` | Icon-only button, getting explicit aria-label |
| 6 | Header back `<button>` — add `aria-label="Back"` | Icon-only, no visible text |
| 7 | `alreadyRated` standalone h2 → h1 | Heading-hierarchy fix (no h1 ancestor in this early-return branch) |
| 8 | `isSubmitted` standalone h2 → h1 | Same heading-hierarchy fix |
| 9 | Label ↔ Textarea: add `htmlFor="rate-driver-feedback"` + `id="rate-driver-feedback"` | Programmatic association |

---

## Proposed diff

**File:** `src/pages/customer/RateDriver.tsx`

```diff
*** a/src/pages/customer/RateDriver.tsx
--- b/src/pages/customer/RateDriver.tsx
***************
*** Loading screen — Loader2 + decorative Check
*** alreadyRated screen — Check + heading
*** isSubmitted screen — Check + heading
*** Header — back button + ArrowLeft
*** Text feedback — label + Textarea association
*** Submit button — Loader2
***************

--- 1. Loading screen Loader2 (around line ~152)
- <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
+ <Loader2 className="w-8 h-8 animate-spin motion-reduce:animate-none mx-auto mb-4 text-primary" aria-hidden="true" />

--- 2. alreadyRated screen Check icon (around line ~162)
- <Check className="w-8 h-8 text-primary" />
+ <Check className="w-8 h-8 text-primary" aria-hidden="true" />

--- 3. alreadyRated h2 → h1 (around line ~164)
- <h2 className="text-xl font-semibold mb-2">Already Rated</h2>
+ <h1 className="text-xl font-semibold mb-2">Already Rated</h1>

--- 4. isSubmitted screen Check icon (around line ~177)
- <Check className="w-8 h-8 text-success" />
+ <Check className="w-8 h-8 text-success" aria-hidden="true" />

--- 5. isSubmitted h2 → h1 (around line ~179)
- <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
+ <h1 className="text-xl font-semibold mb-2">Thank You!</h1>

--- 6. Header back button — aria-label (around line ~191)
  <button
    onClick={() => navigate(-1)}
+   aria-label="Back"
    className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
  >
    <ArrowLeft className="w-5 h-5" />

--- 7. ArrowLeft icon — aria-hidden (same button, ~line ~196)
- <ArrowLeft className="w-5 h-5" />
+ <ArrowLeft className="w-5 h-5" aria-hidden="true" />

--- 8. Label — htmlFor (around line ~254)
- <label className="text-sm text-muted-foreground font-medium">
+ <label htmlFor="rate-driver-feedback" className="text-sm text-muted-foreground font-medium">

--- 9. Textarea — id (around line ~257)
  <Textarea
+   id="rate-driver-feedback"
    value={feedback}
    onChange={(e) => setFeedback(e.target.value)}

--- 10. Submit button Loader2 (around line ~272)
- <Loader2 className="w-4 h-4 mr-2 animate-spin" />
+ <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" />
```

### Exact before → after for each hunk (full context)

**Hunk 1 — Loader2 (loading screen):**
```tsx
// BEFORE
<Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />

// AFTER
<Loader2 className="w-8 h-8 animate-spin motion-reduce:animate-none mx-auto mb-4 text-primary" aria-hidden="true" />
```

**Hunk 2 — alreadyRated Check + heading:**
```tsx
// BEFORE
<Check className="w-8 h-8 text-primary" />
...
<h2 className="text-xl font-semibold mb-2">Already Rated</h2>

// AFTER
<Check className="w-8 h-8 text-primary" aria-hidden="true" />
...
<h1 className="text-xl font-semibold mb-2">Already Rated</h1>
```

**Hunk 3 — isSubmitted Check + heading:**
```tsx
// BEFORE
<Check className="w-8 h-8 text-success" />
...
<h2 className="text-xl font-semibold mb-2">Thank You!</h2>

// AFTER
<Check className="w-8 h-8 text-success" aria-hidden="true" />
...
<h1 className="text-xl font-semibold mb-2">Thank You!</h1>
```

**Hunk 4 — Header back button + ArrowLeft:**
```tsx
// BEFORE
<button
  onClick={() => navigate(-1)}
  className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
>
  <ArrowLeft className="w-5 h-5" />
</button>

// AFTER
<button
  onClick={() => navigate(-1)}
  aria-label="Back"
  className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
>
  <ArrowLeft className="w-5 h-5" aria-hidden="true" />
</button>
```

**Hunk 5 — Label ↔ Textarea association:**
```tsx
// BEFORE
<label className="text-sm text-muted-foreground font-medium">
  Additional comments (optional)
</label>
<Textarea
  value={feedback}
  onChange={(e) => setFeedback(e.target.value)}

// AFTER
<label htmlFor="rate-driver-feedback" className="text-sm text-muted-foreground font-medium">
  Additional comments (optional)
</label>
<Textarea
  id="rate-driver-feedback"
  value={feedback}
  onChange={(e) => setFeedback(e.target.value)}
```

**Hunk 6 — Loader2 (submit button):**
```tsx
// BEFORE
<Loader2 className="w-4 h-4 mr-2 animate-spin" />

// AFTER
<Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" />
```

---

## Guard tally

| Guard | Count |
|-------|-------|
| `className` edits | 4 (2 Loader2 append, 0 on Check/icons, 0 on headings — h-tag swap only, 0 on button — aria-label attr only, 1 label htmlFor attr, 1 Textarea id attr) |
| New `aria-hidden="true"` | 5 (2 Loader2, 2 Check, 1 ArrowLeft) |
| New `aria-label` | 1 (back button "Back") |
| New `htmlFor` / `id` | 2 (label + textarea pair) |
| h2 → h1 promotions | 2 (same className, tag-only swap) |
| `motion-reduce:animate-none` additions | 2 |
| Logic lines touched | **0** |
| `onClick` / `onChange` / `navigate` / `useState` / `useEffect` / hooks touched | **0** |
| StarRating / FeedbackTags / shadcn internals touched | **0** |
| `disabled` touched | **0** |

---

## Owner verification

1. **Run `npm run update`** — must pass (type-check + worker type-check + production build). The changes are JSX attribute additions and one tag-name swap with identical className, so no type risk expected.
2. **Visual spot-check at 375px / 768px / 1280px** — confirm zero visual change (the h2→h1 swap keeps the same `className`, `aria-hidden`/`aria-label`/`htmlFor`/`id` are non-visual attributes, `motion-reduce:animate-none` is a Tailwind `prefers-reduced-motion` media-query class that only activates when the user has that OS setting enabled).
3. **`prefers-reduced-motion` test** — in DevTools, emulate `prefers-reduced-motion: reduce` and confirm the two Loader2 icons stop spinning (the rest of the page is unaffected).
4. **Screen reader quick check** — navigate to the loading, already-rated, and submitted screens; confirm the heading hierarchy reads correctly (h1 as top-level in each branch) and the back button announces "Back".
