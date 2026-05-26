/**
 * CrossServiceCTAs — "What's next?" upsell banner stitching the verticals
 * together. After a flight booking, surface ride-to-airport and hotel-at-
 * destination. After a hotel booking, surface ride-from-airport and food.
 * After a restaurant reservation, offer a ride to the restaurant.
 *
 * Each CTA carries lightweight context to the target route via querystring
 * so the next funnel can pre-fill what it can.
 */
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Car from "lucide-react/dist/esm/icons/car";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Plane from "lucide-react/dist/esm/icons/plane";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import type { LucideIcon } from "lucide-react";

type Variant =
  | "after-flight"
  | "after-hotel"
  | "after-reservation"
  | "after-eats-order"
  | "after-ride";

interface CtaContext {
  destinationCity?: string;
  destinationAddress?: string;
  arrivalDate?: string;
  departureDate?: string;
  airportCode?: string;
  restaurantName?: string;
  restaurantId?: string;
  hotelName?: string;
  /** Ride drop-off address — used for after-ride contextual offers. */
  dropoffAddress?: string;
}

interface Props {
  variant: Variant;
  context?: CtaContext;
  className?: string;
  title?: string;
}

interface Item {
  label: string;
  sub: string;
  icon: LucideIcon;
  to: string;
  tone: string;
}

export default function CrossServiceCTAs({ variant, context = {}, className = "", title }: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const bundleActive = params.get("bundle") === "1";
  const rawItems = build(variant, context);
  const items = bundleActive ? rawItems.map((it) => ({ ...it, to: appendBundle(it.to) })) : rawItems;
  if (!items.length) return null;

  return (
    <div className={`rounded-2xl border border-border/50 bg-card p-4 ${className}`}>
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2.5">
        {title ?? "What's next?"}
      </div>
      <div className="flex flex-col gap-2">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(it.to)}
              className="group flex items-center gap-3 rounded-xl border border-border/40 bg-background p-3 text-left hover:bg-muted/40 transition-colors touch-manipulation"
            >
              <div className={`w-10 h-10 rounded-xl ${it.tone} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground truncate">{it.label}</div>
                <div className="text-[11px] text-muted-foreground truncate">{it.sub}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function appendBundle(to: string): string {
  if (to.includes("bundle=1")) return to;
  const sep = to.includes("?") ? "&" : "?";
  return `${to}${sep}bundle=1`;
}

function build(variant: Variant, ctx: CtaContext): Item[] {
  const qs = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  switch (variant) {
    case "after-flight":
      return [
        {
          label: "Book a ride to the airport",
          sub: ctx.airportCode ? `Pickup → ${ctx.airportCode}` : "Schedule pickup for departure",
          icon: Car,
          to: `/rides${qs({ dropoff: ctx.airportCode, when: ctx.departureDate })}`,
          tone: "bg-emerald-500/15 text-emerald-600",
        },
        {
          label: "Find a hotel at your destination",
          sub: ctx.destinationCity ? `Stays in ${ctx.destinationCity}` : "Browse partner hotels",
          icon: BedDouble,
          to: `/hotels${qs({ city: ctx.destinationCity, checkIn: ctx.arrivalDate })}`,
          tone: "bg-violet-500/15 text-violet-600",
        },
      ];

    case "after-hotel":
      return [
        {
          label: "Ride from the airport to your hotel",
          sub: ctx.hotelName ? `Drop-off at ${ctx.hotelName}` : "Skip the line — pre-book a car",
          icon: Car,
          to: `/rides${qs({ dropoff: ctx.hotelName ?? ctx.destinationAddress, when: ctx.arrivalDate })}`,
          tone: "bg-emerald-500/15 text-emerald-600",
        },
        {
          label: "Order food to your room",
          sub: "Browse local restaurants for delivery",
          icon: UtensilsCrossed,
          to: `/eats${qs({ deliverTo: ctx.hotelName ?? ctx.destinationAddress })}`,
          tone: "bg-orange-500/15 text-orange-600",
        },
      ];

    case "after-reservation":
      return [
        {
          label: "Get a ride to the restaurant",
          sub: ctx.restaurantName ? `Drop-off at ${ctx.restaurantName}` : "We'll get you there on time",
          icon: Car,
          to: `/rides${qs({ dropoff: ctx.restaurantName, when: ctx.arrivalDate })}`,
          tone: "bg-emerald-500/15 text-emerald-600",
        },
      ];

    case "after-eats-order":
      return [
        {
          label: "Reserve a table for next time",
          sub: ctx.restaurantName ?? "Skip the line — book a table",
          icon: UtensilsCrossed,
          to: `/eats/reserve${qs({ restaurantId: ctx.restaurantId, restaurantName: ctx.restaurantName })}`,
          tone: "bg-orange-500/15 text-orange-600",
        },
        {
          label: "Plan a getaway",
          sub: "Search flights & hotels",
          icon: Plane,
          to: "/flights",
          tone: "bg-sky-500/15 text-sky-600",
        },
      ];

    case "after-ride":
      return [
        {
          label: "Order food at this spot",
          sub: ctx.dropoffAddress ? `Near ${ctx.dropoffAddress}` : "Browse nearby restaurants",
          icon: UtensilsCrossed,
          to: `/eats${qs({ deliverTo: ctx.dropoffAddress })}`,
          tone: "bg-orange-500/15 text-orange-600",
        },
        {
          label: "Reserve a table next time",
          sub: ctx.dropoffAddress ?? "Skip the wait",
          icon: UtensilsCrossed,
          to: `/eats/reserve${qs({ restaurantName: ctx.dropoffAddress })}`,
          tone: "bg-orange-500/15 text-orange-600",
        },
        {
          label: "Save this place",
          sub: "Add to your network favorites",
          icon: Bookmark,
          to: `/saved${qs({ place: ctx.dropoffAddress })}`,
          tone: "bg-primary/15 text-primary",
        },
      ];
  }
}
