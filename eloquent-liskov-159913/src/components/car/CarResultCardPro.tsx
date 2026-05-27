import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  Users,
  Briefcase,
  Fuel,
  Gauge,
  ExternalLink,
  CheckCircle2,
  Snowflake,
  Cog,
  CarFront,
  Truck,
  Crown,
  Bus,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCarRedirect } from "@/hooks/useAffiliateRedirect";

/**
 * PROFESSIONAL CAR RENTAL RESULT CARD
 * With full affiliate deep link support
 */

interface CarResultCardProProps {
  id: string;
  category: string;
  name?: string;
  image?: string;
  provider?: string;
  passengers: number;
  bags: number;
  transmission: 'Automatic' | 'Manual';
  hasAC: boolean;
  fuelPolicy?: string;
  mileage?: string;
  pricePerDay: number;
  totalPrice?: number;
  daysCount?: number;
  freeCancellation?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onBook?: () => void;
  // Search context for deep links
  pickupLocation?: string;
  pickupDate?: string;
  returnDate?: string;
  pickupTime?: string;
  returnTime?: string;
  driverAge?: number;
}

export default function CarResultCardPro({
  id,
  category,
  name,
  image,
  provider,
  passengers,
  bags,
  transmission,
  hasAC,
  fuelPolicy,
  mileage = 'Unlimited',
  pricePerDay,
  totalPrice,
  daysCount,
  freeCancellation = true,
  isSelected,
  onSelect,
  onBook,
  pickupLocation,
  pickupDate,
  returnDate,
  pickupTime,
  returnTime,
  driverAge = 25,
}: CarResultCardProProps) {
  const { redirectWithParams, redirectSimple } = useCarRedirect('car_result_card', 'result_card');

  // Category to icon mapping
  const categoryIcons: Record<string, LucideIcon> = {
    'Economy': Car,
    'Compact': Car,
    'SUV': Truck,
    'Luxury': Crown,
    'Van': Bus,
    'Convertible': Crown,
    'Midsize': Car,
    'Full-size': CarFront,
  };
  const FallbackIcon = categoryIcons[category] || Car;

  const handleBookClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Use deep link if we have search context
    if (pickupLocation && pickupDate && returnDate) {
      redirectWithParams({
        pickupLocation,
        pickupDate,
        returnDate,
        pickupTime,
        returnTime,
        driverAge,
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
        "hover:shadow-lg hover:shadow-violet-500/5 hover:border-violet-500/30",
        isSelected && "ring-2 ring-violet-500 border-violet-500/50"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Vehicle Image */}
          <div className="sm:w-52 h-36 sm:h-auto relative shrink-0 bg-secondary">
            {image ? (
              <img 
                src={image} 
	                alt={name || category}
	                className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-110"
	                loading="lazy"
	                decoding="async"
	              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-secondary">
                  <FallbackIcon className="w-10 h-10 text-foreground" />
                </div>
              </div>
            )}
            <Badge className="absolute top-3 left-3 bg-foreground text-primary-foreground text-[10px]">
              {category}
            </Badge>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-base sm:text-lg line-clamp-1 group-hover:text-foreground transition-all duration-200">
                    {name || `${category} Car`}
                  </h3>
                  {provider && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {provider}
                    </p>
                  )}
                </div>
                {freeCancellation && (
                  <Badge className="bg-emerald-500/20 text-emerald-500 border-0 text-[10px] gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    Free Cancel
                  </Badge>
                )}
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                    <Users className="w-4 h-4 text-foreground" />
                  </div>
                  <span className="text-xs">{passengers} seats</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-foreground" />
                  </div>
                  <span className="text-xs">{bags} bags</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                    <Cog className="w-4 h-4 text-foreground" />
                  </div>
                  <span className="text-xs">{transmission}</span>
                </div>
                {hasAC && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                      <Snowflake className="w-4 h-4 text-foreground" />
                    </div>
                    <span className="text-xs">A/C</span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Gauge className="w-3 h-3" />
                  {mileage} miles
                </Badge>
                {fuelPolicy && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Fuel className="w-3 h-3" />
                    {fuelPolicy}
                  </Badge>
                )}
              </div>

              {/* Footer: Price & CTA */}
              <div className="flex items-end justify-between pt-3 border-t border-border/50 mt-auto">
                <div>
                  <p className="text-[10px] text-foreground font-medium uppercase tracking-wide">Estimated</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-xl sm:text-2xl font-bold">${pricePerDay}</p>
                    <span className="text-sm text-muted-foreground">* /day</span>
                  </div>
                  {totalPrice && daysCount && (
                    <p className="text-xs text-muted-foreground">
                      ~${totalPrice} total for {daysCount} days
                    </p>
                  )}
                  <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[120px] leading-tight">
                    Indicative price. Final price confirmed on partner checkout.
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <Button
                    onClick={handleBookClick}
                    className={cn(
                      "gap-2 font-semibold min-h-[44px] touch-manipulation active:scale-[0.98]",
                      "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
                      "shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
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

        {/* Legal disclaimer */}
        <div className="px-4 py-2 bg-muted/40 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Hizovo does not issue tickets. Payment and booking fulfillment are handled by licensed travel partners.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
