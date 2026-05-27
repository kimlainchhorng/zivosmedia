/**
 * ZIVO AI Personalization, Retention & Optimization Engine Types
 */

// ============================================
// Personalization Settings
// ============================================

export interface UserPersonalizationSettings {
  id: string;
  user_id: string;
  personalization_enabled: boolean;
  show_price_badges: boolean;
  show_urgency_indicators: boolean;
  allow_search_history: boolean;
  allow_recently_viewed: boolean;
  preferred_currency: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Saved Searches
// ============================================

export type ServiceType = 'flights' | 'hotels' | 'cars' | 'activities' | 'transfers';

export interface SavedSearch {
  id: string;
  user_id: string;
  service_type: ServiceType;
  title: string;
  search_params: SavedSearchParams;
  price_alert_enabled: boolean;
  target_price: number | null;
  current_price: number | null;
  last_price_check_at: string | null;
  notification_email: boolean;
  notification_push: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedSearchParams {
  origin?: string;
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  adults?: number;
  children?: number;
  pickupLocation?: string;
  dropoffLocation?: string;
  [key: string]: unknown;
}

export interface CreateSavedSearchInput {
  service_type: ServiceType;
  title: string;
  search_params: SavedSearchParams;
  price_alert_enabled?: boolean;
  target_price?: number;
  notification_email?: boolean;
  notification_push?: boolean;
}

// ============================================
// Favorites
// ============================================

export type FavoriteItemType = 'hotel' | 'activity' | 'flight_route' | 'car' | 'transfer' | 'restaurant' | 'destination' | 'flight';

export interface UserFavorite {
  id: string;
  user_id: string;
  item_type: FavoriteItemType;
  item_id: string;
  item_data: FavoriteItemData;
  created_at: string;
}

export interface FavoriteItemData {
  name: string;
  image?: string;
  price?: number;
  rating?: number;
  location?: string;
  [key: string]: unknown;
}

export interface AddFavoriteInput {
  item_type: FavoriteItemType;
  item_id: string;
  item_data: FavoriteItemData;
}

// ============================================
// Recently Viewed
// ============================================

export type RecentlyViewedItemType = 'hotel' | 'activity' | 'flight' | 'car' | 'transfer';

export interface RecentlyViewedItem {
  id: string;
  user_id: string;
  item_type: RecentlyViewedItemType;
  item_id: string;
  item_data: RecentlyViewedItemData;
  viewed_at: string;
}

export interface RecentlyViewedItemData {
  name: string;
  image?: string;
  price?: number;
  rating?: number;
  location?: string;
  [key: string]: unknown;
}

export interface TrackViewInput {
  item_type: RecentlyViewedItemType;
  item_id: string;
  item_data: RecentlyViewedItemData;
}

// ============================================
// Smart Sorting
// ============================================

export interface SmartSortRule {
  id: string;
  service_type: ServiceType;
  rule_name: string;
  rule_key: string;
  description: string | null;
  scoring_weights: ScoringWeights;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScoringWeights {
  price?: number;
  rating?: number;
  cancellation?: number;
  bookings?: number;
  reviews?: number;
  duration?: number;
  stops?: number;
  affinity?: number;
  features?: number;
  vehicle?: number;
  [key: string]: number | undefined;
}

// ============================================
// Price Intelligence
// ============================================

export type DemandLevel = 'low' | 'normal' | 'high' | 'very_high';
export type AvailabilityLevel = 'high' | 'medium' | 'low' | 'limited';

export interface PriceIntelligence {
  id: string;
  service_type: ServiceType;
  item_id: string;
  current_price: number;
  historical_avg: number | null;
  historical_low: number | null;
  demand_level: DemandLevel | null;
  availability_level: AvailabilityLevel | null;
  currency: string;
  updated_at: string;
}

export type DealBadgeType = 'good_deal' | 'great_deal' | 'high_demand' | 'limited_availability' | null;

export interface DealInfo {
  badge: DealBadgeType;
  score: number; // 0-100
  savings_percent?: number;
  message?: string;
}

// ============================================
// Loyalty System
// ============================================

export type LoyaltyTier = 'standard' | 'bronze' | 'silver' | 'gold';

export interface LoyaltyPoints {
  id: string;
  user_id: string;
  points_balance: number;
  lifetime_points: number;
  tier: LoyaltyTier;
  tier_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'bonus' | 'expire' | 'adjust';

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  points_amount: number;
  transaction_type: LoyaltyTransactionType;
  reference_type: string | null;
  reference_id: string | null;
  description: string;
  balance_after: number;
  created_at: string;
}

export interface EarnPointsInput {
  amount_spent: number; // in dollars
  reference_type: 'booking' | 'referral' | 'promotion';
  reference_id: string;
  description: string;
}

export interface RedeemPointsInput {
  points: number;
  reference_type: 'checkout' | 'transfer';
  reference_id: string;
}

// Tier thresholds
export const LOYALTY_TIERS: Record<LoyaltyTier, { min: number; max: number; bonus: number }> = {
  standard: { min: 0, max: 999, bonus: 0 },
  bronze: { min: 1000, max: 4999, bonus: 0.05 },
  silver: { min: 5000, max: 14999, bonus: 0.10 },
  gold: { min: 15000, max: Infinity, bonus: 0.15 },
};

// Points per dollar
export const POINTS_PER_DOLLAR = 1;
export const POINTS_TO_DOLLAR = 100; // 100 points = $1
export const MIN_REDEMPTION_POINTS = 500; // $5 minimum

// ============================================
// Optimization Metrics
// ============================================

export type MetricName = 
  | 'conversion_rate'
  | 'repeat_rate'
  | 'abandonment_rate'
  | 'revenue_per_user'
  | 'ctr'
  | 'booking_count'
  | 'revenue';

export type SegmentType = 
  | 'user_type'
  | 'device_type'
  | 'traffic_source'
  | 'service_type'
  | 'geo';

export interface OptimizationMetric {
  id: string;
  segment_type: SegmentType;
  segment_value: string;
  metric_name: MetricName;
  metric_value: number;
  period_start: string;
  period_end: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================
// Abandonment Recovery
// ============================================

export interface AbandonmentEvent {
  session_id: string;
  user_id?: string;
  email?: string;
  service_type: ServiceType;
  search_params: SavedSearchParams;
  checkout_step?: number;
  cart_value?: number;
  time_spent_seconds: number;
  abandoned_at: string;
}

export interface RecoveryNotification {
  type: 'email' | 'push';
  subject: string;
  body: string;
  promo_code?: string;
  promo_discount?: number;
}

// ============================================
// Personalization Scoring
// ============================================

export interface PersonalizationScore {
  item_id: string;
  base_score: number;
  price_score: number;
  rating_score: number;
  affinity_score: number;
  distance_score: number;
  flexibility_score: number;
  final_score: number;
}

export interface PersonalizationContext {
  user_id?: string;
  location?: { lat: number; lng: number };
  past_bookings: string[];
  past_searches: SavedSearchParams[];
  device_type: 'mobile' | 'tablet' | 'desktop';
  is_new_user: boolean;
  clv_tier?: string;
}
