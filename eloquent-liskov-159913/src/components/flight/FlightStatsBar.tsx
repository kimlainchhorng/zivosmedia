import { Badge } from "@/components/ui/badge";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { 
  Plane, 
  Users, 
  Star, 
  Globe, 
  Shield, 
  Zap,
  TrendingUp,
  Award,
  Clock,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FlightStatsBarProps {
  className?: string;
}

export default function FlightStatsBar({ className }: FlightStatsBarProps) {
  const stats = [
    { 
      icon: Plane, 
      value: 500, 
      suffix: "+",
      label: "Airlines", 
      color: "text-sky-500",
      bgColor: "bg-sky-500/10"
    },
    { 
      icon: Globe, 
      value: 15000, 
      suffix: "+",
      label: "Routes", 
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    { 
      icon: Users, 
      value: 2.5,
      suffix: "M+",
      label: "Happy Travelers", 
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    { 
      icon: Star, 
      value: 4.9, 
      label: "Rating", 
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    },
  ];

  const trustBadges = [
    { icon: Shield, label: "Secure Booking", color: "text-emerald-500" },
    { icon: CheckCircle, label: "Verified Airlines", color: "text-blue-500" },
    { icon: Award, label: "Best Price Guarantee", color: "text-amber-500" },
    { icon: Clock, label: "24/7 Support", color: "text-sky-500" },
  ];

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Background gradient */}
      <div className="absolute inset-0 via-transparent bg-secondary" />
      
      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="flex flex-col items-center p-4 rounded-2xl bg-card/50 backdrop-blur-xl border border-border/50 hover:border-border transition-all duration-200 group animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                stat.bgColor
              )}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className={cn("text-3xl font-bold", stat.color)}>
                  {typeof stat.value === 'number' && stat.value >= 100 ? (
                    <AnimatedCounter 
                      value={stat.value} 
                      duration={2} 
                      decimals={stat.value % 1 !== 0 ? 1 : 0}
                    />
                  ) : (
                    stat.value
                  )}
                </span>
                {stat.suffix && (
                  <span className={cn("text-xl font-semibold", stat.color)}>{stat.suffix}</span>
                )}
              </div>
              <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Trust Badges Marquee */}
        <div className="relative overflow-hidden py-4">
          <div className="flex items-center justify-center gap-6 flex-wrap md:flex-nowrap">
            {trustBadges.map((badge, index) => (
              <div
                key={badge.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-xl border border-border/50 hover:border-border transition-all duration-200 animate-in fade-in"
                style={{ animationDelay: `${(index + 4) * 100}ms` }}
              >
                <badge.icon className={cn("w-4 h-4", badge.color)} />
                <span className="text-sm font-medium text-foreground">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Indicator */}
        <div className="flex justify-center mt-4">
          <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 px-4 py-1.5 gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Zap className="w-3.5 h-3.5" />
            Live Prices Updated
            <TrendingUp className="w-3.5 h-3.5 ml-1" />
          </Badge>
        </div>
      </div>
    </div>
  );
}
