/**
 * ZivoActionBubble — premium ZIVO card embedded in a chat message.
 *
 * Renders a flight / hotel / ride / eats / trip-bundle card. Tapping the
 * bubble navigates to the deep link inside the app, so a friend can share
 * "Bali next weekend" and you tap straight into the booking flow.
 */
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Car from "lucide-react/dist/esm/icons/car";
import Compass from "lucide-react/dist/esm/icons/compass";
import ShoppingCart from "lucide-react/dist/esm/icons/shopping-cart";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Forward from "lucide-react/dist/esm/icons/forward";
import Megaphone from "lucide-react/dist/esm/icons/megaphone";
import type { ComponentType, SVGProps } from "react";
import { useNavigate } from "react-router-dom";
import { openShareToChat } from "./ShareToChatSheet";

export type ZivoCardKind = "flight" | "hotel" | "eats" | "ride" | "trip" | "product" | "car" | "restaurant" | "activity" | "channel";

export interface ZivoCardPayload {
  kind: ZivoCardKind;
  title: string;
  subtitle?: string;
  meta?: string;
  image?: string | null;
  deepLink: string;
  /** "ZIVO" by default; brand can override. */
  badge?: string;
  /** When forwarded, includes original sender. */
  forwardedFrom?: string;
}

interface Props {
  payload: ZivoCardPayload;
  isMe: boolean;
  time: string;
}

const KIND_META: Record<ZivoCardKind, {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  gradient: string;
  cta: string;
}> = {
  flight:     { label: "Flight",       icon: Plane,         gradient: "from-sky-500 to-indigo-500",   cta: "View flight" },
  hotel:      { label: "Hotel",        icon: Hotel,         gradient: "from-emerald-500 to-teal-500",  cta: "View stay"   },
  eats:       { label: "Eats",         icon: UtensilsCrossed, gradient: "from-orange-500 to-rose-500", cta: "Order now"   },
  ride:       { label: "Ride",         icon: Car,           gradient: "from-violet-500 to-fuchsia-500", cta: "Book ride"  },
  trip:       { label: "Trip Bundle",  icon: Compass,       gradient: "from-amber-500 to-pink-500",    cta: "Open trip"   },
  product:    { label: "Grocery",      icon: ShoppingCart,  gradient: "from-green-500 to-emerald-600", cta: "Add to cart" },
  car:        { label: "Car Rental",   icon: Car,           gradient: "from-violet-500 to-fuchsia-500", cta: "View rental" },
  restaurant: { label: "Restaurant",   icon: UtensilsCrossed, gradient: "from-orange-500 to-rose-500", cta: "View booking" },
  activity:   { label: "Activity",     icon: Compass,       gradient: "from-amber-500 to-pink-500",    cta: "View activity" },
  channel:    { label: "Channel",      icon: Megaphone,     gradient: "from-blue-500 to-violet-500",   cta: "Open channel" },
};

export default function ZivoActionBubble({ payload, isMe, time }: Props) {
  const navigate = useNavigate();
  const meta = KIND_META[payload.kind] ?? KIND_META.trip;
  const Icon = meta.icon;

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className="relative flex flex-col gap-1 max-w-[80%] min-w-[240px]">
        {payload.forwardedFrom && (
          <span className={`text-[10px] font-semibold text-muted-foreground/60 ${isMe ? "text-right" : "text-left"}`}>
            ↳ Forwarded from {payload.forwardedFrom}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openShareToChat(payload); }}
          aria-label="Forward this card"
          className="absolute top-2 right-2 z-10 h-7 w-7 inline-flex items-center justify-center rounded-full bg-black/35 backdrop-blur text-white hover:bg-black/55 active:scale-90 transition"
        >
          <Forward className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => navigate(payload.deepLink)}
          className="group relative overflow-hidden rounded-2xl border border-border/30 bg-background shadow-sm hover:shadow-md transition active:scale-[0.99] text-left"
        >
          {/* Top media / gradient strip — image may arrive as either a URL
              string or a JSON object (legacy Booking-import shape). Coerce so
              we never end up with src="[object Object]". */}
          {(() => {
            const raw = payload.image as unknown;
            const imageUrl: string | null =
              typeof raw === "string" && raw.trim()
                ? raw
                : raw && typeof raw === "object"
                  ? ((raw as Record<string, unknown>).url
                      ?? (raw as Record<string, unknown>).src
                      ?? (raw as Record<string, unknown>).path
                      ?? null) as string | null
                  : null;
            return (
          <div className={`relative h-28 bg-gradient-to-br ${meta.gradient}`}>
            {imageUrl && (
              <img
                src={imageUrl}
	                alt=""
	                draggable={false}
	                className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:opacity-100 transition"
	                loading="lazy"
	                decoding="async"
	              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 text-[10px] font-bold uppercase tracking-wide text-foreground">
              <Icon className="w-3 h-3" />
              {meta.label}
            </div>
            <div className="absolute bottom-2.5 right-2.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-black/30 text-[9px] font-bold uppercase tracking-wider text-white">
              {payload.badge ?? "ZIVO"}
            </div>
          </div>
            );
          })()}

          {/* Body */}
          <div className="p-3">
            <p className="text-[14px] font-bold text-foreground leading-tight line-clamp-2">
              {payload.title}
            </p>
            {payload.subtitle && (
              <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">
                {payload.subtitle}
              </p>
            )}
            {payload.meta && (
              <p className="text-[11px] font-medium text-muted-foreground/80 mt-1.5">
                {payload.meta}
              </p>
            )}
            <div className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-bold text-primary">
              {meta.cta}
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>
        <span className={`text-[9px] mt-0.5 ${isMe ? "text-right text-muted-foreground/70" : "text-left text-muted-foreground/70"}`}>
          {time}
        </span>
      </div>
    </div>
  );
}
