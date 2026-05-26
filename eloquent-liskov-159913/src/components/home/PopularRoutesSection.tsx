/**
 * Popular Routes Quick Search Section
 * Displays live Travelpayouts prices for trending flight routes
 */

import { useNavigate } from "react-router-dom";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Plane from "lucide-react/dist/esm/icons/plane";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Clock from "lucide-react/dist/esm/icons/clock";
import { motion } from "framer-motion";
import { useTravelpayoutsPopularRoutes, type TravelpayoutsRoutePrice } from "@/hooks/useTravelpayoutsPopularRoutes";
import { usePopularRoutePrices } from "@/hooks/usePopularRoutePrices";
import { format, parseISO } from "date-fns";

import miamiImg from "@/assets/destinations/miami.jpg";
import sfImg from "@/assets/destinations/san-francisco.jpg";
import atlantaImg from "@/assets/destinations/atlanta.jpg";
import denverImg from "@/assets/destinations/denver.jpg";
import vegasImg from "@/assets/destinations/las-vegas.jpg";
import fllImg from "@/assets/destinations/fort-lauderdale.jpg";

const ROUTE_META = [
  { from: "New York", fromCode: "JFK", to: "Miami", toCode: "MIA", image: miamiImg },
  { from: "Los Angeles", fromCode: "LAX", to: "San Francisco", toCode: "SFO", image: sfImg },
  { from: "Chicago", fromCode: "ORD", to: "Atlanta", toCode: "ATL", image: atlantaImg },
  { from: "Dallas", fromCode: "DFW", to: "Denver", toCode: "DEN", image: denverImg },
  { from: "Seattle", fromCode: "SEA", to: "Las Vegas", toCode: "LAS", image: vegasImg },
  { from: "Boston", fromCode: "BOS", to: "Fort Lauderdale", toCode: "FLL", image: fllImg },
];

// Airline code to name mapping for display
const AIRLINE_NAMES: Record<string, string> = {
  AA: "American Airlines", DL: "Delta Air Lines", UA: "United Airlines",
  B6: "JetBlue", WN: "Southwest", NK: "Spirit Airlines",
  F9: "Frontier Airlines", AS: "Alaska Airlines", HA: "Hawaiian Airlines",
  SY: "Sun Country", G4: "Allegiant Air",
};

