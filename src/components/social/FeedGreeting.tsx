/**
 * FeedGreeting — small mobile-only greeting strip at the top of /feed.
 * Re-evaluates the time-of-day phrase on mount; doesn't tick because the
 * page reloads / refocuses often enough that drift is invisible.
 */
import { useMemo } from "react";
import { Activity, CalendarDays, Clock3, Compass, Moon, Radio, Sparkles, Sun, Sunset } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  /** First name or display handle. Empty string OK — falls back to a generic line. */
  name?: string | null;
}

function moodForHour(h: number): { phrase: string; Icon: LucideIcon } {
  if (h >= 5 && h < 12) return { phrase: "Good morning", Icon: Sun };
  if (h >= 12 && h < 18) return { phrase: "Good afternoon", Icon: Sparkles };
  if (h >= 18 && h < 23) return { phrase: "Good evening", Icon: Sunset };
  return { phrase: "Still up", Icon: Moon };
}

function focusForHour(h: number): string {
  if (h >= 5 && h < 12) return "Catch fresh drops before the day gets busy";
  if (h >= 12 && h < 18) return "Scan creators, shops, and live moments";
  if (h >= 18 && h < 23) return "See what your circle is watching tonight";
  return "A quiet feed pass for late-night finds";
}

export default function FeedGreeting({ name }: Props) {
  const hour = useMemo(() => new Date().getHours(), []);
  const { phrase, Icon } = useMemo(() => moodForHour(hour), [hour]);
  const focusLabel = useMemo(() => focusForHour(hour), [hour]);
  const dateLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date());
  }, []);
  const timeLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
  }, []);
  const first = (name || "").trim().split(/\s+/)[0] || "";

  return (
    <div className="px-3 pb-1 pt-3 md:hidden">
      <div className="zivo-social-greeting-panel overflow-hidden rounded-[1.25rem] px-3 py-3" aria-label="Feed welcome summary">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="zivo-social-chip flex min-h-[24px] items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold text-primary">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {dateLabel}
              </span>
              <span className="zivo-social-chip flex min-h-[24px] items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {timeLabel}
              </span>
            </div>
            <h1 className="truncate text-[19px] font-extrabold leading-tight text-foreground">
              {phrase}{first ? `, ${first}` : ""}
            </h1>
            <p className="mt-0.5 truncate text-[12px] font-semibold text-muted-foreground">Fresh posts, creators, and moments for you</p>
          </div>
          <span className="zivo-social-greeting-orb flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary" aria-hidden>
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <div className="zivo-social-share-preview mt-3 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-background" aria-hidden="true" />
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                Session ready
              </span>
              <span className="block truncate text-xs font-bold text-foreground">Live signal is active</span>
            </span>
          </span>
          <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
            Now
          </span>
        </div>
        <div className="zivo-social-module-tile mt-3 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                Today's focus
              </span>
              <span className="block truncate text-xs font-bold text-foreground">{focusLabel}</span>
            </span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <span className="zivo-social-module-tile flex min-w-0 items-center gap-1.5 rounded-2xl px-2.5 py-2 text-[10px] font-black text-muted-foreground">
            <Radio className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
            <span className="truncate">Live feed</span>
          </span>
          <span className="zivo-social-module-tile flex min-w-0 items-center gap-1.5 rounded-2xl px-2.5 py-2 text-[10px] font-black text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">For now</span>
          </span>
          <span className="zivo-social-module-tile flex min-w-0 items-center gap-1.5 rounded-2xl px-2.5 py-2 text-[10px] font-black text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-fuchsia-500" aria-hidden="true" />
            <span className="truncate">Fresh</span>
          </span>
        </div>
      </div>
    </div>
  );
}
