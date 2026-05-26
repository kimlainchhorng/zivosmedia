import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowRight, Plane, Hotel, Car } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DESTINATION CARDS WITH REAL IMAGES
 * Professional travel imagery (Unsplash)
 * Skyscanner / Expedia quality
 */

export type ServiceType = "flights" | "hotels" | "cars";

interface Destination {
  city: string;
  country: string;
  image: string;
  count: number;
  priceFrom: number;
  trending?: boolean;
  tag?: string;
}

// Using Unsplash images for real travel photos
const destinations: Record<ServiceType, Destination[]> = {
  flights: [
    { 
      city: "New York", 
      country: "USA", 
      image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&h=400&fit=crop&q=80", 
      count: 450, 
      priceFrom: 199, 
      trending: true,
      tag: "Popular"
    },
    { 
      city: "London", 
      country: "United Kingdom", 
      image: "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=400&h=400&fit=crop&q=80", 
      count: 380, 
      priceFrom: 459, 
      trending: true,
      tag: "Hot Deal"
    },
    { 
      city: "Paris", 
      country: "France", 
      image: "https://images.unsplash.com/photo-1431274172761-fca41d930114?w=400&h=400&fit=crop&q=80", 
      count: 320, 
      priceFrom: 489,
      tag: "Romantic"
    },
    { 
      city: "Tokyo", 
      country: "Japan", 
      image: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=400&h=400&fit=crop&q=80", 
      count: 290, 
      priceFrom: 689, 
      trending: true,
      tag: "Adventure"
    },
    { 
      city: "Dubai", 
      country: "UAE", 
      image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400&h=400&fit=crop&q=80", 
      count: 260, 
      priceFrom: 549,
      tag: "Luxury"
    },
    { 
      city: "Los Angeles", 
      country: "USA", 
      image: "https://images.unsplash.com/photo-1580655653885-65763b2597d0?w=400&h=400&fit=crop&q=80", 
      count: 410, 
      priceFrom: 149, 
      trending: true,
      tag: "Best Value"
    },
  ],
  hotels: [
    { 
      city: "New York", 
      country: "USA", 
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop", 
      count: 2450, 
      priceFrom: 189, 
      trending: true,
      tag: "Top Rated"
    },
    { 
      city: "Paris", 
      country: "France", 
      image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=300&fit=crop", 
      count: 1890, 
      priceFrom: 165, 
      trending: true,
      tag: "Romantic"
    },
    { 
      city: "Bali", 
      country: "Indonesia", 
      image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=300&fit=crop", 
      count: 820, 
      priceFrom: 95,
      tag: "Best Value"
    },
    { 
      city: "London", 
      country: "UK", 
      image: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400&h=300&fit=crop", 
      count: 1980, 
      priceFrom: 175, 
      trending: true,
      tag: "Popular"
    },
    { 
      city: "Dubai", 
      country: "UAE", 
      image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=300&fit=crop", 
      count: 1250, 
      priceFrom: 225,
      tag: "Luxury"
    },
    { 
      city: "Maldives", 
      country: "Maldives", 
      image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400&h=300&fit=crop", 
      count: 420, 
      priceFrom: 350, 
      trending: true,
      tag: "Paradise"
    },
  ],
  cars: [
    { 
      city: "Los Angeles", 
      country: "California", 
      image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop", 
      count: 850, 
      priceFrom: 45, 
      trending: true,
      tag: "Popular"
    },
    { 
      city: "Miami", 
      country: "Florida", 
      image: "https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=400&h=300&fit=crop", 
      count: 680, 
      priceFrom: 42, 
      trending: true,
      tag: "Beach Ready"
    },
    { 
      city: "Las Vegas", 
      country: "Nevada", 
      image: "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=400&h=300&fit=crop", 
      count: 590, 
      priceFrom: 38, 
      trending: true,
      tag: "Hot Deal"
    },
    { 
      city: "San Francisco", 
      country: "California", 
      image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop", 
      count: 540, 
      priceFrom: 52,
      tag: "Scenic"
    },
    { 
      city: "Orlando", 
      country: "Florida", 
      image: "https://images.unsplash.com/photo-1575089776834-8be34696ffb9?w=400&h=300&fit=crop", 
      count: 710, 
      priceFrom: 35,
      tag: "Family"
    },
    { 
      city: "Denver", 
      country: "Colorado", 
      image: "https://images.unsplash.com/photo-1619856699906-09e1f58c98b9?w=400&h=300&fit=crop", 
      count: 420, 
      priceFrom: 48,
      tag: "Adventure"
    },
  ],
};

