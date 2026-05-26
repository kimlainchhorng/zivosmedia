/**
 * PHOTO DESTINATION GRID
 * Reusable photo-based destination tiles for Flights, Hotels, Cars
 * Uses 1:1 aspect ratio photos from destinationPhotos config
 */

import { useNavigate } from "react-router-dom";
import { destinationPhotos } from "@/config/photos";
import type { DestinationCity } from "@/config/photos";
import { cn } from "@/lib/utils";

interface PhotoDestinationGridProps {
  service: "flights" | "hotels" | "cars";
  title?: string;
  subtitle?: string;
  limit?: number;
  className?: string;
}

const serviceColors = {
  flights: {
    text: "text-sky-400",
    border: "border-sky-500/30",
    shadow: "shadow-sky-500/20",
    bg: "bg-sky-500/10",
  },
  hotels: {
    text: "text-amber-400",
    border: "border-amber-500/30",
    shadow: "shadow-amber-500/20",
    bg: "bg-amber-500/10",
  },
  cars: {
    text: "text-violet-400",
    border: "border-violet-500/30",
    shadow: "shadow-violet-500/20",
    bg: "bg-violet-500/10",
  },
};

const serviceRoutes = {
  flights: (city: string) => `/flights/to-${city.toLowerCase().replace(/\s+/g, "-")}`,
  hotels: (city: string) => `/hotels?destination=${encodeURIComponent(city)}`,
  cars: (city: string) => `/car-rental/in-${city.toLowerCase().replace(/\s+/g, "-")}`,
};

// Popular destinations to show (ordered by priority)
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

export default function PhotoDestinationGrid({
  service,
  title = "Popular Destinations",
  subtitle,
  limit = 8,
  className,
}: PhotoDestinationGridProps) {
  const navigate = useNavigate();
  const colors = serviceColors[service];
  const getRoute = serviceRoutes[service];

  const destinations = defaultDestinations.slice(0, limit);

  return (
    <section className={cn("py-12", className)}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            {title.split(" ").slice(0, -1).join(" ")}{" "}
            <span className={colors.text}>{title.split(" ").slice(-1)}</span>
          </h2>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {destinations.map((cityKey, index) => {
            const destination = destinationPhotos[cityKey];
            return (
              <button type="button"
                key={cityKey}
                onClick={() => navigate(getRoute(destination.city))}
                className={cn(
                  "group relative overflow-hidden rounded-2xl aspect-square",
                  "border border-border/50 bg-card/50",
                  "hover:shadow-lg transition-all duration-200 hover:-translate-y-1.5",
                  `hover:${colors.border} hover:${colors.shadow}`
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
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
                
                {/* Text Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                  <h3 className={cn(
                    "font-bold text-primary-foreground text-lg mb-0.5 transition-colors",
                    `group-hover:${colors.text}`
                  )}>
                    {destination.city}
                  </h3>
                  <p className="text-xs text-primary-foreground/70">{destination.country}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
