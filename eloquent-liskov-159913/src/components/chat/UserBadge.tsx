/**
 * UserBadge — small inline badges for verified, ZIVO+, and online status.
 * Use after a name or beside an avatar.
 */
import { memo } from "react";
import BadgeCheck from "lucide-react/dist/esm/icons/badge-check";
import Star from "lucide-react/dist/esm/icons/star";
import { cn } from "@/lib/utils";

export interface UserBadgeProps {
  isVerified?: boolean;
  isPremium?: boolean;
  /** Last-seen ISO timestamp; if within ONLINE_THRESHOLD_MS, shows online dot. */
  lastSeen?: string | null;
  /** Override: if provided, takes precedence over lastSeen calc. */
  isOnline?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const ONLINE_THRESHOLD_MS = 60_000;

const SIZES = {
  xs: { icon: "w-3 h-3", dot: "w-1.5 h-1.5" },
  sm: { icon: "w-3.5 h-3.5", dot: "w-2 h-2" },
  md: { icon: "w-4 h-4", dot: "w-2.5 h-2.5" },
};

function UserBadgeImpl({ isVerified, isPremium, lastSeen, isOnline, size = "sm", className }: UserBadgeProps) {
  const s = SIZES[size];
  const online =
    isOnline ?? (lastSeen ? Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS : false);

  if (!isVerified && !isPremium && !online) return null;

  return (
    <span className={cn("inline-flex items-center gap-1 align-middle", className)}>
      {isVerified && (
        <BadgeCheck className={cn(s.icon, "text-sky-500 fill-sky-500/15")} aria-label="Verified" />
      )}
      {isPremium && (
        <Star className={cn(s.icon, "text-emerald-500 fill-emerald-500/20")} aria-label="ZIVO+" />
      )}
      {online && (
        <span
          className={cn(s.dot, "rounded-full bg-emerald-500 ring-2 ring-background")}
          aria-label="Online"
        />
      )}
    </span>
  );
}

export const UserBadge = memo(UserBadgeImpl);
export default UserBadge;
