import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Users, Plane, Globe, DollarSign, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlightSavingsStatsProps {
  className?: string;
}

export default function FlightSavingsStats({ className }: FlightSavingsStatsProps) {
  const stats = [
    {
      icon: DollarSign,
      value: "$847M",
      label: "Saved by travelers",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      icon: Users,
      value: "12M+",
      label: "Happy travelers",
      color: "text-sky-500",
      bgColor: "bg-sky-500/10",
    },
    {
      icon: Plane,
      value: "500+",
      label: "Airlines compared",
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
    {
      icon: Globe,
      value: "190+",
      label: "Countries covered",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: TrendingDown,
      value: "40%",
      label: "Average savings",
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
    },
    {
      icon: Clock,
      value: "24/7",
      label: "Price monitoring",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
  ];

  return (
    <section className={cn("py-10 sm:py-16", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12">
          <Badge className="mb-4 px-4 py-2 bg-primary/10 text-primary border-primary/20">
            <TrendingDown className="w-4 h-4 mr-2" />
            Our Impact
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Helping Travelers Save Big
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join millions of travelers who trust ZIVO to find the best flight deals
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat, index) => (
            <Card 
              key={stat.label}
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1.5"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-4 sm:p-6 text-center">
                <div className={cn(
                  "w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center",
                  stat.bgColor
                )}>
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
                <p className={cn("text-2xl sm:text-3xl font-bold mb-1", stat.color)}>
                  {stat.value}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
