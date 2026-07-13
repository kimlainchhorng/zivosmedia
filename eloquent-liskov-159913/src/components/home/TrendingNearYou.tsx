/**
 * "Trending Near You" — AI-personalized store recommendations on the Home Screen.
 * Shows stores ranked by user interest tags + boosted status.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Star from "lucide-react/dist/esm/icons/star";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Store from "lucide-react/dist/esm/icons/store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTrendingNearYou, type TrendingStore } from "@/hooks/useTrendingNearYou";

const categoryIcons: Record<string, string> = {
  food: "🍜",
  restaurant: "🍽️",
  cafe: "☕",
  car_wash: "🚗",
  beauty: "💅",
  grocery: "🛒",
  retail: "🛍️",
  health: "💊",
  fitness: "💪",
  services: "🔧",
};

export default function TrendingNearYou() {
  const navigate = useNavigate();
  const { data: stores = [], isLoading } = useTrendingNearYou(8);

  if (isLoading || stores.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative h-9 w-9 rounded-full bg-ig-gradient flex items-center justify-center shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-foreground ring-2 ring-background animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight leading-tight text-foreground">For You</h3>
            <p className="text-[10px] text-muted-foreground font-medium">Personalized for you</p>
          </div>
        </div>
        <button type="button"
          onClick={() => navigate("/store-map")}
          className="flex items-center gap-0.5 text-xs text-foreground font-semibold active:opacity-60 transition-opacity"
        >
          See all <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory">
        {stores.map((store, i) => (
          <TrendingCard key={store.store_id} store={store} index={i} />
        ))}
      </div>
    </div>
  );
}

// Lodging stores have a richer dedicated detail page; everything else falls
// through to the generic StoreProfilePage at /shop.
const LODGING_CATEGORIES = new Set(["resort", "hotel", "guesthouse", "hostel"]);
function targetForStore(store: TrendingStore): string {
  if (LODGING_CATEGORIES.has(store.category)) return `/hotel/${store.store_id}`;
  return `/shop/${store.store_id}`;
}

function TrendingCard({ store, index }: { store: TrendingStore; index: number }) {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(targetForStore(store))}
      className={cn(
        "shrink-0 w-[170px] rounded-lg border border-border bg-card overflow-hidden text-left snap-start",
        "active:bg-muted/40 transition-colors",
        "group relative"
      )}
    >
      {/* Featured ribbon — IG gradient pill */}
      {store.is_featured && (
        <div className="absolute top-2 left-2 z-10">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-ig-gradient text-white">
            <Star className="h-2.5 w-2.5 fill-current" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Boosted</span>
          </div>
        </div>
      )}

      {/* Store Logo / Cover */}
      <div className="relative w-full h-28 bg-muted flex items-center justify-center overflow-hidden">
        {store.logo_url ? (
          <img
            src={store.logo_url}
	            alt={store.store_name}
	            className="w-full h-full object-cover"
	            loading="lazy"
	            decoding="async"
	          />
        ) : (
          <Store className="h-10 w-10 text-muted-foreground/40" />
        )}
      </div>

      <div className="p-2.5 pt-2 space-y-1">
        <p className="text-[13px] font-semibold truncate leading-tight text-foreground">{store.store_name}</p>
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground capitalize font-medium truncate">
            {store.category?.replace(/_/g, " ") || "Local"}
          </span>
        </div>
        {store.relevance_score > 10 && (
          <div className="flex items-center gap-1 pt-1 border-t border-border">
            <TrendingUp className="h-3 w-3 text-foreground" />
            <span className="text-[9px] text-foreground font-bold uppercase tracking-wide">Popular pick</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}
