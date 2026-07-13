import {
  Activity,
  Bookmark,
  Plane,
  Wallet,
  Award,
  Lock,
  ShieldCheck,
  Settings,
  LifeBuoy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type QuickLink = {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Tinted accent color for the icon chip. Use Tailwind classes. */
  tint?: string;
  /** Optional badge count rendered on the icon chip. */
  badge?: number;
};

export const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { key: "activity", label: "Your activity", to: "/activity", icon: Activity, tint: "bg-blue-500/15 text-blue-500" },
  { key: "saved", label: "Saved", to: "/saved", icon: Bookmark, tint: "bg-amber-500/15 text-amber-500" },
  { key: "trips", label: "Trips", to: "/trips", icon: Plane, tint: "bg-sky-500/15 text-sky-500" },
  { key: "wallet", label: "Wallet", to: "/wallet", icon: Wallet, tint: "bg-emerald-500/15 text-emerald-500" },
  { key: "badges", label: "Badges", to: "/badges", icon: Award, tint: "bg-fuchsia-500/15 text-fuchsia-500" },
  { key: "privacy", label: "Privacy", to: "/account/privacy", icon: Lock, tint: "bg-violet-500/15 text-violet-500" },
  { key: "security", label: "Security", to: "/account/security", icon: ShieldCheck, tint: "bg-rose-500/15 text-rose-500" },
  { key: "settings", label: "Settings", to: "/settings", icon: Settings, tint: "bg-slate-500/15 text-slate-500" },
  { key: "support", label: "Help & Support", to: "/support", icon: LifeBuoy, tint: "bg-teal-500/15 text-teal-500" },
];
