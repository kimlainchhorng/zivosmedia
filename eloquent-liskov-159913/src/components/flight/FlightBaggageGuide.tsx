import { Luggage, Briefcase, ShoppingBag, AlertCircle, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const baggageTypes = [
  {
    type: "Personal Item",
    icon: ShoppingBag,
    color: "from-green-500 to-emerald-500",
    size: "40 x 30 x 15 cm",
    weight: "Varies by airline",
    included: true,
    examples: ["Purse", "Small backpack", "Laptop bag"],
    tips: "Must fit under the seat in front of you",
  },
  {
    type: "Carry-On",
    icon: Briefcase,
    color: "from-blue-500 to-cyan-500",
    size: "55 x 40 x 23 cm",
    weight: "7-10 kg typically",
    included: "Often included",
    examples: ["Small suitcase", "Large backpack", "Duffel bag"],
    tips: "Fits in overhead bin. Verify with your airline",
  },
  {
    type: "Checked Baggage",
    icon: Luggage,
    color: "from-violet-500 to-purple-500",
    size: "Up to 158 cm total",
    weight: "23 kg standard",
    included: "May have fees",
    examples: ["Large suitcase", "Sports equipment", "Heavy items"],
    tips: "Book in advance for best rates",
  },
];

const restrictions = [
  "Liquids over 100ml in carry-on",
  "Sharp objects (scissors, knives)",
  "Flammable items",
  "Lithium batteries in checked bags",
  "Sporting goods (bats, clubs) in cabin",
];

const FlightBaggageGuide = () => {
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-4">
            <Luggage className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium text-foreground">Baggage Guide</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            Baggage Allowances
          </h2>
          <p className="text-muted-foreground">Know what you can bring on your flight</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
          {baggageTypes.map((bag, index) => {
            const Icon = bag.icon;
            return (
              <div
                key={bag.type}
                className={cn(
                  "p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-sky-500/20 hover:shadow-sm transition-all duration-200",
                  "animate-in fade-in slide-in-from-bottom-4"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-4",
                  "bg-gradient-to-br", bag.color
                )}>
                  <Icon className="w-7 h-7 text-primary-foreground" />
                </div>

                <h3 className="font-bold text-lg mb-3">{bag.type}</h3>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Max Size</span>
                    <span className="font-medium">{bag.size}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Weight</span>
                    <span className="font-medium">{bag.weight}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Included</span>
                    <span className={cn(
                      "font-medium",
                      bag.included === true ? "text-green-400" : "text-amber-400"
                    )}>
                      {bag.included === true ? "Yes" : bag.included}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {bag.examples.map((example) => (
                      <span
                        key={example}
                        className="px-2 py-1 text-xs rounded-lg bg-muted/50"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-muted/30">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{bag.tips}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Restrictions */}
        <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-lg">Prohibited Items</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {restrictions.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightBaggageGuide;
