# MiMo run — 2026-06-13T23:59:40.996Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/FlightConfirmation.tsx (540 lines, route /flights/confirmation/:bookingId -- post-booking flight confirmation: status hero (issued/failed/processing), itinerary card with booking-ref copy, e-ticket numbers, quick actions (Share/Download/Copy), cross-sell Hotels+Cars cards, primary actions (Add to calendar / My Bookings / Search More Flights), trust footer).

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS about this repo:
- shadcn <Button> base className already ships: rounded-xl transition-all duration-200 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2; AND every variant (default/outline/secondary/ghost/etc) has active:scale-[0.98]. => ALL shadcn <Button> are fully compliant => SKIP, never touch.
- shadcn <Card> is rounded-2xl border bg-card shadow-sm transition-all duration-200 (no overflow-hidden by default).

CRITICAL edit-shape rule:
- RAW <button>/<a>/<Link> (NOT framer-motion, NOT shadcn) => CSS active:scale WORKS => add FULL token set (transition-* + active:scale-[tier] + focus-visible ring; aria-label if icon-only).
- framer-motion motion.button with whileTap => ring ONLY (none here).
- shadcn <Button>/<Card> already compliant => never touch.
- overflow-hidden + flush control => focus-visible:ring-inset.

HARD RULE: className + display-only attribute (aria-label) changes ONLY. Do NOT change any onClick / navigate target / handleCopyRef / handleShare / openShareToChat / downloadICS / supabase.functions.invoke / useFlightBooking / useEffect / openExternalUrl / openSystemUrl logic.

MY PLAN -- validate or correct each item (cite classNames, give before->after for corrections):

[A] SKIP (already compliant, do not touch): all 6 shadcn <Button> -- "Back to Flights" (outline asChild Link), "Share" (outline onClick handleShare), "Copy" icon (outline onClick handleCopyRef), "Add to calendar" (outline onClick downloadICS), "My Bookings" (asChild Link, also has explicit active:scale-[0.98] transition-all -- leave it), "Search More Flights" (outline asChild Link). Also SKIP: <DownloadItinerary> component (own slice), CheckoutStepIndicator/CheckoutTrustFooter/CrossServiceCTAs/Header/Footer (separate components), all motion.div wrappers (presentational, not buttons), route-visual + info-grid divs (non-clickable, no onClick => get NOTHING).

[C] RAW <button> => FULL TOKENS (3), all currently "...hover:text-[hsl(var(--flights))] transition-colors":
(1) Support email row: className "flex items-center gap-3 text-sm hover:text-[hsl(var(--flights))] transition-colors" => transition-colors->transition-all + active:scale-[0.97] + ring + rounded-sm. (visible text "support@hizovo.com" = accessible name, no aria-label needed)
(2) Help Center row: className "flex items-center gap-3 text-sm hover:text-[hsl(var(--flights))] transition-colors" => same. (visible text "Help Center")
(3) Booking-ref copy button: className "flex items-center gap-1.5 font-mono font-bold text-base tracking-wider hover:text-[hsl(var(--flights))] transition-colors" => same (transition-all + active:scale-[0.97] + ring + rounded-sm). (visible booking_reference text = accessible name, no aria-label needed)

[L] RAW <Link> wrapping a shadcn <Card> => FULL TOKENS (2): the two cross-sell tiles. Each <Link> currently has NO className; it wraps a <Card className="bg-[hsl(var(--hotels))]/5 border-... hover:border-...40 transition-all cursor-pointer group">. The anchor (<Link>) is the focusable/clickable element, so ring belongs on the Link, not the Card.
(4) Hotels Link to={`/hotels?destination=...`} => add className="block rounded-2xl transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
(5) Cars Link to={`/cars?destination=...`} => same.

QUESTIONS:
(1) The two cross-sell <Link>>Card: is ring + active:scale-[0.98] on the <Link> (block rounded-2xl transition-transform) the right call? Card is rounded-2xl so ring matches. Card has NO overflow-hidden so a normal outward ring (no ring-inset) is correct -- agree? Or should I leave these untouched because the Card already has hover:border transition-all?
(2) The 3 raw text-row buttons: is active:scale-[0.97] the right tier (text-link rows, not cards)? Is transition-colors->transition-all correct (both hover:text color AND active:scale transform must animate)? Is rounded-sm the right ring shape for an inline text+icon row?
(3) Any element mislabeled -- a shadcn Button I should actually touch, or a raw control I missed? (grep found exactly 3 raw <button>, 5 <Link> of which 3 are inside shadcn <Button asChild> => SKIP, 2 are bare cross-sell tiles.)
(4) Responsive at 375/768/1280: container max-w-lg (512px) px-4 centered; quick-actions row "flex gap-2" (Share flex-1 + DownloadItinerary + Copy px-3 icon); cross-sell "grid grid-cols-2 gap-3"; itinerary info "grid grid-cols-2 gap-3"; route visual "flex items-center justify-between" with two 2xl airport codes + plane. Any crush or horizontal overflow at 375px?

Be concise. Cite classNames not line numbers. If my plan is correct as-is, say so plainly per item.
- files: src/pages/FlightConfirmation.tsx

