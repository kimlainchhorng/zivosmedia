import { useState, useEffect } from "react";
import { 
  Plane, 
  MapPin, 
  Clock, 
  Wind, 
  Thermometer,
  Navigation,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FlightTrackerWidgetProps {
  className?: string;
  flightNumber?: string;
  airline?: string;
  departureCode?: string;
  arrivalCode?: string;
  departureCity?: string;
  arrivalCity?: string;
  scheduledDeparture?: Date;
  scheduledArrival?: Date;
  status?: "scheduled" | "boarding" | "in-flight" | "landed" | "delayed" | "cancelled";
}

const FlightTrackerWidget = ({ 
  className,
  flightNumber = "AA 1234",
  airline = "American Airlines",
  departureCode = "JFK",
  arrivalCode = "LAX",
  departureCity = "New York",
  arrivalCity = "Los Angeles",
  scheduledDeparture = new Date(Date.now() + 2 * 60 * 60 * 1000),
  scheduledArrival = new Date(Date.now() + 8 * 60 * 60 * 1000),
  status = "in-flight"
}: FlightTrackerWidgetProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [flightProgress, setFlightProgress] = useState(0);
  const [altitude, setAltitude] = useState(35000);
  const [speed, setSpeed] = useState(485);
  const [temperature, setTemperature] = useState(-54);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      
      // Calculate flight progress based on time
      const totalDuration = scheduledArrival.getTime() - scheduledDeparture.getTime();
      const elapsed = currentTime.getTime() - scheduledDeparture.getTime();
      const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      setFlightProgress(progress);

      // Simulate altitude/speed fluctuations
      setAltitude(prev => prev + Math.floor(Math.random() * 200 - 100));
      setSpeed(prev => Math.max(400, Math.min(550, prev + Math.floor(Math.random() * 20 - 10))));
    }, 5000);

    return () => clearInterval(interval);
  }, [scheduledDeparture, scheduledArrival, currentTime]);

  const statusConfig = {
    scheduled: { label: "Scheduled", color: "bg-muted text-muted-foreground" },
    boarding: { label: "Boarding", color: "bg-amber-500/20 text-amber-400" },
    "in-flight": { label: "In Flight", color: "bg-emerald-500/20 text-emerald-400" },
    landed: { label: "Landed", color: "bg-sky-500/20 text-sky-400" },
    delayed: { label: "Delayed", color: "bg-red-500/20 text-red-400" },
    cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-400" }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const getTimeRemaining = () => {
    const remaining = scheduledArrival.getTime() - currentTime.getTime();
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Navigation className="w-4 h-4 text-primary" />
            {status === "in-flight" && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            )}
          </div>
          <h3 className="font-semibold text-sm">Live Flight Tracker</h3>
        </div>
        <Badge className={statusConfig[status].color}>
          {statusConfig[status].label}
        </Badge>
      </div>

      {/* Flight Info */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/30 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-muted-foreground">{airline}</p>
            <p className="font-bold">{flightNumber}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Route Visualization */}
      <div className="relative mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="text-center">
            <p className="text-2xl font-bold">{departureCode}</p>
            <p className="text-xs text-muted-foreground">{departureCity}</p>
            <p className="text-xs font-medium mt-1">{formatTime(scheduledDeparture)}</p>
          </div>
          
          <div className="flex-1 mx-4 relative">
            <Progress value={flightProgress} className="h-1" />
            <div 
              className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000"
              style={{ left: `${Math.min(95, flightProgress)}%` }}
            >
              <div className="relative">
                <Plane className="w-5 h-5 text-primary transform -rotate-45 -translate-x-1/2" />
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold">{arrivalCode}</p>
            <p className="text-xs text-muted-foreground">{arrivalCity}</p>
            <p className="text-xs font-medium mt-1">{formatTime(scheduledArrival)}</p>
          </div>
        </div>
        
        <div className="text-center">
          <Badge variant="secondary" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {getTimeRemaining()} remaining
          </Badge>
        </div>
      </div>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-center">
          <MapPin className="w-4 h-4 mx-auto mb-1 text-foreground" />
          <p className="text-lg font-bold">{altitude.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Altitude (ft)</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-center">
          <Wind className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
          <p className="text-lg font-bold">{speed}</p>
          <p className="text-[10px] text-muted-foreground">Speed (mph)</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-center">
          <Thermometer className="w-4 h-4 mx-auto mb-1 text-foreground" />
          <p className="text-lg font-bold">{temperature}°</p>
          <p className="text-[10px] text-muted-foreground">Outside (°C)</p>
        </div>
      </div>

      {/* Track on Map Button */}
      <Button variant="outline" className="w-full" size="sm">
        <ExternalLink className="w-4 h-4 mr-2" />
        Track on Live Map
      </Button>
    </div>
  );
};

export default FlightTrackerWidget;
