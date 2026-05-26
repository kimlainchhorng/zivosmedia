/**
 * Coin package definitions for Z Coin top-up
 */
export interface CoinPackage {
  id: string;
  coins: number;
  price: number; // USD
  bonus?: number; // bonus coins
  badge?: string;
  popular?: boolean;
}

export const coinPackages: CoinPackage[] = [
  { id: "starter", coins: 60, price: 0.99, badge: "Starter" },
  { id: "basic", coins: 300, price: 4.99, bonus: 15 },
  { id: "popular", coins: 1000, price: 14.99, bonus: 80, popular: true, badge: "Best Value" },
  { id: "premium", coins: 5000, price: 69.99, bonus: 500, badge: "Premium" },
  { id: "vip", coins: 10000, price: 129.99, bonus: 1500, badge: "VIP" },
  { id: "whale", coins: 50000, price: 499.99, bonus: 10000, badge: "Whale 🐳" },
];
