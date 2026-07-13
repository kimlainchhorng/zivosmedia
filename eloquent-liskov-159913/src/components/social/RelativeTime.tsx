/**
 * RelativeTime — auto-ticking "5m ago" timestamp. Re-renders every minute
 * via useNowTick so labels stay fresh without page reloads.
 */
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { useNowTick } from "@/hooks/useNowTick";

interface Props {
  /** ISO date string or Date */
  date: string | Date | null | undefined;
  className?: string;
  addSuffix?: boolean;
}

export default function RelativeTime({ date, className, addSuffix = true }: Props) {
  // subscribe to the 60s tick so this component re-renders
  useNowTick(60_000);
  const label = useMemo(() => {
    if (!date) return "";
    try {
      return formatDistanceToNow(typeof date === "string" ? new Date(date) : date, { addSuffix });
    } catch {
      return "";
    }
  }, [date, addSuffix]);
  if (!label) return null;
  return <span className={className}>{label}</span>;
}
