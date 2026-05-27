import { useState, useEffect } from "react";
import { 
  Bell, 
  BellRing,
  TrendingDown,
  TrendingUp,
  Plane,
  Hotel,
  Car,
  Plus,
  X,
  Check,
  Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PriceAlert {
  id: string;
  type: "flight" | "hotel" | "car";
  route: string;
  currentPrice: number;
  targetPrice: number;
  lastPrice: number;
  trend: "up" | "down" | "stable";
  isActive: boolean;
  notified: boolean;
}

interface PriceAlertWidgetProps {
  className?: string;
}

const INITIAL_ALERTS: PriceAlert[] = [];

const typeIcons = {
  flight: Plane,
  hotel: Hotel,
  car: Car,
};

const typeColors = {
  flight: "text-sky-500 bg-sky-500/10",
  hotel: "text-amber-500 bg-amber-500/10",
  car: "text-emerald-500 bg-emerald-500/10",
};

const PriceAlertWidget = ({ className }: PriceAlertWidgetProps) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>(INITIAL_ALERTS);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("price_alerts").select("id, origin_code, destination_code, current_price, target_price, is_active, triggered")
      .eq("user_id", user.id).then(({ data }) => {
        if (data && data.length > 0) {
          setAlerts(data.map(a => ({
            id: a.id,
            type: "flight" as const,
            route: `${a.origin_code} → ${a.destination_code}`,
            currentPrice: a.current_price ?? 0,
            targetPrice: a.target_price ?? 0,
            lastPrice: a.current_price ?? 0,
            trend: (a.current_price ?? 0) <= (a.target_price ?? 0) ? "down" as const : "up" as const,
            isActive: a.is_active ?? true,
            notified: a.triggered ?? false,
          })));
        }
      });
  }, [user]);

  const toggleAlert = async (id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;
    const newActive = !alert.isActive;
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isActive: newActive } : a));
    await supabase.from("price_alerts").update({ is_active: newActive }).eq("id", id);
    toast.success("Alert updated");
  };

  const removeAlert = async (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    await supabase.from("price_alerts").update({ is_active: false }).eq("id", id);
    toast.success("Alert removed");
  };

  const activeAlerts = alerts.filter(a => a.isActive);
  const readyToBuy = alerts.filter(a => a.currentPrice <= a.targetPrice);

  const displayAlerts = showAll ? alerts : alerts.slice(0, 3);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Price Alerts</CardTitle>
              <p className="text-sm text-muted-foreground">
                {activeAlerts.length} active alerts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {readyToBuy.length > 0 && (
              <Badge className="bg-emerald-500 text-primary-foreground animate-pulse">
                <BellRing className="w-3 h-3 mr-1" />
                {readyToBuy.length} ready!
              </Badge>
            )}
            <Button variant="ghost" size="icon" aria-label="Alert settings">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        {displayAlerts.map((alert) => {
          const Icon = typeIcons[alert.type];
          const isReady = alert.currentPrice <= alert.targetPrice;
          const priceChange = alert.currentPrice - alert.lastPrice;
          const changePercent = Math.abs((priceChange / alert.lastPrice) * 100).toFixed(1);

          return (
            <div
              key={alert.id}
              className={cn(
                "p-3 rounded-xl border transition-all",
                isReady 
                  ? "bg-emerald-500/10 border-emerald-500/30" 
                  : "bg-muted/30 border-border"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Type Icon */}
                <div className={cn(
                  "p-2 rounded-xl",
                  typeColors[alert.type]
                )}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Alert Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{alert.route}</p>
                    {isReady && (
                      <Badge className="bg-emerald-500 text-primary-foreground text-[10px] px-1.5 py-0">
                        <Check className="w-3 h-3 mr-0.5" />
                        Target hit!
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Target: ${alert.targetPrice}
                    </span>
                    <div className={cn(
                      "flex items-center gap-0.5 text-xs",
                      alert.trend === "down" ? "text-emerald-500" : "text-destructive"
                    )}>
                      {alert.trend === "down" ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <TrendingUp className="w-3 h-3" />
                      )}
                      {changePercent}%
                    </div>
                  </div>
                </div>

                {/* Current Price */}
                <div className="text-right">
                  <p className={cn(
                    "font-bold",
                    isReady && "text-emerald-500"
                  )}>
                    ${alert.currentPrice}
                  </p>
                  <p className="text-xs text-muted-foreground">current</p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={alert.isActive}
                    onCheckedChange={() => toggleAlert(alert.id)}
                    className="scale-75"
                  />
                  <button type="button"
                    onClick={() => removeAlert(alert.id)}
                    aria-label="Remove alert"
                    className="p-1 rounded hover:bg-destructive/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>

              {/* Book Now Button for ready alerts */}
              {isReady && (
                <Button 
                  size="sm" 
                  className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600"
                >
                  Book Now at ${alert.currentPrice}
                </Button>
              )}
            </div>
          );
        })}

        {/* Show More */}
        {alerts.length > 3 && (
          <button type="button"
            onClick={() => setShowAll(!showAll)}
            className="w-full text-center text-sm text-primary hover:underline py-2"
          >
            {showAll ? "Show less" : `Show ${alerts.length - 3} more alerts`}
          </button>
        )}

        {/* Create New Alert */}
        <Button variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Create New Alert
        </Button>
      </CardContent>
    </Card>
  );
};

export default PriceAlertWidget;
