import { useState } from "react";
import { 
  Leaf, 
  TreePine, 
  Droplets,
  ArrowRight,
  Check,
  Info,
  TrendingDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CarbonFootprintWidgetProps {
  className?: string;
  distanceKm?: number;
  cabinClass?: "economy" | "premium" | "business" | "first";
  passengers?: number;
  airline?: string;
}

const CarbonFootprintWidget = ({ 
  className,
  distanceKm = 5500,
  cabinClass = "economy",
  passengers = 1,
  airline = "United Airlines"
}: CarbonFootprintWidgetProps) => {
  const [offsetSelected, setOffsetSelected] = useState(false);

  // Calculate carbon emissions based on distance and class
  // Average: 0.255 kg CO2 per km per passenger for economy
  const classMultipliers = {
    economy: 1,
    premium: 1.3,
    business: 2.0,
    first: 2.5
  };

  const baseEmission = 0.255; // kg CO2 per km
  const emissions = Math.round(distanceKm * baseEmission * classMultipliers[cabinClass] * passengers);
  const treesNeeded = Math.ceil(emissions / 21.77); // Average tree absorbs 21.77 kg CO2/year
  const waterSaved = Math.round(emissions * 0.5); // Simplified calculation

  // Offset cost calculation (average $10 per tonne)
  const offsetCost = Math.max(1, Math.round(emissions / 1000 * 10 * 100) / 100);

  // Comparison to average
  const averageFlightEmission = 500; // kg CO2
  const comparisonPercentage = Math.round((emissions / averageFlightEmission) * 100);

  const offsetOptions = [
    { 
      id: "forest", 
      name: "Reforestation", 
      description: "Plant trees in Brazil", 
      icon: TreePine, 
      price: offsetCost,
      impact: `${treesNeeded} trees`
    },
    { 
      id: "renewable", 
      name: "Clean Energy", 
      description: "Support solar farms", 
      icon: Droplets, 
      price: offsetCost * 1.2,
      impact: `${Math.round(emissions * 0.8)} kWh`
    },
  ];

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-sm">Carbon Footprint</h3>
        </div>
        <Badge className={cn(
          "border-0",
          emissions < 400 ? "bg-emerald-500/20 text-emerald-400" :
          emissions < 800 ? "bg-amber-500/20 text-amber-400" :
          "bg-red-500/20 text-red-400"
        )}>
          {emissions < 400 ? "Low Impact" : emissions < 800 ? "Medium" : "High"}
        </Badge>
      </div>

      {/* Emissions Display */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 mb-4">
        <div className="flex items-end gap-2 mb-2">
          <span className="text-4xl font-bold">{emissions}</span>
          <span className="text-sm text-muted-foreground mb-1">kg CO₂</span>
        </div>
        <p className="text-xs text-muted-foreground">
          For {passengers} passenger{passengers > 1 ? 's' : ''} • {distanceKm.toLocaleString()} km • {cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)}
        </p>
      </div>

      {/* Comparison Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground">vs. Average Flight</span>
          <span className={cn(
            "font-medium flex items-center gap-1",
            comparisonPercentage <= 100 ? "text-emerald-400" : "text-amber-400"
          )}>
            {comparisonPercentage <= 100 && <TrendingDown className="w-3 h-3" />}
            {comparisonPercentage}% of avg
          </span>
        </div>
        <Progress 
          value={Math.min(comparisonPercentage, 100)} 
          className={cn("h-2", comparisonPercentage > 100 && "[&>div]:bg-amber-500")}
        />
      </div>

      {/* Impact Equivalents */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-center">
          <TreePine className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-lg font-bold">{treesNeeded}</p>
          <p className="text-[10px] text-muted-foreground">Trees to offset/year</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-center">
          <Droplets className="w-5 h-5 mx-auto mb-1 text-foreground" />
          <p className="text-lg font-bold">{waterSaved}L</p>
          <p className="text-[10px] text-muted-foreground">Water equivalent</p>
        </div>
      </div>

      {/* Offset Options */}
      <div className="space-y-2 mb-4">
        <p className="text-xs font-medium">Offset Your Flight</p>
        {offsetOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button type="button"
              key={option.id}
              onClick={() => setOffsetSelected(!offsetSelected)}
              className={cn(
                "w-full p-3 rounded-xl border transition-all duration-200 flex items-center gap-3",
                offsetSelected && option.id === "forest"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-border/30 hover:border-primary/30"
              )}
            >
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <Icon className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{option.name}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">${option.price.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">{option.impact}</p>
              </div>
              {offsetSelected && option.id === "forest" && (
                <Check className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* CTA */}
      {offsetSelected ? (
        <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500">
          <Leaf className="w-4 h-4 mr-2" />
          Add Offset (${offsetCost.toFixed(2)})
        </Button>
      ) : (
        <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-xl bg-muted/20">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p>{airline} is committed to net-zero emissions by 2050. Offset your flight to contribute.</p>
        </div>
      )}
    </div>
  );
};

export default CarbonFootprintWidget;
