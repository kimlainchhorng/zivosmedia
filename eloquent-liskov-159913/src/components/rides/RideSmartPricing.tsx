/**
 * RideSmartPricing — Dynamic fare estimates, surge alerts, price lock & fare splitting
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Lock, TrendingUp, TrendingDown, Users, Bell, Zap, Clock, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const surgeZones = [
  { id: "1", area: "Downtown Core", multiplier: 1.8, trend: "rising", eta: "3 min" },
  { id: "2", area: "Airport Terminal", multiplier: 1.2, trend: "falling", eta: "8 min" },
  { id: "3", area: "University District", multiplier: 1.0, trend: "stable", eta: "5 min" },
  { id: "4", area: "Shopping Mall", multiplier: 2.1, trend: "rising", eta: "12 min" },
];

const fareBreakdown = [
  { label: "Base fare", amount: 3.50 },
  { label: "Distance (4.2 mi)", amount: 8.40 },
  { label: "Time (12 min)", amount: 3.60 },
  { label: "Booking fee", amount: 2.50 },
  { label: "Surge (1.2x)", amount: 3.20 },
];

export default function RideSmartPricing() {
  const navigate = useNavigate();
  const [priceLocked, setPriceLocked] = useState(false);
  const [surgeAlerts, setSurgeAlerts] = useState(true);
  const [splitCount, setSplitCount] = useState(1);
  const [activeView, setActiveView] = useState<"estimate" | "surge" | "split">("estimate");

  const totalFare = fareBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const perPerson = totalFare / splitCount;

  const lockPrice = () => {
    setPriceLocked(true);
    toast.success("Price locked for 5 minutes!", { description: `$${totalFare.toFixed(2)} guaranteed` });
  };

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex gap-2">
        {[
          { id: "estimate" as const, label: "Estimate", icon: DollarSign },
          { id: "surge" as const, label: "Surge Map", icon: Zap },
          { id: "split" as const, label: "Split Fare", icon: Users },
        ].map((v) => (
          <Button
            key={v.id}
            size="sm"
            variant={activeView === v.id ? "default" : "outline"}
            onClick={() => setActiveView(v.id)}
            className="flex-1 gap-1.5"
          >
            <v.icon className="w-3.5 h-3.5" />
            {v.label}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeView === "estimate" && (
          <motion.div key="estimate" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Price card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Estimated fare</p>
                    <p className="text-3xl font-black text-foreground">${totalFare.toFixed(2)}</p>
                  </div>
                  {priceLocked ? (
                    <Badge className="bg-green-500/15 text-green-600 border-green-500/30 gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={lockPrice} className="gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Lock Price
                    </Button>
                  )}
                </div>

                {priceLocked && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Lock expires in</span>
                      <span>4:32</span>
                    </div>
                    <Progress value={75} className="h-1.5" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fare Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fareBreakdown.map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">${item.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                  <span>Total</span>
                  <span>${totalFare.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Surge alert toggle */}
            <Card>
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                    <Bell className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Surge Alerts</p>
                    <p className="text-xs text-muted-foreground">Notify when prices drop</p>
                  </div>
                </div>
                <Switch checked={surgeAlerts} onCheckedChange={setSurgeAlerts} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeView === "surge" && (
          <motion.div key="surge" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> Live Surge Zones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {surgeZones.map((zone) => (
                  <div key={zone.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">{zone.area}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" /> ETA {zone.eta}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {zone.trend === "rising" ? (
                        <TrendingUp className="w-3.5 h-3.5 text-destructive" />
                      ) : zone.trend === "falling" ? (
                        <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                      ) : null}
                      <Badge
                        variant={zone.multiplier > 1.5 ? "destructive" : zone.multiplier > 1 ? "secondary" : "outline"}
                        className="font-bold"
                      >
                        {zone.multiplier}x
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-accent/30 border-accent">
              <CardContent className="pt-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Best time to ride</p>
                  <p className="text-xs text-muted-foreground">Prices expected to drop ~30% in 15 minutes around University District.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeView === "split" && (
          <motion.div key="split" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Split Fare Calculator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Number of riders</span>
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setSplitCount(Math.max(1, splitCount - 1))}>−</Button>
                    <span className="text-lg font-bold text-foreground w-6 text-center">{splitCount}</span>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setSplitCount(Math.min(6, splitCount + 1))}>+</Button>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-xl p-4 text-center space-y-1 border border-border/50">
                  <p className="text-xs text-muted-foreground">Each person pays</p>
                  <p className="text-3xl font-black text-primary">${perPerson.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">of ${totalFare.toFixed(2)} total</p>
                </div>

                <div className="flex gap-2">
                  {Array.from({ length: splitCount }).map((_, i) => (
                    <div key={i} className="flex-1 h-2 rounded-full bg-primary/70" />
                  ))}
                  {Array.from({ length: 6 - splitCount }).map((_, i) => (
                    <div key={i} className="flex-1 h-2 rounded-full bg-muted/40" />
                  ))}
                </div>

                <Button className="w-full" onClick={() => navigate("/chat", { state: { splitRequest: { amount: perPerson, riders: splitCount } } })}>
                  <Users className="w-4 h-4 mr-2" /> Send Split Request
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
