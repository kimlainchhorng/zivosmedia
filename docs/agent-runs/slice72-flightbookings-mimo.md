# MiMo run — 2026-06-14T07:03:52.529Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/FlightBookingsPage.tsx (603 lines, "Flight Booking History — /flights/bookings; premium booking management with filters, status tabs, cancellation, and detail modal"; REAL Supabase via useFlightBookings/useFlightBooking/useRequestFlightRefund hooks; useState selectedId/activeTab/searchQuery/sortNewest + modal copied/showRefundConfirm; useMemo filteredBookings (tab + search + sort); PullToRefresh wrapper). Layout: Header; page header (shadcn Back Button asChild Link + title + shadcn Refresh Button + shadcn New-Search Button); sticky search row (shadcn Input + shadcn sort Button) + horizontal FILTER_TABS rail (5 raw pill buttons); loading skeletons / error card / empty card / bookings list (clickable shadcn Cards open a detail modal); BookingDetailsModal (shadcn Dialog: status/route/info rows incl. a copy-ref raw button, totals, travelers, e-tickets, failed-state support raw buttons [mailto + help], processing note, shadcn action Buttons; + a refund-confirm shadcn Dialog).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): RAW interactive controls = (1) L174 FILTER_TABS raw <button> (mapped ×5, single-select filter, one-shot setActiveTab(key), selection bg-conveyed "bg-[hsl(var(--flights))] text-white shadow-sm" [active] vs "bg-muted/50 text-muted-foreground hover:bg-muted", cn 1st arg base "...rounded-full text-xs ... transition-all duration-200 shrink-0", NO scale/focus/aria); (2) L460 copy-ref raw <button> (modal, one-shot handleCopy clipboard, visible content = booking_reference text + Copy/Check icon [the ref NOT the action], HAD "transition-colors" + "hover:text-[hsl(var(--flights))]", NO scale/focus/aria); (3) L535 support mailto raw <button> (failed-state, onClick dynamic-import openSystemUrl mailto:support@hizovo.com, visible text "support@hizovo.com" + Mail icon, HAD "transition-colors" + "hover:text-foreground", NO scale/focus); (4) L538 Help-Center raw <button> (failed-state, onClick dynamic-import openExternalUrl https://hizovo.com/help, visible text "Help Center" + MessageCircle icon, HAD "transition-colors" + "hover:text-foreground", NO scale/focus). SHADCN (SKIP — ship tokens): Back Button L129 (already aria-label), Refresh Button L140 (already aria-label), New-Search Button L143, search Input L154, sort Button L161, Retry Button L233, empty-state Buttons L271/281/286, View-Full-Details Button L555 (already active:scale-[0.98]), Request-Cancellation Button L559, refund-confirm Buttons L587/590, Badge/Card/Skeleton/Separator. CLICKABLE shadcn <Card> L315 (onClick setSelectedId opens modal, ALREADY "active:scale-[0.99]" + "transition-all duration-200", "cursor-pointer group overflow-hidden", NO role/tabIndex/focus — renders a <div>, NOT focusable).

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95; bare full-width row active:scale-[0.99]. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. FLIP RULE: ADDING a NEW CSS scale to a transition-colors/no-transition control that ALSO has hover color/bg/border → FLIP transition-colors→transition-all. DON'T-CHURN: control ALREADY has press + transition → ring (+aria) ONLY. aria-pressed for persistent single-select with constant label + bg-conveyed state. aria-label for icon-only OR when visible text doesn't convey the action. OUTWARD ring-ring default on neutral surfaces. shadcn Button/Input SKIP.

