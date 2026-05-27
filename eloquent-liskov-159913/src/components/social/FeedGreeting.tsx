/**
 * FeedGreeting — small mobile-only greeting strip at the top of /feed.
 * Re-evaluates the time-of-day phrase on mount; doesn't tick because the
 * page reloads / refocuses often enough that drift is invisible.
 */
import { useMemo } from "react";

interface Props {
  /** First name or display handle. Empty string OK — falls back to a generic line. */
  name?: string | null;
}

function phraseForHour(h: number): string {
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  if (h >= 18 && h < 23) return "Good evening";
  return "Still up";
}

export default function FeedGreeting({ name }: Props) {
  const greeting = useMemo(() => phraseForHour(new Date().getHours()), []);
  const first = (name || "").trim().split(/\s+/)[0] || "";

  return (
    <div className="md:hidden px-3 pt-3 pb-1">
      <h1 className="text-[18px] font-bold text-foreground leading-tight">
        {greeting}{first ? `, ${first}` : ""} <span aria-hidden>👋</span>
      </h1>
      <p className="text-[12px] text-muted-foreground mt-0.5">Here's what's new</p>
    </div>
  );
}
