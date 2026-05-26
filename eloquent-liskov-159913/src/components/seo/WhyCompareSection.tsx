import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  DollarSign, 
  Shield, 
  Clock, 
  TrendingDown,
  Globe,
  Zap,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Search,
    title: "Search 500+ Airlines",
    description: "Compare prices across hundreds of airlines and travel sites in one search.",
    color: "text-sky-500",
    bgColor: "bg-sky-500/10",
  },
  {
    icon: TrendingDown,
    title: "Find the Best Deals",
    description: "Our algorithms identify hidden deals and error fares to save you money.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Zap,
    title: "Real-Time Prices",
    description: "Get up-to-date prices from airlines and OTAs with live availability.",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "Book with Confidence",
    description: "We redirect you to trusted partners for secure, direct booking.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: DollarSign,
    title: "No Hidden Fees",
    description: "See all-inclusive prices upfront. No surprise charges from ZIVO.",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
  {
    icon: Clock,
    title: "24/7 Price Monitoring",
    description: "Set alerts and we'll notify you when prices drop on your routes.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
];

export default function WhyCompareSection() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-4 px-4 py-2 bg-primary/10 text-primary border-primary/20">
            <Globe className="w-4 h-4 mr-2" />
            Why ZIVO
          </Badge>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            Why Compare Flights with ZIVO?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We're not an airline or travel agency. We're your flight comparison partner, 
            helping you find the best prices without bias.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <Card 
              key={benefit.title}
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1.5"
            >
              <CardContent className="p-6">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  benefit.bgColor
                )}>
                  <benefit.icon className={cn("w-6 h-6", benefit.color)} />
                </div>
                <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Statement */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-400">
              Trusted by millions of travelers worldwide
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
