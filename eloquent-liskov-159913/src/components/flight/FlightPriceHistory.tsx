import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Calendar, Bell, Info, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * FLIGHT PRICE HISTORY COMPONENT
 * 
 * COMPLIANCE NOTE: This component displays price trend guidance ONLY.
 * No specific prices are shown. All price data comes from live API results.
 * 
 * Purpose: Educate users on best booking timing + collect price alert signups.
 */

interface FlightPriceHistoryProps {
  origin?: string;
  destination?: string;
  onSetAlert?: () => void;
}

const FlightPriceHistory = ({ origin, destination, onSetAlert }: FlightPriceHistoryProps) => {
  const [showAlert, setShowAlert] = useState(false);

  const handleSetAlert = () => {
    setShowAlert(true);
    onSetAlert?.();
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="via-card/50 border border-border rounded-3xl p-6 md:p-8 bg-secondary">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-secondary text-foreground border-border">
                  <Sparkles className="w-3 h-3 mr-1" /> Smart Booking Tips
                </Badge>
              </div>
              <h3 className="text-xl md:text-2xl font-display font-bold">
                When to Book for Best Prices
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                General guidance based on industry trends
              </p>
            </div>
          </div>

          {/* Booking Tips - No Specific Prices */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-500 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-bold">Book Early</span>
              </div>
              <p className="text-sm font-medium text-foreground">21-60 days ahead</p>
              <p className="text-xs text-muted-foreground">Best window for domestic flights</p>
            </div>
            
            <div className="p-4 bg-secondary rounded-xl border border-border">
              <div className="flex items-center gap-2 text-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-bold">Flexible Dates</span>
              </div>
              <p className="text-sm font-medium text-foreground">Tue, Wed, Sat</p>
              <p className="text-xs text-muted-foreground">Often lower demand days</p>
            </div>
            
            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <Info className="w-4 h-4" />
                <span className="text-sm font-bold">Avoid Peak</span>
              </div>
              <p className="text-sm font-medium text-foreground">Holidays & Events</p>
              <p className="text-xs text-muted-foreground">Prices typically higher</p>
            </div>
          </div>

          {/* Alert Button */}
          <div className="flex items-center justify-between p-4 bg-card/80 rounded-xl border border-border/50">
            <div className="flex items-center gap-3">
              <Bell className={cn("w-5 h-5", showAlert ? "text-primary" : "text-muted-foreground")} />
              <div>
                <p className="font-semibold text-sm">Price Drop Alerts</p>
                <p className="text-xs text-muted-foreground">
                  Get notified when prices drop for{" "}
                  {origin && destination ? `${origin} → ${destination}` : "your route"}
                </p>
              </div>
            </div>
            <Button 
              variant={showAlert ? "default" : "outline"} 
              size="sm"
              onClick={handleSetAlert}
              className="min-h-[44px] touch-manipulation"
            >
              {showAlert ? "Alert Set ✓" : "Set Alert"}
            </Button>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-muted-foreground text-center mt-4 leading-relaxed">
            Tips are general guidance only. Actual prices vary by route, airline, and availability. 
            Prices provided by trusted travel partners.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FlightPriceHistory;
