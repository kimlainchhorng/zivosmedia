import { Snowflake, Sun, Leaf, Flower2, Gift, Sparkles, ArrowRight, Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const seasons = [
  {
    id: "winter",
    name: "Winter Escapes",
    icon: Snowflake,
    color: "from-blue-400 to-cyan-500",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
    savings: "Up to $200 off",
    description: "Ski resorts & tropical getaways",
    routes: ["NYC → Aspen", "LA → Maui", "Chicago → Cancun"],
  },
  {
    id: "spring",
    name: "Spring Blooms",
    icon: Flower2,
    color: "from-pink-400 to-rose-500",
    bgColor: "bg-pink-500/10",
    textColor: "text-pink-400",
    savings: "Up to $150 off",
    description: "Cherry blossoms & European cities",
    routes: ["SFO → Tokyo", "NYC → Paris", "LA → Amsterdam"],
  },
  {
    id: "summer",
    name: "Summer Adventures",
    icon: Sun,
    color: "from-amber-400 to-orange-500",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-400",
    savings: "Up to $250 off",
    description: "Beach destinations & festivals",
    routes: ["MIA → Barcelona", "NYC → Ibiza", "LA → Bali"],
  },
  {
    id: "fall",
    name: "Autumn Journeys",
    icon: Leaf,
    color: "from-orange-400 to-red-500",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-400",
    savings: "Up to $175 off",
    description: "Foliage tours & wine regions",
    routes: ["Boston → Munich", "DC → Rome", "SEA → Kyoto"],
  },
];

const FlightSeasonalDeals = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 text-foreground border-border bg-secondary">
            <Gift className="w-3 h-3 mr-1" /> Seasonal Specials
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Fly More, Save More
          </h2>
          <p className="text-muted-foreground">
            Explore seasonal travel options
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {seasons.map((season) => (
            <div
              key={season.id}
              className="group relative overflow-hidden bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:border-border transition-all"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${season.color} opacity-10 blur-3xl`} />

              <div className={`w-14 h-14 rounded-xl ${season.bgColor} flex items-center justify-center mb-4`}>
                <season.icon className={`w-7 h-7 ${season.textColor}`} />
              </div>

              <h3 className="font-bold text-lg mb-2">{season.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{season.description}</p>

              <Badge className={`${season.bgColor} ${season.textColor} border-0 mb-4`}>
                <Sparkles className="w-3 h-3 mr-1" />
                {season.savings}
              </Badge>

              <div className="space-y-1 mb-4">
                <p className="text-xs text-muted-foreground">Popular routes:</p>
                {season.routes.map((route) => (
                  <div key={route} className="flex items-center gap-1 text-xs">
                    <Plane className="w-3 h-3 text-foreground" />
                    {route}
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full group-hover:bg-foreground group-hover:text-primary-foreground transition-colors" size="sm">
                Explore <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlightSeasonalDeals;
