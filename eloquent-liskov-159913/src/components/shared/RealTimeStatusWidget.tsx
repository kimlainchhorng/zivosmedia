import { useState, useEffect } from "react";
import { 
  Radio, 
  Plane, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RealTimeStatusWidgetProps {
  className?: string;
  flightNumber?: string;
  departureCode?: string;
  arrivalCode?: string;
  departureTime?: string;
  flightStatus?: "on-time" | "delayed" | "boarding" | "departed";
}

interface StatusUpdate {
  id: string;
  type: "flight" | "gate" | "delay" | "boarding";
  message: string;
  time: string;
  status: "info" | "warning" | "success";
}

const statusColors = {
  info: "text-sky-400 bg-sky-500/10",
  warning: "text-amber-400 bg-amber-500/10",
  success: "text-emerald-400 bg-emerald-500/10",
};

const statusIcons = {
  flight: Plane,
  gate: ArrowRight,
  delay: AlertTriangle,
  boarding: CheckCircle2,
};

const RealTimeStatusWidget = ({ 
  className,
  flightNumber = "AA 1234",
  departureCode = "JFK",
  arrivalCode = "CDG",
  departureTime = "10:30 AM",
  flightStatus = "on-time"
}: RealTimeStatusWidgetProps) => {
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("Just now");

  // Generate dynamic updates based on props
  const dynamicUpdates: StatusUpdate[] = [
    { id: "1", type: "flight", message: `Flight ${flightNumber} is ${flightStatus === "on-time" ? "on time" : flightStatus}`, time: "2 min ago", status: flightStatus === "on-time" ? "success" : "warning" },
    { id: "2", type: "gate", message: "Gate assigned: B24", time: "5 min ago", status: "info" },
    { id: "3", type: "boarding", message: `Boarding begins in 45 min`, time: "10 min ago", status: "info" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate("Just now");
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusBadgeConfig = {
    "on-time": { label: "On Time", className: "bg-emerald-500/20 text-emerald-400" },
    "delayed": { label: "Delayed", className: "bg-red-500/20 text-red-400" },
    "boarding": { label: "Boarding", className: "bg-amber-500/20 text-amber-400" },
    "departed": { label: "Departed", className: "bg-sky-500/20 text-sky-400" }
  };

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-4 h-4 text-primary" />
            {isLive && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            )}
          </div>
          <h3 className="font-semibold text-sm">Live Updates</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3" />
          {lastUpdate}
        </div>
      </div>

      {/* Flight Status Bar */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 border border-emerald-500/20 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium">{flightNumber}</span>
          </div>
          <Badge className={statusBadgeConfig[flightStatus].className}>
            {statusBadgeConfig[flightStatus].label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>{departureCode}</span>
          <ArrowRight className="w-3 h-3" />
          <span>{arrivalCode}</span>
          <span className="ml-auto">Departs {departureTime}</span>
        </div>
      </div>

      {/* Updates List */}
      <div className="space-y-2">
        {dynamicUpdates.map((update) => {
          const Icon = statusIcons[update.type];
          return (
            <div
              key={update.id}
              className="flex items-start gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors"
            >
              <div className={cn("p-1.5 rounded-xl", statusColors[update.status])}>
                <Icon className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{update.message}</p>
                <p className="text-xs text-muted-foreground">{update.time}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enable Notifications */}
      <button type="button" className="w-full mt-4 p-2 rounded-lg border border-dashed border-primary/30 text-xs text-primary hover:bg-primary/5 transition-colors">
        Enable push notifications
      </button>
    </div>
  );
};

export default RealTimeStatusWidget;
