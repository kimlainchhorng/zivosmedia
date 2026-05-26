/**
 * ZIVO POINTS CONFIGURATION
 * 
 * Non-cash loyalty rewards system that is affiliate-compliant.
 * Points have NO cash value and are NOT withdrawable.
 * 
 * CRITICAL COMPLIANCE:
 * - Points are NOT airline miles
 * - Points are NOT cash or cashback
 * - Points cannot be exchanged for money
 */

// ============================================
// COMPLIANCE COPY (REQUIRED)
// ============================================

export const POINTS_COMPLIANCE = {
  /** Primary disclaimer - show on all points displays */
  primaryDisclaimer: "ZIVO Points have no cash value and cannot be exchanged for money.",
  
  /** Full legal disclaimer */
  fullDisclaimer: "ZIVO Points are promotional credits for platform use only. They have no cash value, cannot be transferred, sold, or redeemed for cash. ZIVO reserves the right to modify, suspend, or terminate the points program at any time. ZIVO Points are not airline miles, hotel points, or any third-party loyalty currency.",
  
  /** Short footer copy */
  footerNote: "Rewards are promotional and subject to change. ZIVO Points are not airline miles.",
  
  /** Checkout reminder */
  checkoutNote: "Points earned are promotional credits only.",
  
  /** Referral program copy */
  referralNote: "Invite friends and earn ZIVO Points when they complete their first booking.",
};

// ============================================
// TIER SYSTEM (Explorer → Traveler → Elite)
// ============================================

export type ZivoTier = 'explorer' | 'traveler' | 'elite';

export interface TierPerks {
  freeDelivery: boolean;
  discountPercent: number;
  bonusPointsMultiplier: number;
  prioritySupport: boolean;
}

export interface TierConfig {
  name: string;
  displayName: string;
  minPoints: number;
  maxPoints: number;
  /** Bonus % on earned points (e.g., 0.10 = 10%) */
  earningBonus: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  benefits: string[];
  perks: TierPerks;
}

export const ZIVO_TIERS: Record<ZivoTier, TierConfig> = {
  explorer: {
    name: 'explorer',
    displayName: 'Explorer',
    minPoints: 0,
    maxPoints: 4999,
    earningBonus: 0,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
    icon: 'compass',
    benefits: [
      'Earn points on all bookings',
      'Access to deals hub',
      'Basic price alerts',
    ],
    perks: { freeDelivery: false, discountPercent: 0, bonusPointsMultiplier: 1, prioritySupport: false },
  },
  traveler: {
    name: 'traveler',
    displayName: 'Traveler',
    minPoints: 5000,
    maxPoints: 24999,
    earningBonus: 0.10,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    icon: 'plane',
    benefits: [
      'All Explorer benefits',
      '+10% bonus on earned points',
      'Priority price alerts',
      'Early access to seasonal deals',
    ],
    perks: { freeDelivery: false, discountPercent: 5, bonusPointsMultiplier: 1.5, prioritySupport: true },
  },
  elite: {
    name: 'elite',
    displayName: 'Elite',
    minPoints: 25000,
    maxPoints: Infinity,
    earningBonus: 0.25,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: 'crown',
    benefits: [
      'All Traveler benefits',
      '+25% bonus on earned points',
      'Exclusive deal previews',
      'Priority customer support',
      'Birthday bonus points',
    ],
    perks: { freeDelivery: true, discountPercent: 10, bonusPointsMultiplier: 2, prioritySupport: true },
  },
};

// ============================================
// POINTS EARNING RULES
// ============================================

export interface EarningRule {
  id: string;
  action: string;
  description: string;
  points: number;
  /** Is this a one-time earn? */
  oneTime: boolean;
  /** Icon name for display */
  icon: 'booking' | 'alert' | 'account' | 'referral' | 'review';
}

export const EARNING_RULES: EarningRule[] = [
  {
    id: 'account_creation',
    action: 'Create an account',
    description: 'Welcome bonus for new members',
    points: 500,
    oneTime: true,
    icon: 'account',
  },
  {
    id: 'first_booking',
    action: 'Complete first booking',
    description: 'Bonus for your first completed booking',
    points: 1000,
    oneTime: true,
    icon: 'booking',
  },
  {
    id: 'booking_complete',
    action: 'Complete a booking',
    description: 'Earn points when your booking is confirmed',
    points: 200, // Base points per booking
    oneTime: false,
    icon: 'booking',
  },
  {
    id: 'price_alert',
    action: 'Set a price alert',
    description: 'Get notified when prices drop',
    points: 50,
    oneTime: false, // Per route
    icon: 'alert',
  },
  {
    id: 'referral_signup',
    action: 'Friend signs up',
    description: 'Earn when your referred friend creates an account',
    points: 250,
    oneTime: false,
    icon: 'referral',
  },
  {
    id: 'referral_booking',
    action: 'Friend completes booking',
    description: 'Bonus when your referred friend books their first trip',
    points: 1000,
    oneTime: false,
    icon: 'referral',
  },
  {
    id: 'leave_review',
    action: 'Leave a review',
    description: 'Share your experience after a trip',
    points: 100,
    oneTime: false,
    icon: 'review',
  },
];

