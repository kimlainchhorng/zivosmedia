# Hizovo Standardized Tracking Parameters

**Last Updated:** 2026-02-02

## Overview

All Hizovo partner redirects use standardized tracking parameters for consistent attribution across Duffel, CJ, Travelpayouts, and other networks.

---

## Standardized Format

```
utm_source=hizovo
utm_medium=affiliate
utm_campaign=travel
subid={searchSessionId}
```

### Example Redirect URL

```
https://partner-checkout.com/book?utm_source=hizovo&utm_medium=affiliate&utm_campaign=travel&subid=SS_839201
```

---

## Parameter Definitions

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `utm_source` | `hizovo` | Identifies traffic source as Hizovo |
| `utm_medium` | `affiliate` | Identifies this as affiliate traffic |
| `utm_campaign` | `travel` | Groups all travel-related clicks |
| `subid` | `SS_{timestamp}_{random}` | Links search → click → booking |

---

## Search Session ID (subid)

The `subid` is your internal Search Session ID that enables:

1. **Search Attribution** - Match which search led to a click
2. **Click Attribution** - Track which click led to a booking
3. **Revenue Attribution** - Connect bookings back to source

### Format

```
SS_{timestamp}_{random}
```

### Example

```
SS_1706789012345_ABC123
```

---

## Implementation

### Config Location

```typescript
// src/config/trackingParams.ts
import { HIZOVO_TRACKING_PARAMS, getSearchSessionId } from '@/config/trackingParams';
```

### Building Tracked URLs

```typescript
import { buildTrackedUrl, getTrackingParams } from '@/config/trackingParams';

// Method 1: Full URL builder
const url = buildTrackedUrl({ 
  baseUrl: 'https://partner.com/checkout' 
});
// Result: https://partner.com/checkout?utm_source=hizovo&utm_medium=affiliate&utm_campaign=travel&subid=SS_839201

// Method 2: Get params as object
const params = getTrackingParams();
// Result: { utm_source: 'hizovo', utm_medium: 'affiliate', utm_campaign: 'travel', subid: 'SS_839201' }
```

### Partner-Specific URLs

Some partners use different parameter names:

```typescript
import { buildPartnerTrackedUrl } from '@/config/trackingParams';

// CJ uses 'sid' instead of 'subid'
const cjUrl = buildPartnerTrackedUrl(
  'https://cj-partner.com/book',
  'cj'
);

// Booking.com uses 'aid'
const bookingUrl = buildPartnerTrackedUrl(
  'https://booking.com/hotel',
  'booking'
);
```

---

## Partner Parameter Mapping

| Partner | source param | medium param | campaign param | subid param |
|---------|--------------|--------------|----------------|-------------|
| Travelpayouts | `utm_source` | `utm_medium` | `utm_campaign` | `subid` |
| Duffel | `utm_source` | `utm_medium` | `utm_campaign` | `subid` |
| CJ | `utm_source` | `utm_medium` | `utm_campaign` | `sid` |
| Booking.com | `utm_source` | `utm_medium` | `utm_campaign` | `aid` |
| Expedia | `utm_source` | `utm_medium` | `utm_campaign` | `affcid` |

---

## Usage in Components

All affiliate CTAs automatically use standardized tracking:

```tsx
// Hooks automatically apply tracking
import { useFlightRedirect } from '@/hooks/useAffiliateRedirect';

const { redirectWithParams } = useFlightRedirect('flight_results', 'result_card');

// All generated URLs will include:
// utm_source=hizovo&utm_medium=affiliate&utm_campaign=travel&subid=SS_XXXXX
```

---

## Logging & Analytics

All tracked clicks are logged to `affiliate_click_logs` table with:

- `subid` - The search session ID
- `utm_source` - Always "hizovo"
- `utm_medium` - Always "affiliate"  
- `utm_campaign` - Always "travel"
- `final_url` - Complete URL with all params

---

## Change Control

⚠️ **DO NOT modify tracking parameters without Business Operations approval.**

Changes to tracking params require:
1. 7-day notice to affected partners
2. Written approval from Business Operations
3. Testing in staging environment
4. Coordinated rollout

---

## Files Reference

- `src/config/trackingParams.ts` - Centralized tracking config
- `src/config/affiliateRegistry.ts` - Partner URL builders
- `src/config/affiliateLinks.ts` - Deep link builders
- `src/lib/outboundTracking.ts` - Click logging
- `src/lib/subidGenerator.ts` - SubID generation
