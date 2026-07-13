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
    <div className="px-4 pb-3 space-y-2">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate("/network")}
        className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left active:bg-muted/50 transition-colors touch-manipulation"
      >
        <div className="relative w-11 h-11 rounded-full bg-muted flex items-center justify-center">
          <BadgeCheck className="w-5 h-5 text-foreground" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ig-gradient">
              ZIVO Network
            </span>
            <UtensilsCrossed className="w-3 h-3 text-muted-foreground" />
            <BedDouble className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="text-sm font-semibold text-foreground truncate">
            Every place here books in-app
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            Browse partner restaurants & hotels — order, reserve, or stay in one tap.
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-foreground shrink-0" />
      </motion.button>

      {savedCount > 0 && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/network/saved")}
          className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-2.5 text-left active:bg-muted/50 transition-colors touch-manipulation"
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
