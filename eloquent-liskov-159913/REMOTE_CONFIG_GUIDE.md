# Remote Configuration System - Complete Guide

## Overview

The remote configuration system allows you to **update app settings instantly without releasing new versions or waiting for App Store reviews**. All changes are stored in Supabase and synced to the app automatically.

### What You Can Control Without Updates

✅ **Pricing & Fees**: Update delivery fees, commissions, service charges instantly  
✅ **Feature Flags**: Enable/disable features for specific user groups or regions  
✅ **Content & Text**: Update banners, messages, support contact info  
✅ **App Behavior**: Adjust timeouts, retry logic, UI text  
❌ **Code/Logic**: Can't change how features work (requires updates)

---

## Quick Start

### 1. Admin Panel

Access the remote config admin panel at `/admin/remote-config`:

```
Admin > Settings > Remote Configuration
```

From here, you can:
- View all current settings
- Add new settings
- Edit existing values
- Delete obsolete settings

### 2. Update a Setting (Example)

**Update grocery delivery base fee from $2.99 to $3.99:**

1. Open Admin > Remote Configuration
2. Find "DELIVERY_BASE_FEE" or use "Add New Setting"
3. Change value from `2.99` to `3.99`
4. Click Save
5. **App syncs automatically within 5 minutes** (or refresh manually)

**Users don't need to update their app!** ✅

---

## Setting Types

### Pricing Settings

```
DELIVERY_BASE_FEE        → 2.99          (Delivery base charge)
DELIVERY_PER_MILE        → 0.60          (Per-mile rate)
DELIVERY_PER_MIN         → 0.10          (Per-minute charge)
SERVICE_FEE_PCT          → 5             (Service fee %)
PLATFORM_COMMISSION_PCT  → 15            (Commission %)
MARKUP_UNDER_THRESHOLD   → 5             (Markup % for small orders)  
SURGE_MULTIPLIER         → 1.5           (Surge pricing multiplier)
```

### Feature Flags

```
RIDES_ENABLED          → true
EATS_ENABLED           → true
GROCERY_ENABLED        → true
TRAVEL_ENABLED         → true
CAR_RENTAL_ENABLED     → true
AI_TRIP_PLANNER        → false          (Beta feature - disabled)
LOYALTY_PROGRAM        → true
MAINTENANCE_MODE       → false
```

### Content Settings

```
SUPPORT_EMAIL          → "support@zivo.com"
SUPPORT_PHONE          → "+1-800-ZIVO-CAR"
ONBOARDING_TITLE       → "Welcome to Zivo"
PROMO_MESSAGE          → "50% off flights this week!"
BANNER_MESSAGE         → "System maintenance tonight 11PM-12AM"
```

### Version Control

```
MIN_APP_VERSION        → "1.0.0"       (Force update if older)
LATEST_APP_VERSION     → "1.1.0"       (Current release)
FORCE_UPDATE           → false         
```

---

## Using in Your Code

### React Components (Recommended)

```typescript
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';

function GroceryCheckout() {
  const { get, isFeatureEnabled } = useRemoteConfig();
  
  // Get pricing
  const baseFee = get('DELIVERY_BASE_FEE', 2.99);
  const discount = get('CHECKOUT_DISCOUNT_PCT', 0);
  
  // Check feature flag
  if (isFeatureEnabled('priority_delivery')) {
    // Show priority option
  }
  
  return (
    <div>
      <p>Base delivery: ${baseFee}</p>
    </div>
  );
}
```

### Pre-built Hooks

Replace hardcoded values with hooks:

```typescript
import { 
  useGroceryPricing, 
  useFeatureFlags,
  useSupportContact 
} from '@/hooks/useRemoteConfigHooks';

function Component() {
  const pricing = useGroceryPricing();
  const features = useFeatureFlags();
  const support = useSupportContact();
  
  // Use like: pricing.deliveryBaseFee, features.isGroceryEnabled, etc.
}
```

---

## Real-World Examples

### Example 1: Update Pricing for a City

**Scenario**: Grocery delivery demand drops in San Francisco. Lower prices temporarily.

**Actions**:
1. Create settings: `SF_DELIVERY_BASE_FEE` = `1.99` (was `2.99`)
2. Update app code to use city-specific pricing:

```typescript
const { get } = useRemoteConfig();
const cityPrefix = city.toUpperCase(); // "SF"
const baseFee = get(`${cityPrefix}_DELIVERY_BASE_FEE`, 2.99);
```

3. Within 5 minutes, **all users in SF see lower prices** ✅
4. **No app update needed** ✅

### Example 2: Launch Beta Feature Safely

**Scenario**: Testing new AI trip planner feature with 10% of users.

**Actions**:
1. Create setting: `AI_TRIP_PLANNER_BETA` = `true`
2. Update app code:

```typescript
const { isFeatureEnabled } = useRemoteConfig();

if (isFeatureEnabled('AI_TRIP_PLANNER_BETA')) {
  // Show AI planner to beta users
}
```

3. Monitor metrics for 1 week
4. If successful, set `AI_TRIP_PLANNER` = `true` for all users
5. **Zero app review needed** ✅

### Example 3: Emergency Maintenance Banner

**Scenario**: Database migration needed. Show maintenance message to users.

**Actions**:
1. Create/update setting: `MAINTENANCE_MODE` = `true`
2. Create setting: `MAINTENANCE_MESSAGE` = `"We're upgrading servers. Back online in 30 min"`
3. Update app code:

