# MiMo advisor — You are reviewing src/main.tsx from zivostravel, a single-file React+TypeScript+Vite travel booking SPA (flights/hotels/cars/bus search -> review -> checkout handoff to an external engine). Find ONLY concrete, reachable correctness or security bugs a user could actually hit — date/return validation edge cases, currency/price parsing, localStorage handling, URL/redirect construction, search param handling, state bugs. For each: cite the exact line/function, give the precise triggering input, explain the wrong behavior, and the minimal fix. Be skeptical and precise; if something looks wrong but is actually correct, say so and move on. Ignore styling, mock/demo hardcoded data, and pure refactors.

Files: /Users/kimlain/Documents/GitHub/zivostravel/src/main.tsx

[no final text — stop_reason=max_tokens; reasoning excerpt:]
Let me carefully review this massive file for concrete correctness bugs, security issues, and logic problems.

Let me go through systematically:

1. **Date validation** - Can users set return date before departure date?

Looking at the `Field` component and `searchFields` function:
- For hotels, the check-out field has `min: travelDates.depart` ✓
- For cars, the return field has `min: travelDates.depart` ✓
- For flights, the return field has `min: travelDates.depart` ✓
- But `updateDate` function doesn't enforce return >= depart at the state level. The `min` attribute on `<input type="date">` is a browser hint but not enforced programmatically. A user could type a return date before depart.

Actually, the `min` attribute on date inputs IS enforced by browsers in terms of the picker, but the user can still manually type dates. And even with the picker, `min` doesn't prevent programmatic changes. However, this is more of a UX soft issue. Let me check if it causes a real bug.

In `travelDaySpan`: `diff = Math.round((endDate.getTime() - startDate.getTime()) / 86400000)` - if end < start, diff would be negative. The function returns `Number.isFinite(diff) && diff > 0 ? diff : fallback` - so it falls back to 3. So a negative diff falls back. Not a crash but incorrect display.

2. **Currency conversion issue in `formatAmountText`**:

```javascript
function formatAmountText(amount: string, currency: CurrencyCode) {
  const normalized = amount.replace(/,/g, "");
  const match = normalized.match(/(?:USD|\$)\s*\$?([0-9]+(?:\.[0-9]+)?)/i);

  if (!match) {
    return amount;
  }

  return money(currency, Number(match[1]));
}
```

This function is used in the OpsPage to format `row.amount` which comes from `fallbackAdminQueue`:
```
amount: `${trip.currency} ${trip.total.toFixed(2)}`
```
and
```
amount: `USD ${deal.price.toFixed(2)}`
```

The regex `/(?:USD|\$)\s*\$?([0-9]+(?:\.[0-9]+)?)/i` tries to match "USD 48.00". Let's test:
- Input: "USD 48.00" → `normalized` = "USD 48.00" → regex match on `USD 48.00` → matches "USD 48.00", captures "48.00" ✓
- But wait: `(?:USD|\$)\s*\$?` - this matches "USD" followed by optional spaces and optional "$". For "USD 48.00", it would match "USD " then look for optional "$" which isn't there, then capture "48.00". That works.

But if `trip.currency` is "KHR", the amount string would be "KHR 1234.00", and the regex won't match because it only looks for "USD" or "$". So the function returns the raw amount unchanged. That's actually correct behavior - it falls back to the raw amount.

Wait, but the `money(currency, Number(match[1]))` would convert the USD amount to the current display currency. So if display currency is KHR, "USD 48.00" → `money("KHR", 48)` → `48 * 4100 = 196800៛`. But the original amount was already in some currency. Actually the admin queue amounts are hardcoded as USD, so converting to display currency makes sense.

Actually there IS a double-conversion bug. The `fallbackAdminQueue` creates amounts like `USD ${trip.total.toFixed(2)}` where `trip.total` is in USD. Then `formatAmountText` extracts the number and passes it to `money(currency, ...)` which converts from the base USD to the display currency. This is correct.

But wait - for saved trips, the amount uses `trip.currency` which could be KHR. So if a trip is saved in KHR, the amount string is "KHR 196800៛" (no wait, `trip.total.toFixed(2)` - the total from a saved trip in KHR would already be in KHR, so the amount is "KHR 196800.00"). The regex won't match "KHR", so it returns "KHR 196800.00" as-is. But that's not formatted with the KHR symbol. Actually that's fine because it's already showing the currency.

