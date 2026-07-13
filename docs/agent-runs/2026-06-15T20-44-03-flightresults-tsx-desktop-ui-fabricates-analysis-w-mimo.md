# MiMo run — 2026-06-15T20:44:03.194Z

- model: mimo-v2.5-pro
- api_format: openai
- task: FlightResults.tsx desktop UI fabricates analysis with no data source. (A) 'Currency' select: one USD option, no onChange - non-functional. (B) 'Booking confidence' card: placeholder score bookingConfidence (92 or 78 based only on whether results exist), 3 static claims, fixed 'Confidence updated 2h ago'. (C) 'Price comparison' card: dead 7days/30days toggle (spans no onClick), hardcoded -8 percent, 'Average price' fallback literal 689, static decorative SVG trend, fixed Tips text. No price-history/demand data feeds any of it. A separate 'Why book with ZIVO?' card is legit static marketing (keep). PROPOSED: (1) replace Currency select with static USD text; (2) REMOVE the Booking confidence + Price comparison cards (and now-unused vars like bookingConfidence). Q1: agree remove both fabricated cards + static currency, vs keep shells with fake specifics stripped/labeled illustrative? Q2: risk removing them (layout, unused vars, the desktopInsights aside still has the Why-book card so not empty)? Concise verdict + reason.

---

## Verdict

**Remove all three.** The fabricated cards mislead users with fake data (hardcoded confidence scores, phantom price comparisons, a non-functional currency selector). Stripping them to empty shells adds no value — they'd just be blank boxes. The "Why book with ZIVO?" card is legitimate static marketing and stays, so the aside isn't empty. No layout risk: the aside is a flex column that naturally collapses.

---

## Plan

1. **Replace the Currency `<select>`** with a static "USD" text label (the select has one option and no `onChange` — it does nothing).
2. **Delete the Booking Confidence card** entirely (the `bookingConfidence` variable, the card markup, and the 3 static claim rows).
3. **Delete the Price Comparison card** entirely (the `priceComparison` toggle state, the card markup, the dead 7d/30d spans, the hardcoded stats, the decorative SVG, the tips).
4. **Clean up unused variables** (`bookingConfidence`, `priceComparison` state, and any now-orphaned imports).
5. The **"Why book with ZIVO?"** card stays — it's honest static marketing copy.

---

## Diff

**File:** `src/pages/FlightResults.tsx`

### (A) Remove unused state

```diff
-  const [priceComparison, setPriceComparison] = useState<'7days' | '30days'>('7days');
```

### (B) Remove `bookingConfidence` variable (find and delete)

```diff
-  const bookingConfidence = results.length > 0 ? 92 : 78;
```

### (C) Replace Currency `<select>` with static text

Find the Currency select block (roughly):

```tsx
// BEFORE
<select className="bg-transparent border-none text-sm font-medium text-foreground focus:outline-none">
  <option value="USD">USD ($)</option>
</select>
```

Replace with:

```tsx
// AFTER
<span className="text-sm font-medium text-foreground">USD ($)</span>
```

### (D) Delete the Booking Confidence card

Remove the entire card block that starts with the "Booking Confidence" heading and includes the confidence bar, the 3 static claims, and the "Confidence updated 2h ago" footer. It looks roughly like:

```tsx
// DELETE everything from here:
<div className="bg-card border border-border/40 rounded-2xl p-5">
  <h3 className="text-sm font-semibold text-foreground mb-3">Booking Confidence</h3>
  ...
  <p className="text-[10px] text-muted-foreground mt-3">Confidence updated 2h ago</p>
</div>
```

### (E) Delete the Price Comparison card

Remove the entire card block that starts with the "Price Comparison" heading and includes the 7d/30d toggle, the hardcoded stats, the decorative SVG trend line, and the Tips section:

```tsx
// DELETE everything from here:
<div className="bg-card border border-border/40 rounded-2xl p-5">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-semibold text-foreground">Price Comparison</h3>
    <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
      <span ...>7 days</span>
      <span ...>30 days</span>
    </div>
  </div>
  ...
</div>
```

### (F) Verify the aside still renders

After the deletions, the `desktopInsights` aside should contain only:

```tsx
<aside className="hidden lg:block w-80 shrink-0 space-y-4">
  {/* Currency (now static text) */}
  <div className="bg-card border border-border/40 rounded-2xl p-5">
    <h3 className="text-sm font-semibold text-foreground mb-3">Currency</h3>
    <span className="text-sm font-medium text-foreground">USD ($)</span>
  </div>

  {/* Why book with ZIVO? — kept, legit marketing */}
  <div className="bg-card border border-border/40 rounded-2xl p-5">
    ...
  </div>
</aside>
```

That's a clean two-card aside — no empty shells, no fabricated data.

---

## Owner verification

1. **Run `npm run update`** — must pass (type-check + worker type-check + production build, 0 errors). Removing the `useState` import for `priceComparison` is safe if other `useState` calls remain; if it was the only one, swap `useState` for a named import that's still used elsewhere.
2. **Visual check** at 1024px+ desktop: the right aside should show the Currency card (static "USD") and the "Why book with ZIVO?" card, stacked vertically with normal spacing. No empty gaps or broken borders.
3. **Mobile/tablet** (< `lg`): the aside is `hidden lg:block` so no change — unaffected.
4. **No logic changes** — all search, filtering, booking, and checkout flows are untouched. This is purely removing fabricated UI chrome.
