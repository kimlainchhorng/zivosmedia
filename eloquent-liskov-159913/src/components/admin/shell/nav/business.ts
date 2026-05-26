import {
  LayoutDashboard,
  Plane,
  Building2,
  Car,
  Users,
  FileText,
  Settings,
  TrendingUp,
} from "lucide-react";
import type { NavConfig } from "./types";

export const businessNav: NavConfig = {
  sections: [
    {
      label: "Overview",
      items: [
        { title: "Dashboard", url: "/business/dashboard", icon: LayoutDashboard },
        { title: "Insights", url: "/business/insights", icon: TrendingUp },
      ],
    },
    {
      label: "Travel",
      items: [
        { title: "Flights", url: "/business-travel", icon: Plane },
        { title: "Hotels", url: "/business/hotels", icon: Building2 },
        { title: "Ground", url: "/business/ground", icon: Car },
      ],
    },
    {
      label: "Account",
      items: [
        { title: "Travelers", url: "/business/travelers", icon: Users },
        { title: "Policies", url: "/business/policies", icon: FileText },
        { title: "Settings", url: "/business/account", icon: Settings },
      ],
    },
  ],
};
