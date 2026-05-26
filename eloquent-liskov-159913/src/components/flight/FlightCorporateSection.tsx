import { Briefcase, Check, Clock, Crown, Plane, Users, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const corporateFeatures = [
  "Dedicated account manager",
  "Volume-based discounts",
  "Centralized billing",
  "Travel policy integration",
  "Priority rebooking",
  "Expense reporting tools",
];

const FlightCorporateSection = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-br from-card via-muted to-card border border-border rounded-3xl p-8 md:p-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 blur-3xl rounded-full" />

          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge className="mb-4 bg-secondary text-foreground border-border">
                <Briefcase className="w-3 h-3 mr-1" /> For Business
              </Badge>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-foreground">
                ZIVO for Enterprise
              </h2>
              <p className="text-muted-foreground mb-6">
                Streamline your corporate travel with dedicated tools, volume discounts, and premium support.
              </p>

              <ul className="space-y-3 mb-8">
                {corporateFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-5 h-5 text-foreground" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="flex gap-4">
                <Button size="lg" className="bg-foreground hover:bg-foreground text-primary-foreground">
                  Request Demo <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-muted">
                  Learn More
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-muted/50 rounded-xl border border-border">
                <Crown className="w-8 h-8 text-amber-400 mb-3" />
                <p className="text-2xl font-bold text-foreground">500+</p>
                <p className="text-sm text-muted-foreground">Enterprise clients</p>
              </div>
              <div className="p-5 bg-muted/50 rounded-xl border border-border">
                <Users className="w-8 h-8 text-foreground mb-3" />
                <p className="text-2xl font-bold text-foreground">1M+</p>
                <p className="text-sm text-muted-foreground">Business travelers</p>
              </div>
              <div className="p-5 bg-muted/50 rounded-xl border border-border">
                <Plane className="w-8 h-8 text-green-400 mb-3" />
                <p className="text-2xl font-bold text-foreground">35%</p>
                <p className="text-sm text-muted-foreground">Avg savings</p>
              </div>
              <div className="p-5 bg-muted/50 rounded-xl border border-border">
                <Clock className="w-8 h-8 text-foreground mb-3" />
                <p className="text-2xl font-bold text-foreground">24/7</p>
                <p className="text-sm text-muted-foreground">Priority support</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightCorporateSection;