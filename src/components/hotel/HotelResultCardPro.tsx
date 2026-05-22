import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Hotel, 
  Star, 
  MapPin,
  ExternalLink,
  Wifi,
  Car,
  Waves,
  Dumbbell,
  Utensils,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHotelRedirect } from "@/hooks/useAffiliateRedirect";

/**
 * PROFESSIONAL HOTEL RESULT CARD
 * With full affiliate deep link support
 */

interface HotelResultCardProProps {
  id: string;
  name: string;
  image?: string;
  address: string;
  city: string;
  rating: number;
  reviewCount: number;
  pricePerNight?: number;
  priceLevel?: string;
  amenities?: string[];
  freeCancellation?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onBook?: () => void;
  // Search context for deep links
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
}

export default function HotelResultCardPro({
  id,
  name,
  image,
  address,
  city,
  rating,
  reviewCount,
  pricePerNight,
  priceLevel,
  amenities = [],
  freeCancellation = true,
  isSelected,
  onSelect,
  onBook,
  destination,
  checkIn,
  checkOut,
  guests = 2,
  rooms = 1,
}: HotelResultCardProProps) {
  const { redirectWithParams, redirectSimple } = useHotelRedirect('hotel_result_card', 'result_card');

  const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi') || lower.includes('internet')) return <Wifi className="w-3 h-3" />;
    if (lower.includes('pool')) return <Waves className="w-3 h-3" />;
    if (lower.includes('gym') || lower.includes('fitness')) return <Dumbbell className="w-3 h-3" />;
    if (lower.includes('restaurant') || lower.includes('breakfast')) return <Utensils className="w-3 h-3" />;
    if (lower.includes('parking')) return <Car className="w-3 h-3" />;
    return null;
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 4.5) return { label: 'Exceptional', color: 'bg-emerald-500' };
    if (rating >= 4.0) return { label: 'Excellent', color: 'bg-emerald-500' };
    if (rating >= 3.5) return { label: 'Very Good', color: 'bg-sky-500' };
    if (rating >= 3.0) return { label: 'Good', color: 'bg-amber-500' };
    return { label: 'Fair', color: 'bg-muted-foreground' };
  };

  const ratingInfo = getRatingLabel(rating);

  const handleBookClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Use deep link if we have search context
    if (destination && checkIn && checkOut) {
      redirectWithParams({
        destination: destination || city,
        checkIn,
        checkOut,
        guests,
        rooms,
      });
    } else {
      redirectSimple();
    }
    
    onBook?.();
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200 cursor-pointer group",
        "hover:shadow-lg hover:shadow-amber-500/5 hover:border-amber-500/30",
        isSelected && "ring-2 ring-amber-500 border-amber-500/50"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="sm:w-56 h-40 sm:h-auto relative shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              {image ? (
                <img 
                  src={image} 
	                  alt={name}
	                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
	                  loading="lazy"
	                  decoding="async"
	                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Hotel className="w-12 h-12 text-amber-500/50" />
                </div>
              )}
            </div>
            {freeCancellation && (
              <Badge className="absolute top-3 left-3 bg-emerald-500/90 text-primary-foreground text-[10px] gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Free Cancellation
              </Badge>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg line-clamp-1 group-hover:text-amber-500 transition-all duration-200">
                      {name}
                    </h3>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span className="line-clamp-1">{address || city}</span>
                    </div>
                  </div>

                  {/* Rating Badge */}
                  <div className="flex flex-col items-end shrink-0">
                    <div className={cn(
                      "px-2 py-1 rounded text-primary-foreground font-bold text-sm",
                      ratingInfo.color
                    )}>
                      {rating.toFixed(1)}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{ratingInfo.label}</p>
                  </div>
                </div>

                {/* Reviews */}
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      className={cn(
                        "w-3.5 h-3.5",
                        i < Math.round(rating) 
                          ? "fill-amber-500 text-amber-500" 
                          : "text-muted-foreground/30"
                      )} 
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({reviewCount.toLocaleString()} reviews)
                  </span>
                </div>

                {/* Amenities */}
                {amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {amenities.slice(0, 5).map((amenity, idx) => {
                      const icon = getAmenityIcon(amenity);
                      return (
                        <Badge key={idx} variant="secondary" className="text-[10px] gap-1 py-0.5">
                          {icon}
                          {amenity}
                        </Badge>
                      );
                    })}
                    {amenities.length > 5 && (
                      <Badge variant="outline" className="text-[10px] py-0.5">
                        +{amenities.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Footer: Price & CTA */}
              <div className="flex items-end justify-between pt-3 border-t border-border/50 mt-auto">
                <div>
                  {pricePerNight ? (
                    <>
                      <p className="text-[10px] text-amber-500 font-medium uppercase tracking-wide">Estimated</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        ${pricePerNight}
                        <span className="text-sm font-normal text-muted-foreground">* /night</span>
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[120px] leading-tight">
                        Indicative price. Final price confirmed on partner checkout.
                      </p>
                    </>
                  ) : priceLevel ? (
                    <>
                      <p className="text-[10px] text-amber-500 font-medium">Estimated range</p>
                      <p className="text-lg font-bold text-amber-500">{priceLevel}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Final price on partner site
                      </p>
                    </>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <Button
                    onClick={handleBookClick}
                    className={cn(
                      "gap-2 font-semibold min-h-[44px] touch-manipulation active:scale-[0.98]",
                      "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
                      "shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
                    )}
                  >
                    Continue to secure booking
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <p className="text-[9px] text-muted-foreground text-right max-w-[140px] leading-tight">
                    Powered by licensed travel partners · Final price confirmed before payment
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
