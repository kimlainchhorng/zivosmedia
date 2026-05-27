# ZIVO Affiliate Architecture Documentation

> **Last Updated:** 2026-01-31  
> **Maintainer:** ZIVO Business Operations  
> **Status:** LOCKED - Changes require approval

---

## 📌 Overview

ZIVO is an **affiliate-only travel search and comparison platform**. We do NOT process payments, bookings, or refunds. All transactions happen on our partner sites.

### How ZIVO Monetizes

```
User searches → Compares options → Clicks "View Deal" → Redirected to partner → Books on partner site → ZIVO earns commission
```

---

## 🔒 Locked SubIDs (DO NOT CHANGE)

| Service    | SubID             | Primary Partner  | Purpose                |
|------------|-------------------|------------------|------------------------|
| Flights    | `zivo_flights`    | Searadar         | Flight search & booking |
| Hotels     | `zivo_hotels`     | Booking.com      | Hotel search & booking  |
| Car Rental | `zivo_cars`       | Rentalcars.com   | Car rental comparison   |
| Activities | `zivo_activities` | Tiqets           | Tours & attractions     |

⚠️ **SubIDs must never be changed without Business Operations approval.** They are tracked by affiliate networks for revenue attribution.

---

## 📂 File Structure

```
src/
├── config/
│   ├── affiliateLinks.ts      # Legacy config (deprecated, kept for compatibility)
│   └── affiliateRegistry.ts   # MAIN CONFIG - All partners & URLs
├── lib/
│   ├── affiliateTracking.ts   # Click tracking & analytics
│   ├── affiliateSafetyMonitor.ts  # Compliance monitoring
│   └── layoutGuard.ts         # Page structure enforcement
├── data/
│   ├── hotelAffiliatePartners.ts  # Hotel partner details
│   └── carAffiliatePartners.ts    # Car partner details
└── docs/
    ├── AFFILIATE_ARCHITECTURE.md  # This file
    └── AFFILIATE_SUBID_MAPPING.md # SubID documentation
```

---

## 🔧 How to Update Affiliate Links

### Changing a Primary Partner

1. Open `src/config/affiliateRegistry.ts`
2. Find the partner in the relevant `*_PARTNERS` array
3. Update the `priority` value (higher = primary)
4. Update the URL in the `build*Url()` function

```typescript
// Example: Make Expedia the primary hotel partner
const HOTEL_PARTNERS: AffiliatePartner[] = [
  { id: 'expedia', name: 'Expedia', priority: 100, ... }, // Now primary
  { id: 'booking', name: 'Booking.com', priority: 95, ... }, // Fallback
];
```

### Adding a New Partner

1. Add to the `*_PARTNERS` array with appropriate priority
2. Add URL building logic to the corresponding `build*Url()` function
3. The partner will automatically appear in partner selectors

### Disabling a Partner

Set `isActive: false` - the partner will be skipped automatically:

```typescript
{ id: 'kayak', name: 'Kayak', isActive: false, ... }
```

---

## 🚫 What Must NEVER Be Changed

### Forbidden UI Elements

- ❌ **Payment forms** (Stripe, PayPal, card inputs)
- ❌ **Checkout pages** (internal booking confirmation)
- ❌ **Price guarantees** ("Best price", "Lowest price", "Guaranteed")
- ❌ **Booking confirmation** (internal order completion)

### Required UI Elements

- ✅ **Affiliate disclosure** on all booking pages
- ✅ **"Redirect to partner" notice** near all CTAs
- ✅ **External link indicators** (ExternalLink icon, `_blank` target)
- ✅ **Price disclaimer** ("Prices may vary", "*indicative")

---

## 📊 Revenue Tracking

All clicks are tracked via `trackAffiliateClick()` in `src/lib/affiliateTracking.ts`.

Tracked dimensions:
- Service type (flights/hotels/cars/activities)
- CTA type (result_card/sticky_cta/top_cta/cross_sell/etc.)
- Device (mobile/desktop/tablet)
- Partner ID
- Route/destination

Analytics available in Admin Panel → Affiliate Revenue Report.

---

## 🛡️ Safety Monitors

### Automated Checks (Development)

The `affiliateSafetyMonitor.ts` runs on page load in development and checks:

1. **No payment UI** - Scans for Stripe, PayPal, card forms
2. **No checkout language** - "Proceed to checkout", "Place order", etc.
3. **No forbidden guarantees** - "Best price guarantee", etc.
4. **Affiliate disclosure present** - On all booking pages

### Layout Guard

The `layoutGuard.ts` enforces page structure:

- Hero section: Search only, NO promos
- Results section: Cards + partner selector
- Cross-sell: Only BELOW results
- Footer: Always show disclosure

---

## 🔄 Fallback System

If the primary partner fails:

1. `openAffiliateLink()` tries the primary partner
2. If popup is blocked, tries the fallback partner
3. If both fail, navigates directly as last resort
4. Never shows a dead-end to users

---

## 📞 Support Escalation

For affiliate issues:
1. Check if partner is healthy in Admin → Partner Health
2. Verify SubIDs match documentation
3. Test redirect flow in incognito mode
4. Contact Business Operations for partner-side issues

---

## ✅ Compliance Checklist

Before deploying changes:

- [ ] No payment UI added
- [ ] No checkout forms added
- [ ] No price guarantees added
- [ ] Affiliate disclosure visible
- [ ] All CTAs open external links
- [ ] SubIDs unchanged
- [ ] Safety audit passes in dev

---

*This document is the source of truth for ZIVO affiliate architecture. All changes must be reviewed by Business Operations.*