export default function PopularRoutesSection() {
  const navigate = useNavigate();
  const { data: tpRoutes = [], isLoading: tpLoading } = useTravelpayoutsPopularRoutes();
  const { data: duffelRoutes, isLoading: duffelLoading } = usePopularRoutePrices();

  const isLoading = tpLoading && duffelLoading;
  const hasTpData = tpRoutes.length > 0;

  const handleRouteClick = (fromCode: string, toCode: string, departureDate?: string, returnDate?: string) => {
    const dep = departureDate || (() => {
      const d = new Date(); d.setDate(d.getDate() + 7);
      return d.toISOString().split("T")[0];
    })();
    const ret = returnDate || (() => {
      const d = new Date(); d.setDate(d.getDate() + 14);
      return d.toISOString().split("T")[0];
    })();
    navigate(
      `/flights/results?origin=${fromCode}&destination=${toCode}&departureDate=${dep}&returnDate=${ret}&adults=1&cabinClass=economy`
    );
  };

  const routes = ROUTE_META.map((meta) => {
    // Prefer Travelpayouts live data
    const tp = tpRoutes.find(
      (t) => t.origin === meta.fromCode && t.destination === meta.toCode
    );
    // Fallback to Duffel cached data
    const duffel = duffelRoutes?.find(
      (d) => d.origin_code === meta.fromCode && d.destination_code === meta.toCode
    );

    if (tp) {
      const depDate = tp.departureAt ? tp.departureAt.split("T")[0] : undefined;
      const retDate = tp.returnAt ? tp.returnAt.split("T")[0] : undefined;
      return {
        ...meta,
        price: tp.price,
        airline: AIRLINE_NAMES[tp.airline] || tp.airline,
        airlineCode: tp.airline,
        departureDate: depDate,
        returnDate: retDate,
        transfers: tp.transfers,
        duration: tp.duration,
        source: "travelpayouts" as const,
      };
    }

    if (duffel) {
      return {
        ...meta,
        price: Math.round(duffel.lowest_price),
        airline: duffel.airline_name || null,
        airlineCode: duffel.airline_code || null,
        departureDate: undefined,
        returnDate: undefined,
        transfers: null,
        duration: null,
        source: "duffel" as const,
      };
    }

    return {
      ...meta,
      price: null as number | null,
      airline: null as string | null,
      airlineCode: null as string | null,
      departureDate: undefined as string | undefined,
      returnDate: undefined as string | undefined,
      transfers: null as number | null,
      duration: null as number | null,
      source: null,
    };
  });

  const hasLive = routes.some((r) => r.price !== null);

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <section className="py-16 bg-muted/20" aria-label="Popular flight routes">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Popular Routes</h2>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full border flex items-center gap-1 ${
            hasLive
              ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
              : "text-primary bg-primary/10 border-primary/20"
          }`}>
            {isLoading ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Loading</>
            ) : hasLive ? (
              <><Sparkles className="w-3 h-3" /> Live Prices</>
            ) : (
              <><Sparkles className="w-3 h-3" /> Updating</>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {routes.map((route, i) => (
            <motion.div
              key={`${route.fromCode}-${route.toCode}`}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="cursor-pointer group"
              onClick={() => handleRouteClick(route.fromCode, route.toCode, route.departureDate, route.returnDate)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRouteClick(route.fromCode, route.toCode, route.departureDate, route.returnDate); }}
            >
              <div className="relative rounded-2xl overflow-hidden border border-border/30 hover:border-primary/40 hover:shadow-lg transition-all duration-300 active:scale-[0.97]">
                {/* Destination Image */}
                <div className="relative h-28">
                  <img
                    src={route.image}
	                    alt={route.to}
	                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
	                    loading="lazy"
	                    decoding="async"
	                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                  
                  {/* Route badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 border border-border/30">
                    <span className="font-bold text-[11px] text-foreground">{route.fromCode}</span>
                    <Plane className="w-2.5 h-2.5 text-primary rotate-45" />
                    <span className="font-bold text-[11px] text-foreground">{route.toCode}</span>
                  </div>

                  {/* Stops badge */}
                  {route.transfers !== null && (
                    <div className="absolute top-2.5 right-2.5 bg-background/80 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-border/30">
                      <span className="text-[9px] text-muted-foreground font-medium">
                        {route.transfers === 0 ? "Direct" : `${route.transfers} stop${route.transfers > 1 ? "s" : ""}`}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Info at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-[11px] text-muted-foreground truncate">
                    {route.from} → {route.to}
                  </p>

                  {/* Date & duration row */}
                  {(route.departureDate || route.duration) && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {route.departureDate && (
                        <span className="text-[9px] text-muted-foreground/80 flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {format(parseISO(route.departureDate), "MMM d")}
                          {route.returnDate && ` – ${format(parseISO(route.returnDate), "MMM d")}`}
                        </span>
                      )}
                      {route.duration && route.duration > 0 && (
                        <span className="text-[9px] text-muted-foreground/80 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDuration(route.duration)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-0.5">
                    {route.price !== null ? (
                      <span className="text-sm font-bold text-primary">
                        from ${route.price}*
                      </span>
                    ) : (
                      <div className="h-4 w-16 rounded bg-muted/50 animate-pulse" />
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground mt-4 text-center">
          {hasTpData
            ? "*Live prices from Travelpayouts. Final price confirmed at partner checkout."
            : hasLive
              ? "*Live prices from Duffel. Final price confirmed at partner checkout."
              : "*Prices loading. Final price confirmed at partner checkout."}
        </p>
      </div>
    </section>
  );
}
