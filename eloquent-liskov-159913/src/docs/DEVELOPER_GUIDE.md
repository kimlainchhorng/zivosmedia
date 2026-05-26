# ZIVO Developer Guide

> Quick reference for developers working on ZIVO travel services

---

## 🎯 Key Principle

**ZIVO is an affiliate aggregator.** We search, compare, and redirect. We never:
- Process payments
- Confirm bookings
- Handle refunds
- Guarantee prices

---

## 📁 Where Things Live

| What | Where |
|------|-------|
| Affiliate links | `src/config/affiliateRegistry.ts` |
| Click tracking | `src/lib/affiliateTracking.ts` |
| Safety checks | `src/lib/affiliateSafetyMonitor.ts` |
| Layout rules | `src/lib/layoutGuard.ts` |
| Shared components | `src/components/shared/` |
| Travel hero | `src/components/shared/TravelPageHero.tsx` |
| Search card | `src/components/shared/TravelSearchCard.tsx` |

---

## 🚀 Adding a Booking CTA

Always use the central affiliate system:

```tsx
import { openAffiliateLink } from '@/config/affiliateRegistry';

const handleBook = () => {
  openAffiliateLink('flights', {
    origin: 'JFK',
    destination: 'LAX',
    departDate: '2026-03-15',
  });
};

// Button must show external link icon
<Button onClick={handleBook}>
  View Deal <ExternalLink className="w-4 h-4" />
</Button>
```

---

## 🎨 Page Structure (Locked)

```
┌─────────────────────────────────────┐
│  HERO SECTION                       │
│  ├── Badge: "ZIVO Flights"          │
│  ├── Title: "Compare 500+ airlines" │
│  ├── Search Form (TravelSearchCard) │
│  ├── Trust Badges                   │
│  └── Affiliate Disclaimer           │
│  ❌ NO: Promos, deals, rewards      │
└─────────────────────────────────────┘
           ↓ (after search)
┌─────────────────────────────────────┐
│  RESULTS SECTION                    │
│  ├── Result Count + Filters         │
│  ├── Result Cards                   │
│  │   └── "View Deal" button (each)  │
│  ├── Partner Selector (sidebar)     │
│  └── Price Disclaimer               │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  CROSS-SELL (optional)              │
│  ├── "Complete Your Trip"           │
│  └── Hotel / Car / Activity cards   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  FOOTER                             │
│  ├── Affiliate Disclosure           │
│  └── Legal Links                    │
└─────────────────────────────────────┘
```

---

## ⚠️ Forbidden Patterns

```tsx
// ❌ NEVER DO THIS
<StripeElements />
<PaymentForm />
<CheckoutPage />
<Button>Confirm Booking</Button>
<p>Best Price Guarantee</p>
<p>Lowest prices on ZIVO</p>

// ✅ ALWAYS DO THIS
<Button onClick={openAffiliateLink}>View Deal <ExternalLink /></Button>
<p>Prices are indicative and may vary*</p>
<p>You will be redirected to our travel partner</p>
```

---

## 🔍 Testing Changes

1. Run the app in dev mode
2. Check console for safety audit results
3. Verify all "Book" buttons open new tabs
4. Confirm affiliate disclosure is visible
5. Test fallback by blocking popups

---

## 📊 Adding Analytics

```tsx
import { trackAffiliateClick } from '@/lib/affiliateTracking';

trackAffiliateClick({
  flightId: 'flight-123',
  airline: 'United',
  airlineCode: 'UA',
  origin: 'JFK',
  destination: 'LAX',
  price: 299,
  passengers: 1,
  cabinClass: 'economy',
  affiliatePartner: 'searadar',
  referralUrl: 'https://...',
  source: 'result_card',
  ctaType: 'result_card',
  serviceType: 'flights',
});
```

---

## 🆘 Common Issues

**"Safety audit failed"**
- Check for forbidden patterns (payment, checkout, guarantees)
- Ensure affiliate disclosure exists on the page

**"Redirect not working"**
- Verify partner is `isActive: true` and `isHealthy: true`
- Check browser popup blocker
- Test fallback partner

**"Wrong partner opening"**
- Check priority values in `affiliateRegistry.ts`
- Higher priority = primary partner

---

## 📞 Questions?

1. Check `src/docs/AFFILIATE_ARCHITECTURE.md`
2. Review `src/lib/layoutGuard.ts` for rules
3. Ask in #zivo-dev channel
