import { Users, TrendingUp, Search, Plane, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const stats = [
  { label: "Airlines compared", value: "300+", icon: Plane },
  { label: "Routes covered", value: "10,000+", icon: Search },
  { label: "Partner-verified prices", value: "100%", icon: Shield },
];

const FlightSocialProof = () => {
  return (
    <section className="py-12 px-4 to-background bg-secondary">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
            <TrendingUp className="w-3 h-3 mr-1" /> Why ZIVO
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Find Better Flights, Faster
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            We compare prices across hundreds of airlines and travel partners so you don't have to.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-4 bg-card/50 backdrop-blur-xl border border-border/50 rounded-xl">
              <stat.icon className="w-6 h-6 text-foreground mx-auto mb-2" />
              <p className="text-2xl md:text-3xl font-bold text-foreground">
                {stat.value}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlightSocialProof;
