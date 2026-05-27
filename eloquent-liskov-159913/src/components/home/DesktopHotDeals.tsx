/**
 * DesktopHotDeals — Desktop-optimized Hot Deals section
 * Reuses the same data as mobile but with a grid layout for wide screens
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Flame from "lucide-react/dist/esm/icons/flame";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Plane from "lucide-react/dist/esm/icons/plane";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import { Badge } from "@/components/ui/badge";
import { useHotDeals } from "@/hooks/useHotDeals";
import { destinationPhotos } from "@/config/photos";

export default function DesktopHotDeals() {
  const navigate = useNavigate();
  const { data: hotDeals = [], isLoading } = useHotDeals();

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Flame className="w-6 h-6 text-orange-500" />
            Hot Deals
            <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-500 border-0">LIVE</Badge>
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[200px] rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (hotDeals.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Flame className="w-6 h-6 text-orange-500" />
          Hot Deals
          <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-500 border-0">LIVE</Badge>
        </h2>
        <button type="button"
          onClick={() => navigate("/flights")}
          className="text-sm text-primary font-semibold flex items-center gap-1 hover:gap-2 transition-all"
        >
          See all <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {hotDeals.slice(0, 8).map((deal, i) => {
          const destPhoto = destinationPhotos[deal.destinationKey as keyof typeof destinationPhotos];
          const formattedDate = new Date(deal.departureDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });

          return (
            <motion.button
              key={`${deal.originCode}-${deal.destinationCode}-${i}`}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() =>
                navigate(
                  `/flights/results?origin=${deal.originCode}&destination=${deal.destinationCode}&departureDate=${deal.departureDate}&adults=1&cabinClass=economy`
                )
              }
              className="rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 text-left group relative border border-border/20"
            >
              <div className="relative h-[200px] overflow-hidden">
                <img
                  src={destPhoto?.src || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600"}
	                  alt={deal.destination}
	                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
	                  loading="lazy"
	                  decoding="async"
	                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                {/* HOT DEAL badge */}
                <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full px-3 py-1 shadow-lg">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3 h-3" /> HOT DEAL
                  </span>
                </div>

                {/* Date */}
                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                  <span className="text-[10px] font-semibold text-white flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {formattedDate}
                  </span>
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{deal.destination}</div>
                      <div className="text-[11px] text-white/70 font-medium mt-0.5 flex items-center gap-1">
                        <Plane className="w-3 h-3" />
                        {deal.originCode} → {deal.destinationCode} · {deal.stops === 0 ? "Nonstop" : `${deal.stops} stop`} · {deal.duration}
                      </div>
                      {deal.airline && (
                        <div className="text-[10px] text-white/60 mt-0.5">{deal.airline}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white leading-none">${Math.round(deal.price)}</div>
                      <div className="text-[10px] text-white/60">one way</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
