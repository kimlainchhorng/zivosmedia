import { Plane, Armchair, UtensilsCrossed, Wifi, Luggage, Check, X, Crown, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const cabinClasses: { name: string; Icon: LucideIcon; color: string; priceRange: string; seatPitch: string; seatWidth: string; features: { meal: string; drinks: string; wifi: string; lounge: boolean; priority: boolean; luggage: string } }[] = [
  {
    name: "Economy",
    Icon: Plane,
    color: "from-slate-500 to-gray-500",
    priceRange: "$",
    seatPitch: "28-32\"",
    seatWidth: "17-18\"",
    features: {
      meal: "Snacks/Buy",
      drinks: "Non-alcoholic",
      wifi: "Available ($)",
      lounge: false,
      priority: false,
      luggage: "Personal + Carry-on",
    },
  },
  {
    name: "Premium Economy",
    Icon: Armchair,
    color: "from-blue-500 to-cyan-500",
    priceRange: "$$",
    seatPitch: "34-38\"",
    seatWidth: "18-19\"",
    features: {
      meal: "Enhanced",
      drinks: "Including alcohol",
      wifi: "Often included",
      lounge: false,
      priority: true,
      luggage: "Extra baggage",
    },
  },
  {
    name: "Business",
    Icon: Crown,
    color: "from-violet-500 to-purple-500",
    priceRange: "$$$",
    seatPitch: "Lie-flat beds",
    seatWidth: "20-23\"",
    features: {
      meal: "Multi-course",
      drinks: "Premium bar",
      wifi: "Included",
      lounge: true,
      priority: true,
      luggage: "2 checked bags",
    },
  },
  {
    name: "First Class",
    Icon: Sparkles,
    color: "from-amber-500 to-orange-500",
    priceRange: "$$$$",
    seatPitch: "Private suites",
    seatWidth: "23\"+ / Suites",
    features: {
      meal: "On-demand dining",
      drinks: "Champagne & caviar",
      wifi: "High-speed",
      lounge: true,
      priority: true,
      luggage: "3+ checked bags",
    },
  },
];

const FlightClassComparison = () => {
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-4">
            <Armchair className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium text-foreground">Cabin Classes</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            Compare Flight Classes
          </h2>
          <p className="text-muted-foreground">Find the right experience for your journey</p>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="grid grid-cols-4 gap-4 min-w-[800px] max-w-5xl mx-auto">
            {cabinClasses.map((cabin, index) => (
              <div
                key={cabin.name}
                className={cn(
                  "p-5 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm",
                  "animate-in fade-in slide-in-from-bottom-4"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-center mb-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3",
                    "bg-gradient-to-br", cabin.color
                  )}>
                    <cabin.Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold text-lg">{cabin.name}</h3>
                  <p className="text-foreground font-bold">{cabin.priceRange}</p>
                </div>

                <div className="space-y-4">
                  <div className="pb-3 border-b border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Seat Pitch</p>
                    <p className="font-medium text-sm">{cabin.seatPitch}</p>
                  </div>
                  <div className="pb-3 border-b border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Seat Width</p>
                    <p className="font-medium text-sm">{cabin.seatWidth}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
                      <span>{cabin.features.meal}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Wifi className="w-4 h-4 text-muted-foreground" />
                      <span>{cabin.features.wifi}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Luggage className="w-4 h-4 text-muted-foreground" />
                      <span>{cabin.features.luggage}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {cabin.features.lounge ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span>Lounge Access</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 text-muted-foreground/50" />
                          <span className="text-muted-foreground">No Lounge</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {cabin.features.priority ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span>Priority Boarding</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 text-muted-foreground/50" />
                          <span className="text-muted-foreground">Standard Boarding</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightClassComparison;
