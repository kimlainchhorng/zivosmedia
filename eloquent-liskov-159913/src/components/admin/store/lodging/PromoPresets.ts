export interface PromoPreset {
  key: string;
  label: string;
  emoji: string;
  description: string;
  values: {
    name: string;
    code?: string;
    promo_type: string;
    discount_value: number;
    rule_type: string;
    days_in_advance?: number;
    min_nights?: number;
    max_nights?: number;
  };
}

export const PROMO_PRESETS: PromoPreset[] = [
  {
    key: "early-bird",
    label: "Early Bird 15%",
    emoji: "🐦",
    description: "Book 30+ days in advance, save 15%.",
    values: { name: "Early Bird 15%", code: "EARLY15", promo_type: "percent", discount_value: 15, rule_type: "early_bird", days_in_advance: 30 },
  },
  {
    key: "last-minute",
    label: "Last Minute 10%",
    emoji: "⏰",
    description: "Book within 7 days of arrival, save 10%.",
    values: { name: "Last Minute 10%", code: "LM10", promo_type: "percent", discount_value: 10, rule_type: "last_minute", days_in_advance: 7 },
  },
  {
    key: "stay-3",
    label: "Stay 3 Save 20%",
    emoji: "🛏️",
    description: "Stay 3+ nights, save 20%.",
    values: { name: "Stay 3 Nights — Save 20%", promo_type: "percent", discount_value: 20, rule_type: "length_of_stay", min_nights: 3 },
  },
  {
    key: "stay-7-free",
    label: "Stay 7, get 1 free",
    emoji: "🎁",
    description: "1 free night for week-long stays.",
    values: { name: "Weekly Escape — 1 free night", promo_type: "free_night", discount_value: 1, rule_type: "length_of_stay", min_nights: 7 },
  },
  {
    key: "mobile",
    label: "Mobile-only 8%",
    emoji: "📱",
    description: "App/mobile bookings, save 8%.",
    values: { name: "Mobile-only Rate", promo_type: "percent", discount_value: 8, rule_type: "mobile" },
  },
  {
    key: "member",
    label: "Member 12%",
    emoji: "⭐",
    description: "Loyalty members save 12%.",
    values: { name: "Member-only Rate", code: "MEMBER12", promo_type: "percent", discount_value: 12, rule_type: "member" },
  },
];
