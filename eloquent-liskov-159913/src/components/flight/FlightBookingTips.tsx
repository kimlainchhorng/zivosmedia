import { Lightbulb, Calendar, Clock, TrendingDown, Bell, Smartphone, CreditCard, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const tips = [
  {
    icon: Calendar,
    title: "Book 6-8 Weeks Ahead",
    description: "Domestic flights are cheapest 1-3 months before departure",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: TrendingDown,
    title: "Fly Mid-Week",
    description: "Tuesday and Wednesday often have the lowest fares",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: Clock,
    title: "Early or Late Flights",
    description: "6am and late night flights are typically cheaper",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: Bell,
    title: "Set Price Alerts",
    description: "Get notified when prices drop for your route",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    icon: Globe,
    title: "Be Flexible on Airports",
    description: "Check nearby airports - sometimes significantly cheaper",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  {
    icon: Smartphone,
    title: "Use Incognito Mode",
    description: "Prevent potential price increases from tracking cookies",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    icon: CreditCard,
    title: "Collect Miles",
    description: "Join airline loyalty programs - they're free to join",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Lightbulb,
    title: "Consider Stopovers",
    description: "Connecting flights can be 30-50% cheaper than direct",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
];

const FlightBookingTips = () => {
  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-transparent to-transparent">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-4">
            <Lightbulb className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium text-foreground">Pro Tips</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            Flight Booking Secrets
          </h2>
          <p className="text-muted-foreground">Insider tips for smarter travel planning</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {tips.map((tip, index) => {
            const Icon = tip.icon;
            return (
              <div
                key={tip.title}
                className={cn(
                  "group p-5 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm",
                  "transition-all duration-300 hover:border-sky-500/30 hover:shadow-md hover:-translate-y-0.5",
                  "animate-in fade-in slide-in-from-bottom-4"
                )}
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", tip.bg)}>
                  <Icon className={cn("w-5 h-5", tip.color)} />
                </div>
                <h3 className="font-bold text-sm mb-1 group-hover:text-foreground transition-colors">
                  {tip.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tip.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FlightBookingTips;
