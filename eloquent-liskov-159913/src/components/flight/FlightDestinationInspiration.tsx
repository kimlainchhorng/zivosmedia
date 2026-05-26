import { useNavigate } from "react-router-dom";
import { Sparkles, TrendingUp, Star, Plane, ArrowRight, Calendar, Building2, Mountain, Palmtree, Landmark, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const destinationIcons: Record<string, typeof Building2> = {
  Barcelona: Landmark,
  Reykjavik: Mountain,
  Santorini: Palmtree,
  Kyoto: Landmark,
  Marrakech: MapPin,
  "Cape Town": Mountain,
};

const destinations = [
  { id: 1, city: "Barcelona", country: "Spain", fromPrice: 289, season: "Mar-May", highlight: "Architecture & Beaches", trending: true },
  { id: 2, city: "Reykjavik", country: "Iceland", fromPrice: 449, season: "Sep-Mar", highlight: "Northern Lights", trending: true },
  { id: 3, city: "Santorini", country: "Greece", fromPrice: 399, season: "Apr-Oct", highlight: "Sunset Views", trending: false },
  { id: 4, city: "Kyoto", country: "Japan", fromPrice: 699, season: "Mar-May, Oct-Nov", highlight: "Cherry Blossoms", trending: true },
  { id: 5, city: "Marrakech", country: "Morocco", fromPrice: 349, season: "Mar-May, Sep-Nov", highlight: "Souks & Riads", trending: false },
  { id: 6, city: "Cape Town", country: "South Africa", fromPrice: 599, season: "Nov-Feb", highlight: "Safari & Wine", trending: false },
];

const FlightDestinationInspiration = () => {
  const navigate = useNavigate();

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-4">
            <Sparkles className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium text-foreground">Inspiration</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            Where to Next?
          </h2>
          <p className="text-muted-foreground">Discover your next adventure</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {destinations.map((dest, index) => (
            <button type="button"
              key={dest.id}
              onClick={() => {
                // OTA Mode: Navigate internally to flight search
                const params = new URLSearchParams({ dest: dest.city });
                navigate(`/flights?${params.toString()}`);
              }}
              className={cn(
                "group relative p-5 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm",
                "text-left transition-all duration-200 hover:border-sky-500/30 hover:shadow-xl",
                "touch-manipulation active:scale-[0.98]",
                "animate-in fade-in slide-in-from-bottom-4"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {dest.trending && (
                <div className="absolute -top-2 right-4 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-[10px] font-bold text-green-400">Trending</span>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-secondary">
                  {(() => { const Icon = destinationIcons[dest.city] || MapPin; return <Icon className="w-7 h-7 text-foreground" />; })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg group-hover:text-foreground transition-colors">
                    {dest.city}
                  </h3>
                  <p className="text-sm text-muted-foreground">{dest.country}</p>
                  <p className="text-xs text-foreground mt-1">{dest.highlight}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground">From</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xl font-bold text-foreground">${dest.fromPrice}*</p>
                    <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{dest.season}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button 
            onClick={() => navigate('/flights')}
            variant="outline" 
            className="rounded-xl gap-2"
          >
            Explore All Destinations
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-[9px] text-muted-foreground mt-2">*Prices are estimates. Final price confirmed at checkout.</p>
        </div>
      </div>
    </section>
  );
};

export default FlightDestinationInspiration;