// ============================================
// POINTS REDEMPTION OPTIONS
// ============================================

export interface RedemptionOption {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  /** Value in dollars (if applicable) */
  dollarValue?: number;
  available: boolean;
  comingSoon?: boolean;
}

export const REDEMPTION_OPTIONS: RedemptionOption[] = [
  {
    id: 'fee_discount_small',
    name: '$5 Booking Fee Discount',
    description: 'Apply to your next booking',
    pointsCost: 500,
    dollarValue: 5,
    available: true,
  },
  {
    id: 'fee_discount_medium',
    name: '$10 Booking Fee Discount',
    description: 'Apply to your next booking',
    pointsCost: 1000,
    dollarValue: 10,
    available: true,
  },
  {
    id: 'fee_discount_large',
    name: '$25 Booking Fee Discount',
    description: 'Best value redemption',
    pointsCost: 2000, // Better rate for higher redemption
    dollarValue: 25,
    available: true,
  },
  {
    id: 'priority_alerts',
    name: 'Priority Price Alerts',
    description: 'Get notified first when prices drop (30 days)',
    pointsCost: 300,
    available: true,
  },
  {
    id: 'early_access',
    name: 'Early Deal Access',
    description: 'See deals 24 hours before everyone else (30 days)',
    pointsCost: 500,
    available: true,
  },
  {
    id: 'exclusive_promo',
    name: 'Exclusive Promo Code',
    description: 'Unlock partner discounts',
    pointsCost: 750,
    available: false,
    comingSoon: true,
  },
];

// ============================================
// REFERRAL PROGRAM (POINTS-BASED, SAFE)
// ============================================

export const REFERRAL_PROGRAM = {
  /** Points earned by referrer when friend signs up */
  referrerSignupBonus: 250,
  /** Points earned by referrer when friend books */
  referrerBookingBonus: 1000,
  /** Points earned by new user on signup via referral */
  newUserBonus: 500,
  
  /** Copy for referral */
  shareMessage: "Join me on ZIVO and earn 500 ZIVO Points! Use my referral link:",
  emailSubject: "You're invited to ZIVO - Earn bonus points!",
  emailBody: "Hey! I've been using ZIVO to find great travel deals. Sign up with my link and you'll get 500 bonus ZIVO Points to start!",
  
  /** Tier bonuses for super referrers */
  tierBonuses: [
    { count: 3, bonusPoints: 500, title: "Connector" },
    { count: 10, bonusPoints: 2500, title: "Influencer" },
    { count: 25, bonusPoints: 10000, title: "Ambassador" },
  ],
};

// ============================================
// UTILITIES
// ============================================

/** Get tier from lifetime points */
export function getTierFromPoints(lifetimePoints: number): ZivoTier {
  if (lifetimePoints >= ZIVO_TIERS.elite.minPoints) return 'elite';
  if (lifetimePoints >= ZIVO_TIERS.traveler.minPoints) return 'traveler';
  return 'explorer';
}

/** Get tier config */
export function getTierConfig(tier: ZivoTier): TierConfig {
  return ZIVO_TIERS[tier];
}

/** Get tier perks for checkout logic */
export function getTierPerks(tier: ZivoTier): TierPerks {
  return ZIVO_TIERS[tier].perks;
}

/** Calculate points needed for next tier */
export function getPointsToNextTier(lifetimePoints: number): { nextTier: ZivoTier | null; pointsNeeded: number } {
  const currentTier = getTierFromPoints(lifetimePoints);
  
  if (currentTier === 'elite') {
    return { nextTier: null, pointsNeeded: 0 };
  }
  
  const nextTier = currentTier === 'explorer' ? 'traveler' : 'elite';
  const pointsNeeded = ZIVO_TIERS[nextTier].minPoints - lifetimePoints;
  
  return { nextTier, pointsNeeded };
}

/** Calculate earning bonus based on tier */
export function getEarningBonus(tier: ZivoTier): number {
  return ZIVO_TIERS[tier].earningBonus;
}

/** Points to dollar value (for fee discounts) */
export const POINTS_TO_DOLLAR_RATE = 100; // 100 points = $1
export const MIN_REDEMPTION = 500; // Minimum 500 points to redeem

export function pointsToDollar(points: number): number {
  return points / POINTS_TO_DOLLAR_RATE;
}
