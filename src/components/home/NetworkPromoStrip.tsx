/**
 * NetworkPromoStrip — compact teaser routing to /network.
 * Says, in one strip, "every place here books in-app." Sets up the partner
 * narrative without taking the home over.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import BadgeCheck from "lucide-react/dist/esm/icons/badge-check";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import Heart from "lucide-react/dist/esm/icons/heart";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import { useNetworkFavorites } from "@/hooks/useNetworkFavorites";

export default function NetworkPromoStrip() {
  const navigate = useNavigate();
  const restaurantFavs = useNetworkFavorites("restaurant");
  const hotelFavs = useNetworkFavorites("hotel");
  const savedCount = restaurantFavs.favorites.size + hotelFavs.favorites.size;

  return (
    <div className="space-y-3 px-4 pb-4 sm:px-5">
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate("/network")}
        className="flex w-full items-center gap-3 rounded-[24px] border border-border/40 bg-card p-4 text-left shadow-[0_16px_40px_-30px_rgba(15,23,42,0.4)] transition-colors touch-manipulation active:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BadgeCheck className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-primary">
              ZIVO Network
            </span>
            <UtensilsCrossed className="w-3 h-3 text-muted-foreground" />
            <BedDouble className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="text-sm font-bold leading-snug text-foreground">
            Every place here books in-app
          </div>
          <div className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            Browse partner restaurants & hotels — order, reserve, or stay in one tap.
          </div>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60 text-foreground">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </motion.button>

      {savedCount > 0 && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/network/saved")}
          className="flex w-full items-center gap-3 rounded-[20px] border border-border/40 bg-card p-3 text-left shadow-sm transition-colors touch-manipulation active:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <Heart className="w-4 h-4 text-destructive fill-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-foreground">
              Your saved places ({savedCount})
            </div>
            <div className="text-[11px] text-muted-foreground">
              One-tap reorder, rebook, or ride here.
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </motion.button>
      )}
    </div>
  );
}
