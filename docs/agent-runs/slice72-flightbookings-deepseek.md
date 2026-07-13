# DeepSeek run — 2026-06-14T07:02:37.260Z

- model: deepseek-chat
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

## Plan

Apply the premium interaction + a11y pass to `src/pages/FlightBookingsPage.tsx` — 4 raw button edits (FILTER_TABS, copy-ref, support mailto, Help Center), 0 logic changes, leave shadcn components and the clickable Card as-is.

---

## Proposed Diff

**File:** `src/pages/FlightBookingsPage.tsx`

### Edit (A) — FILTER_TABS `<button>` (L174)

**Before:**
```tsx
className={cn(
  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0",
  activeTab === key
    ? "bg-[hsl(var(--flights))] text-white shadow-sm"
    : "bg-muted/50 text-muted-foreground hover:bg-muted"
)}
```

**After:**
```tsx
className={cn(
  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  activeTab === key
    ? "bg-[hsl(var(--flights))] text-white shadow-sm"
    : "bg-muted/50 text-muted-foreground hover:bg-muted"
)}
```

Also add `aria-pressed={activeTab === key}` to the `<button>` element (already present in your file — verified correct).

### Edit (B) — copy-ref `<button>` (L460)

**Before:**
```tsx
<button type="button" onClick={handleCopy} className="flex items-center gap-1.5 font-mono font-bold hover:text-[hsl(var(--flights))] transition-colors">
```

**After:**
```tsx
<button type="button" onClick={handleCopy} aria-label="Copy booking reference" className="flex items-center gap-1.5 font-mono font-bold hover:text-[hsl(var(--flights))] transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit (C) — support mailto `<button>` (L535)

**Before:**
```tsx
<button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openSystemUrl }) => openSystemUrl("mailto:support@hizovo.com"))} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
```

**After:**
```tsx
<button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openSystemUrl }) => openSystemUrl("mailto:support@hizovo.com"))} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit (D) — Help Center `<button>` (L538)

**Before:**
```tsx
<button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl("https://hizovo.com/help"))} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
```

**After:**
```tsx
<button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl("https://hizovo.com/help"))} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

---

## Answers to your questions

1. **(A) FILTER_TABS:** ✅ `aria-pressed={activeTab === key}` correct (single-select, no tablist roles). ✅ No flip correct (`transition-all` already present). ✅ `[0.97]` segmented tier + OUTWARD `ring-ring` on own flights-color fill correct.

2. **(B) copy-ref:** ✅ `aria-label="Copy booking reference"` warranted (visible text is the ref digits, not the action). ✅ FLIP + `[0.97]` + ring correct.

3. **(C)/(D) support + Help:** ✅ FLIP `transition-colors`→`transition-all` + `[0.97]` + ring correct. ✅ No aria correct (visible text conveys action). External nav handlers untouched.

4. **(1) clickable shadcn `<Card>` L315:** ✅ LEAVE correct. A focus-visible ring IS a no-op on a `<div>` with no `role="button"`/`tabIndex`/`onKeyDown`. Already `active:scale-[0.99]` + `transition-all` (don't-churn). ✅ **FLAG** keyboard a11y (`role="button" tabIndex={0} onKeyDown`) as a structural owner fix.

5. **Inventory:** ✅ Exhaustive — 4 raw buttons edited, all shadcn Button/Input/Badge/Card SKIP, clickable Card LEFT+flagged. Badges/AirlineLogo/icons/gradient bands presentational.

6. **Owner flags:** ✅ (a) clickable Card lacks keyboard a11y (structural). ✅ (b) `PullToRefresh` wraps the entire page including the sticky `top-[72px]` search/filter row — its `y` transform may break `position: sticky` on descendants (repo guardrail). ✅ (c) bookings query/refund mutation are real Supabase (untouched). ✅ (d) `navigator.clipboard` with no catch (pre-existing). No other flags.

7. **Responsive 375/768/1280:** ✅ Clean — page header (Back + title + Refresh + New-Search) fits; sticky search Input `h-10` + sort icon button + 5-pill FILTER_TABS `overflow-x-auto` rail scrolls horizontally without crush; booking cards (route + status badge + pax/ref + price) lay out; detail modal `max-w-md` fits. **Sub-44px tap targets (FLAG — repo-wide compact patterns, NOT introduced here):** filter pills `py-1.5` (~30px), copy/support/Help inline text buttons (~20px), shadcn icon Buttons `size="icon"` (~40px ✓), Input `h-10` (40px ✓).

---

## Verify

Run `npm run update` before calling done.
