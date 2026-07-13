/**
 * RelativeTime — auto-ticking "5m ago" timestamp. Re-renders every minute
 * via useNowTick so labels stay fresh without page reloads.
 */
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { useNowTick } from "@/hooks/useNowTick";
import { cn } from "@/lib/utils";

interface Props {
  /** ISO date string or Date */
  date: string | Date | null | undefined;
  className?: string;
  addSuffix?: boolean;
  showFreshDot?: boolean;
}

export default function RelativeTime({ date, className, addSuffix = true, showFreshDot = true }: Props) {
  // subscribe to the 60s tick so this component re-renders
  const now = useNowTick(60_000);
  const resolvedDate = useMemo(() => {
    if (!date) return null;
    const value = typeof date === "string" ? new Date(date) : date;
    return Number.isNaN(value.getTime()) ? null : value;
  }, [date]);
  const label = useMemo(() => {
    if (!resolvedDate) return "";
    try {
      const ageMs = now - resolvedDate.getTime();
      if (ageMs >= 0 && ageMs < 60_000) return addSuffix ? "just now" : "now";
      return formatDistanceToNow(resolvedDate, { addSuffix });
    } catch {
      return "";
    }
  }, [now, resolvedDate, addSuffix]);
  const isFresh = useMemo(() => {
    if (!resolvedDate) return false;
    const ageMs = now - resolvedDate.getTime();
    return ageMs >= 0 && ageMs < 5 * 60_000;
  }, [now, resolvedDate]);
  const isLiveFresh = useMemo(() => {
    if (!resolvedDate) return false;
    const ageMs = now - resolvedDate.getTime();
    return ageMs >= 0 && ageMs < 60_000;
  }, [now, resolvedDate]);
  if (!label || !resolvedDate) return null;
  const absoluteLabel = resolvedDate.toLocaleString();
  return (
    <time
      className={cn("inline-flex items-center gap-1 align-baseline", className)}
      dateTime={resolvedDate.toISOString()}
      title={absoluteLabel}
      aria-label={`${label}${isFresh ? ", fresh" : ""}. ${absoluteLabel}`}
    >
      {showFreshDot && isFresh && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.7)]",
            isLiveFresh ? "bg-cyan-400 animate-pulse" : "bg-emerald-500",
          )}
          aria-hidden="true"
        />
      )}
      {label}
    </time>
  );
}
