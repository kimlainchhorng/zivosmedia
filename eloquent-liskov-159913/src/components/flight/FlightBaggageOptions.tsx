import { useState } from "react";
import { Luggage, Briefcase, Check, Plus, Minus, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const baggageOptions = [
  { 
    id: "personal", 
    name: "Personal Item", 
    description: "Fits under the seat", 
    dimensions: "45 x 35 x 20 cm",
    weight: "Up to 7kg",
    price: 0, 
    included: true,
    icon: Briefcase 
  },
  { 
    id: "cabin", 
    name: "Cabin Bag", 
    description: "Overhead compartment", 
    dimensions: "55 x 40 x 23 cm",
    weight: "Up to 10kg",
    price: 25, 
    included: false,
    icon: ShoppingBag 
  },
  { 
    id: "checked-1", 
    name: "Checked Bag (23kg)", 
    description: "Standard checked luggage", 
    dimensions: "158 cm total",
    weight: "Up to 23kg",
    price: 35, 
    included: false,
    icon: Luggage 
  },
  { 
    id: "checked-2", 
    name: "Checked Bag (32kg)", 
    description: "Heavy checked luggage", 
    dimensions: "158 cm total",
    weight: "Up to 32kg",
    price: 55, 
    included: false,
    icon: Luggage 
  },
];

const FlightBaggageOptions = () => {
  const [selectedBags, setSelectedBags] = useState<Record<string, number>>({
    personal: 1,
    cabin: 0,
    "checked-1": 0,
    "checked-2": 0,
  });

  const updateBagCount = (id: string, delta: number) => {
    setSelectedBags(prev => ({
      ...prev,
      [id]: Math.max(0, Math.min(3, (prev[id] || 0) + delta))
    }));
  };

  const totalPrice = Object.entries(selectedBags).reduce((sum, [id, count]) => {
    const option = baggageOptions.find(o => o.id === id);
    return sum + (option?.price || 0) * count;
  }, 0);

  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-secondary text-foreground border-border">
            <Luggage className="w-3 h-3 mr-1" /> Baggage
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Add Baggage to Your Trip
          </h2>
          <p className="text-muted-foreground">Pre-book your bags and save up to 40% vs. airport prices</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {baggageOptions.map((option) => {
            const Icon = option.icon;
            const count = selectedBags[option.id] || 0;
            const isSelected = count > 0;

            return (
              <div
                key={option.id}
                className={cn(
                  "relative p-5 rounded-2xl border transition-all",
                  isSelected 
                    ? "bg-primary/5 border-primary/30" 
                    : "bg-card/60 border-border/50 hover:border-border"
                )}
              >
                {option.included && (
                  <Badge className="absolute -top-2 -right-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    Included
                  </Badge>
                )}

                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center",
                    isSelected ? "bg-primary/20" : "bg-muted/50"
                  )}>
                    <Icon className={cn("w-7 h-7", isSelected ? "text-primary" : "text-muted-foreground")} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold">{option.name}</h3>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      <div className="text-right">
                        {option.price === 0 ? (
                          <span className="text-green-400 font-bold">Free</span>
                        ) : (
                          <span className="font-bold">${option.price}</span>
                        )}
                        <p className="text-xs text-muted-foreground">per bag</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span>{option.dimensions}</span>
                      <span>•</span>
                      <span>{option.weight}</span>
                    </div>

                    {!option.included && (
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Remove bag"
                          className="h-8 w-8"
                          onClick={() => updateBagCount(option.id, -1)}
                          disabled={count === 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-bold">{count}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Add bag"
                          className="h-8 w-8"
                          onClick={() => updateBagCount(option.id, 1)}
                          disabled={count >= 3}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {option.included && (
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <Check className="w-4 h-4" />
                        <span>1 bag included with your fare</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="via-card/50 rounded-2xl border border-border p-6 bg-secondary">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Luggage className="w-6 h-6 text-foreground" />
              </div>
              <div>
                <p className="font-bold">Baggage Summary</p>
                <p className="text-sm text-muted-foreground">
                  {Object.values(selectedBags).reduce((a, b) => a + b, 0)} bags selected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Additional Cost</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  ${totalPrice}
                </p>
              </div>
              <Button className="bg-secondary">
                <Check className="w-4 h-4 mr-2" />
                Add to Booking
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightBaggageOptions;
