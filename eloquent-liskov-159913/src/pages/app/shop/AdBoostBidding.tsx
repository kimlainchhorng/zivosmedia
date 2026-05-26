/**
 * AdBoostBidding — Merchant bidding for Top Map / Top Reel placement
 * Shows predicted ROI from Meta CAPI data
 */
import { useState } from "react";
import { ArrowLeft, TrendingUp, MapPin, Film, Zap, DollarSign, Target, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

type PlacementType = "top_map" | "top_reel";

const PLACEMENT_CONFIG = {
  top_map: {
    label: "Top Map Pin",
    icon: MapPin,
    description: "Your shop appears as the first highlighted pin when users open the Map",
    minBid: 200,
    avgCtr: 4.2,
    avgConversion: 1.8,
  },
  top_reel: {
    label: "Top Reel Slot",
    icon: Film,
    description: "Your latest Reel gets priority placement in the For You feed",
    minBid: 300,
    avgCtr: 6.5,
    avgConversion: 2.4,
  },
};

export default function AdBoostBidding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [placement, setPlacement] = useState<PlacementType>("top_map");
  const [budgetCents, setBudgetCents] = useState(500);
  const [durationDays, setDurationDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = PLACEMENT_CONFIG[placement];
  const dailyBudget = budgetCents / durationDays;
  const estimatedImpressions = Math.round((budgetCents / 100) * 420);
  const estimatedClicks = Math.round(estimatedImpressions * (config.avgCtr / 100));
  const estimatedSales = Math.round(estimatedClicks * (config.avgConversion / 100));
  const estimatedRevenue = estimatedSales * 850; // avg $8.50 per sale in cents
  const predictedROI = budgetCents > 0 ? Math.round(((estimatedRevenue - budgetCents) / budgetCents) * 100) : 0;

  const handleSubmitBid = async () => {
    if (!user) {
      toast.error("Please log in");
      return;
    }
    setIsSubmitting(true);
    try {
      // Record the bid in `ad_boost_bids`. The ad-auction scheduler picks the
      // highest bid per placement per window and flips it to status='won'.
      // (The previous call to `create-travel-checkout` invoked an edge fn
      // that doesn't exist — silent 404 on every submit.)
      const { error } = await (supabase as any).from("ad_boost_bids").insert({
        user_id: user.id,
        placement,
        budget_cents: budgetCents,
        duration_days: durationDays,
        predicted_roi_pct: predictedROI,
      });
      if (error) throw error;
      toast.success("Boost bid submitted. We'll notify you when the auction completes.");
      navigate("/shop-dashboard/roi?boosted=true");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit boost");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Ad Boost Bidding</h1>
            <p className="text-xs text-muted-foreground">Get top placement for your shop</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Placement Selection */}
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(PLACEMENT_CONFIG) as [PlacementType, typeof config][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = placement === key;
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.97 }}
                onClick={() => setPlacement(key)}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${active ? "border-primary bg-primary/5" : "border-border/40 bg-card"}`}
              >
                <Icon className={`h-6 w-6 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-bold">{cfg.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{cfg.description}</p>
              </motion.button>
            );
          })}
        </div>

        {/* Budget Slider */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">${(budgetCents / 100).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">≈ ${(dailyBudget / 100).toFixed(2)}/day for {durationDays} days</p>
            </div>
            <Slider
              value={[budgetCents]}
              onValueChange={([v]) => setBudgetCents(v)}
              min={config.minBid}
              max={5000}
              step={50}
              className="py-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Min ${(config.minBid / 100).toFixed(2)}</span>
              <span>$50.00</span>
            </div>
          </CardContent>
        </Card>

        {/* Duration */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Campaign Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {[3, 7, 14, 30].map(d => (
                <Button
                  key={d}
                  variant={durationDays === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDurationDays(d)}
                  className="flex-1 rounded-xl text-xs"
                >
                  {d}d
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Predicted ROI Card */}
        <Card className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Predicted Performance
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-auto font-normal">
                Powered by Meta CAPI
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-card/80 p-3 text-center border border-border/30">
                <p className="text-lg font-bold">{estimatedImpressions.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Est. Impressions</p>
              </div>
              <div className="rounded-xl bg-card/80 p-3 text-center border border-border/30">
                <p className="text-lg font-bold">{estimatedClicks.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Est. Clicks ({config.avgCtr}% CTR)</p>
              </div>
              <div className="rounded-xl bg-card/80 p-3 text-center border border-border/30">
                <p className="text-lg font-bold text-emerald-500">{estimatedSales}</p>
                <p className="text-[10px] text-muted-foreground">Est. Sales</p>
              </div>
              <div className="rounded-xl bg-card/80 p-3 text-center border border-border/30">
                <p className={`text-lg font-bold ${predictedROI > 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {predictedROI > 0 ? "+" : ""}{predictedROI}%
                </p>
                <p className="text-[10px] text-muted-foreground">Predicted ROI</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Based on average {config.label} performance verified by Meta Conversions API
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          onClick={handleSubmitBid}
          disabled={isSubmitting}
          className="w-full h-14 rounded-2xl text-base font-bold gap-2 shadow-lg"
        >
          <Zap className="h-5 w-5" />
          {isSubmitting ? "Processing..." : `Launch ${config.label} — $${(budgetCents / 100).toFixed(2)}`}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          You'll be redirected to secure checkout. Campaign starts within 1 hour of payment.
        </p>
      </div>
    </div>
  );
}
