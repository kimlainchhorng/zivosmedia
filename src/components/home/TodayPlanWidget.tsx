/**
 * TodayPlanWidget — at-a-glance "what's on today" card on AppHome.
 * Pulls today's confirmed flight and hotel check-in items and lays them out in
 * a compact timeline. Restaurant reservations remain out of scope until their
 * backend relation exists; querying the known-missing relation only adds a 404.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import Plane from "lucide-react/dist/esm/icons/plane";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Kind = "flight" | "hotel";

interface PlanEntry {
  id: string;
  kind: Kind;
  title: string;
  detail: string;
  href: string;
}

interface FlightPlanRow {
  id: string;
  origin: string;
  destination: string;
  booking_reference: string | null;
}

interface HotelPlanRow {
  id: string;
  hotels: { name: string | null; city: string | null } | null;
}

interface TodayPlanSource {
  flights: FlightPlanRow[];
  hotels: HotelPlanRow[];
}

type TodayPlanQueryResult =
  { status: "ready"; source: TodayPlanSource } | { status: "unavailable" };

const TODAY_PLAN_STALE_TIME_MS = 60_000;

function getTodayPlanQueryKey(userId: string | null, localDay: string) {
  return ["home-today-plan", userId, localDay] as const;
}

function getLocalTodayISO(now = new Date()) {
  return format(now, "yyyy-MM-dd");
}

const META: Record<Kind, { icon: LucideIcon; tone: string }> = {
  flight: { icon: Plane, tone: "bg-sky-500/15 text-sky-600" },
  hotel: { icon: BedDouble, tone: "bg-violet-500/15 text-violet-600" },
};

export default function TodayPlanWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? null;
  // Local YYYY-MM-DD: toISOString() returns the UTC day, which in Cambodia
  // (UTC+7) reads as yesterday during 00:00–07:00 local — so an early-morning
  // user would see yesterday's plan and miss a flight/check-in dated today.
  const [todayISO, setTodayISO] = useState(getLocalTodayISO);

  useEffect(() => {
    const now = new Date();
    const nextDay = new Date(now);
    nextDay.setHours(24, 0, 0, 0);
    const timer = window.setTimeout(
      () => setTodayISO(getLocalTodayISO()),
      Math.max(1_000, nextDay.getTime() - now.getTime() + 1_000),
    );
    return () => window.clearTimeout(timer);
  }, [todayISO]);

  const { data, isError } = useQuery({
    queryKey: getTodayPlanQueryKey(userId, todayISO),
    queryFn: () => {
      if (!userId)
        throw new Error("Today Plan requires an authenticated user.");
      return loadTodayPlan(userId, todayISO);
    },
    enabled: !!userId,
    staleTime: TODAY_PLAN_STALE_TIME_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const entries = useMemo(
    () =>
      !isError && data?.status === "ready"
        ? buildTodayPlanEntries(data.source)
        : [],
    [data, isError],
  );

  if (!entries.length) return null;

  return (
    <div className="px-4 pb-3">
      <div className="rounded-3xl border border-border/50 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Today's plan</h2>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {entries.length} item{entries.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="space-y-1">
          {entries.map((e) => {
            const m = META[e.kind];
            const Icon = m.icon;
            return (
              <button
                type="button"
                key={e.id}
                onClick={() => navigate(e.href)}
                className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/40 transition-colors text-left touch-manipulation"
              >
                <div
                  className={`w-9 h-9 rounded-xl ${m.tone} flex items-center justify-center shrink-0`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">
                    {e.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {e.detail}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

async function loadTodayPlan(
  userId: string,
  todayISO: string,
): Promise<TodayPlanQueryResult> {
  try {
    const sb = supabase as any;
    const [flights, hotels] = await Promise.all([
      sb
        .from("flight_bookings")
        .select("id,origin,destination,departure_date,booking_reference")
        .eq("customer_id", userId)
        .eq("departure_date", todayISO),
      sb
        .from("hotel_bookings")
        // hotel_bookings has neither hotel_name nor city — only hotel_id.
        // PostgREST rejects the whole request over an unknown column, so this
        // widget embeds the known `hotels(name, city)` relation.
        .select("id,check_in_date,hotels(name,city)")
        .eq("customer_id", userId)
        .eq("check_in_date", todayISO),
    ]);

    if (flights.error || hotels.error) return { status: "unavailable" };

    return {
      status: "ready",
      source: {
        flights: (flights.data ?? []) as FlightPlanRow[],
        hotels: (hotels.data ?? []) as HotelPlanRow[],
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}

function buildTodayPlanEntries(source: TodayPlanSource): PlanEntry[] {
  const next: PlanEntry[] = [];

  source.flights.forEach((flight) => {
    next.push({
      id: `flt-${flight.id}`,
      kind: "flight",
      title: `${flight.origin} → ${flight.destination}`,
      detail: flight.booking_reference
        ? `Ref ${flight.booking_reference}`
        : "Departure today",
      href: `/flights/confirmation/${flight.id}`,
    });
  });

  source.hotels.forEach((hotel) => {
    next.push({
      id: `htl-${hotel.id}`,
      kind: "hotel",
      title: `Check-in: ${hotel.hotels?.name ?? "Hotel"}`,
      detail: hotel.hotels?.city ?? "Today",
      href: "/trips",
    });
  });

  return next;
}
