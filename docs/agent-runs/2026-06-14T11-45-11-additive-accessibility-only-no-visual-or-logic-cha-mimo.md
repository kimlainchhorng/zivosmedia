# MiMo run — 2026-06-14T11:45:11.751Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility only, no visual or logic change. This is the customer RateRestaurant review page, English only, not bilingual. There is NO framer-motion so no useReducedMotion. Changes: One: the StarSelector subcomponent renders five icon only buttons each containing a Star icon with no visible text, so add aria-label to each star button equal to the category label plus the star number, for example using a template like label colon space then the number then space then star or stars singular plural, and add aria-hidden true to the Star icon inside since the button now has its own accessible name. Two: in the submit button there is one raw CSS animate-spin Loader2 shown while pending, append motion-reduce colon animate-none to its className and add aria-hidden true, the visible Submit Review text is the label. Three: the tag buttons wrap a Badge that already shows visible tag.label text, so leave the button and Badge alone but add aria-hidden true to the decorative emoji span before the label. Four: the header back button is icon only, add aria-label Back to the button and aria-hidden true to its ArrowLeft icon. Five: the submitted screen is a separate full page early return whose only heading is an h2 reading Thank You with no h1, promote that h2 to h1 keeping the exact same className for zero visual change, the main screen already has an h1 so leave it. Six: the Comments label is a plain label not associated with the Textarea, add htmlFor with a new id and the matching id on the Textarea. Do not touch the shadcn Card Button Badge Textarea internals beyond adding the id prop to Textarea, and do not touch the useSubmitRestaurantReview hook or FOOD_FEEDBACK_TAGS logic.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/customer/RateRestaurant.tsx

---

## 1. Plan

Six targeted, additive accessibility edits to `src/pages/customer/RateRestaurant.tsx` — no visual/logic changes, no hook/tag logic touched:

1. **StarSelector** — add `aria-label` to each star `<button>` (e.g. "Food Quality: 3 stars") and `aria-hidden="true"` to the `<Star>` icon inside.
2. **Submit Loader2** — append `motion-reduce:animate-none` to the spinner's className and add `aria-hidden="true"`.
3. **Tag emoji** — add `aria-hidden="true"` to the decorative `<span className="mr-1.5">` wrapping the emoji.
4. **Header back button** — add `aria-label="Back"` to the button and `aria-hidden="true"` to the `<ArrowLeft>` icon.
5. **Submitted screen** — promote `<h2>` to `<h1>`, keeping identical className.
6. **Comments label ↔ Textarea** — add `htmlFor="rate-restaurant-comments"` on the `<label>` and `id="rate-restaurant-comments"` on the `<Textarea>`.

---

## 2. Proposed diff

**File:** `../zivodriver/src/pages/customer/RateRestaurant.tsx`

### Edit 1 — StarSelector star buttons

**Before:**
```tsx
{[1, 2, 3, 4, 5].map((s) => (
  <button key={s} onClick={() => onChange(s)} className="focus:outline-none">
    <Star
      className={`w-8 h-8 transition-colors ${
        s <= value ? "text-warning fill-warning" : "text-muted-foreground/30"
      }`}
    />
  </button>
))}
```

**After:**
```tsx
{[1, 2, 3, 4, 5].map((s) => (
  <button key={s} onClick={() => onChange(s)} className="focus:outline-none" aria-label={`${label}: ${s} star${s > 1 ? "s" : ""}`}>
    <Star
      aria-hidden="true"
      className={`w-8 h-8 transition-colors ${
        s <= value ? "text-warning fill-warning" : "text-muted-foreground/30"
      }`}
    />
  </button>
))}
```

### Edit 2 — Loader2 spinner

**Before:**
```tsx
{submitReview.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
```

**After:**
```tsx
{submitReview.isPending ? <Loader2 aria-hidden="true" className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" /> : null}
```

### Edit 3 — Tag emoji span

**Before:**
```tsx
<span className="mr-1.5">{tag.emoji}</span>
```

**After:**
```tsx
<span className="mr-1.5" aria-hidden="true">{tag.emoji}</span>
```

### Edit 4 — Header back button

**Before:**
```tsx
<button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
  <ArrowLeft className="w-5 h-5" />
</button>
```

**After:**
```tsx
<button onClick={() => navigate(-1)} aria-label="Back" className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
  <ArrowLeft aria-hidden="true" className="w-5 h-5" />
</button>
```

### Edit 5 — Submitted screen h2 → h1

**Before:**
```tsx
<h2 className="text-xl font-semibold mb-2">Thank You!</h2>
```

**After:**
```tsx
<h1 className="text-xl font-semibold mb-2">Thank You!</h1>
```

### Edit 6 — Comments label ↔ Textarea association

**Before:**
```tsx
<label className="text-sm text-muted-foreground font-medium">Comments (optional)</label>
<Textarea
  value={feedback}
  onChange={(e) => setFeedback(e.target.value)}
  placeholder="Share your experience..."
  rows={3}
  maxLength={500}
/>
```

**After:**
```tsx
<label htmlFor="rate-restaurant-comments" className="text-sm text-muted-foreground font-medium">Comments (optional)</label>
<Textarea
  id="rate-restaurant-comments"
  value={feedback}
  onChange={(e) => setFeedback(e.target.value)}
  placeholder="Share your experience..."
  rows={3}
  maxLength={500}
/>
```

---

## 3. Owner verification

- **`npm run update`** (type-check + worker type-check + production build) must pass — the only props added are `aria-label`, `aria-hidden`, `htmlFor`, `id`, and `motion-reduce:animate-none` (a Tailwind utility); no logic lines changed.
- **No visual diff**: `motion-reduce:animate-none` only activates under `prefers-reduced-motion`; all other changes are attribute-only. The `h2`→`h1` uses the identical className so font-size/weight/spacing are identical.
- **Plurals check**: "1 star" vs "2 stars" through "5 stars" — confirm the template produces the expected strings for each category (e.g. "Overall Experience: 1 star", "Food Quality: 5 stars").
- **Tab key through the star grid**: each button should announce its category + number to screen readers.
- **Focus on the Textarea**: screen reader should announce "Comments (optional)" as its label via the `for`/`id` association.
