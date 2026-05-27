import { useState, useMemo } from "react";
import { 
  Scale, 
  Plane, 
  Clock,
  DollarSign,
  Star,
  Check,
  X,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FlightFeatures {
  wifi: boolean;
  meals: boolean;
  legroom: boolean;
}

interface FlightOption {
  id: string;
  airline: string;
  price: number;
  duration: string;
  stops: number;
  rating: number;
  features: FlightFeatures;
}

interface TripComparisonWidgetProps {
  className?: string;
  flightOptions?: FlightOption[];
  currency?: string;
  maxSelections?: number;
  onSelectFlight?: (flight: FlightOption) => void;
}

const defaultFlightOptions: FlightOption[] = [
  { 
    id: "1", 
    airline: "Air France", 
    price: 899, 
    duration: "7h 45m", 
    stops: 0, 
    rating: 4.5,
    features: { wifi: true, meals: true, legroom: true }
  },
  { 
    id: "2", 
    airline: "Delta", 
    price: 849, 
    duration: "9h 20m", 
    stops: 1, 
    rating: 4.2,
    features: { wifi: true, meals: true, legroom: false }
  },
  { 
    id: "3", 
    airline: "United", 
    price: 799, 
    duration: "11h 15m", 
    stops: 1, 
    rating: 3.8,
    features: { wifi: false, meals: true, legroom: false }
  },
];

const TripComparisonWidget = ({ 
  className,
  flightOptions = defaultFlightOptions,
  currency = "$",
  maxSelections = 3,
  onSelectFlight
}: TripComparisonWidgetProps) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    flightOptions.slice(0, 2).map(f => f.id)
  );

  const toggleOption = (id: string) => {
    if (selectedOptions.includes(id)) {
      setSelectedOptions(selectedOptions.filter(o => o !== id));
    } else if (selectedOptions.length < maxSelections) {
      setSelectedOptions([...selectedOptions, id]);
    }
  };

  const comparedFlights = useMemo(() => 
    flightOptions.filter(f => selectedOptions.includes(f.id)),
    [flightOptions, selectedOptions]
  );

  const bestPrice = useMemo(() => 
    comparedFlights.length > 0 ? Math.min(...comparedFlights.map(f => f.price)) : 0,
    [comparedFlights]
  );

  const bestRating = useMemo(() => 
    comparedFlights.length > 0 ? Math.max(...comparedFlights.map(f => f.rating)) : 0,
    [comparedFlights]
  );

  const bestValueFlight = useMemo(() => {
    if (comparedFlights.length === 0) return null;
    // Best value = best balance of price and rating
    return comparedFlights.reduce((best, current) => {
      const currentScore = current.rating / (current.price / 100);
      const bestScore = best.rating / (best.price / 100);
      return currentScore > bestScore ? current : best;
    });
  }, [comparedFlights]);

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Compare Options</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {selectedOptions.length}/{maxSelections} selected
        </Badge>
      </div>

      {/* Selection Pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {flightOptions.map((flight) => (
          <button type="button"
            key={flight.id}
            onClick={() => toggleOption(flight.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
              selectedOptions.includes(flight.id)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 border-border/50 hover:border-border"
            )}
          >
            {flight.airline}
          </button>
        ))}
      </div>

      {/* Comparison Grid */}
      {comparedFlights.length >= 2 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 text-xs text-muted-foreground font-normal">Feature</th>
                {comparedFlights.map((flight) => (
                  <th key={flight.id} className="text-center py-2 font-medium">
                    {flight.airline}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/30">
                <td className="py-2 text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Price
                </td>
                {comparedFlights.map((flight) => (
                  <td key={flight.id} className="text-center py-2">
                    <span className={cn(
                      "font-bold",
                      flight.price === bestPrice && "text-emerald-400"
                    )}>
                      {currency}{flight.price}
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2 text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Duration
                </td>
                {comparedFlights.map((flight) => (
                  <td key={flight.id} className="text-center py-2">{flight.duration}</td>
                ))}
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2 text-muted-foreground flex items-center gap-1">
                  <Plane className="w-3 h-3" /> Stops
                </td>
                {comparedFlights.map((flight) => (
                  <td key={flight.id} className="text-center py-2">
                    {flight.stops === 0 ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">Direct</Badge>
                    ) : (
                      <span>{flight.stops} stop{flight.stops > 1 ? 's' : ''}</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2 text-muted-foreground flex items-center gap-1">
                  <Star className="w-3 h-3" /> Rating
                </td>
                {comparedFlights.map((flight) => (
                  <td key={flight.id} className="text-center py-2">
                    <span className={cn(
                      flight.rating === bestRating && "text-amber-400"
                    )}>
                      {flight.rating} <Star className="w-3 h-3 inline fill-current" />
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2 text-muted-foreground">WiFi</td>
                {comparedFlights.map((flight) => (
                  <td key={flight.id} className="text-center py-2">
                    {flight.features.wifi ? (
                      <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground mx-auto" />
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground">Extra Legroom</td>
                {comparedFlights.map((flight) => (
                  <td key={flight.id} className="text-center py-2">
                    {flight.features.legroom ? (
                      <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground mx-auto" />
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {comparedFlights.length < 2 && (
        <div className="text-center py-8 text-muted-foreground">
          <Scale className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select at least 2 options to compare</p>
        </div>
      )}

      {/* Best Value Indicator */}
      {bestValueFlight && comparedFlights.length >= 2 && (
        <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Best Value</p>
          <div className="flex items-center justify-between">
            <span className="font-bold">{bestValueFlight.airline}</span>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-primary to-teal-500"
              onClick={() => onSelectFlight?.(bestValueFlight)}
            >
              Select <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripComparisonWidget;
