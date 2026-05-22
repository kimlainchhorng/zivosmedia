/**
 * QuickReorderWidget — surface the user's last delivered food order with a
 * one-tap "Order again" CTA. Pulls the most recent `delivered` row from
 * `food_orders` and resolves the restaurant for cover image + name.
 *
 * Hidden when the user has no delivery history.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface LastOrder {
  id: string;
  restaurantId: string;
  restaurantName: string;
  cover: string | null;
  totalDollars: number;
  daysAgo: number;
}

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=60&w=320";

export default function QuickReorderWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [last, setLast] = useState<LastOrder | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLast(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: order } = await supabase
        .from("food_orders")
        .select("id,total_amount,restaurant_id,created_at,updated_at")
        .eq("customer_id", user.id)
        .eq("status", "delivered")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || !order || !(order as any).restaurant_id) {
        if (!cancelled) setLast(null);
        return;
      }

      const { data: r } = await supabase
        .from("restaurants")
        .select("id,name,cover_image_url,logo_url")
        .eq("id", (order as any).restaurant_id)
        .maybeSingle();

      if (cancelled) return;

      const ref = new Date((order as any).updated_at ?? (order as any).created_at);
      const days = Math.max(0, Math.round((Date.now() - ref.getTime()) / 86_400_000));

      setLast({
        id: order.id,
        restaurantId: (order as any).restaurant_id,
        restaurantName: r?.name ?? "Last restaurant",
        cover: r?.cover_image_url ?? r?.logo_url ?? null,
        totalDollars: dollars((order as any).total_amount),
        daysAgo: days,
      });
    })().catch(() => {
      if (!cancelled) setLast(null);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!last) return null;

  return (
    <div className="px-4 pb-3">
      <motion.button
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.99 }}
        onClick={() =>
          navigate(`/eats/restaurant/${last.restaurantId}?reorderFrom=${last.id}`)
        }
        className="w-full rounded-3xl border border-orange-500/20 bg-card overflow-hidden text-left shadow-sm active:scale-[0.99] transition-transform touch-manipulation"
      >
        <div className="flex">
          <div className="relative w-24 h-24 shrink-0">
            <img
              src={last.cover ?? FALLBACK_COVER}
	              alt={last.restaurantName}
	              className="w-full h-full object-cover"
	              loading="lazy"
	              decoding="async"
	            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
            <div className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-full bg-black/55 backdrop-blur px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
              <UtensilsCrossed className="w-2.5 h-2.5" /> Eats
            </div>
          </div>
          <div className="flex-1 p-3 min-w-0 flex flex-col justify-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
              Order it again
            </div>
            <div className="text-sm font-bold text-foreground truncate">
              {last.restaurantName}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              ${last.totalDollars.toFixed(2)} ·{" "}
              {last.daysAgo === 0
                ? "today"
                : last.daysAgo === 1
                ? "1 day ago"
                : `${last.daysAgo} days ago`}
            </div>
          </div>
          <div className="flex items-center pr-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 text-white text-[11px] font-bold px-2.5 py-1.5">
              <RotateCcw className="w-3 h-3" /> Reorder
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </motion.button>
    </div>
  );
}

function dollars(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n > 1000 && Math.abs(n - Math.round(n)) < 0.001) return n / 100;
  return n;
}