---

## Validation

Your plan is **correct**. Two refinements, then the ready-to-apply diff.

---

### Refinements

**[C-1] and [C-3] need `aria-label` — data-value precedent.** The email row's visible text `support@hizovo.com` and the booking-ref copy's visible text `booking.booking_reference` are **data values**, not action labels. Per the GroceryOrderPlaced / GroceryOrderConfirmed / GroceryOrderTracking precedent (copy-order-ID buttons all got `aria-label="Copy order ID"` because the hex ID is a data value, not an action name), screen readers would announce meaningless strings. Add:

| Control | `aria-label` |
|---|---|
| Email button | `"Email support"` |
| Help Center button | *(none — "Help Center" IS an action label)* |
| Booking-ref copy | `"Copy booking reference"` |

**[L] cross-sell Links — plan is correct.** `block rounded-2xl transition-transform active:scale-[0.98]` + ring on the `<Link>` is right. `block` needed because `rounded-2xl` is undefined on inline `<a>`. `transition-transform` suffices (Link has no hover effect of its own — the hover:border is on the inner Card). Card has no `overflow-hidden` (shadcn default) → normal outward ring, no `ring-inset`. Agree.

**[C] tiers — all correct.** `active:scale-[0.97]` for text-link rows, `transition-all` (covers both the `hover:text` color AND the `active:scale` transform), `rounded-sm` for clean ring on inline text. The itinerary Card has `overflow-hidden` but the copy button sits inside `p-5` (20px clearance) → ring won't clip → no `ring-inset`.

**[3] Inventory complete.** Grep confirms exactly 3 raw `<button>` (email, help center, booking-ref copy), 2 bare `<Link>` (cross-sell), 6 shadcn `<Button>`, 0 `motion.button`. No missed controls.

**[4] No responsive crush at 375px.** Container 343px inner. Quick-actions row: Share flex-1 + DownloadItinerary + Copy px-3 icon = fits. Cross-sell `grid-cols-2` = ~165px/card = fits. Route visual two 3-char airport codes + plane flex-1 = comfortable.

---

### Proposed diff

```diff
--- a/src/pages/FlightConfirmation.tsx
+++ b/src/pages/FlightConfirmation.tsx
@@ EMAIL BUTTON (support email row) @@
-                      <button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openSystemUrl }) => openSystemUrl("mailto:support@hizovo.com"))} className="flex items-center gap-3 text-sm hover:text-[hsl(var(--flights))] transition-colors">
+                      <button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openSystemUrl }) => openSystemUrl("mailto:support@hizovo.com"))} aria-label="Email support" className="flex items-center gap-3 text-sm hover:text-[hsl(var(--flights))] transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">

@@ HELP CENTER BUTTON @@
-                      <button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl("https://hizovo.com/help"))} className="flex items-center gap-3 text-sm hover:text-[hsl(var(--flights))] transition-colors">
+                      <button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl("https://hizovo.com/help"))} className="flex items-center gap-3 text-sm hover:text-[hsl(var(--flights))] transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">

@@ BOOKING-REF COPY BUTTON @@
-                      className="flex items-center gap-1.5 font-mono font-bold text-base tracking-wider hover:text-[hsl(var(--flights))] transition-colors"
+                      aria-label="Copy booking reference"
+                      className="flex items-center gap-1.5 font-mono font-bold text-base tracking-wider hover:text-[hsl(var(--flights))] transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"

@@ HOTELS CROSS-SELL LINK @@
-                    <Link to={`/hotels?destination=${booking.destination}`}>
+                    <Link to={`/hotels?destination=${booking.destination}`} className="block rounded-2xl transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

@@ CARS CROSS-SELL LINK @@
-                    <Link to={`/cars?destination=${booking.destination}`}>
+                    <Link to={`/cars?destination=${booking.destination}`} className="block rounded-2xl transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Exact before/after per control:**

| # | Element | Before className | After (append) |
|---|---------|-----------------|----------------|
| C-1 | email `<button>` | `…transition-colors` | +`aria-label="Email support"`, `transition-colors`→`transition-all`, +`active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm` |
| C-2 | help center `<button>` | `…transition-colors` | `transition-colors`→`transition-all`, +`active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm` |
| C-3 | booking-ref copy `<button>` | `…transition-colors` | +`aria-label="Copy booking reference"`, `transition-colors`→`transition-all`, +`active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm` |
| L-4 | Hotels `<Link>` | *(no className)* | +`className="block rounded-2xl transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| L-5 | Cars `<Link>` | *(no className)* | +`className="block rounded-2xl transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |

**Net diff: 5 edits — 3 className swaps + 2 new className attributes + 2 new `aria-label` attributes = 7 insertions / 5 deletions.**

### Owner verification

1. Run `npm run update` — must exit 0.
2. Preview at 375/768/1280: the cross-sell tiles should receive focus rings (Tab to them) and press-scale on click; the three text rows should press-scale and ring on Tab.
3. The email/help buttons only render in the `isFailed` ticketing-status branch; the cross-sell Links and booking-ref copy only render in the `isIssued` branch — preview needs a booking in each state, or verify the className edits are correct by reading the source.
