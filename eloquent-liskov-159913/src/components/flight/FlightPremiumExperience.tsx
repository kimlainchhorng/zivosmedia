import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plane, 
  Users, 
  Star, 
  Sparkles,
  Crown,
  Shield,
  Headphones,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FlightPremiumExperienceProps {
  className?: string;
}

export default function FlightPremiumExperience({ className }: FlightPremiumExperienceProps) {
  const experiences = [
    {
      icon: Crown,
      title: "First & Business Class",
      description: "Lie-flat seats, gourmet dining, and premium lounges with exclusive amenities",
      features: ["Priority Boarding", "Lounge Access", "Extra Baggage"],
      gradient: "from-amber-500 via-yellow-500 to-orange-400",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-500",
    },
    {
      icon: Plane,
      title: "Global Network",
      description: "Access 500+ airlines flying to 15,000+ routes across all continents",
      features: ["190+ Countries", "Direct Flights", "Alliance Partners"],
      gradient: "from-muted to-muted",
      iconBg: "bg-sky-500/20",
      iconColor: "text-sky-500",
    },
    {
      icon: Shield,
      title: "Travel Protection",
      description: "Comprehensive coverage including cancellation, delays, and medical emergencies",
      features: ["Trip Insurance", "24/7 Assistance", "Refund Guarantee"],
      gradient: "from-emerald-500 via-teal-500 to-green-500",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-500",
    },
  ];

  const trustBadges = [
    { icon: Star, label: "4.9 Rating", value: "2.5M+ Reviews" },
    { icon: Users, label: "Trusted by", value: "5M+ Travelers" },
    { icon: Headphones, label: "Support", value: "24/7 Available" },
    { icon: Zap, label: "Fast Booking", value: "Under 2 mins" },
  ];

  return (
    <section className={cn("py-10 sm:py-16 relative overflow-hidden", className)}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />
      <div className="absolute top-20 right-10 w-64 h-64 bg-secondary rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12">
          <Badge className="mb-3 sm:mb-4 px-3 sm:px-4 py-1.5 sm:py-2 text-foreground border-border text-xs sm:text-sm bg-secondary">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Premium Experience
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">
            Fly with Confidence
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Experience world-class travel with our premium partnerships
          </p>
        </div>

        {/* Experience Cards */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-12">
          {experiences.map((exp, index) => (
            <Card
              key={exp.title}
              className="relative overflow-hidden border-0 bg-card/50 backdrop-blur-xl group hover:shadow-xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Top gradient */}
              <div className={cn("h-1 bg-gradient-to-r", exp.gradient)} />
              
              {/* Background glow */}
              <div className={cn(
                "absolute top-0 left-0 right-0 h-40 bg-gradient-to-b opacity-10 group-hover:opacity-20 transition-opacity",
                exp.gradient
              )} />

              <CardContent className="p-5 sm:p-6 relative">
                {/* Icon */}
                <div className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                  exp.iconBg
                )}>
                  <exp.icon className={cn("w-6 h-6 sm:w-7 sm:h-7", exp.iconColor)} />
                </div>

                {/* Content */}
                <h3 className="font-display text-lg sm:text-xl font-bold mb-2">{exp.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{exp.description}</p>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  {exp.features.map((feature) => (
                    <Badge key={feature} variant="outline" className="text-xs bg-muted/50">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {trustBadges.map((badge, index) => (
            <div
              key={badge.label}
              className="flex flex-col items-center p-3 sm:p-4 rounded-xl bg-card/50 backdrop-blur-xl border border-border/50 hover:border-border transition-all animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${(index + 3) * 100}ms` }}
            >
              <badge.icon className="w-5 h-5 sm:w-6 sm:h-6 text-foreground mb-2" />
              <p className="text-lg sm:text-xl font-bold text-foreground">{badge.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{badge.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
