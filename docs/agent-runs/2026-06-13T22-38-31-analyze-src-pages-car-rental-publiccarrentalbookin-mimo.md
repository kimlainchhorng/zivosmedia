# MiMo run — 2026-06-13T22:38:31.539Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze src/pages/car-rental/PublicCarRentalBookingDetailPage.tsx (a customer-facing PUBLIC page showing a car-rental reservation confirmation/detail — status, vehicle, pickup/dropoff dates, pricing, and any actions like cancel/modify/contact/directions) for PREMIUM + RESPONSIVE refinements toward parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. Focus on: (1) interaction consistency — add active:scale + transition-transform/all + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to every raw interactive button/anchor/Link/chip lacking them (cards/wide controls scale-[0.98], chips/small links scale-[0.97], icon-only scale-[0.95]); do NOT add rings to shadcn Button/Input/Textarea/Select (already ship focus styles) — shadcn Button gets only active:scale + transition-transform; (2) responsive issues at 375/768/1280; (3) any fetched-but-unused fields worth surfacing. Return a CONCISE line-referenced punch list of exact className edits with before/after. Do NOT reprint the whole component. Keep under ~1400 tokens.
- files: src/pages/car-rental/PublicCarRentalBookingDetailPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

This page is **surprisingly clean** — a single `max-w-2xl` centered column with mostly shadcn controls. Only **3 raw interactive elements** lack tokens; all shadcn `<Button>`/`<Input>`/`<Textarea>`/`<Select>` already ship focus styles (verified in `src/components/ui/button.tsx`). No responsive crush at any breakpoint. No genuinely unused fetched fields worth surfacing (every `ReservationRow` field is rendered; `store.slug` exists but linking to the storefront is a navigation addition — out of scope).

---

## Proposed changes — `src/pages/car-rental/PublicCarRentalBookingDetailPage.tsx`

### 1 · Lookup "Back to home" `<Link>` (~L170)

**Before:**
```jsx
<Link to="/" className="mt-4 block text-center text-sm text-primary underline">Back to home</Link>
```

**After:**
```jsx
<Link to="/" className="mt-4 block text-center text-sm text-primary underline transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">Back to home</Link>
```

### 2 · Directions `<a>` link (~L248)

**Before:**
```jsx
<a
  href={directionsUrl}
  target="_blank"
  rel="noreferrer"
  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
>
```

**After:**
```jsx
<a
  href={directionsUrl}
  target="_blank"
  rel="noreferrer"
  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
>
```

### 3 · Detail "Back to home" `<Link>` (bottom of detail, ~L360)

**Before:**
```jsx
<Link to="/" className="block text-center text-sm text-primary underline">Back to home</Link>
```

**After:**
```jsx
<Link to="/" className="block text-center text-sm text-primary underline transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">Back to home</Link>
```

---

### What was **not** changed (and why)

| Control | Type | Reason skipped |
|---------|------|----------------|
| Look up booking / Add to calendar / Reschedule / Cancel booking / Keep booking / Save new dates / Keep current dates | shadcn `<Button>` | Already ships `active:scale-[0.98]` + `focus-visible:ring-2` (confirmed in `button.tsx`) |
| `<Input>` / `<Textarea>` | shadcn | Already ships focus styles |
| Vehicle feature chips | `<span>` (non-interactive) | Decorative, not actionable |
| Status / Payment pills | `<span>` (non-interactive) | Decorative badges |
| `store.slug` | fetched but unused | Using it as a "back to store" link is a navigation/behavior addition — out of scope |

### Fetched-but-unused: **none worth surfacing**

Every field in `ReservationRow` is rendered. The `store_profiles.address` is fetched and parsed to `city`/`state` for both the header subtitle and the Google Maps directions URL — well-used. `vehicleFeatures` is rendered as chips.

### Responsive: **no issues found**

Single `max-w-2xl px-4` centered column. The action bar already uses `flex flex-wrap`. The reschedule dialog uses `sm:grid-cols-2`. The location row uses `flex-wrap`. Everything holds at 375 / 768 / 1280.

---

**Total: 3 className-only edits. Zero logic/query/behavior changes. Net ≈ +6 words of Tailwind class text.**

**Owner must verify:** `npm run update` (green gate). Preview `/car-rental-booking/:code` at 375/768/1280 — the 3 raw controls are gated behind a valid reservation (the lookup form and the "Back to home" `<Link>` are the reachable controls in the empty-DB state).
