import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Plane, 
  Calendar, 
  Star, 
  ArrowRight,
  Clock,
  TrendingUp,
  Sparkles,
  Heart,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FlightFeaturedDestinationsProps {
  className?: string;
  onSelectDestination?: (city: string, code: string) => void;
}

export default function FlightFeaturedDestinations({ 
  className,
  onSelectDestination 
}: FlightFeaturedDestinationsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [likedDestinations, setLikedDestinations] = useState<Set<string>>(new Set());

  // Featured destinations should come from a live flight-deals feed (cached
  // best fares per city). Empty until that backend exists — never display
  // fabricated prices.
  const featuredDestinations: Array<{
    id: string; city: string; country: string; code: string;
    price: number; originalPrice: number; image: string;
    rating: number; reviews: number; flightTime: string;
    badge: string; badgeColor: string; highlight: string; tags: string[];
  }> = [];

  if (featuredDestinations.length === 0) return null;

  const toggleLike = (id: string) => {
    setLikedDestinations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <section className={cn("py-16 relative overflow-hidden", className)}>
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <Badge className="mb-4 px-4 py-2 text-foreground border-border bg-secondary">
              <Sparkles className="w-4 h-4 mr-2" />
              Featured Destinations
            </Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Explore Dream Destinations
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl">
              Handpicked destinations with exclusive deals and premium experiences
            </p>
          </div>
          <Button variant="outline" className="gap-2 self-start md:self-auto">
            View All Destinations
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Featured Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredDestinations.map((dest, index) => (
            <Card
              key={dest.id}
              className={cn(
                "group relative overflow-hidden border-0 cursor-pointer transition-all duration-500",
                "hover:shadow-2xl hover:shadow-sky-500/20 hover:-translate-y-1.5",
                "animate-in fade-in slide-in-from-bottom-4"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
              onMouseEnter={() => setHoveredId(dest.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectDestination?.(dest.city, dest.code)}
            >
              {/* Image Container */}
              <div className="relative h-56 overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.city}
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-700",
                    hoveredId === dest.id ? "scale-110" : "scale-100"
	                  )}
	                  loading="lazy"
	                  decoding="async"
	                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                
                {/* Badge */}
                <Badge className={cn(
                  "absolute top-4 left-4 text-primary-foreground font-semibold",
                  dest.badgeColor
                )}>
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  {dest.badge}
                </Badge>

                {/* Like Button */}
                <button type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(dest.id);
                  }}
                  className={cn(
                    "absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    likedDestinations.has(dest.id)
                      ? "bg-rose-500 text-primary-foreground"
                      : "bg-background/80 backdrop-blur-sm text-foreground hover:bg-background"
                  )}
                >
                  <Heart className={cn(
                    "w-5 h-5",
                    likedDestinations.has(dest.id) && "fill-current"
                  )} />
                </button>

                {/* Price Tag */}
                <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm rounded-xl px-4 py-2 text-right">
                  <p className="text-xs text-muted-foreground line-through">${dest.originalPrice}</p>
                  <p className="text-2xl font-bold text-foreground">${dest.price}</p>
                </div>
              </div>

              <CardContent className="p-5">
                {/* Location */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      {dest.city}
                      <span className="text-sm font-normal text-muted-foreground">({dest.code})</span>
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {dest.country}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-semibold">{dest.rating}</span>
                    <span className="text-xs text-muted-foreground">({(dest.reviews / 1000).toFixed(1)}k)</span>
                  </div>
                </div>

                {/* Highlight */}
                <p className="text-sm text-muted-foreground mb-3">{dest.highlight}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {dest.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {dest.flightTime}
                    </div>
                    <div className="flex items-center gap-1">
                      <Plane className="w-4 h-4" />
                      Direct
                    </div>
                  </div>
                  <Button size="sm" className="gap-1 bg-secondary">
                    Book Now
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
