/**
 * Referral Program Configuration
 * Rewards structure for user referrals
 * 
 * COMPLIANCE: Uses ZIVO Points (not cash, not airline miles)
 */

export interface ReferralTierBonus {
  count: number;
  bonus: number;
  title: string;
  description: string;
}

export interface ReferralRewards {
  newUser: {
    credit: number;
    points: number;
    description: string;
  };
  referrer: {
    creditPerReferral: number;
    pointsPerReferral: number;
    tierBonuses: ReferralTierBonus[];
  };
}

export const REFERRAL_REWARDS: ReferralRewards = {
  newUser: {
    credit: 0, // No cash credit
    points: 500, // ZIVO Points
    description: "Get 500 ZIVO Points when you sign up",
  },
  referrer: {
    creditPerReferral: 0,
    pointsPerReferral: 1000,
    tierBonuses: [
      {
        count: 3,
        bonus: 500,
        title: "Connector",
        description: "Refer 3 friends and earn 500 bonus points",
      },
      {
        count: 10,
        bonus: 2500,
        title: "Influencer",
        description: "Refer 10 friends and earn 2,500 bonus points",
      },
      {
        count: 25,
        bonus: 10000,
        title: "Ambassador",
        description: "Refer 25 friends and become a ZIVO Ambassador with 10,000 bonus points",
      },
    ],
  },
};

export const REFERRAL_TERMS = [
  "Referred friend must be a new ZIVO user",
  "Points are credited after friend's first completed booking",
  "Points are credited within 48 hours of booking completion",
  "ZIVO Points have no cash value and cannot be exchanged for money",
  "ZIVO reserves the right to modify program terms",
];

export const SHARE_MESSAGES = {
  default: "Join me on ZIVO and earn 500 ZIVO Points! Use my referral link:",
  email: {
    subject: "You're invited to ZIVO - Earn bonus points!",
    body: "Hey! I've been using ZIVO to find great travel deals. Sign up with my link and you'll get 500 bonus ZIVO Points to start!",
  },
  twitter: "I just discovered @ZIVOtravel - amazing deals on flights, hotels & more! Earn points on your first trip:",
  whatsapp: "Check out ZIVO for amazing travel deals! Sign up with my link and get 500 bonus points!",
};

// Compliance copy
export const REFERRAL_COMPLIANCE = {
  disclaimer: "ZIVO Points have no cash value and cannot be exchanged for money. Points are not airline miles.",
  note: "Rewards are promotional and subject to change.",
};
