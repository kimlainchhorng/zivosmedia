# Travel funnel / Coverflow theming inventory (2026-11-10)

Scope: visual layer only on travel host via `.zivo-travel-3d` / `TravelPageFrame` / kit. **No** dedicated travel backend flip.

## Already themed (representative)

- Home / utilities: `ZivoTravelHome`, `ZivoTravel{MyTrips,Wallet,PaymentMethods,Account}`, `TravelUtilityShell`
- List / search skins: `FlightLanding`, `FlightResults` (partial host classes + `TravelPullToRefresh`), `Cars` (PageTransition / TiltCard / zt-glass), `BusBookingPage`, many car checkout/confirm pages
- Frame-wrapped: `HotelResultsPage`, `CarResultsPage`, `TravelCheckoutPage`, flight review/traveler/checkout/details family (counts vary)

## Gaps closed in this PR (TravelPageFrame; host no-op off travel)

- `HotelBooking`, `HotelLanding`, `TravelExtras`, `TravelInsurance`
- `BookingReturnPage`, `TravelerDashboard`, `TravelTripsPage`
- `FlightPriceAlertsPage`, `TravelJournalsPage`
- **Coverflow3D** first funnel use: `HotelLanding` popular destinations (travel host only; media keeps grid)

## Still missing / deferred (do not treat as closed)

| Gap | Notes |
| --- | --- |
| Result-deck Coverflow | `FlightResults`, `HotelResultsPage`, `Cars`/`CarResultsPage`, bus results still list/filter layouts — Coverflow kit exists but is not the primary results UX |
| Deeper funnel skin | Extras/insurance/journals still mostly media chrome inside the frame; glass/coverflow polish incomplete |
| Redirect stubs | `FlightBooking`, `FlightLive`, `FlightCityPage` are Navigate-only — no theme work needed |
| Dedicated backend | Keep `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=false` |

## Safe follow-ups

1. Optional travel-host Coverflow **toggle** on flight/hotel/car result decks (keep list as default for filters).
2. Replace remaining `bg-ig-gradient` accents on travel-host alert/journal headers with travel tokens.
3. Apply `zt-glass` to insurance/extras cards only under travel host.
