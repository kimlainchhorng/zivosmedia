import { Star, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/ui/price-display";
import { SourceBadge, BestPriceBadge, AvailabilityBadge } from "@/components/hotels/SourceBadge";
import type { ZivoPropertyExtended } from "@/types/zivoProperty";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

/**
 * Live Rates Grid for SEO pages
 * Displays normalized ZivoProperty data with supplier comparison
 */

interface LiveRatesGridProps {
  properties: ZivoPropertyExtended[];
  isLoading: boolean;
  citySlug: string;
  maxItems?: number;
}

// Star rating display
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "w-3 h-3",
            i < rating ? "fill-hotels text-hotels" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

// Property card component
function PropertyCard({ property }: { property: ZivoPropertyExtended }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Property Image */}
      <div className="relative h-40 bg-muted">
        {property.imageUrl && (
          <img
            src={property.imageUrl}
	            alt={property.meta.name}
	            className="w-full h-full object-cover"
	            loading="lazy"
	            decoding="async"
	          />
        )}
        
        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <SourceBadge source={property.source} />
          {property.pricing.isCheapest && <BestPriceBadge />}
        </div>
        
        <div className="absolute top-2 right-2">
          <AvailabilityBadge status={property.inventory.status} />
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold line-clamp-1">
              {property.meta.name}
            </CardTitle>
            <StarRating rating={property.meta.starRating} />
          </div>
          
          {/* Review score */}
          {property.reviewScore && (
            <div className="flex items-center gap-1 text-sm">
              <span className="font-bold text-hotels">{property.reviewScore.toFixed(1)}</span>
              {property.reviewCount && (
                <span className="text-muted-foreground text-xs">
                  ({property.reviewCount})
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Location */}
        {property.zone && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
            {property.zone}
          </p>
        )}

        {/* Amenities preview */}
        {property.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {property.facilities.slice(0, 3).map((facility) => (
              <span
                key={facility}
                className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground"
              >
                {facility}
              </span>
            ))}
            {property.facilities.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                +{property.facilities.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Price and CTA */}
        <div className="flex items-end justify-between gap-2 mt-2">
          <PriceDisplay
            price={property.pricePerNight}
            baseCurrency={property.pricing.currency}
            service="hotels"
            suffix="/night"
            size="sm"
          />
          
          <Button size="sm" variant="outline" className="text-xs">
            View Deal
          </Button>
        </div>

        {/* Alternative rates indicator */}
        {property.alternativeRates && property.alternativeRates.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-2">
            Compare {property.alternativeRates.length + 1} supplier{property.alternativeRates.length > 0 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Loading skeleton
function PropertySkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <div className="h-40 bg-muted" />
      <CardHeader className="pb-2">
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/4 mt-2" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-3 bg-muted rounded w-1/2 mb-3" />
        <div className="flex gap-1 mb-3">
          <div className="h-4 bg-muted rounded-full w-12" />
          <div className="h-4 bg-muted rounded-full w-16" />
        </div>
        <div className="flex justify-between items-end">
          <div className="h-6 bg-muted rounded w-20" />
          <div className="h-8 bg-muted rounded w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state
function EmptyState({ citySlug }: { citySlug: string }) {
  return (
    <div className="col-span-full text-center py-12">
      <p className="text-muted-foreground mb-4">
        Search for hotels to see real-time rates
      </p>
      <Button asChild>
        <Link to={`/hotels?destination=${citySlug}`}>
          Search Hotels
        </Link>
      </Button>
    </div>
  );
}

export default function LiveRatesGrid({
  properties,
  isLoading,
  citySlug,
  maxItems = 6,
}: LiveRatesGridProps) {
  const displayProperties = properties.slice(0, maxItems);

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Real-time Rates</h2>
          {!isLoading && properties.length > maxItems && (
            <Button variant="ghost" asChild>
              <Link to={`/hotels?destination=${citySlug}`}>
                View all {properties.length} properties →
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <PropertySkeleton key={i} />
              ))}
            </>
          ) : displayProperties.length > 0 ? (
            displayProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))
          ) : (
            <EmptyState citySlug={citySlug} />
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground mt-6 text-center">
          * Prices shown are estimates and may change. Final price confirmed at checkout with our travel partners.
        </p>
      </div>
    </section>
  );
}
