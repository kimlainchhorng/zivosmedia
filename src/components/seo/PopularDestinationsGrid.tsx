/**
 * POPULAR DESTINATIONS GRID (SEO)
 * 1:1 photo tiles using destinationPhotos config
 * Replaces emoji-based grids with real photos
 */

import { Link } from "react-router-dom";
import { destinationPhotos } from "@/config/photos";
import type { DestinationCity } from "@/config/photos";
import { Globe, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Default destinations to display (ordered by priority)
const defaultDestinations: DestinationCity[] = [
  "new-york",
  "los-angeles",
  "miami",
  "las-vegas",
  "london",
  "paris",
  "tokyo",
  "dubai",
];

// Trending cities get a badge
const trendingCities: DestinationCity[] = ["new-york", "tokyo", "dubai", "miami"];

interface PopularDestinationsGridProps {
  service?: "flights" | "hotels" | "cars";
  limit?: number;
  className?: string;
}

const serviceRoutes = {
  flights: (city: string) => `/flights/to-${city.toLowerCase().replace(/\s+/g, "-")}`,
  hotels: (city: string) => `/hotels?destination=${encodeURIComponent(city)}`,
  cars: (city: string) => `/car-rental/in-${city.toLowerCase().replace(/\s+/g, "-")}`,
};

const serviceColors = {
  flights: {
    accent: "text-sky-400",
    badge: "bg-sky-500",
    border: "hover:border-sky-500/50",
    shadow: "hover:shadow-sky-500/20",
  },
  hotels: {
    accent: "text-amber-400",
    badge: "bg-amber-500",
    border: "hover:border-amber-500/50",
    shadow: "hover:shadow-amber-500/20",
  },
  cars: {
    accent: "text-violet-400",
    badge: "bg-violet-500",
    border: "hover:border-violet-500/50",
    shadow: "hover:shadow-violet-500/20",
  },
};

export default function PopularDestinationsGrid({ 
  service = "flights",
  limit = 8,
  className 
}: PopularDestinationsGridProps) {
  const destinations = defaultDestinations.slice(0, limit);
  const colors = serviceColors[service];
  const getRoute = serviceRoutes[service];

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className={cn("w-5 h-5", colors.accent)} />
          <h2 className="font-bold text-xl">Popular Destinations</h2>
        </div>
        <Badge variant="outline" className="text-xs">
          Top picks
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {destinations.map((cityKey, index) => {
          const destination = destinationPhotos[cityKey];
          const isTrending = trendingCities.includes(cityKey);
          
          return (
            <Link
              key={cityKey}
              to={getRoute(destination.city)}
              className="group"
            >
              <div className={cn(
                "relative overflow-hidden rounded-xl aspect-square",
                "border border-border/50 bg-card/50",
                "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
                colors.border,
                colors.shadow
              )}>
                {/* Photo */}
                <img
                  src={destination.src}
                  alt={destination.alt}
                  width={destination.width}
	                  height={destination.height}
	                  loading="lazy"
	                  decoding="async"
	                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
	                />
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                
                {/* Trending Badge */}
                {isTrending && (
                  <Badge className={cn(
                    "absolute top-2 right-2 text-[10px] text-primary-foreground border-0 shadow-lg",
                    colors.badge
                  )}>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Hot
                  </Badge>
                )}
                
                {/* Text Content */}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                  <h3 className={cn(
                    "font-bold text-primary-foreground text-sm truncate transition-colors",
                    `group-hover:${colors.accent}`
                  )}>
                    {destination.city}
                  </h3>
                  <p className="text-xs text-primary-foreground/70">{destination.country}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
