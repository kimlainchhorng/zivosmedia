/**
 * Custom hook examples for using remote config
 * Shows how to replace hardcoded values with remote config
 */

import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useCallback } from 'react';

/**
 * Example: Get grocery pricing config
 */
export function useGroceryPricing() {
  const { get } = useRemoteConfig();

  return {
    markupUnderThreshold: get('MARKUP_UNDER_THRESHOLD_PCT', 5),
    markupOverThreshold: get('MARKUP_OVER_THRESHOLD_PCT', 3),
    markupThreshold: get('MARKUP_THRESHOLD', 50),
    deliveryBaseFee: get('DELIVERY_BASE_FEE', 2.99),
    deliveryPerMile: get('DELIVERY_PER_MILE', 0.60),
    deliveryPerMin: get('DELIVERY_PER_MIN', 0.10),
    deliveryMinFee: get('DELIVERY_MIN_FEE', 3.99),
    deliveryMaxFee: get('DELIVERY_MAX_FEE', 14.99),
    serviceFeePercent: get('SERVICE_FEE_PCT', 5),
    serviceFeeMi: get('SERVICE_FEE_MIN', 2.50),
    serviceFeeMax: get('SERVICE_FEE_MAX', 10.00),
    priorityFee: get('PRIORITY_FEE', 2.99),
  };
}

/**
 * Example: Get feature flags
 */
export function useFeatureFlags() {
  const { isFeatureEnabled } = useRemoteConfig();

  return {
    // Replace service features
    isRidesEnabled: isFeatureEnabled('rides_enabled'),
    isEatsEnabled: isFeatureEnabled('eats_enabled'),
    isGroceryEnabled: isFeatureEnabled('grocery_enabled'),
    isTravelEnabled: isFeatureEnabled('travel_enabled'),
    isCarRentalEnabled: isFeatureEnabled('car_rental_enabled'),
    
    // Experimental features
    isAITripPlannerEnabled: isFeatureEnabled('ai_trip_planner_enabled'),
    isLoyaltyEnabled: isFeatureEnabled('loyalty_enabled'),
    isB2BEnabled: isFeatureEnabled('b2b_enabled'),
    
    // Maintenance mode
    isMaintenanceMode: isFeatureEnabled('maintenance_mode'),
  };
}

/**
 * Example: Get support contact info
 */
export function useSupportContact() {
  const { get } = useRemoteConfig();

  return {
    email: get('SUPPORT_EMAIL', 'support@zivo.com'),
    phone: get('SUPPORT_PHONE', '+1-800-ZIVO-CAR'),
    website: get('SUPPORT_WEBSITE', 'https://support.zizo.app'),
    liveChat: get('LIVE_CHAT_ENABLED', true),
  };
}

/**
 * Example: Get app version requirements
 */
export function useAppVersionRequirements() {
  const { get } = useRemoteConfig();

  return {
    minVersion: get('MIN_APP_VERSION', '1.0.0'),
    latestVersion: get('LATEST_APP_VERSION', '1.1.0'),
    forceUpdate: get('FORCE_UPDATE', false),
    maintenanceMode: get('MAINTENANCE_MODE', false),
    maintenanceMessage: get('MAINTENANCE_MESSAGE', ''),
  };
}

/**
 * Example: Get pricing/commission settings
 */
export function usePricing() {
  const { get } = useRemoteConfig();

  return {
    platformCommission: get('PLATFORM_COMMISSION_PCT', 15),
    taxRate: get('TAX_RATE', 0.12),
    surgeMultiplier: get('SURGE_MULTIPLIER', 1.5),
    tippingEnabled: get('TIPPING_ENABLED', true),
    minTipAmount: get('MIN_TIP_AMOUNT', 0),
    defaultTipPercentages: get('DEFAULT_TIP_PERCENTAGES', [15, 18, 20]),
  };
}

/**
 * Example: Get content/UI strings
 */
export function useContent() {
  const { get } = useRemoteConfig();

  // All strings can be updated in Supabase without releasing a new app version
  return {
    onboardingTitle: get('ONBOARDING_TITLE', 'Welcome to Zivo'),
    onboardingDescription: get('ONBOARDING_DESCRIPTION', 'Your all-in-one travel & delivery app'),
    promoMessage: get('PROMO_MESSAGE', ''),
    bannerMessage: get('BANNER_MESSAGE', ''),
    ctaButtonText: get('CTA_BUTTON_TEXT', 'Get Started'),
  };
}
