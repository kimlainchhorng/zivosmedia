# MiMo advisor — Senior security+correctness review of this PURE affiliate/partner deep-link URL builder. Focus: (1) buildOutRedirectUrl packs an arbitrary destinationUrl into /out?url=... — is that an open-redirect / does the /out handler validate it? (2) appendTrackingParams uses new URL(baseUrl) — throws on relative input? (3) any param-injection / encoding gaps in the booking/hotels/expedia/priceline builders. Give P0/P1/P2 with concrete repro inputs. Do NOT propose test files.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/lib/partnerDeepLinks.ts

## Security + Correctness Review — `partnerDeepLinks.ts`

---

### P0 — Open Redirect in `buildOutRedirectUrl`

`destinationUrl` is packed raw into the `url` query param with **zero domain/path validation**. Any caller that passes user-derived or externally-sourced input enables arbitrary redirects through `/out?`.

**Repro:** `buildOutRedirectUrl("booking", "Booking", "hotels", "home", "https://evil-phishing-site.com/login")` produces `/out?...&url=https%3A%2F%2Fevil-phishing-site.com%2Flogin`.

**Fix (P0):** Add an allowlist validation *inside this function* (don't trust `/out` alone):

```ts
const ALLOWED_REDIRECT_HOSTS = ['booking.com', 'hotels.com', 'expedia', 'priceline.com', /* ... */];
// Validate before building
try {
  const parsed = new URL(destinationUrl);
  if (!ALLOWED_REDIRECT_HOSTS.some(h => parsed.hostname.endsWith(h))) {
    throw new Error('Disallowed redirect target');
  }
} catch { throw new Error('Invalid destination URL'); }
```

---

### P1 — `appendTrackingParams` crashes on relative URLs

`new URL(baseUrl)` throws a `TypeError` for any relative path (`/hotels/search`). Callers have no indication of this contract.

**Repro:** `appendTrackingParams('/hotels/search')` → uncaught `TypeError: Invalid URL`.

**Fix (P1):** Guard or accept a base:

```ts
export function appendTrackingParams(baseUrl: string, base?: string): string {
  const url = base ? new URL(baseUrl, base) : new URL(baseUrl);
  // ...
}
```

---

### P1 — `extraParams` silently overrides core keys in `buildOutRedirectUrl`

The spread `...extraParams` appears **after** the explicit keys in the object literal, so passing `extraParams: { url: 'https://evil.com' }` overrides the intended `destinationUrl`. A caller bug or injection becomes a silent redirect swap.

**Repro:**
```ts
buildOutRedirectUrl("booking", "Booking", "hotels", "detail",
  "https://booking.com/hotel/x",
  { url: "https://evil.com" })
// → /out?...&url=https%3A%2F%2Fevil.com
```

**Fix (P1):** Flip the spread order or strip reserved keys:

```ts
const { partner, name, product, page, url, ...safe } = extraParams ?? {};
const params = new URLSearchParams({
  partner: partnerId, name: partnerName, product,
  page: pageSource, url: destinationUrl, ...safe,
});
```

---

### P2 — Five builders silently discard every parameter

`buildHotellookDeepLink`, `buildEconomyBookingsDeepLink`, `buildQeeqDeepLink`, `buildGetRentACarDeepLink`, and `getAllCarPartnerUrls` all accept `HotelDeepLinkParams` / `CarDeepLinkParams` but return **static config URLs** — check-in dates, destinations, etc. are silently thrown away. No destination-specific deep link is ever produced.

**Fix (P2):** Either append the params to the Travelpayouts URLs per their API, or change the signature to `() => string` so the caller knows params are unused.

---

### P2 — No input validation on dates, ages, or counts

Negative `adults`, `rooms: -1`, `checkIn: "not-a-date"`, `driverAge: 3` all pass through unchecked. Partner sites may behave unpredictably.

**Fix (P2):** Add minimal runtime guards (`if (adults < 1) throw ...`, date regex `/^\d{4}-\d{2}-\d{2}$/`).

---

### Summary

| # | Severity | Issue |
|---|----------|-------|
| 1 | **P0** | Open redirect — no domain allowlist on `destinationUrl` |
| 2 | **P1** | `appendTrackingParams` throws on relative input |
| 3 | **P1** | `extraParams` spread can override `url`/`partner`/etc. |
| 4 | P2 | 5 builders accept params but return static URLs |
| 5 | P2 | No validation on dates/numbers |

The *encoding* story is fine — every builder uses `URLSearchParams`, which percent-encodes correctly, so there's no param-injection or double-encoding gap in the actual partner URL construction.