```typescript
const { get } = useRemoteConfig();
const maintenanceMode = get('MAINTENANCE_MODE', false);

if (maintenanceMode) {
  return <MaintenanceScreen message={message} />;
}
```

**Result**: Within 2 minutes, all users see the message ✅

### Example 4: Run Targeted Promotion

**Scenario**: Offer 20% discount to users who haven't booked in 30 days.

**Actions**:
1. Create setting: `LAPSED_USER_DISCOUNT_PCT` = `20`
2. Create setting: `LAPSED_USER_DAYS_THRESHOLD` = `30`
3. Update app code to read these values
4. When user hasn't booked in 30 days, offer discount
5. **Change discount or turn off instantly** ✅

---

## Implementation Checklist

### Quick wins (implement first):

- [ ] Delivery & restaurant pricing
- [ ] Feature flags for services (rides, eats, grocery, travel)
- [ ] Support contact info
- [ ] App version requirements
- [ ] Promotional banners & messages

### Medium effort:

- [ ] City-specific pricing overrides
- [ ] User-segment-specific features (beta testers)
- [ ] Time-based promotions (holiday discounts)
- [ ] A/B testing configuration

### Advanced:

- [ ] Dynamic commission rules per driver/restaurant
- [ ] Country-specific tax/compliance settings
- [ ] ML-powered pricing adjustments
- [ ] Multi-language content management

---

## API Reference

### RemoteConfig Service

```typescript
remoteConfig.initialize()         // Called automatically on app start
remoteConfig.fetchConfig()        // Fetch latest config from Supabase
remoteConfig.get(key, default)    // Get value with fallback
remoteConfig.getAll()             // Get entire config object
remoteConfig.updateSetting(key, value, desc)  // Update in Supabase
remoteConfig.isFeatureEnabled(name)  // Check feature flag
remoteConfig.refresh()            // Force refresh config
remoteConfig.destroy()            // Cleanup
```

### useRemoteConfig Hook

```typescript
const {
  config,              // Current config object
  loading,             // Is fetching from server
  error,               // Last error, if any
  get,                 // Get value: get(key, default)
  updateSetting,       // Update: updateSetting(key, value, desc)
  isFeatureEnabled,    // Check flag: isFeatureEnabled(name)
  refresh,             // Force sync: refresh()
} = useRemoteConfig();
```

---

## Best Practices

### ✅ Do:

- [ ] Use descriptive key names: `DELIVERY_BASE_FEE` not `dbf`
- [ ] Add descriptions for complex settings
- [ ] Test config changes in development first
- [ ] Keep JSON values simple (primitives, arrays, objects)
- [ ] Use feature flags before major changes
- [ ] Document what each setting does


### ❌ Don't:

- [ ] Store secrets/API keys in settings
- [ ] Use for code logic changes (requires app update)
- [ ] Store large files or blobs
- [ ] Update settings too frequently (can cause app instability)
- [ ] Mix config types (pricing + content + features)
- [ ] Forget to set defaults in `get()` calls

---

## Troubleshooting

**Config not updating?**
- Click "Sync Config" button in admin panel
- Settings sync every 5 minutes automatically
- Try refreshing your browser

**JSON syntax error?**
- Wrap JSON in quotes: `{"key": "value"}` not `{key: value}`
- Use double quotes: `"key"` not `'key'`
- Test with `JSON.parse(value)` first

**Change not live?**
- Admin changes take immediate effect in code
- User apps sync within 5 minutes
- Force refresh with browser reload

**Feature flag not working?**
- Check spelling: `RIDES_ENABLED` not `rides_enabled`
- Use `isFeatureEnabled()` not direct `config.RIDES_ENABLED`
- Ensure code is checking your flag

---

## Monitoring & Analytics

### What to Track

- How often you change pricing
- Which features are toggled most frequently
- A/B test performance
- User reactions to promotions
- Revenue/pricing sensitivity

### Add Logging

```typescript
const { get } = useRemoteConfig();

const fee = get('DELIVERY_BASE_FEE', 2.99);
logAnalytics({
  event: 'pricing_loaded',
  deliveryFee: fee,
  configVersion: get('CONFIG_VERSION', '1.0'),
  timestamp: new Date()
});
```

---

## Migration Path

### Phase 1: Core Pricing (Week 1)

Migrate hardcoded values to remote config:
```typescript
// Before
const DELIVERY_BASE_FEE = 2.99;

// After  
const DELIVERY_BASE_FEE = get('DELIVERY_BASE_FEE', 2.99);
```

### Phase 2: Feature Flags (Week 2)

Add feature toggles for each service:
```typescript
if (get('GROCERY_ENABLED', true)) {
  // Show grocery option
}
```

### Phase 3: Content (Week 3)

Move text strings to remote config:
```typescript
const supportEmail = get('SUPPORT_EMAIL', 'help@zivo.com');
```

### Phase 4: Advanced (Ongoing)

Implement dynamic rules, A/B tests, targeting logic.

---

## Integration with App Store

**Remember**: 

- **Pricing changes** = No review needed ✅
- **Content updates** = No review needed ✅  
- **Feature visibility toggles** = No review needed ✅
- **Code logic changes** = Requires App Store review ❌
- **New API integrations** = Requires review ❌
- **Payment method changes** = May require review ⚠️

Stay within these boundaries and you can update features instantly!

---

## Support

Questions or issues?

- Check the [Remote Config Code](./remoteConfigService.ts)
- Review [Example Hooks](./useRemoteConfigHooks.ts)
- See [Admin Panel](./AdminRemoteConfigPage.tsx)
- Contact: engineering@zivo.app
