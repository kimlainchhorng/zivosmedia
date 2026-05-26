# ZIVO Affiliate SubID Mapping Documentation

**Last Updated:** 2026-01-31  
**Version:** 1.0  
**Owner:** Business Operations

---

## Overview

This document defines all affiliate SubIDs used by ZIVO for revenue attribution and partner compliance. SubIDs are appended to affiliate URLs and tracked by partners for commission attribution.

⚠️ **IMPORTANT:** SubIDs must NOT be changed without written approval from Business Operations. Changes require 7-day notice for partner coordination.

---

## Active SubID Registry

### Flights
| SubID | Partner | Description | Status |
|-------|---------|-------------|--------|
| `zivo_flights` | Travelpayouts/Searadar | Primary flight search redirects | ✅ Active |

### Hotels
| SubID | Partner | Description | Status |
|-------|---------|-------------|--------|
| `zivo_hotels` | Travelpayouts | Hotel search and booking redirects | ✅ Active |

### Car Rentals
| SubID | Partner | Description | Status |
|-------|---------|-------------|--------|
| `zivo_cars` | Travelpayouts | Car rental search redirects | ✅ Active |

### Activities & Tours
| SubID | Partner | Description | Status |
|-------|---------|-------------|--------|
| `zivo_activities` | Tiqets | Tours, attractions, experiences | ✅ Active |

---

## Implementation Details

### URL Format
```
https://[partner-domain]/[path]?subid=[zivo_subid]
```

### Example URLs
```
Flights:    https://searadar.tpo.li/iAbLlX9i?subid=zivo_flights
Activities: https://tiqets.tpo.li/5fqrcQWZ?subid=zivo_activities
```

---

## Partner Commission Rates (Updated Feb 2, 2026)

| Product | Commission Model | Rate | Base Case (Forecast) | Payment Terms |
|---------|------------------|------|---------------------|---------------|
| Flights | Fixed per booking | $3–$12 | $6 per booking | Monthly, NET-30 |
| Hotels | Percentage | 4% | 4% of booking value | Monthly, NET-30 |
| Car Rentals | Percentage | 2% | 2% of booking value | Monthly, NET-30 |
| Activities | Percentage | 2-5% | 3% of booking value | Monthly, NET-30 |

### Revenue Calculation Examples

| Product | Booking Value | Calculation | Commission |
|---------|--------------|-------------|------------|
| Flights | N/A | Flat fee | $6 |
| Hotels | $800 | $800 × 4% | $32 |
| Car Rentals | $400 | $400 × 2% | $8 |

### AOV Assumptions

| Product | Min AOV | Max AOV | Base Case |
|---------|---------|---------|-----------|
| Flights | N/A | N/A | N/A (fixed per booking) |
| Hotels | $700 | $900 | $800 |
| Car Rentals | $300 | $450 | $400 |

---

## Change Control Process

1. **Request:** Submit SubID change request to Business Operations
2. **Review:** 48-hour review period for impact assessment
3. **Partner Notification:** 7-day advance notice to affected partners
4. **Implementation:** Code change via approved PR
5. **Verification:** Post-deployment tracking verification

---

## Audit Trail

All SubID configurations are maintained in:
- `src/config/affiliateLinks.ts` (centralized link config)
- `src/lib/affiliateTracking.ts` (click tracking)

---

## Contacts

- **Business Operations:** ops@zivo.com
- **Partner Relations:** partners@zivo.com
- **Technical Support:** dev@zivo.com
