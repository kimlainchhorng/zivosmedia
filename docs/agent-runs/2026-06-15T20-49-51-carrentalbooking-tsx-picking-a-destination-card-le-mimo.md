# MiMo run — 2026-06-15T20:49:51.332Z

- model: mimo-v2.5-pro
- api_format: openai
- task: CarRentalBooking.tsx: picking a destination card leaves Search disabled. handleLocationSelect(city) only does setPickupDisplayValue(city) (bare city), never setSelectedAirport. Search is disabled unless selectedAirport set or pickupDisplayValue matches a 3-letter code in parens, and handleSearch needs that pickupCode. The autocomplete path handleAirportChange sets selectedAirport + display 'City (CODE)'. @/data/airports exports searchAirports(query,limit):Airport[]. PROPOSED FIX in handleLocationSelect: const match = searchAirports(city,1)[0]; if match: setSelectedAirport(match) and setPickupDisplayValue(match.city + ' (' + match.code + ')'); else setPickupDisplayValue(city). Q1: resolve via searchAirports the right fix vs changing DestinationCardsGrid to pass an airport? Q2: bare-city fallback when no airport match acceptable (Search stays disabled, no regression)? Q3: any risk? Concise verdict + reason.

---

## (1) Plan

The fix is straightforward: `handleLocationSelect` in `CarRentalBooking.tsx` should resolve the city name to an airport object via `searchAirports` (the same utility the autocomplete path already uses), then set both `selectedAirport` and a properly formatted `pickupDisplayValue`. This keeps the fix local to the one function that's broken — no need to change `DestinationCardsGrid`'s contract.

**Answers to your questions:**

- **Q1:** Yes, resolving via `searchAirports` is the right fix. Changing `DestinationCardsGrid` to pass an airport object would couple a generic UI component to airport-domain knowledge. The booking page is the right place to resolve a city name → airport.
- **Q2:** Yes, the bare-city fallback is acceptable. If no airport matches (e.g. a city not in the database), `selectedAirport` stays `null` and `pickupDisplayValue` is just the city name — Search remains disabled (same as today), no regression. The user can still type/autocomplete to pick a specific airport.
- **Q3:** Minimal risk. `searchAirports` is a pure client-side filter over the in-memory airport list (no network call). The only edge case is a city name that matches multiple airports (e.g. "London" → LHR/LGW/STN/LTN/SEN/LCY) — `searchAirports(city, 1)[0]` picks the first ranked result, which is reasonable for a car rental pickup. If the user wants a different airport they can still use the autocomplete field.

---

## (2) Proposed diff

**File:** `src/pages/CarRentalBooking.tsx`

Find the `handleLocationSelect` function (currently looks like):

```ts
const handleLocationSelect = (city: string) => {
  setPickupDisplayValue(city);
};
```

Replace with:

```ts
const handleLocationSelect = (city: string) => {
  const match = searchAirports(city, 1)[0];
  if (match) {
    setSelectedAirport(match);
    setPickupDisplayValue(`${match.city} (${match.code})`);
  } else {
    setPickupDisplayValue(city);
  }
};
```

**Import check:** `searchAirports` must already be imported (or needs to be added) at the top of the file. Verify with:

```ts
import { searchAirports } from "@/data/airports";
```

If the import is already present (likely, since the autocomplete path uses it), no change needed there.

---

## (3) Owner verification

1. **Run `npm run update`** — must pass (type-check + worker type-check + production build, 0 errors).
2. **Manual test:** On the car rental page, click a destination card (e.g. "Phnom Penh"). Confirm:
   - The pickup input shows `Phnom Penh (PNH)` (or whichever airport `searchAirports` returns first).
   - The Search button is **enabled**.
   - Clicking Search works (the `pickupCode` is populated).
3. **Edge case test:** If there's a destination card whose city name doesn't match any airport in the database, confirm Search stays disabled (no crash, no regression — the fallback path).
4. **No deploy needed** — this is a client-side fix, ships with the next build.
