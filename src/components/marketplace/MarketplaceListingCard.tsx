/**
 * MarketplaceListingCard — Facebook-Marketplace-style item tile.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import Tag from "lucide-react/dist/esm/icons/tag";
import MapPin from "lucide-react/dist/esm/icons/map-pin";

export interface ListingData {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  condition?: string;
  images?: string[];
  location?: string | null;
  status: string;
}

interface Props {
  listing: ListingData;
  onTap?: (id: string) => void;
}

export default function MarketplaceListingCard({ listing, onTap }: Props) {
  const fmt = useMemo(
    () => new Intl.NumberFormat(undefined, { style: "currency", currency: listing.currency }).format(listing.price_cents / 100),
    [listing.currency, listing.price_cents],
  );
  const cover = listing.images?.[0];
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onTap?.(listing.id)}
      className="block w-full rounded-2xl overflow-hidden bg-card border border-border/40 hover:shadow-lg transition text-left"
    >
      <div className="aspect-square bg-muted relative">
        {cover ? (
	          <img src={cover} alt={listing.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex items-center justify-center h-full text-3xl">📦</div>
        )}
        {listing.status === "sold" && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold uppercase">Sold</span>
        )}
        {listing.condition && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-card/90 text-[10px] font-semibold backdrop-blur-sm">
            <Tag className="w-2.5 h-2.5" />
            {listing.condition.replace("_", " ")}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-base font-bold tabular-nums">{fmt}</p>
        <p className="text-sm text-foreground line-clamp-1">{listing.title}</p>
        {listing.location && (
          <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5">
            <MapPin className="w-3 h-3" />
            {listing.location}
          </p>
        )}
      </div>
    </motion.button>
  );
}
