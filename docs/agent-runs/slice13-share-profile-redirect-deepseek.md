# DeepSeek run — 2026-06-13T23:21:54.765Z

- model: deepseek-chat
- task: Analyze a customer-facing PUBLIC app-store deep-link redirect page — src/pages/ShareProfileRedirect.tsx (shows 'Open in ZIVO app' / 'Download for iOS/Android' CTAs, plus a small 'Continue in browser' text link) — for PREMIUM + RESPONSIVE refinements toward parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change routing, redirect logic, useEffect/platform-detection, or any data/query logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. Control inventory: the two primary CTAs ('Open in ZIVO app' ~L159, 'Download for…' ~L162) are shadcn Button components — ALREADY ship active:scale + focus-visible:ring, SKIP. The ONLY raw control is a small 'Continue in browser' text-link button (~L174): className 'mt-4 text-[12px] text-muted-foreground underline-offset-2 hover:underline', NO active:scale, NO focus ring, NO rounded. Tasks: (1) interaction consistency — for the small text-link, add active:scale-[0.97] (small text-link tier) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring + rounded-sm (clean radius on inline text) + transition-transform (or transition-all if hover state needs to animate). Flag any control I missed. (2) responsive issues at 375/768/1280 (centered single-column hero). (3) any display-only polish worth doing. Return a CONCISE line-referenced punch list of exact className edits with before/after. Do NOT reprint the whole component. Keep under ~600 tokens.
- files: src/pages/ShareProfileRedirect.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Analysis: `ShareProfileRedirect.tsx` — Premium + Responsive Refinement

### 1. Short Plan

This is a clean, minimal page. The two primary CTAs are shadcn `<Button>`s (already tokenized). The **only raw control** is the "Continue in browser" text link. I'll add interaction tokens to it, check for responsive issues, and flag one small display polish.

### 2. Proposed Changes

**File:** `src/pages/ShareProfileRedirect.tsx`

#### Change 1: Interaction tokens on "Continue in browser" text link (L174)

**Before:**
```tsx
className="mt-4 text-[12px] text-muted-foreground underline-offset-2 hover:underline"
```

**After:**
```tsx
className="mt-4 text-[12px] text-muted-foreground underline-offset-2 hover:underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** `rounded-sm` gives a clean focus ring shape on inline text. `transition-all` animates both the hover underline and the scale. `active:scale-[0.97]` matches the "small text-link" tier from the reference. `focus-visible:ring-2` provides keyboard accessibility.

#### Change 2: Display polish — add `text-balance` to the description paragraph (L156)

**Before:**
```tsx
<p className="mt-1 text-[13px] text-muted-foreground">
```

**After:**
```tsx
<p className="mt-1 text-[13px] text-muted-foreground text-balance">
```

**Rationale:** Prevents orphaned words on narrow mobile widths (375px). Pure display-only, no logic change.

### 3. Controls I Missed? — None

- **"Open in ZIVO app"** (L159): shadcn `<Button>` — already ships `active:scale-[0.98]` + `focus-visible:ring-2`.
- **"Download for…"** (L162): shadcn `<Button variant="outline">` — same, already tokenized.
- **Smartphone icon container** (L153): non-interactive `<div>` — correctly skipped.
- **Loader2 spinner** (L137): non-interactive — skipped.
- **"Profile not found"** (L127): pure text `<p>` — skipped.

### 4. Responsive Check (375/768/1280)

- **Single centered column** (`max-w-sm px-6 py-12`): holds cleanly at all widths.
- **Button stack** (`flex flex-col gap-2`): two full-width buttons stack vertically — no crush at 375px.
- **No grid/sidebar** — no responsive breakpoints needed.
- **No horizontal overflow** — all content is text + buttons within `max-w-sm`.

### 5. Owner Verification

- Run `npm run update` (type-check + worker + build must pass).
- Preview at 375px, 768px, 1280px — confirm the "Continue in browser" link has a visible focus ring on keyboard tab and a subtle press scale on click.
- No deploy needed — this is a className-only change, additive, safe for all domains.
