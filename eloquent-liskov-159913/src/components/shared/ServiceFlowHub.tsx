import { useNavigate } from "react-router-dom";
import { 
  Car, 
  Plane, 
  Hotel, 
  UtensilsCrossed,
  Package,
  Shield,
  Ticket,
  Train,
  ArrowRight,
  Sparkles,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ServiceStep {
  id: string;
  label: string;
  icon: typeof Plane;
  href: string;
  color: string;
  bgColor: string;
  completed?: boolean;
  active?: boolean;
}

interface ServiceFlowHubProps {
  currentService?: string;
  className?: string;
}

const allServices: ServiceStep[] = [
  { id: "flight", label: "Flights", icon: Plane, href: "/flights", color: "text-sky-500", bgColor: "bg-sky-500/10" },
  { id: "hotel", label: "Hotels", icon: Hotel, href: "/hotels", color: "text-amber-500", bgColor: "bg-amber-500/10" },
  { id: "car", label: "Cars", icon: Car, href: "/rent-car", color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  { id: "ride", label: "Rides", icon: Car, href: "/rides/hub", color: "text-green-500", bgColor: "bg-green-500/10" },
  { id: "eats", label: "Eats", icon: UtensilsCrossed, href: "/eats", color: "text-orange-500", bgColor: "bg-orange-500/10" },
  { id: "activities", label: "Things To Do", icon: Ticket, href: "/things-to-do", color: "text-purple-500", bgColor: "bg-purple-500/10" },
  { id: "insurance", label: "Insurance", icon: Shield, href: "/travel-insurance", color: "text-blue-500", bgColor: "bg-blue-500/10" },
];

const ServiceFlowHub = ({ currentService, className }: ServiceFlowHubProps) => {
  const navigate = useNavigate();

  // Highlight recommended services based on current context
  const getRecommendedServices = () => {
    if (!currentService) return allServices.slice(0, 6);
    
    const recommendations: Record<string, string[]> = {
      flight: ["hotel", "car", "insurance", "events"],
      hotel: ["car", "food", "events", "transport"],
      car: ["hotel", "insurance", "events"],
      ride: ["food", "package"],
      food: ["ride", "package"],
    };
    
    const recommended = recommendations[currentService] || [];
    return allServices.filter(s => recommended.includes(s.id));
  };

  const recommendedServices = getRecommendedServices();
  const otherServices = allServices.filter(
    s => !recommendedServices.find(r => r.id === s.id) && s.id !== currentService
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-teal-500/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Complete Your Journey</CardTitle>
            <p className="text-sm text-muted-foreground">
              {currentService ? "Recommended add-ons" : "All services in one place"}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 space-y-4">
        {/* Recommended Services */}
        {recommendedServices.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">
                Recommended
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {recommendedServices.map((service) => (
                <button type="button"
                  key={service.id}
                  onClick={() => navigate(service.href)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border border-primary/20 hover:bg-primary/5 transition-all group",
                    service.bgColor
                  )}
                >
                  <div className={cn("p-2 rounded-xl", service.bgColor)}>
                    <service.icon className={cn("w-5 h-5", service.color)} />
                  </div>
                  <span className="text-sm font-medium">{service.label}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Other Services */}
        <div>
          <p className="text-xs text-muted-foreground mb-3">More services</p>
          <div className="flex flex-wrap gap-2">
            {otherServices.slice(0, 5).map((service) => (
              <button type="button"
                key={service.id}
                onClick={() => navigate(service.href)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-200 active:scale-[0.97] touch-manipulation"
              >
                <service.icon className={cn("w-4 h-4", service.color)} />
                <span className="text-sm">{service.label}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceFlowHub;
