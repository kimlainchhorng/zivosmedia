import { Star, MapPin, Wifi, Car, Coffee, CheckCircle, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";

export interface HotelCardData {
  id: string;
  name: string;
  area: string;
  imageUrl: string;
  starRating: number;
  guestRating: number;
  reviewCount: number;
  pricePerNight: number;
  totalPrice: number;
  nights: number;
  amenities: string[];
  freeCancellation: boolean;
  distanceFromCenter: number;
}

interface HotelResultCardProps {
  hotel: HotelCardData;
  onViewDeal: (hotel: HotelCardData) => void;
  className?: string;
}

const amenityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  parking: Car,
  breakfast: Coffee,
};

export function HotelResultCard({ hotel, onViewDeal, className }: HotelResultCardProps) {
  const { getDisplay } = useCurrency();
  const { formatted: pricePerNight } = getDisplay(hotel.pricePerNight, "USD");
  const { formatted: totalPrice } = getDisplay(hotel.totalPrice, "USD");

  return (
    <Card
      className={cn(
        "overflow-hidden hover:shadow-lg transition-shadow border-border/50 bg-card/50",
        className,
      )}
    >
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="relative w-full sm:w-48 h-48 sm:h-auto shrink-0">
            <img
              src={hotel.imageUrl}
	              alt={hotel.name}
	              className="w-full h-full object-cover"
	              loading="lazy"
	              decoding="async"
	            />
            {hotel.freeCancellation && (
              <Badge className="absolute top-2 left-2 bg-emerald-500/90 text-primary-foreground text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Free Cancellation
              </Badge>
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col">
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-lg leading-tight">{hotel.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <div className="flex">
                      {Array.from({ length: hotel.starRating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {hotel.area}
                    </span>
                  </div>
                </div>
              </div>

              {hotel.guestRating > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {hotel.guestRating.toFixed(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {hotel.reviewCount.toLocaleString()} reviews
                  </span>
                </div>
              )}

              {hotel.amenities?.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {hotel.amenities.slice(0, 4).map((a) => {
                    const Icon = amenityIcons[a.toLowerCase()];
                    return Icon ? (
                      <Icon key={a} className="w-4 h-4 text-muted-foreground" />
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div className="flex items-end justify-between mt-3 pt-3 border-t">
              <div>
                <div className="text-2xl font-bold">{pricePerNight}</div>
                <div className="text-xs text-muted-foreground">
                  per night · {totalPrice} total
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2.5"
                  aria-label="Share to chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    openShareToChat({
                      kind: "hotel",
                      title: hotel.name,
                      subtitle: hotel.area,
                      meta: `${pricePerNight}/night · ${hotel.nights}n`,
                      image: hotel.imageUrl,
                      deepLink: `/hotels`,
                    });
                  }}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
                <Button onClick={() => onViewDeal(hotel)} size="sm">
                  View Deal
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
