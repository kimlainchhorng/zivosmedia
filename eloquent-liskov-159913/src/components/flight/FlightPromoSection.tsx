import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Zap, 
  Gift, 
  Clock, 
  ArrowRight,
  Percent,
  Star,
  Crown,
  Flame,
  Timer,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FlightPromoSectionProps {
  className?: string;
  onPromoClick?: (promoCode: string) => void;
}

export default function FlightPromoSection({ className, onPromoClick }: FlightPromoSectionProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const promos = [
    {
      id: "flash",
      type: "flash",
      title: "Flash Sale",
      subtitle: "48-Hour Deal",
      description: "Up to 40% off on premium flights",
      code: "FLASH40",
      discount: "40% OFF",
      bgGradient: "from-orange-500 via-red-500 to-pink-500",
      icon: Flame,
      iconBg: "bg-orange-500/20",
      badge: "Ends Soon",
      badgeColor: "bg-red-500 text-primary-foreground",
      features: ["Business Class", "Premium Economy", "Lounge Access"],
      countdown: { hours: 47, minutes: 32 },
    },
    {
      id: "member",
      type: "member",
      title: "Member Exclusive",
      subtitle: "ZIVO Miles Bonus",
      description: "Double miles on all bookings",
      code: "MILES2X",
      discount: "2X MILES",
      bgGradient: "from-amber-500 via-yellow-500 to-orange-400",
      icon: Crown,
      iconBg: "bg-amber-500/20",
      badge: "VIP Only",
      badgeColor: "bg-gradient-to-r from-amber-500 to-yellow-500 text-primary-foreground",
      features: ["Priority Boarding", "Seat Upgrade", "Free Baggage"],
    },
    {
      id: "first",
      type: "first",
      title: "First Time Flyer",
      subtitle: "Welcome Offer",
      description: "Get $50 off your first booking",
      code: "WELCOME50",
      discount: "$50 OFF",
      bgGradient: "from-sky-500 via-blue-500 to-indigo-500",
      icon: Gift,
      iconBg: "bg-sky-500/20",
      badge: "New User",
      badgeColor: "bg-sky-500 text-primary-foreground",
      features: ["No Minimum", "Any Destination", "Any Airline"],
    },
    {
      id: "weekend",
      type: "weekend",
      title: "Weekend Getaway",
      subtitle: "Special Rates",
      description: "20% off weekend flights",
      code: "WEEKEND20",
      discount: "20% OFF",
      bgGradient: "from-emerald-500 via-teal-500 to-cyan-500",
      icon: Sparkles,
      iconBg: "bg-emerald-500/20",
      badge: "Popular",
      badgeColor: "bg-emerald-500 text-primary-foreground",
      features: ["Fri-Sun Travel", "Domestic Flights", "Economy Class"],
    },
  ];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    onPromoClick?.(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <section className={cn("py-12", className)}>
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-10">
          <Badge className="mb-4 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 border-amber-500/30">
            <Zap className="w-4 h-4 mr-2" />
            Exclusive Deals
          </Badge>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Save More on Your Next Flight
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Unlock special discounts and rewards with our limited-time offers
          </p>
        </div>

        {/* Promo Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {promos.map((promo, index) => (
            <Card
              key={promo.id}
              className="relative overflow-hidden border-0 bg-card/50 backdrop-blur-xl hover:shadow-2xl transition-all duration-500 group animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Gradient Top Border */}
              <div className={cn(
                "h-1.5 bg-gradient-to-r",
                promo.bgGradient
              )} />
              
              {/* Background Glow */}
              <div className={cn(
                "absolute top-0 left-0 right-0 h-40 bg-gradient-to-b opacity-10 group-hover:opacity-20 transition-opacity",
                promo.bgGradient
              )} />

              <CardContent className="p-6 relative">
                {/* Badge */}
                <Badge className={cn("absolute top-4 right-4 text-xs font-semibold", promo.badgeColor)}>
                  {promo.badge}
                </Badge>

                {/* Icon */}
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                  promo.iconBg
                )}>
                  <promo.icon className={cn(
                    "w-7 h-7",
                    promo.type === "flash" ? "text-orange-500" :
                    promo.type === "member" ? "text-amber-500" :
                    promo.type === "first" ? "text-sky-500" : "text-emerald-500"
                  )} />
                </div>

                {/* Content */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                    {promo.subtitle}
                  </p>
                  <h3 className="text-xl font-bold mb-2">{promo.title}</h3>
                  <p className="text-sm text-muted-foreground">{promo.description}</p>
                </div>

                {/* Discount Badge */}
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r text-primary-foreground font-bold text-lg mb-4",
                  promo.bgGradient
                )}>
                  <Percent className="w-4 h-4" />
                  {promo.discount}
                </div>

                {/* Features */}
                <div className="space-y-2 mb-4">
                  {promo.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Countdown (for flash sales) */}
                {promo.countdown && (
                  <div className="flex items-center gap-2 mb-4 text-sm">
                    <Timer className="w-4 h-4 text-orange-500 animate-pulse" />
                    <span className="text-muted-foreground">Ends in:</span>
                    <span className="font-mono font-bold text-orange-500">
                      {promo.countdown.hours}h {promo.countdown.minutes}m
                    </span>
                  </div>
                )}

                {/* CTA */}
                <Button
                  onClick={() => handleCopyCode(promo.code)}
                  className={cn(
                    "w-full font-semibold transition-all",
                    copiedCode === promo.code
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : "bg-gradient-to-r hover:opacity-90",
                    promo.bgGradient
                  )}
                >
                  {copiedCode === promo.code ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      Use Code: {promo.code}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
