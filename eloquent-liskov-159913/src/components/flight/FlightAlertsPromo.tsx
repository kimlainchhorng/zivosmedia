import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bell,
  TrendingDown,
  Zap,
  Globe,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FlightAlertsPromoProps {
  className?: string;
  onSetAlert?: () => void;
}

export default function FlightAlertsPromo({ className, onSetAlert }: FlightAlertsPromoProps) {
  const { user } = useAuth();
  const [sampleAlerts, setSampleAlerts] = useState<{ route: string; drop: string; percent: string; time: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("price_alerts").select("origin_name, destination_name, current_price, target_price, updated_at")
      .eq("user_id", user.id).eq("is_active", true).eq("triggered", true).limit(3).then(({ data }) => {
        if (data && data.length > 0) {
          setSampleAlerts(data.map(a => ({
            route: `${a.origin_name || "?"} → ${a.destination_name || "?"}`,
            drop: `$${((a.current_price ?? 0) - (a.target_price ?? 0)).toFixed(0)}`,
            percent: `${Math.round(((a.current_price ?? 1) - (a.target_price ?? 0)) / (a.current_price ?? 1) * 100)}%`,
            time: a.updated_at ? new Date(a.updated_at).toLocaleDateString() : "Recently",
          })));
        }
      });
  }, [user]);

  const alertFeatures = [
    {
      icon: TrendingDown,
      title: "Price Drop Alerts",
      description: "Get notified when prices drop on your saved routes",
      color: "text-emerald-500",
    },
    {
      icon: Zap,
      title: "Flash Deal Alerts",
      description: "Be the first to know about limited-time offers",
      color: "text-amber-500",
    },
    {
      icon: Globe,
      title: "Route Tracking",
      description: "Monitor multiple destinations at once",
      color: "text-sky-500",
    },
  ];

  return (
    <section className={cn("py-10 sm:py-16", className)}>
      <div className="container mx-auto px-4">
        <Card className="relative overflow-hidden border-0 via-card bg-secondary">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <CardContent className="p-6 sm:p-8 md:p-12 relative">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left side - Content */}
              <div>
                <Badge className="mb-4 px-4 py-2 bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                  <Bell className="w-4 h-4 mr-2" />
                  Price Alerts
                </Badge>
                
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                  Never Miss a
                  <span className="ml-2 text-accent-foreground">
                    Price Drop
                  </span>
                </h2>
                
                <p className="text-muted-foreground mb-6 max-w-md">
                  Set up free price alerts and save up to 40% on your next flight. 
                  We'll notify you the moment prices drop.
                </p>

                {/* Features */}
                <div className="space-y-4 mb-6">
                  {alertFeatures.map((feature) => (
                    <div key={feature.title} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-card/80 border border-border/50 flex items-center justify-center flex-shrink-0">
                        <feature.icon className={cn("w-5 h-5", feature.color)} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{feature.title}</h4>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  className="hover:opacity-90 bg-secondary"
                  onClick={onSetAlert}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Set Price Alert
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Right side - Live alerts preview */}
              <div className="relative">
                <div className="absolute -inset-4 rounded-2xl blur-xl opacity-50 bg-secondary" />
                
                <Card className="relative bg-card/80 backdrop-blur-xl border-border/50">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-foreground" />
                      <span className="font-semibold">Recent Price Drops</span>
                      <span className="relative flex h-2 w-2 ml-auto">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </div>

                    <div className="space-y-3">
                      {sampleAlerts.map((alert, index) => (
                        <div
                          key={alert.route}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/30 animate-in fade-in slide-in-from-right-4"
                          style={{ animationDelay: `${index * 150}ms` }}
                        >
                          <div>
                            <p className="font-semibold text-sm">{alert.route}</p>
                            <p className="text-xs text-muted-foreground">{alert.time}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-500">{alert.drop}</p>
                            <p className="text-xs text-emerald-400">{alert.percent}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-center text-xs text-muted-foreground mt-4">
                      Join 500K+ travelers saving with price alerts
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
