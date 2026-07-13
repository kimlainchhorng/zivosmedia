import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Luggage, Plane, Hotel, CarFront, Bus, CalendarDays, ChevronRight, Compass,
  Ticket, LogIn, Loader2, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTrips, type TravelOrder, type TripFilter } from "@/hooks/useMyTrips";
import { TravelUtilityShell } from "@/components/zivo-travel/TravelUtilityShell";

const QUICK_ACTIONS = [
  { label: "Flights", to: "/flights", icon: Plane },
  { label: "Hotels", to: "/hotels", icon: Hotel },
  { label: "Cars", to: "/cars", icon: CarFront },
  { label: "Bus", to: "/bus", icon: Bus },
];

const ITEM_ICON: Record<string, typeof Hotel> = {
  hotel: Hotel,
  activity: Ticket,
  transfer: CarFront,
};

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(amount);
  } catch {
    return `${currency || "$"} ${amount.toFixed(2)}`;
  }
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-700",
  pending: "bg-amber-500/15 text-amber-700",
  cancelled: "bg-rose-500/15 text-rose-700",
  refunded: "bg-rose-500/15 text-rose-700",
};

function TripCard({ order }: { order: TravelOrder }) {
  const items = order.travel_order_items || [];
  const primary = items[0];
  const Icon = (primary && ITEM_ICON[primary.type]) || Luggage;
  const startDates = items
    .map((i) => new Date(i.start_date))
    .filter((d) => !Number.isNaN(d.getTime()));
  const earliest = startDates.length
    ? new Date(Math.min(...startDates.map((d) => d.getTime())))
    : null;

  return (
    <div className="zt-glass flex items-center gap-3 rounded-2xl p-4">
      <span className="zt-glass grid h-12 w-12 shrink-0 place-items-center rounded-xl">
        <Icon className="h-5 w-5 text-sky-600" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-slate-900">{primary?.title || `Order ${order.order_number}`}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          {earliest ? format(earliest, "EEE, MMM d, yyyy") : "Dates to be confirmed"}
          {items.length > 1 && <span>· {items.length} items</span>}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-black text-slate-900">{formatPrice(order.total, order.currency)}</p>
        <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", STATUS_STYLE[order.status] || "bg-slate-500/10 text-slate-600")}>
          {order.status}
        </span>
      </div>
    </div>
  );
}

function StateCard({ icon: Icon, title, children }: { icon: typeof CalendarDays; title: string; children?: React.ReactNode }) {
  return (
    <div className="zt-glass zt-depth mt-6 flex flex-col items-center rounded-3xl px-6 py-14 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/20 via-sky-500/20 to-violet-500/20">
        <Icon className="h-8 w-8 text-sky-600" />
      </span>
      <h2 className="mt-5 text-xl font-black text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

export default function ZivoTravelMyTrips() {
  const [tab, setTab] = useState<Extract<TripFilter, "upcoming" | "past">>("upcoming");
  const { user } = useAuth();
  const { data: trips = [], isLoading, isError } = useMyTrips(tab);

  return (
    <TravelUtilityShell
      eyebrow="Your travel"
      title="My Trips"
      icon={Luggage}
      subtitle="Your upcoming and past bookings — flights, hotels, cars and more — all in one place."
    >
      {/* Tabs */}
      <div className="zt-glass inline-flex rounded-2xl p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-xl px-5 py-2 text-sm font-bold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
              tab === t ? "bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500 text-white shadow" : "text-slate-600 hover:text-slate-900",
            )}
            aria-pressed={tab === t}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Trips / states */}
      {!user ? (
        <StateCard icon={LogIn} title="Sign in to see your trips">
          <p className="mt-2 max-w-md text-sm text-slate-600">Log in to view and manage your flights, hotels, and car bookings.</p>
          <Link
            to="/login?redirect=/my-trips"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          >
            <LogIn className="h-4 w-4" /> Log in
          </Link>
        </StateCard>
      ) : isLoading ? (
        <div className="mt-6 space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="zt-glass flex items-center gap-3 rounded-2xl p-4">
              <span className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-slate-900/5" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-900/5" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-900/5" />
              </div>
            </div>
          ))}
          <p className="flex items-center justify-center gap-2 pt-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your trips…
          </p>
        </div>
      ) : isError ? (
        <StateCard icon={AlertCircle} title="Couldn’t load your trips">
          <p className="mt-2 max-w-md text-sm text-slate-600">Something went wrong fetching your bookings. Please try again in a moment.</p>
        </StateCard>
      ) : trips.length === 0 ? (
        <StateCard icon={CalendarDays} title={`No ${tab} trips yet`}>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            {tab === "upcoming"
              ? "When you book a flight, hotel, or car, your trip will appear here with all the details."
              : "Your completed trips will be saved here so you can rebook your favorites in a tap."}
          </p>
          <Link
            to="/flights"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          >
            <Compass className="h-4 w-4" /> Plan a trip
          </Link>
        </StateCard>
      ) : (
        <div className="mt-6 space-y-3">
          {trips.map((order) => (
            <TripCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* Quick actions */}
      <h3 className="mb-3 mt-10 text-sm font-black uppercase tracking-[0.18em] text-slate-500">Start something new</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="zt-glass group flex items-center justify-between rounded-2xl px-4 py-4 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          >
            <span className="flex items-center gap-2.5">
              <a.icon className="h-5 w-5 text-sky-600" />
              <span className="font-bold text-slate-800">{a.label}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </TravelUtilityShell>
  );
}
