/**
 * Ramp-Style Car Rental Result Card
 * Production-ready, high-conversion design with always-visible pricing
 * Legally compliant with partner disclosures
 */

import { Users, Briefcase, Snowflake, Cog, ExternalLink, CheckCircle, Shield, Fuel, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { brandedCarModels } from "@/config/photos";
import type { BrandedCarModel } from "@/config/photos";
import { useMemo } from "react";

export interface RampCarCardData {
  id: string;
  category: string;
  company: string;
  companyLogo?: string;
  seats: number | string;
  bags: number | string;
  transmission: "Automatic" | "Manual";
  hasAC: boolean;
  pricePerDay: number;
  totalPrice: number;
  days: number;
  features: string[];
  mileage?: string;
  fuelPolicy?: string;
  freeCancellation?: boolean;
  theftProtection?: boolean;
  isBestDeal?: boolean;
}

interface RampCarCardProps {
  car: RampCarCardData;
  onViewDeal: (car: RampCarCardData) => void;
  className?: string;
}

// Map car categories to brandedCarModels categories
const categoryMapping: Record<string, string[]> = {
  economy: ["compact", "economy"],
  compact: ["compact"],
  midsize: ["midsize", "sedan"],
  fullsize: ["sedan", "luxury"],
  suv: ["suv"],
  luxury: ["luxury", "exotic"],
  electric: ["electric"],
  van: ["van", "minivan"],
  convertible: ["luxury", "exotic"],
  premium: ["luxury"],
  minivan: ["van", "minivan"],
};

function getBrandedCarForCategory(category: string, index: number = 0): BrandedCarModel | null {
  const categoryKey = category.toLowerCase().split(" ")[0];
  const mappedCategories = categoryMapping[categoryKey] || [categoryKey];
  
  const matchingCars = brandedCarModels.filter(car => 
    mappedCategories.includes(car.category)
  );
  
  if (matchingCars.length === 0) return null;
  return matchingCars[index % matchingCars.length];
}

export function RampCarCard({ car, onViewDeal, className }: RampCarCardProps) {
  const { getDisplay } = useCurrency();
  
  const brandedCar = useMemo(() => {
    const hash = car.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return getBrandedCarForCategory(car.category, hash);
  }, [car.id, car.category]);
  
  const { formatted: dailyPrice } = getDisplay(car.pricePerDay, "USD");
  const { formatted: totalPriceFormatted } = getDisplay(car.totalPrice, "USD");

  // Determine if theft protection is available from car data
  const hasTheftProtection = car.theftProtection || car.features.some(f => 
    f.toLowerCase().includes("theft") || f.toLowerCase().includes("protection")
  );

  return (
    <div
      className={cn(
        "bg-card rounded-2xl border border-border/60",
        "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]",
        "transition-all duration-200 ease-out",
        "overflow-hidden group",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {/* LEFT: Image & Category */}
        <div className="sm:w-56 h-44 sm:h-auto bg-muted/30 flex flex-col items-center justify-center p-6 relative">
          {/* Best Deal Badge */}
          {car.isBestDeal && (
            <Badge className="absolute top-3 left-3 bg-emerald-500 text-primary-foreground border-0 text-[10px] font-semibold shadow-sm">
              Best Deal
            </Badge>
          )}
          
          {/* Car Image */}
          {brandedCar ? (
            <img
              src={brandedCar.src}
	              alt={`${car.category} rental car`}
	              className="w-full h-full object-contain max-h-32 group-hover:scale-110 transition-transform duration-200"
	              loading="lazy"
	              decoding="async"
	            />
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 flex items-center justify-center">
              <Car className="w-12 h-12 text-emerald-500" />
            </div>
          )}
          
          {/* Supplier name */}
          <span className="absolute bottom-3 left-3 text-[11px] text-muted-foreground font-medium bg-background/80 px-2 py-0.5 rounded">
            {car.company}
          </span>
        </div>

        {/* CENTER: Details */}
        <div className="flex-1 p-5 sm:p-6">
          {/* Category + "or similar" */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg text-foreground">{car.category}</h3>
            <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-border/60">
              or similar
            </Badge>
          </div>
          
          {/* Branded model name (if available) */}
          {brandedCar && (
            <p className="text-sm text-muted-foreground mb-3">
              {brandedCar.brand} {brandedCar.model}
            </p>
          )}

          {/* Specs Row with Icons */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5" title="Seats">
              <Users className="w-4 h-4" />
              <span>{car.seats}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Bags">
              <Briefcase className="w-4 h-4" />
              <span>{car.bags}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Transmission">
              <Cog className="w-4 h-4" />
              <span>{car.transmission}</span>
            </div>
            {car.hasAC && (
              <div className="flex items-center gap-1.5" title="Air Conditioning">
                <Snowflake className="w-4 h-4" />
                <span>A/C</span>
              </div>
            )}
          </div>

          {/* Feature Badges (Chips) */}
          <div className="flex flex-wrap gap-2">
            {car.freeCancellation && (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 gap-1 font-normal">
                <CheckCircle className="w-3 h-3" />
                Free cancellation
              </Badge>
            )}
            {car.mileage && (
              <Badge variant="outline" className="text-xs font-normal border-border/60 gap-1">
                <Fuel className="w-3 h-3" />
                {car.mileage}
              </Badge>
            )}
            {hasTheftProtection && (
              <Badge variant="outline" className="text-xs font-normal border-border/60 gap-1">
                <Shield className="w-3 h-3" />
                Theft protection
              </Badge>
            )}
          </div>
        </div>

        {/* RIGHT: Price Block - ALWAYS VISIBLE */}
        <div className="sm:w-56 p-5 sm:p-6 flex flex-col justify-between items-end border-t sm:border-t-0 sm:border-l border-border/40 bg-muted/20">
          <div className="text-right w-full">
            {/* Price per day - Large & Bold */}
            <p className="text-2xl font-bold text-foreground">
              {dailyPrice}
              <span className="text-sm font-normal text-muted-foreground"> / day</span>
            </p>
            
            {/* Total price line */}
            <p className="text-sm text-muted-foreground mt-1">
              {totalPriceFormatted} total · {car.days} day{car.days !== 1 ? "s" : ""}
            </p>
            
            {/* Indicative price disclaimer */}
            <p className="text-[10px] text-muted-foreground/70 mt-3 leading-tight">
              Indicative price — final price shown on partner site
            </p>
          </div>
          
          {/* CTA Button */}
          <Button
            onClick={() => onViewDeal(car)}
            className="mt-4 w-full gap-2 font-medium bg-primary hover:bg-primary/90 text-primary-foreground h-11"
          >
            Continue to secure booking
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
          
          {/* Under CTA text */}
          <p className="text-[9px] text-muted-foreground/60 mt-2 text-center w-full leading-tight">
            Powered by licensed travel partners
          </p>
        </div>
      </div>
      
      {/* Footer Disclosure */}
      <div className="px-5 py-2.5 bg-muted/30 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground text-center">
          Final price confirmed before payment · Booking fulfilled by licensed partner
        </p>
      </div>
    </div>
  );
}
