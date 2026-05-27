/**
 * Premium Hotel Result Card
 * Optimized for conversion with clear CTA
 */

import { Star, MapPin, Wifi, Car, Coffee, CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/contexts/CurrencyContext";
import { SmartImage } from "@/components/shared/SmartImage";

export interface HotelResult {
  id: string;
  name: string;
  area: string;
  imageUrl: string;
  starRating: number;
  guestRating: number;
  reviewCount: number;
  pricePerNight: number;
  amenities: string[];
  freeCancellation: boolean;
  distanceFromCenter: number;
}

interface HotelResultCardProps {
  hotel: HotelResult;
  onViewDeal: (hotel: HotelResult) => void;
}

const amenityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  parking: Car,
  breakfast: Coffee,
};

export default function HotelResultCard({ hotel, onViewDeal }: HotelResultCardProps) {
  const { format, getDisplay } = useCurrency();
  const { formatted: nightlyPrice, wasConverted } = getDisplay(hotel.pricePerNight, "USD");
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 rounded-2xl hover:border-amber-500/30 hover:-translate-y-0.5 active:scale-[0.995] touch-manipulation">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative w-full sm:w-48 h-48 sm:h-auto shrink-0">
            <SmartImage
              src={hotel.imageUrl}
              alt={hotel.name}
              className="w-full h-full object-cover"
              size={480}
            />
            {hotel.freeCancellation && (
              <Badge className="absolute top-2 left-2 bg-emerald-500/90 text-primary-foreground text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Free Cancellation
              </Badge>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 flex flex-col">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-lg leading-tight">{hotel.name}</h3>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">via Booking Partner</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <div className="flex">
                      {Array.from({ length: hotel.starRating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs">•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {hotel.area}
                    </span>
                  </div>
                </div>
                
                {/* Rating */}
                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-hotels/10">
                    <span className="font-bold text-hotels">{hotel.guestRating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">/ 10</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{hotel.reviewCount.toLocaleString()} reviews</p>
                </div>
              </div>

              {/* Amenities */}
              <div className="flex flex-wrap gap-2 mt-3">
                {hotel.amenities.slice(0, 3).map((amenity) => {
                  const Icon = amenityIcons[amenity];
                  return (
                    <span
                      key={amenity}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded"
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      {amenity.charAt(0).toUpperCase() + amenity.slice(1)}
                    </span>
                  );
                })}
                {hotel.distanceFromCenter && (
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                    {hotel.distanceFromCenter} km from center
                  </span>
                )}
              </div>
            </div>

            {/* Price & CTA */}
            <div className="flex items-end justify-between mt-4 pt-4 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-2xl font-bold text-hotels">{nightlyPrice}</p>
                <p className="text-xs text-muted-foreground">per night*</p>
                {wasConverted && (
                  <p className="text-[9px] text-muted-foreground/70">Converted from USD</p>
                )}
              </div>
              <Button 
                onClick={() => onViewDeal(hotel)}
                className="bg-hotels hover:bg-hotels/90 text-primary-foreground font-semibold gap-2 rounded-xl min-h-[44px] touch-manipulation active:scale-[0.97] transition-all duration-200 shadow-md shadow-hotels/20"
              >
                Book with Provider
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5 text-right">
              Prices may change until booking is completed.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
