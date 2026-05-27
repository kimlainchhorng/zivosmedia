import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { getAirlineLogo } from "@/data/airlines";

// Popular routes with a featured airline for each
const popularSEORoutesWithAirlines = [
  { from: "new-york", to: "los-angeles", code: { from: "JFK", to: "LAX" }, airline: "AA" },
  { from: "los-angeles", to: "london", code: { from: "LAX", to: "LHR" }, airline: "BA" },
  { from: "new-york", to: "london", code: { from: "JFK", to: "LHR" }, airline: "VS" },
  { from: "san-francisco", to: "tokyo", code: { from: "SFO", to: "NRT" }, airline: "UA" },
  { from: "chicago", to: "paris", code: { from: "ORD", to: "CDG" }, airline: "AF" },
  { from: "miami", to: "cancun", code: { from: "MIA", to: "CUN" }, airline: "AA" },
  { from: "boston", to: "dublin", code: { from: "BOS", to: "DUB" }, airline: "EI" },
  { from: "seattle", to: "honolulu", code: { from: "SEA", to: "HNL" }, airline: "AS" },
];

interface PopularRoutesGridProps {
  fromCity?: string;
  toCity?: string;
  onSelectRoute?: (from: string, to: string) => void;
}

export default function PopularRoutesGrid({ 
  fromCity, 
  toCity, 
  onSelectRoute 
}: PopularRoutesGridProps) {
  const displayRoutes = popularSEORoutesWithAirlines;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-xl">Popular Routes</h2>
        </div>
        <Badge variant="outline" className="text-xs">
          <TrendingUp className="w-3 h-3 mr-1" />
          Trending
        </Badge>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayRoutes.map((route) => {
          const fromDisplay = route.from.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          const toDisplay = route.to.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          const routeSlug = `${route.from}-to-${route.to}`;

          return (
            <Link
              key={routeSlug}
              to={`/flights/results?origin=${route.code.from}&dest=${route.code.to}`}
              className="group block"
            >
              <Card className="h-full border-border/50 hover:border-border hover:shadow-lg hover:transition-all duration-200 group-hover:-translate-y-1 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-border/50 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={getAirlineLogo(route.airline, 32)}
	                        alt="Airline logo"
	                        className="w-8 h-8 object-contain"
	                        loading="lazy"
	                        decoding="async"
	                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-bold">
                        <span className="truncate">{route.code.from}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{route.code.to}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {fromDisplay} → {toDisplay}
                      </p>
                      {/* Micro-CTA */}
                      <p className="text-xs text-foreground font-medium mt-1 group-hover:underline">
                        Search deals →
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Internal Link to More Routes */}
      <div className="text-center">
        <Link 
          to="/flights" 
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          View all popular routes
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
