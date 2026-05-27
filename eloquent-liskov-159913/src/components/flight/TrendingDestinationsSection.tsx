import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, TrendingUp, Plane, MapPin } from "lucide-react";
import { useTrendingDestinations } from "@/hooks/useTrendingFlights";

interface TrendingDestinationsSectionProps {
  onSelectDestination: (city: string, code: string) => void;
}

export function TrendingDestinationsSection({ onSelectDestination }: TrendingDestinationsSectionProps) {
  const { destinations, isLoading } = useTrendingDestinations();

  return (
    <section className="py-12 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold">Popular Destinations</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs text-muted-foreground">
              <Plane className="w-3 h-3 mr-1" />
              Live Prices
            </Badge>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {destinations.slice(0, 9).map((dest, index) => (
            <div
              key={dest.code}
              onClick={() => onSelectDestination(dest.city, dest.code)}
              className="cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-200 touch-manipulation active:scale-[0.98]"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <Card className="glass-card hover:border-border transition-all group overflow-hidden relative">
                {dest.trending && (
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-amber-500 text-primary-foreground text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Trending
                  </Badge>
                )}
                <CardContent className="p-0">
                  <div className="flex items-center">
                    <div className="w-24 h-24 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 relative bg-secondary">
                      <MapPin className="w-8 h-8 text-foreground" />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                    </div>
                    <div className="flex-1 p-4">
                      <h3 className="font-display font-semibold text-lg">{dest.city}</h3>
                      <p className="text-sm text-muted-foreground">
                        {dest.country} • {dest.code}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {dest.isLoading ? (
                          <Skeleton className="h-5 w-16" />
                        ) : (
                          <p className="text-foreground font-bold">From ${dest.price}</p>
                        )}
                        <span className="text-xs text-muted-foreground">round trip</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground mr-4 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
        {/* MoR Disclaimer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          All prices include taxes and fees. Final total shown at checkout.
        </p>
      </div>
    </section>
  );
}

export default TrendingDestinationsSection;
