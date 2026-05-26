/**
 * FloatingProductCard — "Buy from [Shop] - Xkm away" overlay on Reels
 * Fires Meta InitiateCheckout on click
 */
import { motion } from "framer-motion";
import { ShoppingBag, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackInitiateCheckout } from "@/services/metaConversion";
import { toast } from "sonner";

interface CommerceLink {
  link_type: string;
  store_id?: string;
  store_product_id?: string;
  truck_sale_id?: string;
  checkout_path?: string;
  map_lat?: number;
  map_lng?: number;
  map_label?: string;
}

interface FloatingProductCardProps {
  commerceLink: CommerceLink;
  shopName: string;
  storeSlug?: string;
  postId: string;
  currentUserId?: string | null;
  userLat?: number | null;
  userLng?: number | null;
  onNavigate?: () => void;
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function FloatingProductCard({
  commerceLink,
  shopName,
  storeSlug,
  postId,
  currentUserId,
  userLat,
  userLng,
  onNavigate,
}: FloatingProductCardProps) {
  const navigate = useNavigate();

  const distanceLabel = (() => {
    if (userLat && userLng && commerceLink.map_lat && commerceLink.map_lng) {
      const km = getDistanceKm(userLat, userLng, commerceLink.map_lat, commerceLink.map_lng);
      return km < 1 ? `${Math.round(km * 1000)}m away` : `${km.toFixed(1)}km away`;
    }
    return null;
  })();

  const handleClick = async () => {
    const checkoutPath =
      commerceLink.checkout_path ||
      (commerceLink.link_type === "store_product" && commerceLink.store_product_id
        ? `/grocery/shop/${storeSlug || ""}?buy=${commerceLink.store_product_id}`
        : commerceLink.link_type === "truck_sale" && commerceLink.truck_sale_id
          ? `/marketplace?truckSale=${commerceLink.truck_sale_id}`
          : null);

    if (!checkoutPath) {
      toast.error("Checkout not configured for this product");
      return;
    }

    // Fire Meta InitiateCheckout immediately
    await trackInitiateCheckout({
      eventId: `reel-cart-${postId}-${Date.now()}`,
      externalId: currentUserId || undefined,
      sourceType: commerceLink.link_type,
      sourceTable: "social_reel_links",
      sourceId: postId,
      payload: {
        post_id: postId,
        store_product_id: commerceLink.store_product_id,
        truck_sale_id: commerceLink.truck_sale_id,
        shop_name: shopName,
      },
    });

    onNavigate?.();
    navigate(checkoutPath);
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.4, type: "spring" }}
      onClick={handleClick}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-primary/95 backdrop-blur-md text-primary-foreground shadow-xl border border-primary-foreground/10"
    >
      <ShoppingBag className="h-4 w-4 shrink-0" />
      <div className="text-left min-w-0">
        <p className="text-[12px] font-bold truncate leading-tight">
          Buy from {shopName}
        </p>
        {distanceLabel && (
          <p className="text-[10px] opacity-80 flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" />
            {distanceLabel}
          </p>
        )}
      </div>
    </motion.button>
  );
}