const serviceConfig = {
  flights: {
    title: "Popular Destinations",
    subtitle: "Trending flight routes with great deals",
    countLabel: "daily flights",
    priceLabel: "/person",
    icon: Plane,
    accentColor: "sky",
    badgeColors: "bg-sky-500 text-primary-foreground",
    priceColor: "text-sky-500",
  },
  hotels: {
    title: "Trending Destinations",
    subtitle: "Top-rated hotels in popular cities",
    countLabel: "hotels",
    priceLabel: "/night",
    icon: Hotel,
    accentColor: "amber",
    badgeColors: "bg-amber-500 text-primary-foreground",
    priceColor: "text-amber-500",
  },
  cars: {
    title: "Popular Pickup Locations",
    subtitle: "Find great car rental deals",
    countLabel: "cars available",
    priceLabel: "/day",
    icon: Car,
    accentColor: "violet",
    badgeColors: "bg-violet-500 text-primary-foreground",
    priceColor: "text-violet-500",
  },
};

interface DestinationCardsGridProps {
  service: ServiceType;
  onSelect?: (city: string) => void;
  className?: string;
}

export default function DestinationCardsGrid({ 
  service, 
  onSelect,
  className = '' 
}: DestinationCardsGridProps) {
  const config = serviceConfig[service];
  const data = destinations[service];
  const ServiceIcon = config.icon;

  return (
    <section className={cn("py-12 sm:py-16 bg-muted/30", className)}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              config.accentColor === "sky" && "bg-sky-500/10",
              config.accentColor === "amber" && "bg-amber-500/10",
              config.accentColor === "violet" && "bg-violet-500/10"
            )}>
              <ServiceIcon className={cn(
                "w-5 h-5",
                config.accentColor === "sky" && "text-sky-500",
                config.accentColor === "amber" && "text-amber-500",
                config.accentColor === "violet" && "text-violet-500"
              )} />
            </div>
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                {config.title}
              </h2>
              <p className="text-muted-foreground text-sm">
                {config.subtitle}
              </p>
            </div>
          </div>
          <button type="button" className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200">
            View all <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {data.map((dest) => (
            <Card
              key={dest.city}
              className={cn(
                "group overflow-hidden cursor-pointer transition-all duration-200",
                "hover:-translate-y-1.5 hover:shadow-xl border-0 bg-card"
              )}
              onClick={() => onSelect?.(dest.city)}
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden">
                <img 
                  src={dest.image.replace("q=80", "q=75&fm=webp&auto=format")} 
                  alt={`${dest.city}, ${dest.country} - Travel destination`}
                  width={400}
                  height={400}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  style={{ aspectRatio: "1/1" }}
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                
                {/* Tag badge */}
                {dest.tag && (
                  <Badge className={cn(
                    "absolute top-2 left-2 text-[10px] font-semibold border-0 shadow-lg",
                    dest.trending ? config.badgeColors : "bg-white/90 text-foreground"
                  )}>
                    {dest.trending && <TrendingUp className="w-2.5 h-2.5 mr-1" />}
                    {dest.tag}
                  </Badge>
                )}

                {/* City name overlay */}
                <div className="absolute bottom-2 left-2 right-2">
                  <h3 className="font-bold text-primary-foreground text-sm sm:text-base drop-shadow-lg">
                    {dest.city}
                  </h3>
                  <p className="text-primary-foreground/80 text-xs">
                    {dest.country}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {dest.count.toLocaleString()} {config.countLabel}
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">From</span>
                    <span className={cn("font-bold text-sm", config.priceColor)}>
                      ${dest.priceFrom}{config.priceLabel}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Mobile view all */}
        <button type="button" className="sm:hidden w-full mt-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center justify-center gap-2 rounded-xl bg-card border border-border hover:border-primary/20 hover:shadow-sm active:scale-[0.98] touch-manipulation">
          View all destinations <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
