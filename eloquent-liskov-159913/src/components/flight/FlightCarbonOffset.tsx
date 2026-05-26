import { Leaf, TreePine, Recycle, Plane, ArrowRight, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const FlightCarbonOffset = () => {
  const carbonFootprint = 0.85; // tons CO2
  const offsetCost = 12.75;

  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-br from-green-500/10 via-card/50 to-emerald-500/10 border border-green-500/20 rounded-3xl p-8 md:p-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 blur-3xl rounded-full" />

          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge className="mb-4 bg-green-500/20 text-green-400 border-green-500/30">
                <Leaf className="w-3 h-3 mr-1" /> Fly Green
              </Badge>
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
                Offset Your Carbon Footprint
              </h2>
              <p className="text-muted-foreground mb-6">
                Make your travel more sustainable by offsetting your flight's carbon emissions through verified environmental projects.
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated CO₂ emissions</span>
                  <span className="font-bold text-lg">{carbonFootprint} tons</span>
                </div>
                <Progress value={45} className="h-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-400">Below average</span>
                  <span className="text-muted-foreground">Average: 1.5 tons</span>
                </div>
              </div>

              <div className="p-4 bg-green-500/10 rounded-xl mb-6 hover:bg-green-500/15 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TreePine className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="font-bold">Carbon Offset</p>
                      <p className="text-sm text-muted-foreground">Plant trees & support clean energy</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">${offsetCost}</p>
                    <p className="text-xs text-muted-foreground">one-time</p>
                  </div>
                </div>
              </div>

              <Button size="lg" className="w-full bg-gradient-to-r from-green-500 to-emerald-500">
                <Leaf className="w-4 h-4 mr-2" />
                Offset My Flight
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-card/60 backdrop-blur-xl rounded-xl border border-green-500/20 hover:border-green-500/40 hover:shadow-sm transition-all duration-200">
                <TreePine className="w-8 h-8 text-green-400 mb-3" />
                <p className="text-3xl font-bold">2.5M</p>
                <p className="text-sm text-muted-foreground">Trees planted</p>
              </div>
              <div className="p-5 bg-card/60 backdrop-blur-xl rounded-xl border border-green-500/20 hover:border-green-500/40 hover:shadow-sm transition-all duration-200">
                <Recycle className="w-8 h-8 text-emerald-400 mb-3" />
                <p className="text-3xl font-bold">50K</p>
                <p className="text-sm text-muted-foreground">Tons offset</p>
              </div>
              <div className="p-5 bg-card/60 backdrop-blur-xl rounded-xl border border-green-500/20 hover:border-green-500/40 hover:shadow-sm transition-all duration-200 col-span-2 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Calculator className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="font-bold">Carbon Calculator</p>
                    <p className="text-sm text-muted-foreground">See your environmental impact</p>
                  </div>
                  <ArrowRight className="w-5 h-5 ml-auto text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightCarbonOffset;
