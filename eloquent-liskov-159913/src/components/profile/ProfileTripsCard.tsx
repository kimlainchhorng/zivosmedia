import { motion } from "framer-motion";
import { Plane, Hotel, Car, Bus, Ship, Briefcase, Compass, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TripBookingItem = {
  id: string;
  service_type: string;
  status: string;
  created_at: string;
};

const SERVICE_ICONS: Record<string, LucideIcon> = {
  flight: Plane,
  flights: Plane,
  hotel: Hotel,
  hotels: Hotel,
  lodging: Hotel,
  car: Car,
  cars: Car,
  ride: Car,
  bus: Bus,
  cruise: Ship,
  ship: Ship,
  package: Briefcase,
  tour: Compass,
};

const iconFor = (serviceType: string): LucideIcon => {
  const key = serviceType?.toLowerCase().trim() || "";
  return SERVICE_ICONS[key] ?? Compass;
};

const tintFor = (serviceType: string): string => {
  const key = serviceType?.toLowerCase().trim() || "";
  switch (key) {
    case "flight":
    case "flights":
      return "bg-sky-500/15 text-sky-500";
    case "hotel":
    case "hotels":
    case "lodging":
      return "bg-amber-500/15 text-amber-500";
    case "car":
    case "cars":
    case "ride":
      return "bg-emerald-500/15 text-emerald-500";
    case "bus":
      return "bg-orange-500/15 text-orange-500";
    case "cruise":
    case "ship":
      return "bg-blue-500/15 text-blue-500";
    case "package":
      return "bg-violet-500/15 text-violet-500";
    default:
      return "bg-primary/15 text-primary";
  }
};

const STATUS_TONE: Record<string, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-600",
  completed: "bg-emerald-500/15 text-emerald-600",
  paid: "bg-emerald-500/15 text-emerald-600",
  pending: "bg-amber-500/15 text-amber-600",
  awaiting: "bg-amber-500/15 text-amber-600",
  cancelled: "bg-destructive/15 text-destructive",
  failed: "bg-destructive/15 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

const toneFor = (status: string): string =>
  STATUS_TONE[status?.toLowerCase().trim() || ""] ?? "bg-muted text-muted-foreground";

const titleCase = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

const formatRelative = (iso: string): string => {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "";
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(day / 365)}y ago`;
};

type Props = {
  bookings: TripBookingItem[];
  loading?: boolean;
  limit?: number;
  onViewAll: () => void;
  onOpen: (booking: TripBookingItem) => void;
  className?: string;
};

const SkeletonRow = () => (
  <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/60 px-3 py-2.5">
    <div className="h-8 w-8 rounded-full bg-muted/70 animate-pulse" />
    <div className="flex-1 space-y-1.5">
      <div className="h-3 w-24 rounded bg-muted/70 animate-pulse" />
      <div className="h-2.5 w-16 rounded bg-muted/60 animate-pulse" />
    </div>
  </div>
);

const ProfileTripsCard = ({
  bookings,
  loading = false,
  limit = 2,
  onViewAll,
  onOpen,
  className,
}: Props) => {
  const items = bookings.slice(0, limit);

  return (
    <div
      className={cn(
        "mx-3 lg:mx-0 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-3 shadow-sm",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-bold tracking-tight text-foreground">Recent trips</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          View all <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-1.5">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : items.length === 0 ? (
        <button
          type="button"
          onClick={onViewAll}
          className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-border/60 bg-background/40 px-3 py-5 text-center transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <Compass className="h-5 w-5 text-muted-foreground" />
          <span className="text-[12px] font-semibold text-foreground">No trips yet</span>
          <span className="text-[11px] text-muted-foreground">Book your first ZIVO trip to see it here</span>
        </button>
      ) : (
        <ul className="space-y-1.5">
          {items.map((b) => {
            const Icon = iconFor(b.service_type);
            const tint = tintFor(b.service_type);
            const tone = toneFor(b.status);
            return (
              <li key={b.id}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onOpen(b)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-border/40 bg-background/60 px-3 py-2.5 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", tint)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-foreground">
                      {titleCase(b.service_type) || "Booking"}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {formatRelative(b.created_at)}
                    </span>
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", tone)}>
                    {titleCase(b.status) || "—"}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
                </motion.button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ProfileTripsCard;
