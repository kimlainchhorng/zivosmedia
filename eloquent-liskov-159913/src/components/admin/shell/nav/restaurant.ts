import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  Users,
  Star,
  Tag,
  TrendingUp,
  Settings,
  Wallet,
} from "lucide-react";
import type { NavConfig } from "./types";

export const restaurantNav: NavConfig = {
  sections: [
    {
      label: "Operations",
      items: [
        { title: "Dashboard", url: "/eats/restaurant-dashboard", icon: LayoutDashboard },
        { title: "Orders", url: "/eats/restaurant-dashboard?tab=orders", icon: Package },
        { title: "Menu", url: "/eats/restaurant-dashboard?tab=menu", icon: UtensilsCrossed },
      ],
    },
    {
      label: "Growth",
      items: [
        { title: "Reviews", url: "/eats/reviews", icon: Star },
        { title: "Promotions", url: "/eats/promotions", icon: Tag },
        { title: "Analytics", url: "/eats/restaurant-dashboard?tab=stats", icon: TrendingUp },
      ],
    },
    {
      label: "Finance",
      items: [
        { title: "Payouts", url: "/eats/restaurant-dashboard?tab=payouts", icon: Wallet },
      ],
    },
    {
      label: "Account",
      items: [
        { title: "Staff", url: "/eats/staff", icon: Users },
        { title: "Settings", url: "/eats/settings", icon: Settings },
      ],
    },
  ],
};
