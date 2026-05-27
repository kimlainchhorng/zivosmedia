import { useNavigate } from "react-router-dom";
import { 
  Plane, 
  Hotel, 
  Car, 
  ArrowRight, 
  Sparkles,
  X,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CrossSellBannerProps {
  currentService: "flight" | "hotel" | "car";
  destination?: string;
  dates?: string;
  className?: string;
  dismissible?: boolean;
}

const serviceData = {
  flight: {
    suggestService: "hotel",
    icon: Hotel,
    title: "Add a hotel",
    description: "Save 20% when you bundle",
    href: "/book-hotel",
    gradient: "from-amber-500/20 to-orange-500/10",
    iconBg: "bg-amber-500",
    textColor: "text-amber-600"
  },
  hotel: {
    suggestService: "car",
    icon: Car,
    title: "Need a car?",
    description: "Pick up at your hotel",
    href: "/rent-car",
    gradient: "from-emerald-500/20 to-teal-500/10",
    iconBg: "bg-emerald-500",
    textColor: "text-emerald-600"
  },
  car: {
    suggestService: "flight",
    icon: Plane,
    title: "Flying there?",
    description: "Book flights & save 15%",
    href: "/book-flight",
    gradient: "from-muted to-muted",
    iconBg: "bg-sky-500",
    textColor: "text-sky-600"
  }
};

const CrossSellBanner = ({ 
  currentService, 
  destination,
  dates,
  className,
  dismissible = true
}: CrossSellBannerProps) => {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);
  
  if (isDismissed) return null;
  
  const data = serviceData[currentService];
  const Icon = data.icon;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-primary/20",
      `bg-gradient-to-r ${data.gradient}`,
      className
    )}>
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative p-4 flex items-center gap-4">
        {/* Icon */}
        <div className={cn("p-3 rounded-xl shrink-0 shadow-lg", data.iconBg)}>
          <Icon className="w-6 h-6 text-primary-foreground" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-semibold">{data.title}</h4>
            <Badge variant="secondary" className="bg-white/50 text-xs px-1.5">
              <Gift className="w-3 h-3 mr-1" />
              Bundle Deal
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.description}
            {destination && ` in ${destination}`}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button 
            size="sm"
            className="bg-gradient-to-r from-primary to-teal-500"
            onClick={() => navigate(data.href)}
          >
            Add
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          
          {dismissible && (
            <button type="button"
              onClick={() => setIsDismissed(true)}
              className="p-2 rounded-xl hover:bg-black/5 transition-all duration-200 active:scale-[0.90] touch-manipulation"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrossSellBanner;
