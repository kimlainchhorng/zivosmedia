import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFlightRedirect } from "@/hooks/useAffiliateRedirect";
import { format, addDays } from "date-fns";
import { AirlineLogo } from "@/components/flight/AirlineLogo";

const routes = [
  { from: "LAX", fromCity: "Los Angeles", to: "JFK", toCity: "New York", price: 149, searches: "50K+", trending: true, airline: "AA" },
  { from: "SFO", fromCity: "San Francisco", to: "LAX", toCity: "Los Angeles", price: 79, searches: "45K+", trending: true, airline: "UA" },
  { from: "ORD", fromCity: "Chicago", to: "MIA", toCity: "Miami", price: 119, searches: "38K+", trending: false, airline: "AA" },
  { from: "JFK", fromCity: "New York", to: "LHR", toCity: "London", price: 349, searches: "42K+", trending: true, airline: "BA" },
  { from: "LAX", fromCity: "Los Angeles", to: "HNL", toCity: "Honolulu", price: 189, searches: "35K+", trending: true, airline: "HA" },
  { from: "DFW", fromCity: "Dallas", to: "LAX", toCity: "Los Angeles", price: 99, searches: "32K+", trending: false, airline: "WN" },
  { from: "SEA", fromCity: "Seattle", to: "SFO", toCity: "San Francisco", price: 89, searches: "28K+", trending: false, airline: "AS" },
  { from: "ATL", fromCity: "Atlanta", to: "JFK", toCity: "New York", price: 109, searches: "30K+", trending: false, airline: "DL" },
];

interface FlightPopularRoutesProps {
  onSelect?: (from: string, to: string) => void;
}

const FlightPopularRoutes = ({ onSelect }: FlightPopularRoutesProps) => {
  const { redirectWithParams } = useFlightRedirect('popular_routes', 'popular_route');

  // Generate dynamic dates (2 weeks from now, 1 week trip)
  const departDate = format(addDays(new Date(), 14), 'yyyy-MM-dd');
  const returnDate = format(addDays(new Date(), 21), 'yyyy-MM-dd');

  const handleRouteClick = (route: typeof routes[0]) => {
    // Use dynamic deep link with real parameters
    redirectWithParams({
      origin: route.from,
      destination: route.to,
      departDate,
      returnDate,
      passengers: 1,
      cabinClass: 'economy',
      tripType: 'roundtrip',
    });
    
    onSelect?.(route.from, route.to);
  };

  return (
    <section className="py-12 sm:py-16 border-t border-border/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
              Most Searched <span className="text-accent-foreground">Routes</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Popular flight routes with the best deals
            </p>
          </div>
          <button type="button" className="hidden sm:flex items-center gap-2 text-foreground hover:text-primary transition-colors text-sm font-medium">
            View all <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {routes.map((route, index) => (
            <Card
              key={`${route.from}-${route.to}`}
              className={cn(
                "glass-card overflow-hidden group cursor-pointer transition-all duration-200",
                "hover:border-sky-500/50 hover:-translate-y-1 touch-manipulation active:scale-[0.98]",
                "animate-in fade-in slide-in-from-bottom-4"
              )}
              onClick={() => handleRouteClick(route)}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AirlineLogo
                      iataCode={route.airline}
                      size={40}
                      className="shrink-0 bg-white border border-border/50"
                    />
                    <div className="text-center">
                      <p className="font-bold text-lg">{route.from}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[60px]">{route.fromCity}</p>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-px bg-border" />
                      <ArrowRight className="w-4 h-4 mx-1 text-foreground" />
                      <div className="w-6 h-px bg-border" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg">{route.to}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[60px]">{route.toCity}</p>
                    </div>
                  </div>
                  {route.trending && (
                    <Badge className="text-primary-foreground text-xs bg-foreground">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Hot
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{route.searches} searches</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">From</span>
                    <span className="text-lg font-bold text-foreground">${route.price}*</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Price Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center mt-4">
          *Prices are indicative and may change. Final price shown on partner site.
        </p>
      </div>
    </section>
  );
};

export default FlightPopularRoutes;
