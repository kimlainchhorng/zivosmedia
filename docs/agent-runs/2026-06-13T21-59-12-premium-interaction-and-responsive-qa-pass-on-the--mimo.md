# MiMo run — 2026-06-13T21:59:13.019Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction and responsive QA pass on the PUBLIC CAR-RENTAL BOOKING storefront at src/pages/car-rental/PublicCarRentalBookingPage.tsx (route /car-rental/:slug) and its detail page src/pages/car-rental/PublicCarRentalBookingDetailPage.tsx. Reference standard for interaction tokens: src/pages/hubs/JobPostingDetailPage.tsx (uses transition-all active:scale-[0.97/0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). HARD RULE: className and display-only attribute changes ONLY (e.g. adding aria-label). Do NOT change any supabase query, RPC, mutation, react-query key, state logic, routing, date math, or pricing math. Identify genuine gaps ONLY: (1) raw <button>/<a> controls missing active:scale press feedback or focus-visible rings — the booking page has ~7 controls still on transition-colors without scale/ring; (2) responsive crush or overflow at 375px width; (3) fetched-but-unused data fields; (4) contrast/legibility bugs; (5) accessibility gaps such as icon-only buttons without aria-label. For each finding give the EXACT line number and exact before/after className. Be concise and flag only REAL gaps. IMPORTANT: shadcn <Button> components already ship built-in active:scale + focus-visible:ring — do NOT flag those, only raw <button>/<a> elements.
- files: src/pages/car-rental/PublicCarRentalBookingPage.tsx, src/pages/car-rental/PublicCarRentalBookingDetailPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Audit both files for raw `<button>`/`<a>` controls missing `active:scale` press feedback + `focus-visible` ring, responsive crush, fetched-but-unused fields, contrast bugs, and accessibility gaps. Skip all shadcn `<Button>` (already carries the tokens). Only className / `aria-label` changes — zero behavior/logic touch.

## Findings

### File 1 — `PublicCarRentalBookingPage.tsx` (route `/car-rental/:slug`)

**Genuine gap found:** 1 raw `<a>` control (visible portion before truncation)

| # | Location | Element | Issue |
|---|----------|---------|-------|
| 1 | Line ~567 (store-not-found state) | `<Link to="/" className="mt-4 inline-block text-primary underline">` | Raw `Link` — no `active:scale` press feedback, no `focus-visible` ring |

**Before (line ~567):**
```tsx
<Link to="/" className="mt-4 inline-block text-primary underline">Back to home</Link>
```

**After:**
```tsx
<Link to="/" className="mt-4 inline-block text-primary underline transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">Back to home</Link>
```

**No other gaps** in the visible portion:
- Vehicle card `<button>`s: already carry `transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ✅
- Similar-vehicle alt `<button>`s: already carry `transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ✅
- Add-on toggle name `<button>`: has `active:scale-[0.98] transition-transform focus-visible:ring-2` ✅
- Add-on qty `−`/`+` buttons: have `active:scale-[0.95] transition-transform focus-visible:ring-2` + `aria-label` ✅
- Add-on "Add" button: has `active:scale-[0.95] transition-all focus-visible:ring-2` ✅
- Promo "Remove" `<button>`: has `active:scale-[0.95] transition-transform focus-visible:ring-2` ✅
- All shadcn `<Button>`/`<Input>`/`<Select>`/`<Textarea>`: skip (built-in tokens) ✅
- Wizard step indicators: decorative `<div>`s, not interactive ✅
- Grid layouts: `sm:grid-cols-2 lg:grid-cols-3` for vehicles, `sm:grid-cols-2` for dates/details — no crush at 375 ✅
- No fetched-but-unused fields, no contrast bugs, no missing `aria-label`s on icon-only controls ✅

> **Caveat:** The file is truncated (~80 lines cut). The confirmed step likely has more interactive elements (links to view booking, print QR, etc.). The agent applying this diff should check the confirmed step section too.

---

### File 2 — `PublicCarRentalBookingDetailPage.tsx` (route `/car-rental-booking/:code`)

**Genuine gap found:** 1 raw `<a>` control

| # | Location | Element | Issue |
|---|----------|---------|-------|
| 1 | Line ~267 (detail screen, directions link) | `<a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">` | Raw `<a>` — no `active:scale` press feedback, no `focus-visible` ring |

**Before (line ~267):**
```tsx
<a
  href={directionsUrl}
  target="_blank"
  rel="noreferrer"
  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
>
```

**After:**
```tsx
<a
  href={directionsUrl}
  target="_blank"
  rel="noreferrer"
  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
>
```

**No other gaps:**
- All dialog action buttons: shadcn `<Button>` ✅
- Lookup form submit: shadcn `<Button>` ✅
- "Cancel this booking" / "Reschedule" buttons: shadcn `<Button>` ✅
- "Add to calendar" / "Reschedule" action buttons: shadcn `<Button>` ✅
- "Back to home" `<Link>`: shadcn-style layout but actually a raw `Link` — however it's a **text link**, not a button. It already has `underline` and the page pattern (consistent with the salon). Acceptable as-is.
- Layout: `max-w-2xl`, single-column, no responsive crush ✅
- `vehicleFeatures` fetched and rendered ✅, no fetched-but-unused fields ✅
- `PaymentPill` properly labeled ✅
- No contrast bugs, no missing `aria-label`s on icon-only controls ✅

---

## Summary diff (2 changes, className-only)

```diff
--- a/src/pages/car-rental/PublicCarRentalBookingPage.tsx
+++ b/src/pages/car-rental/PublicCarRentalBookingPage.tsx
@@ -565,1 +565,1 @@
-          <Link to="/" className="mt-4 inline-block text-primary underline">Back to home</Link>
+          <Link to="/" className="mt-4 inline-block text-primary underline transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">Back to home</Link>

--- a/src/pages/car-rental/PublicCarRentalBookingDetailPage.tsx
+++ b/src/pages/car-rental/PublicCarRentalBookingDetailPage.tsx
@@ -265,1 +265,1 @@
-                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
+                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
```

## Owner verification

1. **Check the truncated confirmed step** in `PublicCarRentalBookingPage.tsx` (~lines 570–600+) for any raw `<a>`/`<button>` controls I couldn't see. The file was cut off at `classN` mid-attribute.
2. `npm run update` must pass green.
3. Preview at 375 / 768 / 1280 — both changes are minimal and non-layout-shifting, so responsive behavior won't change, but confirm keyboard focus ring appears on Tab to both links.
