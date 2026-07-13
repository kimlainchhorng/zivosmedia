import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, ArrowRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const popularRoutes = [
  { id: 1, from: "LAX", fromCity: "Los Angeles", to: "JFK", toCity: "New York", duration: "5h 30m" },
  { id: 2, from: "SFO", fromCity: "San Francisco", to: "LHR", toCity: "London", duration: "10h 45m" },
  { id: 3, from: "MIA", fromCity: "Miami", to: "CDG", toCity: "Paris", duration: "9h 20m" },
  { id: 4, from: "ORD", fromCity: "Chicago", to: "NRT", toCity: "Tokyo", duration: "13h 15m" },
];

interface FlightDealsCarouselProps {
  onSelect?: (from: string, to: string) => void;
}

const FlightDealsCarousel = ({ onSelect }: FlightDealsCarouselProps) => {
  return (
    <section className="py-12 sm:py-16 relative overflow-hidden">
      <div className="absolute inset-0 via-transparent to-transparent bg-secondary" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
              <TrendingUp className="w-3 h-3" />
              Popular Routes
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              Trending <span className="text-accent-foreground">Destinations</span>
            </h2>
          </div>
          <button type="button" className="hidden sm:flex items-center gap-2 text-foreground hover:text-primary transition-colors text-sm font-medium">
            View all routes <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {popularRoutes.map((route, index) => (
            <Card
              key={route.id}
              className={cn(
                "glass-card overflow-hidden group cursor-pointer transition-all duration-200 flex-shrink-0 w-[300px] sm:w-[320px]",
                "hover:border-sky-500/50 hover:-translate-y-1 touch-manipulation active:scale-[0.98]",
                "animate-in fade-in slide-in-from-right-4"
              )}
              onClick={() => onSelect?.(route.from, route.to)}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-0">
                <div className="relative p-4 bg-secondary">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{route.from}</p>
                      <p className="text-xs text-muted-foreground">{route.fromCity}</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center px-3">
                      <div className="flex-1 h-px bg-border" />
                      <Plane className="w-5 h-5 mx-2 text-foreground rotate-90" />
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{route.to}</p>
                      <p className="text-xs text-muted-foreground">{route.toCity}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Avg. flight time: {route.duration}
                  </p>
                  <Button className="w-full bg-foreground hover:bg-foreground text-primary-foreground">
                    Search Flights <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlightDealsCarousel;
