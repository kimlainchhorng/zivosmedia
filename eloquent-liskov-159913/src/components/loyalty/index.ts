/**
 * Loyalty Components - Real implementations using useLoyaltyPoints hook
 */
export { default as PointsBalanceCard } from "./PointsBalanceCard";
export { default as TierProgressCard } from "./TierProgressCard";

// Shared tier labels — keep PointsBalanceCard and TierProgressCard in sync.
// Without this, the same `standard` tier shows as "Standard" in the balance
// card and "Explorer" in the progress card.
export const TIER_LABELS: Record<string, string> = {
  standard: "Explorer",
  bronze: "Traveler",
  silver: "Voyager",
  gold: "Elite",
};

// Stubs for unused components (to prevent import errors)
const Stub = (_props: any) => null;
export const PointsEarningList = Stub;
export const RedemptionOptions = Stub;
export const ReferralCard = Stub;
export const TierComparisonTable = Stub;
export const PointsCheckoutReminder = Stub;
