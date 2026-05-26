/**
 * QuickReorderCarousel - Swipeable recent rides/food with one-tap rebook
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";
import Clock from "lucide-react/dist/esm/icons/clock";
import Star from "lucide-react/dist/esm/icons/star";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import useEmblaCarousel from "embla-carousel-react";

interface ReorderItem {
  id: string;
  type: "ride" | "food" | "flight" | "hotel";
  title: string;
  subtitle: string;
  price: string;
  timeAgo: string;
  rating?: number;
  rebookUrl: string;
}

const typeConfig = {
  ride: { icon: Car, color: "text-emerald-500", bg: "bg-emerald-500/10", accent: "emerald", vehicleImage: "/vehicles/economy-car-v2.png" },
  food: { icon: UtensilsCrossed, color: "text-orange-500", bg: "bg-orange-500/10", accent: "orange", vehicleImage: null },
  flight: { icon: Plane, color: "text-sky-500", bg: "bg-sky-500/10", accent: "sky", vehicleImage: null },
  hotel: { icon: Hotel, color: "text-amber-500", bg: "bg-amber-500/10", accent: "amber", vehicleImage: null },
};

// No demo data — only real bookings

export default function QuickReorderCarousel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [emblaRef] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  const queryKey = ["home-reorder", user?.id];

  useEffect(() => {
    if (!user?.id) return;

    const invalidateReorder = () => {
      void queryClient.invalidateQueries({ queryKey: ["home-reorder", user.id] });
    };

    const channel = supabase
      .channel(`home-reorder-${user.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips", filter: `rider_id=eq.${user.id}` },
        invalidateReorder,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "food_orders", filter: `customer_id=eq.${user.id}` },
        invalidateReorder,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "food_orders", filter: `user_id=eq.${user.id}` },
        invalidateReorder,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const { data: recentBookings } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user?.id) return [];

      const items: ReorderItem[] = [];

      // Recent rides
      const { data: rides } = await supabase
        .from("trips")
        .select("id, pickup_address, dropoff_address, fare_amount, created_at, rating")
        .eq("rider_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(3);

      rides?.forEach((r) => {
        items.push({
          id: r.id,
          type: "ride",
          title: `${(r.pickup_address || "Pickup").slice(0, 15)} → ${(r.dropoff_address || "Dropoff").slice(0, 15)}`,
          subtitle: `$${r.fare_amount?.toFixed(2) || "0"}`,
          price: `$${r.fare_amount?.toFixed(2) || "0"}`,
          timeAgo: formatDistanceToNow(new Date(r.created_at), { addSuffix: true }),
          rating: r.rating || undefined,
          rebookUrl: "/rides/hub",
        });
      });

      // Recent food orders
      const { data: orders } = await supabase
        .from("food_orders")
        .select("id, total_amount, items, restaurants(id, name), created_at")
        .or(`customer_id.eq.${user.id},user_id.eq.${user.id}`)
        .in("status", ["completed", "delivered"])
        .order("created_at", { ascending: false })
        .limit(3);

      orders?.forEach((o: any) => {
        const orderItems = Array.isArray(o.items) ? o.items.slice(0, 2).map((i: any) => i.name || "Item").join(", ") : "";
        items.push({
          id: o.id,
          type: "food",
          title: o.restaurants?.name || "Restaurant",
          subtitle: orderItems || "Order",
          price: `$${o.total_amount?.toFixed(2) || "0"}`,
          timeAgo: formatDistanceToNow(new Date(o.created_at), { addSuffix: true }),
          rebookUrl: `/eats/restaurant/${o.restaurants?.id || ""}`,
        });
      });

      return items.sort((a, b) => 0).slice(0, 6);
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const items = recentBookings || [];

  // No data — hide widget entirely
  if (!items.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
            <RotateCcw className="w-3.5 h-3.5 text-foreground" strokeWidth={1.8} />
          </div>
          Quick Rebook
          <Badge variant="secondary" className="text-[9px] font-bold bg-primary/10 text-primary border-0 px-1.5 py-0">
            1-Tap
          </Badge>
        </h2>
        <button type="button" onClick={() => navigate("/trips")} className="text-xs text-primary font-bold touch-manipulation active:scale-95 min-w-[44px] min-h-[32px] flex items-center gap-0.5 hover:gap-1.5 transition-all">
          History <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {items.map((item, i) => {
            const cfg = typeConfig[item.type];
            const Icon = cfg.icon;

            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(item.rebookUrl)}
                className="flex-[0_0_75%] sm:flex-[0_0_45%] min-w-0 rounded-2xl bg-card/90 backdrop-blur-sm border border-border/40 p-4 shadow-sm hover:shadow-lg transition-all duration-300 touch-manipulation text-left relative overflow-hidden group"
              >
                {/* Rebook badge */}
                <div className="absolute top-3 right-3">
                  <div className={`${cfg.bg} rounded-full p-1.5 shadow-sm group-active:scale-90 transition-transform`}>
                    <RotateCcw className={`w-3 h-3 ${cfg.color}`} />
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center border border-border/30 overflow-hidden`}>
                    {cfg.vehicleImage ? (
	                      <img src={cfg.vehicleImage} alt={item.type} className="w-8 h-8 object-contain" loading="lazy" decoding="async" />
                    ) : (
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{item.price}</span>
                  <div className="flex items-center gap-2">
                    {item.rating && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-bold">
                        <Star className="w-2.5 h-2.5 fill-amber-500" /> {item.rating}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" /> {item.timeAgo}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
