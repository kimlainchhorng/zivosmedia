import { Package, Check, Sparkles, ArrowRight, Percent, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const bundles = [
  {
    id: "economy",
    name: "Economy Bundle",
    price: 49,
    savings: 35,
    popular: false,
    features: ["Checked bag (23kg)", "Seat selection", "Priority boarding"],
    color: "from-muted-foreground to-muted-foreground/80",
  },
  {
    id: "comfort",
    name: "Comfort Bundle",
    price: 99,
    savings: 65,
    popular: true,
    features: ["2 Checked bags", "Extra legroom seat", "Priority boarding", "Lounge access", "Flexible rebooking"],
    color: "from-sky-500 to-blue-600",
  },
  {
    id: "premium",
    name: "Premium Bundle",
    price: 199,
    savings: 120,
    popular: false,
    features: ["3 Checked bags", "Business class seat", "Priority everything", "Lounge access", "Full flexibility", "Travel insurance"],
    color: "from-amber-500 to-orange-600",
  },
];

const FlightBundleDeals = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-secondary text-foreground border-border">
            <Package className="w-3 h-3 mr-1" /> Bundle & Save
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Upgrade Your Journey
          </h2>
          <p className="text-muted-foreground">
            Save up to 40% with our curated travel bundles
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className={`relative bg-card/50 backdrop-blur-xl border rounded-2xl p-6 transition-all duration-200 hover:scale-[1.03] hover:shadow-lg ${
                bundle.popular ? "border-sky-500/50 ring-2 ring-sky-500/20" : "border-border/50"
              }`}
            >
              {bundle.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-foreground text-primary-foreground border-0">
                    <Star className="w-3 h-3 mr-1" /> Most Popular
                  </Badge>
                </div>
              )}

              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${bundle.color} flex items-center justify-center mb-4`}>
                <Package className="w-7 h-7 text-primary-foreground" />
              </div>

              <h3 className="text-xl font-bold mb-2">{bundle.name}</h3>
              
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold">${bundle.price}</span>
                <Badge className="bg-green-500/20 text-green-400 border-0">
                  <Percent className="w-3 h-3 mr-1" /> Save ${bundle.savings}
                </Badge>
              </div>

              <ul className="space-y-2 mb-6">
                {bundle.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full ${bundle.popular ? "bg-gradient-to-r from-sky-500 to-blue-600" : ""}`}
                variant={bundle.popular ? "default" : "outline"}
              >
                Select Bundle <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlightBundleDeals;
