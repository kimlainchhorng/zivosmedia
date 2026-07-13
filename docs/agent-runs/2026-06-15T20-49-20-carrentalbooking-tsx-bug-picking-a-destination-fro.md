# DeepSeek run — 2026-06-15T20:49:20.871Z

- model: deepseek-chat
- task: CarRentalBooking.tsx bug: picking a destination from DestinationCardsGrid leaves the user unable to search. handleLocationSelect(city) only does setPickupDisplayValue(city) (a bare city like 'Miami'), never setSelectedAirport. The Search button is disabled when !selectedAirport && !pickupDisplayValue.match(/\([A-Z]{3}\)/), and handleSearch derives pickupCode = selectedAirport?.code || pickupDisplayValue.match(/\(XXX\)/). So a bare city has no code -> Search stays disabled. The proper autocomplete path handleAirportChange(airport,display) sets selectedAirport + display='City (CODE)'. @/data/airports exports searchAirports(query,limit):Airport[]. PROPOSED FIX: resolve the picked city to its top airport and mirror handleAirportChange: const match = searchAirports(city,1)[0]; if(match){ setSelectedAirport(match); setPickupDisplayValue(match.city+' ('+match.code+')'); } else { setPickupDisplayValue(city); }. Q1: is resolving via searchAirports the right fix, or should DestinationCardsGrid pass an airport? Q2: fallback to bare city when no match acceptable (Search stays disabled but no regression, user can use autocomplete)? Q3: any risk? Concise verdict.

---

Looking at this bug, here's my analysis and proposed fix:

## (1) Short Plan

The root cause is that `DestinationCardsGrid` passes a bare city string (e.g., `'Miami'`) to `handleLocationSelect`, but the search flow requires an airport object with a code. The cleanest fix is to resolve the city to its top airport using the existing `searchAirports` utility, mirroring `handleAirportChange`'s behavior. This keeps the data flow consistent and avoids coupling `DestinationCardsGrid` to airport logic.

## (2) Proposed Change

**File:** `src/pages/CarRentalBooking.tsx`

**Before:**
```typescript
const handleLocationSelect = (city: string) => {
  setPickupDisplayValue(city);
};
```

**After:**
```typescript
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

**Also add the import if not present:**
```typescript
import { searchAirports } from '@/data/airports';
```

## (3) Owner Verification

1. **Verify the import** — `searchAirports` is already exported from `@/data/airports` (confirmed in the task description), so just ensure it's imported in `CarRentalBooking.tsx`.
2. **Test the flow:** Click a destination card → verify the pickup field shows `"Miami (MIA)"` → verify the Search button becomes enabled → verify `handleSearch` derives the correct `pickupCode`.
3. **Edge case:** If `searchAirports('Miami', 1)` returns `undefined` (empty array), the fallback bare city keeps the Search disabled — no regression, user can use the autocomplete.
4. **Run `npm run update`** to confirm type-check + build pass.

**Q1 verdict:** Resolving via `searchAirports` is the right fix. It reuses existing infrastructure, keeps `DestinationCardsGrid` simple (it just passes city names), and mirrors the established `handleAirportChange` pattern. Having `DestinationCardsGrid` pass an airport would couple it to airport data and break if the grid is reused elsewhere.

**Q2 verdict:** Fallback to bare city is acceptable — it's a no-op that preserves existing behavior (Search stays disabled), and the autocomplete remains available as a workaround.

**Q3 verdict:** Low risk. The change is additive (only runs when a destination card is clicked), uses an existing pure function, and the fallback prevents any regression. The only risk is if `searchAirports` has side effects — it doesn't (it's a pure lookup).
