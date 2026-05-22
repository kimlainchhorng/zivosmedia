/**
 * Hotel Multi-Provider Card
 * Shows multiple booking options per hotel with provider comparison
 */

import { useState } from "react";
import { Star, MapPin, Wifi, Car, Coffee, CheckCircle, ExternalLink, ChevronDown, ChevronUp, BadgeCheck, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useMultiProviderPricing, type ProviderPrice } from "@/hooks/useMultiProviderPricing";
import type { HotelCardData } from "./HotelResultCard";

interface HotelMultiProviderCardProps {
  hotel: HotelCardData;
  onSelectProvider: (hotel: HotelCardData, provider: ProviderPrice) => void;
  className?: string;
  defaultExpanded?: boolean;
}

const amenityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  parking: Car,
  breakfast: Coffee,
};

export function HotelMultiProviderCard({ 
  hotel, 
  onSelectProvider, 
  className,
  defaultExpanded = false 
}: HotelMultiProviderCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { getDisplay } = useCurrency();
  
  // Get multi-provider pricing
  const { providers, lowestPrice, savings, savingsPercent } = useMultiProviderPricing(
    hotel.pricePerNight,
    "USD",
    "hotels",
    hotel.id
  );

  const { formatted: formattedLowestPrice } = getDisplay(lowestPrice, "USD");
  const totalLowestPrice = lowestPrice * (hotel.nights || 1);
  const { formatted: formattedTotalPrice } = getDisplay(totalLowestPrice, "USD");

  const visibleProviders = isExpanded ? providers : providers.slice(0, 2);

  return (
    <Card className={cn(
      "overflow-hidden hover:shadow-lg transition-shadow border-border/50 bg-card/50",
      className
    )}>
      {/* Top badges */}
      {savingsPercent > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20">
          <Badge className="bg-emerald-500 text-primary-foreground text-[10px] gap-1">
            <Award className="w-3 h-3" /> Save up to {savingsPercent}%
          </Badge>
          <Badge className="bg-amber-500/20 text-amber-600 text-[10px] gap-1">
            {providers.length} booking options
          </Badge>
        </div>
      )}

      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
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

            {/* Best Price Summary */}
            <div className="flex items-end justify-between mt-4 pt-4 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-2xl font-bold text-hotels">{formattedLowestPrice}</p>
                <p className="text-xs text-muted-foreground">per night</p>
                {hotel.nights && hotel.nights > 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formattedTotalPrice} total for {hotel.nights} nights
                  </p>
                )}
              </div>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? (
                  <>Hide options <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>Compare {providers.length} sites <ChevronDown className="w-3 h-3" /></>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Multi-Provider Comparison Section */}
        <div className="border-t border-border/50 bg-muted/20">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Compare prices:
            </p>
            <div className="space-y-2">
              {visibleProviders.map((provider) => {
                const { formatted: providerPrice } = getDisplay(provider.price, "USD");
                const totalProviderPrice = provider.price * (hotel.nights || 1);
                const { formatted: formattedTotal } = getDisplay(totalProviderPrice, "USD");
                
                return (
                  <div 
                    key={provider.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all",
                      provider.isBestDeal 
                        ? "bg-emerald-500/10 border-emerald-500/30" 
                        : "bg-card border-border/50 hover:border-hotels/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {provider.name}
                          {provider.isBestDeal && (
                            <Badge className="bg-emerald-500 text-primary-foreground text-[9px] py-0 h-4">Best deal</Badge>
                          )}
                        </p>
                        {provider.discount && (
                          <p className="text-[10px] text-emerald-600">Save {provider.discount}%</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={cn(
                          "text-lg font-bold",
                          provider.isBestDeal ? "text-emerald-600" : "text-foreground"
                        )}>
                          {providerPrice}
                        </p>
                        <p className="text-[10px] text-muted-foreground">/night</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onSelectProvider(hotel, provider)}
                        className="gap-1 font-medium min-h-[36px] touch-manipulation bg-hotels hover:bg-hotels/90 text-primary-foreground"
                      >
                        Book with Provider
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show more button */}
            {providers.length > 2 && !isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="w-full mt-2 text-xs text-muted-foreground"
              >
                Show {providers.length - 2} more options
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="px-4 py-2.5 bg-muted/40 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Prices may change until booking is completed with the provider. ZIVO may earn a commission.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default HotelMultiProviderCard;