EDITS APPLIED (validate exact):
(A) L174 FILTER_TABS <button> — **ADD aria-pressed={activeTab === key}** (persistent single-select segmented filter, no role=tablist → aria-pressed is the house pattern over aria-selected) + APPEND into the cn 1st-arg static base "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (segmented/pill tier [0.97]; **NO flip** — "transition-all" already present; OUTWARD ring-ring — the flights-color is the pill's OWN active fill, ring renders against the neutral overflow-x-auto header rail; single edit hits all 5 tabs).
(B) L460 copy-ref <button> — **ADD aria-label="Copy booking reference"** (visible content is the ref digits, not the action) + **FLIP transition-colors→transition-all** + APPEND "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (inline chip/text-link tier [0.97]; FLIP mandatory — gaining a NEW CSS scale on transition-colors+hover:text; OUTWARD ring-ring on the neutral dialog bg-card).
(C) L535 support mailto <button> — **FLIP transition-colors→transition-all** + APPEND "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (small text-link tier [0.97]; FLIP — hover:text-foreground + new scale both animate; OUTWARD ring-ring; NO aria — visible text "support@hizovo.com" + Mail icon convey it).
(D) L538 Help-Center <button> — identical FLIP + active:scale-[0.97] + ring (NO aria — visible text "Help Center").
LEAVE: (1) L315 clickable shadcn <Card> — ALREADY active:scale-[0.99] + transition-all; it renders a <div> with onClick but NO role="button"/tabIndex/onKeyDown → NOT keyboard-focusable, so a focus-visible ring would be a NO-OP; the real fix is the structural keyboard-a11y change → LEFT + flagged (it does NOT contain nested interactive buttons — the whole card opens the modal — so no double-anim concern, but still not focusable); all shadcn Button/Input/Badge/Card-styling (ship tokens or presentational); decorative icons/AirlineLogo/gradient bands.

