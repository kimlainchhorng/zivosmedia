# MiMo run — 2026-06-14T06:26:15.389Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive non-visual accessibility only, zero visual change. NO framer-motion in this file. Identify: icon-only back button needs aria-label Back, decorative icons ArrowLeft Wallet ArrowRight need aria-hidden true, and h1 then h3 skips h2 so change h3 Recent Earnings to h2 keeping className. List exact edits only.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/EarningsSummary.tsx

---

## Plan

Six additive a11y edits in one file, zero visual/logic change:

1. **Back `<button>`** — icon-only, no visible label → add `aria-label="Back"`
2. **`<ArrowLeft>`** — decorative inside labeled button → add `aria-hidden="true"`
3. **`<Wallet>`** — decorative, text "Unpaid Balance" follows → add `aria-hidden="true"`
4. **`<ArrowRight>` in "Earnings History"** — decorative, visible text beside it → add `aria-hidden="true"`
5. **`<ArrowRight>` in "Payout Batches"** — same → add `aria-hidden="true"`
6. **`<h3>` → `<h2>`** — heading hierarchy skips h2 (h1 → h3); keep exact `className`

---

## Proposed diff

**File:** `src/pages/driver/EarningsSummary.tsx` (in the zivodriver repo)

### Edit 1 — Back button (add `aria-label`)

```diff
-          <button onClick={goBack} className="p-2 rounded-xl bg-muted hover:bg-muted/80">
-            <ArrowLeft className="w-5 h-5" />
+          <button onClick={goBack} aria-label="Back" className="p-2 rounded-xl bg-muted hover:bg-muted/80">
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
```

### Edit 2 — Wallet icon (add `aria-hidden`)

```diff
-            <Wallet className="w-4 h-4" />
+            <Wallet className="w-4 h-4" aria-hidden="true" />
```

### Edit 3 — ArrowRight in "Earnings History" button

```diff
-            Earnings History <ArrowRight className="w-4 h-4" />
+            Earnings History <ArrowRight className="w-4 h-4" aria-hidden="true" />
```

### Edit 4 — ArrowRight in "Payout Batches" button

```diff
-            Payout Batches <ArrowRight className="w-4 h-4" />
+            Payout Batches <ArrowRight className="w-4 h-4" aria-hidden="true" />
```

### Edit 5 — Heading level h3 → h2

```diff
-            <h3 className="text-sm font-semibold text-foreground">Recent Earnings (Last 20)</h3>
+            <h2 className="text-sm font-semibold text-foreground">Recent Earnings (Last 20)</h2>
```

---

## Verify / deploy

- Run the zivodriver repo's type-check (`npx tsc --noEmit` or equivalent) — these are JSX attribute additions only, so zero type risk.
- Run `npm run build` to confirm the production build succeeds.
- **No visual change expected** — `aria-label`, `aria-hidden`, and heading tag swap (with identical `className`) are invisible to sighted users.
- Owner commits & deploys per usual workflow.
