import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Clock, Calendar, CreditCard, Luggage, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const tips = [
  {
    icon: Calendar,
    title: "Book 6-8 Weeks Ahead",
    description: "Best prices are typically found 6-8 weeks before domestic flights and 2-8 months for international.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Clock,
    title: "Fly Mid-Week",
    description: "Tuesday and Wednesday flights are often 15-20% cheaper than weekend departures.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: CreditCard,
    title: "Use Price Alerts",
    description: "Set up price alerts for your routes and book when prices drop to your target.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Luggage,
    title: "Pack Light",
    description: "Avoid checked bag fees by packing efficiently in a carry-on. Save up to $60 round trip.",
    color: "from-emerald-500 to-green-500",
  },
  {
    icon: Smartphone,
    title: "Check-In Online",
    description: "Check in 24 hours before departure to secure better seats and save time at the airport.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Lightbulb,
    title: "Be Flexible",
    description: "Flexible dates can save you up to 30%. Use our calendar view to find the cheapest days.",
    color: "from-sky-500 to-blue-500",
  },
];

const FlightTravelTips = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 via-transparent bg-secondary" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border text-foreground text-sm font-medium mb-4">
            <Lightbulb className="w-4 h-4" />
            Pro Tips
          </div>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            Save More on <span className="text-accent-foreground">Every Flight</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Expert tips to find the best deals and travel smarter
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {tips.map((tip, index) => (
            <Card
              key={tip.title}
              className={cn(
                "glass-card overflow-hidden group cursor-pointer transition-all duration-300",
                "hover:border-sky-500/50 hover:-translate-y-1 touch-manipulation active:scale-[0.98]",
                "animate-in fade-in slide-in-from-bottom-4"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-5 sm:p-6">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  "bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110",
                  tip.color
                )}>
                  <tip.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-lg mb-2 group-hover:text-foreground transition-colors">
                  {tip.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tip.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlightTravelTips;