QUESTIONS:
(1) (A) FILTER_TABS: aria-pressed={activeTab === key} correct (single-select, no tablist roles)? NO flip correct (transition-all already present)? [0.97] segmented tier + OUTWARD ring-ring on own flights-color fill?
(2) (B) copy-ref: aria-label="Copy booking reference" warranted (visible text = ref digits)? FLIP + [0.97] + ring correct?
(3) (C)/(D) support mailto + Help-Center: FLIP transition-colors→transition-all + [0.97] + ring correct? NO aria (visible text conveys)? (these are real external nav handlers — untouched)
(4) (1) clickable shadcn <Card> L315: LEAVE correct? Is a focus-visible ring a no-op on a shadcn Card (renders <div>, no role/tabIndex)? Already active:scale-[0.99] (don't-churn)? Should keyboard a11y (role="button"+tabIndex+onKeyDown) be FLAGGED as a structural owner fix?
(5) Inventory exhaustive (4 raw buttons edited; all shadcn Button/Input SKIP; clickable Card LEFT+flagged)? Badges/AirlineLogo/icons/gradient bands presentational?
(6) Owner flags (logic/out of scope, FLAG not fix): (a) clickable shadcn Card lacks keyboard a11y (role/tabIndex/onKeyDown — structural); (b) PullToRefresh wraps the entire page including the sticky search/filter row (top-[72px]) AND Header — its y-transform may break position:sticky on descendants (repo guardrail); (c) bookings query/refund mutation are real Supabase (untouched); (d) copy uses navigator.clipboard with no catch (pre-existing); anything else?
(7) Responsive 375/768/1280: page header (Back + title + Refresh + New-Search); sticky search Input + sort + 5-pill FILTER_TABS rail (overflow-x-auto); bookings cards (route + status badge + pax/ref + price + chevron); detail modal (Dialog max-w-md: route, info rows, totals, actions). Any crush @375? sub-44px tap targets to FLAG (filter pills py-1.5 ~30px; copy/support/help inline text; shadcn icon Buttons size icon ~40px; Input h-10 40px)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/FlightBookingsPage.tsx

---

## Validation — FlightBookingsPage.tsx

All four edits are **already applied correctly** in the file shown. Validation per question:

---

### (1)(A) FILTER_TABS — ✅ ALL CORRECT

```jsx
aria-pressed={activeTab === key}
// cn 1st arg:
"…transition-all duration-200 shrink-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- `aria-pressed` — correct house pattern for persistent single-select without `role=tablist`. ✓
- **NO flip** — `transition-all` was already present in the base string before this edit. ✓
- `[0.97]` segmented/pill tier. ✓
- **OUTWARD `ring-ring`** — `bg-[hsl(var(--flights))]` is the pill's own active fill on the neutral `overflow-x-auto` rail. ✓

---

### (2)(B) copy-ref — ✅ ALL CORRECT

```jsx
aria-label="Copy booking reference"
className="flex items-center gap-1.5 font-mono font-bold hover:text-[hsl(var(--flights))] transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- `aria-label` warranted — visible content is the ref digits + Copy/Check icon, not the action verb. ✓
- **FLIP** `transition-colors`→`transition-all` mandatory — gained a CSS `active:scale` on a control that had `hover:text`. ✓ (now shows `transition-all`)
- `[0.97]` inline chip/text-link tier. ✓
- OUTWARD `ring-ring` on neutral dialog `bg-card/95`. ✓

---

### (3)(C)/(D) support mailto + Help-Center — ✅ ALL CORRECT

```jsx
// (C)
className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
// (D) identical
```

- **FLIP** mandatory — `hover:text-foreground` + new CSS scale. ✓
- `[0.97]` small text-link tier. ✓
- OUTWARD `ring-ring` on neutral destructive-5 container. ✓
- **NO aria** — visible text `"support@hizovo.com"` + Mail icon / `"Help Center"` + MessageCircle icon conveys the action. ✓
- Both `onClick` handlers (`openSystemUrl("mailto:…")` / `openExternalUrl("https://hizovo.com/help")`) are untouched dynamic imports. ✓

---

### (4) Clickable shadcn Card L315 — ✅ LEAVE CORRECT

```jsx
className="…transition-all duration-200 cursor-pointer group active:scale-[0.99] overflow-hidden"
onClick={() => setSelectedId(booking.id)}
```

- Already has `active:scale-[0.99]` + `transition-all duration-200` → **DON'T-CHURN**. ✓
- Renders a `<div>` with `onClick` but **no `role="button"` / `tabIndex={0}` / `onKeyDown`** → NOT keyboard-focusable → a `focus-visible:ring` would be a **no-op** (never triggers). ✓ LEAVE.
- No nested interactive children inside the card body that could cause double-anim (the card's entire area opens the modal; there are no `stopPropagation` children). ✓
- **FLAGGED** for structural keyboard-a11y fix. ✓

---

### (5) Inventory — ✅ EXHAUSTIVE

| Raw controls edited | 4 — (A) FILTER_TABS, (B) copy-ref, (C) support mailto, (D) Help-Center |
|---|---|
| className edits | 4 (A/B/C/D) |
| aria attrs added | 2 (A `aria-pressed`, B `aria-label`) |
| FLIPs | 2 (B + C/D `transition-colors`→`transition-all`) |
| Skipped shadcn | Back Button ✓ (has `aria-label`), Refresh Button ✓ (has `aria-label`), New-Search Button, Input, sort Button, Retry Button, empty-state Buttons (Search Flights / Set Price Alert / Clear Filters), View-Full-Details Button ✓ (has `active:scale-[0.98]`), Request-Cancellation Button, refund-confirm Buttons (Keep Booking / Confirm Cancellation), Badge/Skeleton/Separator/Dialog/Card-styling |
| Left + flagged | Clickable Card L315 (structural keyboard a11y) |
| Presentational | Badges, AirlineLogo, all Lucide icons, gradient bands, Skeleton, motion entrance anims |

✓ Exhaustive — nothing missed.

---

### (6) Owner flags — ✅ ALL CORRECT + ADDITIONS

**(a)** Clickable `<Card>` div lacks `role="button"` / `tabIndex={0}` / `onKeyDown` — **structural a11y, flagged**. ✓

**(b)** `PullToRefresh` wraps the **entire page** including `<Header />` and the sticky search/filter row (`sticky top-[72px]`). The `PullToRefresh` component applies a CSS `y` transform on touch-drag, which **breaks `position: sticky`** on descendants per the repo guardrail. **Owner should restructure: move the sticky search row + filter rail OUTSIDE the `PullToRefresh` wrapper** (the pull-to-refresh should only wrap the bookings list below the sticky header). ✓

**(c)** `useFlightBookings` / `useFlightBooking` / `useRequestFlightRefund` — real Supabase hooks, untouched. ✓

**(d)** `navigator.clipboard.writeText(booking.booking_reference)` at the `handleCopy` handler — **no `.catch()` wrapper**. Will silently throw on insecure contexts (HTTP) or when clipboard permission is denied. Pre-existing, flagged. ✓

**(e) Additional flag — `openSystemUrl` / `openExternalUrl` error handling**: The support mailto and Help-Center buttons use `import("@/lib/openExternalUrl").then(…)` with no `.catch()` — if the dynamic import fails or the function throws, the promise rejection is unhandled. Pre-existing, minor. FLAG.

**(f) Additional flag — refund mutation error handling**: `handleRefund` calls `refundMutation.mutate(…)` with `onSuccess` only, no `onError` — the mutation hook likely handles errors internally (React Query pattern), but confirm. Pre-existing, low risk.

---

### (7) Responsive 375/768/1280 — ✅ CLEAN + SUB-44PX FLAGS

At 375px (351px usable with `px-4`):

- **Page header**: Back shadcn icon `rounded-xl` (~40px) + `flex-1` title/subtitle + Refresh icon (~40px) + New-Search shadcn `size="sm"` → fits, no crush. ✓
- **Sticky search row**: `flex gap-2` → Input `flex-1` h-10 + sort Button `size="icon"` ~40px → fits. ✓
- **5-pill FILTER_TABS rail**: `flex gap-1.5 overflow-x-auto` with `shrink-0` pills → scrolls horizontally, no crush. ✓
- **Booking cards**: `p-4` with flex rows (AirlineLogo 40px + route text + status Badge, then pax/ref + price + chevron) → all within the `max-w-2xl` column. ✓
- **Detail modal**: shadcn Dialog `max-w-md` → viewport-bounded at 375 (Dialog centers with margin). Route display (`text-2xl` origin/destination) may wrap on very short screens but stays within bounds. ✓

**Sub-44px tap targets to FLAG (repo-wide compact patterns, NOT introduced here):**

| Control | Size | Note |
|---|---|---|
| Filter pills | `py-1.5` → ~30px | Below 44px |
| Copy-ref button | inline text, no min-height | Below 44px |
| Support mailto button | `text-xs` inline, no min-height | Below 44px |
| Help-Center button | `text-xs` inline, no min-height | Below 44px |
| Shadcn icon Buttons (Back/Refresh/sort) | ~40px | Borderline but standard |
| Input | `h-10` → 40px | Borderline |

---

## Summary

**All 4 edits are correct as applied. No changes needed.** The diff is clean: 4 className edits + 2 aria attrs, 0 logic lines touched, every `onClick`/`setActiveTab`/`handleCopy`/`openSystemUrl`/`openExternalUrl`/`useQuery`/`refundMutation` byte-identical.

**Ready for `npm run update`** — the page should build green as-is (edits are already in-tree).

**Owner action items (flag, not fix):**
1. Keyboard-a11y on clickable Card: add `role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedId(booking.id)}`
2. PullToRefresh structural fix: pull the sticky search/filter row outside the PullToRefresh wrapper so `position: sticky` isn't broken
3. Add `.catch()` to `navigator.clipboard.writeText` call (pre-existing)
4. Sub-44px targets on filter pills / inline text buttons (repo-wide)