Actually, hmm. Let me re-examine. The `money` function takes `amount` in USD base and multiplies by `option.rate`. So `money("KHR", 48)` would give `48 * 4100 = 196800៛`. But in the admin queue, the saved trip's total is stored as... let me check `saveBookingIntent`:

The `BookingRecord` has `total: number` which comes from `session.total` which is computed from `result.price + serviceFee`. The prices in `resultCatalog` are all in USD. So `trip.total` is always in USD terms. When the currency is set to KHR, the `money()` function would display it converted. But wait - the booking intent captures `currency: session.currency` which would be the selected currency. Hmm, but the prices in the catalog are in USD.

Actually, looking more carefully at the code: when a user has currency set to KHR, `session.currency` is "USD" (from `fallbackReviewSession` which hardcodes `"USD"`). But `money(currency, trip.total)` in the UI would use the display currency. So `trip.total` of 48 (USD) displayed with `money("KHR", 48)` would show 196800៛. This is fine.

But in `fallbackAdminQueue`, the amount is `${trip.currency} ${trip.total.toFixed(2)}`. If `trip.currency` is "USD", this produces "USD 48.00". The regex extracts 48 and converts. If `trip.currency` is "KHR" (which wouldn't happen since reviewSession hardcodes "USD"), it would produce "KHR 48.00" which the regex ignores. OK, not really a reachable bug.

3. **`formatAmountText` regex doesn't handle "$48.00" format correctly**:

Input: "$48.00" → normalized: "$48.00" → regex `/(?:USD|\$)\s*\$?([0-9]+(?:\.[0-9]+)?)/i`:
- Group 1 `(?:USD|\$)` matches "$"
- `\s*` matches nothing
- `\$?` matches nothing
- `([0-9]+...)` matches "48.00"

That works. What about "USD $48.00"?
- `(?:USD|\$)` matches "USD"
- `\s*` matches " "
- `\$?` matches "$"
- `([0-9]+...)` matches "48.00"

That also works.

4. **`readNumberParam` clamps to 1-9**: `Math.max(1, Math.min(9, Math.round(value)))`. For travelers, this seems intentionally restrictive. If a user searches for 10 travelers, it silently caps at 9. Not really a bug, just a business rule.

5. **`buildSearchPath` for "One way" flights omits `end` parameter**: 
```javascript
if (tripType !== "One way") {
    params.set("end", travelDates.return);
}
```
But `readSearchContext` always reads `end` from params with a fallback to `defaultDates.return`. So on the results page, `end` would always have a value. The review page would use the default return date for one-way flights, which might show "3 nights" for a flight review. Let me trace this...

In `contextualResultDetail` for flights, it just returns `${context.from} to ${context.to}`. In `contextualizeResultItem`, flights fall through to the default case which only updates `detail`. So duration and time aren't modified for flights from the catalog values. OK, not really a problem.

6. **`currentReviewKind` always returns "flights" for unknown types**:
```javascript
function currentReviewKind(): SearchKind | null {
  if (typeof window === "undefined" || window.location.pathname !== "/booking/review") {
    return null;
  }
  const type = window.location.search ? new URLSearchParams(window.location.search).get("type") : null;
  if (type === "hotels" || type === "cars" || type === "bus") {
    return type;
  }
  return "flights";
}
```

If someone navigates to `/booking/review?type=invalid`, it returns "flights". And if there's NO `type` param at all, it also returns "flights". This means `/booking/review` with no type always shows flights. Is this a bug? It's a design choice but could be surprising.

7. **`withBookingReference` URL construction**: 
```javascript
function withBookingReference(rawUrl: string, bookingReference: string) {
  const base = typeof window === "undefined" ? "https://zivostravel.com" : window.location.origin;
  const url = new URL(rawUrl, base);
  url.searchParams.set("booking_reference", bookingReference);
  return rawUrl.startsWith("/") ? `${url.pathname}${url.search}` : url.toString();
}
```

If `rawUrl` is a relative path like `/booking/review?type=flights&result=flight-angkor-direct`, this creates a URL object with base, then returns the pathname + search. This should work correctly.

8. **`localBookingIntent` return type missing `traveler` field?** No, looking at `BookingRecord`, the `traveler` field is optional (`traveler?: TravelerDetails`), so it's fine.

9. **Date input validation**: The `min` attribute on return dates is set to the depart date. But the `updateDate` function just sets the value:
```javascript
function updateDate(field: "depart" | "return", value: string) {
    setDates((current) => ({
      ...current,
      [field]: value || current[field]
    }));
}
```

This doesn't enforce that return >= depart. The HTML `min` attribute on `<input type="date">` prevents selecting earlier dates via the picker but doesn't prevent manual text entry. If a user types "2025-01-01" as the return date while depart is "2026-06-15", it would be accepted. Then `travelDaySpan` would compute a negative diff, fall back to the default (3). The UI would show "3 nights" but with wrong dates. This is a real UX issue but borderline for "concrete bug" since the min attribute covers 99% of cases.

10. **`SSO URL construction` in `contextualizeReviewSession`**:
```javascript
ssoUrl: engineUrl(
  `${bridge.routing.authHandoff}?app=zivo-travel&redirect=${encodeURIComponent(
    checkoutTarget.pathname + checkoutTarget.search
  )}`
)
```
Where `checkoutTarget = new URL(checkoutHref)`. `checkoutHref` is from `contextualCheckoutUrl` which returns an `engineUrl(...)` - a full URL like `https://zivosmedia.com/travel/checkout?...`. So `checkoutTarget.pathname + checkoutTarget.search` gives `/travel/checkout?...`. This is a relative redirect path. This looks correct.

11. **`Handoff source` from URL query parameter**: 
```javascript
const handoffSource = new URLSearchParams(window.location.search).get("source");
const isConnectedHandoff = handoffSource === "zivosmedia" || handoffSource === "zivo-admin";
```
This is read from the URL search params. If a user navigates to `/?source=zivo-admin`, the handoff banner appears. This is fine for UX but could be spoofed by anyone typing a URL. However, this is just a UI banner with no security implications, so not a bug.

12. **`money()` function double conversion potential**: 
```javascript
function money(currency: string, amount: number) {
  const option = currencyOptions.find((item) => item.code === currency) || currencyOptions[0];
  const converted = amount * option.rate;
```
This ALWAYS multiplies by the rate. So `money("USD", 48)` → `48 * 1 = 48`. `money("KHR", 48)` → `48 * 4100 = 196800`. 

The prices in the catalog are in USD. When displaying, we call `money(currency, result.price)` where `currency` is the display currency and `result.price` is in USD. So `money("KHR", 48)` correctly converts USD 48 to KHR 196800. This is correct.

But what about `money(currency, trip.total)` where `trip.total` came from a saved booking? The saved booking's `total` field comes from `session.total` which is `result.price + serviceFee`, both computed from USD base prices. So `trip.total` is always in USD base. Converting with the display currency is correct.

Wait, but in the admin queue, saved trip amounts are displayed:
```javascript
amount: `${trip.currency} ${trip.total.toFixed(2)}`
```
And then formatted with `formatAmountText(row.amount, currency)`. The regex extracts the number from the amount string and passes it to `money(currency, ...)`. So if the trip was saved with `currency: "USD"`, the amount is "USD 48.00", regex extracts 48, and `money(displayCurrency, 48)` converts correctly. But if somehow `trip.currency` was "KHR", the amount would be "KHR 196800.00", regex doesn't match, and it returns "KHR 196800.00" without formatting. This could happen but is unlikely since the review session hardcodes "USD".

Actually wait - I just realized the admin queue constructs amounts for saved trips using `trip.currency` and `trip.total`. But `trip.total` was computed as `result.price + serviceFee` where all prices are USD. If `trip.currency` is "USD" (which it always is from the hardcoded value), then the amount string correctly represents USD. The `formatAmountText` then extracts and re-converts to display currency. But this means the amount in the admin queue gets double-converted if the display currency isn't USD. Let me trace:

1. Trip saved: `total = 48` (USD), `currency = "USD"`
2. Admin queue: `amount = "USD 48.00"`
3. Display currency = "KHR"
4. `formatAmountText("USD 48.00", "KHR")` → regex extracts 48 → `money("KHR", 48)` → `48 * 4100 = 196800៛`

But the correct KHR amount should be 48 * 4100 = 196800៛. And that's what we get. So it's correct.

Hmm, but what if display currency is "USD"? Then `formatAmountText("USD 48.00", "USD")` → extracts 48 → `money("USD", 48)` → `48 * 1 = "USD $48.00"`. Correct.

OK so this is actually correct. The amount string stores the USD value, and `formatAmountText` re-renders it in the display currency.

13. **`savedTripsKey` uses localStorage**: The code properly handles SSR with `typeof window === "undefined"` checks. ✓

14. **`normalizeSavedTrip` - `total` can be 0**: If a tampered localStorage entry has `total: "abc"`, `finiteNumber` returns 0. The trip shows $0 total. Not ideal but defensive. ✓

15. **`handleCheckout` in BookingReview**: 
```javascript
async function handleCheckout(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const intent = bookingIntent || await createBookingDraft();
    window.location.href = intent.booking.checkoutUrl;
}
```
If `createBookingDraft` fails and returns undefined... wait, looking at `createBookingDraft`:
- If `bookingSaving` is true: `return bookingIntent || localBookingIntent(activeSession, kind, traveler);`
- The catch block creates a local intent and returns it
- The function returns the intent in all paths

But wait - when `bookingSaving` is true, it returns `bookingIntent || localBookingIntent(...)`. If `bookingIntent` is null, it creates a new local intent but doesn't save it. The return type is `Promise<BookingIntentResponse>`, and the early return with `localBookingIntent` would be fine. So `intent.booking.checkoutUrl` should always exist. ✓

Actually wait, there's a subtle issue. When `bookingSaving` is already true (called again), `createBookingDraft` returns early with `bookingIntent || localBookingIntent(activeSession, kind, traveler)`. But it returns a plain value (not wrapped in Promise). Since the function is `async`, it IS wrapped in a Promise. But the `intent` variable receives a `BookingIntentResponse` which has `.booking.checkoutUrl`. This should be fine.

16. **`createBookingDraft` when `bookingSaving` is true**: The function returns `bookingIntent || localBookingIntent(activeSession, kind, traveler)`. If this is called during `handleCheckout`, and `bookingSaving` is true, it returns immediately. But this return value isn't saved to `bookingIntent` state. So subsequent calls would still have `bookingIntent` as null (if it was null before). This is a minor issue but not really a bug since the returned value is still valid.

17. **Currency context not persisting across page navigations**: Currency is saved to localStorage in the effect:
```javascript
useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(currencyKey, currency);
    }
}, [currency]);
```
And read back:
```javascript
function readCurrency(): CurrencyCode {
  if (typeof window === "undefined") {
    return "USD";
  }
  const stored = window.localStorage.getItem(currencyKey);
  return stored === "KHR" || stored === "THB" ? stored : "USD";
}
```
This looks correct. ✓

18. **`supportChatUrl` construction**:
```javascript
function supportChatUrl(reference?: string) {
  const chat = new URL(bridge.routing.support, engineOrigin);
  chat.searchParams.set("app", "zivo-travel");
  if (reference) {
    chat.searchParams.set("ticket", reference);
  }
  return chat.toString();
}
```
This constructs a URL to the engine origin with the support routing path. Looks correct. ✓

19. **`readSearchContext` tripType normalization**: 
```javascript
const tripType = params.get("tripType")?.replace(/-/g, " ") || "round trip";
```
Then in `chips` for flights:
```javascript
formatMode(tripType)
```
`formatMode` capitalizes each word. So "round trip" → "Round Trip". But in `quantityCopy`:
```javascript
helper: tripType  // This is the raw "round trip" from context
```
Wait, this is passed `tripType` from the function parameter, not from `context.tripType`. Let me check:
```javascript
const quantity = quantityCopy(activeKind, searchCount, tripType);
```
Where `tripType` is state: `const [tripType, setTripType] = useState<TripType>("Round trip");`. So it's already properly capitalized. ✓

20. **Potential XSS via URL parameters**: The code reads from URL params like `from`, `to`, `start`, `end` and displays them in the UI (e.g., in chips, labels, summaries). These values are used in JSX which React auto-escapes, so no XSS. ✓

21. **`resultListUrl` and navigation**: The `resultListUrl` function constructs a URL from search context and deletes the "type" param:
```javascript
function resultListUrl(kind: SearchKind, context: SearchContext) {
  const params = resultRequestParams(kind, context);
  params.delete("type");
  return localUrl(`/${kind}?${params.toString()}`);
}
```
This is used for the "Back to results" link in the review page. This should correctly navigate back to the results page with the same search context. ✓

22. **`normalizeSupportTicket` - `topic` type validation**:
```javascript
topic: ticket.topic || "booking",
```
If `ticket.topic` is some random string like "hacked", it would pass through. But `supportTopicLabel` would return "Booking help" as fallback, and the display would work. Not a security issue since it's just display. ✓

23. **`handleCheckout` navigates away on success**: If `createBookingDraft` succeeds, `window.location.href = intent.booking.checkoutUrl` navigates to the engine checkout. But what if the checkout URL is a full external URL (to `engineOrigin`)? That would navigate away from the SPA. This is intentional behavior for the handoff. ✓

24. **The `Field` component date min**: 
```javascript
const dateMin = inputType === "date" ? min ?? new Date().toISOString().slice(0, 10) : undefined;
```
This uses today's date as the minimum. But the default dates are `2026-06-15` which is in the future. If the app is running in 2024 or 2025, the min would be today (e.g., 2025-01-01), and the default dates would be valid. If the app is running after June 2026, the default dates would be in the past, and the `min` attribute would prevent selecting them. But the default values would still show in the input fields, creating a mismatch between what's shown and what's selectable. However, since these are demo/placeholder defaults, this is more of a UX concern than a correctness bug.

Actually wait - there's a real issue here. The `min` is set to today, but the **value** could be in the past (the default dates are 2026-06-15, but if someone runs this after June 2026, or if a URL has a past date in params). The `min` attribute on `<input type="date">` only prevents selecting dates before min via the picker UI. If the `value` attribute is already set to a date before `min`, the input still shows that value. The browser doesn't clear it or adjust it. So the displayed date could be before the min. But again, this is more of an edge case with the hardcoded demo dates.

25. **`searchContext` memo dependency**: In `ResultsPage`:
```javascript
const searchContext = useMemo(() => readSearchContext(kind), [kind]);
```
This only depends on `kind`, but `readSearchContext` reads from `window.location.search`. If the URL changes (e.g., via pushState), the memoized value won't update. But since this is a single-page app with full-page navigations (via `<a href=...>` links), the component remounts on URL change, so the memo recomputes. ✓

But wait - what about `BookingReview`:
```javascript
const searchContext = useMemo(() => readSearchContext(kind), [kind]);
```
Same pattern. If someone changes URL params without a full navigation, the context wouldn't update. But this is an SPA with traditional link navigation, so it's fine.

26. **Real bug - `formatAmountText` doesn't handle the `trip.currency` being non-USD in admin queue**:

Actually let me re-examine. In `fallbackAdminQueue`:
```javascript
const savedRows = readSavedTrips().map((trip) => ({
    ...
    amount: `${trip.currency} ${trip.total.toFixed(2)}`,
    ...
}));
```

`trip.currency` comes from `session.currency` which is always "USD" (hardcoded in `fallbackReviewSession`). But if a backend response sets a different currency, this could be "KHR" or "THB". In that case, `formatAmountText("KHR 196800.00", displayCurrency)` wouldn't match the regex (which only matches USD/$), and would return the raw "KHR 196800.00" string. This means:
- If display currency is USD, the admin queue shows "KHR 196800.00" instead of converting
- If display currency is KHR, the admin queue still shows "KHR 196800.00" which might be correct but isn't formatted

But since in the local-only flow, `currency` is always "USD", this is not reachable with the current code. However, if the backend ever returns a non-USD session, this would be a display bug. For a review focused on current code, this is not reachable. Skip.

27. **`bookingHref` in BookingReview**: 
```javascript
const bookingHref = bookingIntent?.booking.checkoutUrl || activeSession.checkoutUrl;
```
This is used for the "Continue secure checkout" link's href. The `handleCheckout` function prevents default and does its own navigation. But the `href` attribute still exists as a fallback if JavaScript is disabled. In that case, clicking would navigate directly. If `bookingIntent` is null, it uses `activeSession.checkoutUrl` which is the default checkout URL. This is correct behavior. ✓

28. **Real bug - `prepareDriverRequest` doesn't handle errors properly**: 
```javascript
async function prepareDriverRequest() {
    if (driverRequestSaving) {
      return;
    }
    setDriverRequestSaving(true);
    const intent = bookingIntent || await createBookingDraft();
    const fallback = localDriverRequestPreview(intent.booking, activeSession, searchContext);
```

If `createBookingDraft` throws (which it shouldn't based on the code, since catch blocks always return), but if it did throw, `intent` would be undefined and `intent.booking` would crash. However, `createBookingDraft` has catch blocks that always return a local intent. So this is safe. ✓

29. **Potential issue with `searchContext` and `activeSession` stale closures**: In `BookingReview`, `prepareDriverRequest` uses `searchContext` and `activeSession` from the component scope. Since these are state/memo values, they should be current at call time. ✓

30. **`travelDaySpan` timezone issues**: 
```javascript
function travelDaySpan(start: string, end: string, fallback: number) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 8640000
