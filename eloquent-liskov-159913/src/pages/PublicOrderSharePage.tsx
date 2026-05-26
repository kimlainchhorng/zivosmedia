/**
 * PublicOrderSharePage — read-only Eats order tracker accessible without auth.
 *
 * Mounted at /share/order/:orderId. Symmetric counterpart to the trip share
 * page. Polls every 8s, shows progress + restaurant + ETA, and auto-expires
 * 30 minutes after the order is delivered so the link doesn't keep
 * advertising the customer's delivery address.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Truck from "lucide-react/dist/esm/icons/truck";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Clock from "lucide-react/dist/esm/icons/clock";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { useShareWatchlist } from "@/hooks/useShareWatchlist";

interface PublicOrder {
  id: string;
  status: string | null;
  restaurant_name: string | null;
  delivery_address_short: string | null;
  eta_minutes: number | null;
  updated_at: string | null;
}

const PROGRESS: Record<string, number> = {
  pending: 8,
  confirmed: 18,
  preparing: 38,
  ready: 60,
  picked_up: 75,
  out_for_delivery: 88,
  delivered: 100,
  cancelled: 0,
};

const LABELS: Record<string, string> = {
  pending: "Order placed",
  confirmed: "Restaurant confirmed",
  preparing: "Preparing your food",
  ready: "Ready for pickup",
  picked_up: "Driver has the order",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Order cancelled",
};

const SHARE_TTL_AFTER_DELIVERY_MS = 30 * 60_000;

export default function PublicOrderSharePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const watchlist = useShareWatchlist();

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      const { data, error: err } = await supabase
        .from("food_orders")
        .select("id,status,delivery_address,eta_minutes,restaurant_id,updated_at")
        .eq("id", orderId)
        .maybeSingle();

      if (err || !data) {
        if (!cancelled) {
          setError("Order not found or no longer viewable.");
          setLoading(false);
        }
        return;
      }

      let restaurantName: string | null = null;
      if ((data as any).restaurant_id) {
        const { data: r } = await supabase
          .from("restaurants")
          .select("name")
          .eq("id", (data as any).restaurant_id)
          .maybeSingle();
        if (r) restaurantName = r.name;
      }

      if (!cancelled) {
        const addr = (data as any).delivery_address as string | null;
        // Only show the city / general area, not the full address.
        const short = addr ? shortenAddress(addr) : null;
        setOrder({
          id: data.id,
          status: data.status,
          restaurant_name: restaurantName,
          delivery_address_short: short,
          eta_minutes: (data as any).eta_minutes ?? null,
          updated_at: (data as any).updated_at ?? null,
        });
        setLoading(false);
      }
    };

    load();
    const channel = supabase
      .channel(`share-order:${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "food_orders", filter: `id=eq.${orderId}` },
        () => load(),
      )
      .subscribe();
    timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading && !order) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
        <div className="rounded-2xl border border-border/50 p-6 text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-bold text-foreground">Order not available</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error ?? "This share link may have expired."}
          </p>
        </div>
      </div>
    );
  }

  const progress = PROGRESS[order.status ?? ""] ?? 0;
  const label = LABELS[order.status ?? ""] ?? "Tracking order";
  const isDelivered = order.status === "delivered";
  const isCancelled = order.status === "cancelled";

  const deliveredAt = isDelivered && order.updated_at ? new Date(order.updated_at).getTime() : null;
  const isExpired = !!deliveredAt && Date.now() - deliveredAt > SHARE_TTL_AFTER_DELIVERY_MS;
  if (isExpired) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
        <div className="rounded-2xl border border-border/50 p-6 text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-foreground">Order delivered</p>
          <p className="text-xs text-muted-foreground mt-1">
            This share link has automatically expired. Ask the customer for a new link if you'd
            like to track another order.
          </p>
        </div>
      </div>
    );
  }

  const ogTitle = `Live ZIVO order · ${label}`;
  const ogDescription = order.restaurant_name
    ? `From ${order.restaurant_name}${
        order.eta_minutes && order.eta_minutes > 0 ? ` · ETA ${order.eta_minutes} min` : ""
      }`
    : `Following a food order live on ZIVO.`;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-orange-500/10 via-background to-background">
      <SEOHead
        title={ogTitle}
        description={ogDescription}
        canonical={`/share/order/${order.id}`}
        ogImage="/og-eats.jpg"
        appLink={`zivo://share/order/${order.id}`}
      />
      <header className="pt-safe">
        <div className="max-w-screen-sm mx-auto px-5 pt-6 pb-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-orange-600">
            Shared by ZIVO
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mt-0.5">Live order</h1>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 pt-3 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-orange-500/20 bg-card p-5 shadow-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/15 text-orange-600 flex items-center justify-center">
              {order.status === "out_for_delivery" || order.status === "picked_up" ? (
                <Truck className="w-6 h-6" />
              ) : (
                <UtensilsCrossed className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
                Status
              </div>
              <div className="text-base font-extrabold text-foreground">{label}</div>
            </div>
            {!isDelivered && !isCancelled && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-orange-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-60 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
                LIVE
              </div>
            )}
          </div>

          <Progress value={progress} className="h-2 mb-4" />

          <div className="space-y-3">
            {order.restaurant_name && (
              <Row
                icon={<UtensilsCrossed className="w-4 h-4 text-orange-600" />}
                label="From"
                value={order.restaurant_name}
              />
            )}
            {order.delivery_address_short && (
              <Row
                icon={<MapPin className="w-4 h-4 text-foreground" />}
                label="Delivering to"
                value={order.delivery_address_short}
              />
            )}
            {order.eta_minutes != null && order.eta_minutes > 0 && !isDelivered && (
              <Row
                icon={<Clock className="w-4 h-4 text-foreground" />}
                label="ETA"
                value={`${order.eta_minutes} min`}
              />
            )}
          </div>
        </motion.div>

        {orderId && (
          <button type="button"
            onClick={() => {
              if (watchlist.has("order", orderId)) watchlist.remove("order", orderId);
              else watchlist.add("order", orderId, order.restaurant_name ?? null);
            }}
            className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.99] transition-transform touch-manipulation ${
              watchlist.has("order", orderId)
                ? "border-orange-500/40 bg-orange-500/10"
                : "border-border/50 bg-card hover:bg-muted/40"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-600 flex items-center justify-center">
              👁️
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                {watchlist.has("order", orderId) ? "Tracking" : "Track this"}
              </div>
              <div className="text-[12px] font-bold text-foreground">
                {watchlist.has("order", orderId)
                  ? "Saved to your watchlist — tap to remove"
                  : "Save this link to /share/with-me to check back later"}
              </div>
            </div>
          </button>
        )}

        <div className="rounded-2xl border border-border/40 bg-card/80 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-[11px] text-muted-foreground">
            Public read-only view. We only show the general delivery area, not the exact address.
            The customer can stop sharing at any time.
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-2">
          <Clock className="w-3 h-3" /> Updates live as the order changes
        </div>
      </main>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-bold text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}

function shortenAddress(addr: string): string {
  // Keep neighborhood / city, drop the street number to protect privacy.
  // Heuristic: split on commas, drop the first chunk if it starts with digits.
  const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const tail = parts.slice(/^\d/.test(parts[0]) ? 1 : 0).join(", ");
  return tail || parts[parts.length - 1];
}
