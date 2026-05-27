import { Shield, BadgeDollarSign, Clock, Headphones, Award, Bell, Lock, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const guarantees = [
  { icon: BadgeDollarSign, title: "Price Drop Alerts", description: "Get notified instantly when prices drop on your saved routes", color: "text-green-400", bgColor: "bg-green-500/10" },
  { icon: Globe, title: "500+ Airlines", description: "Compare prices across all major and budget carriers worldwide", color: "text-blue-400", bgColor: "bg-blue-500/10" },
  { icon: Lock, title: "Secure Redirects", description: "Book directly with airlines through our verified partner links", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  { icon: Headphones, title: "Travel Support", description: "Our experts help you find the best flight options 24/7", color: "text-amber-400", bgColor: "bg-amber-500/10" },
];

const FlightPriceGuarantee = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden via-card/50 border border-border rounded-3xl p-8 md:p-12 bg-secondary">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary blur-3xl rounded-full" />

          <div className="relative z-10">
            <div className="text-center mb-10">
              <Badge className="mb-3 bg-secondary text-foreground border-border">
                <Shield className="w-3 h-3 mr-1" /> Search with Confidence
              </Badge>
              <h2 className="text-2xl md:text-4xl font-display font-bold mb-3">
                Why Travelers Trust ZIVO
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {guarantees.map((guarantee) => (
                <div key={guarantee.title} className="p-5 bg-card/60 backdrop-blur-xl rounded-xl border border-border/30">
                  <div className={`w-12 h-12 ${guarantee.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                    <guarantee.icon className={`w-6 h-6 ${guarantee.color}`} />
                  </div>
                  <h3 className="font-bold mb-2">{guarantee.title}</h3>
                  <p className="text-sm text-muted-foreground">{guarantee.description}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button size="lg" className="bg-secondary">
                <Award className="w-4 h-4 mr-2" />
                Start Searching Flights
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightPriceGuarantee;
