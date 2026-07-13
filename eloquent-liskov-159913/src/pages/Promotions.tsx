import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Gift, Ticket, Users, Star, Copy, Check, Share2, Clock, TrendingUp, Award, Sparkles, Zap, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TIER_THRESHOLDS: Record<string, { next: string; target: number; multiplier: number }> = {
  silver:   { next: "Gold",     target: 1000, multiplier: 1.0 },
  gold:     { next: "Platinum", target: 3000, multiplier: 1.5 },
  platinum: { next: "Diamond",  target: 5000, multiplier: 2.0 },
  diamond:  { next: "Diamond",  target: 5000, multiplier: 3.0 },
};

const REFERRER_REWARD = 15;
const REFEREE_DISCOUNT = 20;

const Promotions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Code copied!", description: `${code} has been copied to your clipboard.` });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;
    setApplyingPromo(true);
    try {
      const now = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("promo_codes")
        .select("code, discount_type, discount_value, end_at, is_active")
        .eq("code", promoCode.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (!data) {
        toast({ title: "Invalid code", description: "This promo code doesn't exist or has expired.", variant: "destructive" });
      } else if (data.end_at && data.end_at < now) {
        toast({ title: "Code expired", description: `This code expired on ${new Date(data.end_at).toLocaleDateString()}.`, variant: "destructive" });
      } else {
        const label = data.discount_type === "percentage" ? `${data.discount_value}% OFF` : `$${data.discount_value} OFF`;
        toast({ title: "Code applied!", description: `${promoCode.toUpperCase()} — ${label} will be applied at checkout.` });
        setPromoCode("");
      }
    } finally {
      setApplyingPromo(false);
    }
  };

  // Active platform promo codes
  const { data: activeCouponsRaw = [], isLoading: couponsLoading } = useQuery({
    queryKey: ["promo-codes-active"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("promo_codes")
        .select("code, discount_type, discount_value, end_at, min_fare, city")
        .eq("is_active", true)
        .or(`end_at.is.null,end_at.gt.${now}`)
        .limit(12);
      return (data || []) as { code: string; discount_type: string; discount_value: number; end_at: string | null; min_fare: number | null; city: string | null }[];
    },
  });

  const activeCoupons = activeCouponsRaw.map((c) => ({
    code: c.code,
    discount: c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `$${c.discount_value} OFF`,
    description: c.city ? `Available in ${c.city}` : "All locations",
    expires: c.end_at ? new Date(c.end_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No expiry",
    service: "all" as const,
    minOrder: c.min_fare ? `$${c.min_fare}` : "None",
  }));

  // Referral data
  const { data: referralData, isLoading: referralLoading } = useQuery({
    queryKey: ["promotions-referral", user?.id],
    queryFn: async () => {
      const [{ data: profile }, { data: refs }] = await Promise.all([
        (supabase as any).from("profiles").select("share_code").eq("user_id", user!.id).maybeSingle(),
        (supabase as any).from("referrals").select("status, referrer_credit_cents").eq("referrer_user_id", user!.id),
      ]);
      const allRefs = (refs || []) as { status: string; referrer_credit_cents: number | null }[];
      const earned = allRefs.filter((r) => r.status === "completed" || r.status === "earned");
      return {
        code: profile?.share_code || `ZIVO-${user!.id.slice(0, 6).toUpperCase()}`,
        totalReferrals: allRefs.length,
        pendingCredits: allRefs.filter((r) => r.status === "pending").reduce((s, r) => s + (r.referrer_credit_cents ?? 0), 0) / 100,
        earnedTotal: earned.reduce((s, r) => s + (r.referrer_credit_cents ?? 0), 0) / 100,
      };
    },
    enabled: !!user,
  });

  const referralStats = {
    code: referralData?.code ?? "—",
    totalReferrals: referralData?.totalReferrals ?? 0,
    pendingCredits: referralData?.pendingCredits ?? 0,
    earnedTotal: referralData?.earnedTotal ?? 0,
    referrerReward: REFERRER_REWARD,
    refereeDiscount: REFEREE_DISCOUNT,
  };

  // Loyalty points
  const { data: loyaltyRaw, isLoading: loyaltyLoading } = useQuery({
    queryKey: ["promotions-loyalty", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("loyalty_points")
        .select("points_balance, tier, lifetime_points")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { points_balance: number; tier: string; lifetime_points: number } | null;
    },
    enabled: !!user,
  });

  const tierKey = (loyaltyRaw?.tier ?? "silver").toLowerCase();
  const tierInfo = TIER_THRESHOLDS[tierKey] ?? TIER_THRESHOLDS.silver;
  const loyaltyPoints = {
    current: loyaltyRaw?.points_balance ?? 0,
    tier: loyaltyRaw?.tier ?? "Silver",
    nextTier: tierInfo.next,
    pointsToNext: Math.max(0, tierInfo.target - (loyaltyRaw?.points_balance ?? 0)),
    multiplier: tierInfo.multiplier,
  };

  const availableOffers = [
    { title: "Weekend Rides Special", discount: "15% OFF", description: "All rides on weekends", validUntil: "Every Sat-Sun", code: "WEEKEND15", gradient: "from-primary to-teal-400" },
    { title: "Late Night Eats", discount: "Free Delivery", description: "Orders after 10 PM", validUntil: "Ongoing", code: "LATENIGHT", gradient: "from-eats to-orange-500" },
    { title: "Luxury Car Rental", discount: "$50 OFF", description: "Premium vehicle rentals 3+ days", validUntil: "Limited time", code: "LUXURY50", gradient: "from-muted to-muted" },
    { title: "Hotel + Flight Bundle", discount: "20% OFF", description: "Book together and save", validUntil: "Mar 2026", code: "BUNDLE20", gradient: "from-muted to-muted" },
  ];

  const rewards = [
    { name: "Free Ride (up to $15)", points: 500, available: true },
    { name: "$10 Eats Credit", points: 400, available: true },
    { name: "Car Rental Upgrade", points: 1000, available: true },
    { name: "Airport Lounge Pass", points: 2000, available: true },
    { name: "Free Hotel Night", points: 5000, available: false },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden safe-area-top safe-area-bottom">
      <SEOHead
        title="Promotions & Rewards – ZIVO"
        description="View active promo codes, exclusive offers, and seasonal campaigns. Earn loyalty points, refer friends, and redeem rewards for free rides and credits."
      />
      {/* Enhanced Background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-eats/12 via-transparent to-transparent opacity-50" />
      <div className="absolute top-1/4 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-gradient-to-bl from-eats/20 to-orange-500/15 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-gradient-to-tr from-primary/12 to-teal-500/8 rounded-full blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 safe-area-top z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl touch-manipulation active:scale-95" aria-label="Go back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-eats to-orange-500 flex items-center justify-center shadow-lg shadow-eats/30">
              <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-base sm:text-xl">Promotions & Rewards</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Save more, earn more</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl relative z-10">
        {/* Apply Promo Code */}
        <Card className="mb-6 sm:mb-8 border-0 bg-gradient-to-br from-card/90 to-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-eats/5 to-orange-500/5" />
          <CardContent className="p-4 sm:p-6 relative">
            <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-eats" />
              Have a promo code?
            </h3>
            <div className="flex gap-2 sm:gap-3">
              <Input
                placeholder="Enter code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="flex-1 h-11 sm:h-12 rounded-xl bg-muted/30 border-border/50"
              />
              <Button
                onClick={applyPromoCode}
                disabled={applyingPromo || !promoCode.trim()}
                className="h-11 sm:h-12 px-4 sm:px-6 rounded-xl bg-gradient-to-r from-eats to-orange-500 text-primary-foreground font-bold shadow-lg shadow-eats/30 touch-manipulation active:scale-95"
              >
                {applyingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Tabs defaultValue="coupons" className="mb-6 sm:mb-8">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 sm:p-1.5 rounded-xl h-auto">
              <TabsTrigger value="coupons" className="rounded-lg py-2.5 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-eats data-[state=active]:to-orange-500 data-[state=active]:text-primary-foreground touch-manipulation">
                <Ticket className="h-4 w-4 mr-1.5 hidden sm:inline" />
                Coupons
              </TabsTrigger>
              <TabsTrigger value="offers" className="rounded-lg py-2.5 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-eats data-[state=active]:to-orange-500 data-[state=active]:text-primary-foreground touch-manipulation">
                <Gift className="h-4 w-4 mr-1.5 hidden sm:inline" />
                Offers
              </TabsTrigger>
              <TabsTrigger value="referral" className="rounded-lg py-2.5 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-eats data-[state=active]:to-orange-500 data-[state=active]:text-primary-foreground touch-manipulation">
                <Users className="h-4 w-4 mr-1.5 hidden sm:inline" />
                Refer
              </TabsTrigger>
              <TabsTrigger value="loyalty" className="rounded-lg py-2.5 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-eats data-[state=active]:to-orange-500 data-[state=active]:text-primary-foreground touch-manipulation">
                <Star className="h-4 w-4 mr-1.5 hidden sm:inline" />
                Points
              </TabsTrigger>
            </TabsList>

            {/* Coupons Tab */}
            <TabsContent value="coupons" className="mt-5 sm:mt-6">
              <div className="space-y-4">
                <h3 className="font-display font-bold text-lg sm:text-xl flex items-center gap-2">
                  <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-eats" />
                  Active Promo Codes
                </h3>
                {couponsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : activeCoupons.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                    {activeCoupons.map((coupon) => (
                      <Card key={coupon.code} className="overflow-hidden border-0 bg-gradient-to-br from-card/90 to-card shadow-xl">
                        <div className={`h-1.5 ${
                          (coupon.service as string) === 'rides' ? 'bg-gradient-to-r from-primary to-teal-400' :
                          (coupon.service as string) === 'eats' ? 'bg-gradient-to-r from-eats to-orange-500' : 'bg-gradient-to-r from-violet-500 to-purple-500'
                        }`} />
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex justify-between items-start mb-3 sm:mb-4">
                            <div>
                              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-eats to-orange-500 bg-clip-text text-transparent">{coupon.discount}</p>
                              <p className="text-sm sm:text-base text-muted-foreground">{coupon.description}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0 font-semibold text-xs">
                              {coupon.service === 'all' ? 'All' : String(coupon.service).toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs sm:text-sm text-muted-foreground min-w-0">
                              <p>Min: {coupon.minOrder}</p>
                              <p className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {coupon.expires}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyCode(coupon.code)}
                              className="rounded-xl font-semibold touch-manipulation active:scale-95 flex-shrink-0"
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="h-4 w-4 mr-1 text-emerald-500" />
                              ) : (
                                <Copy className="h-4 w-4 mr-1" />
                              )}
                              {coupon.code}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-0 bg-gradient-to-br from-card/90 to-card shadow-xl">
                    <CardContent className="p-8 sm:p-10 text-center">
                      <Ticket className="h-12 w-12 sm:h-14 sm:w-14 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground text-base sm:text-lg">No active coupons. Check out our offers!</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Offers Tab */}
            <TabsContent value="offers" className="mt-6">
              <div className="space-y-4">
                <h3 className="font-display font-bold text-xl flex items-center gap-2">
                  <Zap className="w-5 h-5 text-eats" />
                  Available Offers
                </h3>
                <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                  {availableOffers.map((offer, i) => (
                    <div
                      key={i}
                      className="animate-in fade-in slide-in-from-bottom-4 duration-500 hover:-translate-y-1 transition-transform"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <Card className="border-0 bg-gradient-to-br from-card/90 to-card shadow-xl hover:shadow-2xl transition-all overflow-hidden">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2">
                            <h4 className="font-bold text-base sm:text-lg">{offer.title}</h4>
                            <Badge className={`bg-gradient-to-r ${offer.gradient} text-primary-foreground border-0 font-semibold px-2 sm:px-3 text-xs`}>
                              {offer.discount}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{offer.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{offer.validUntil}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyCode(offer.code)}
                              className="rounded-xl font-semibold touch-manipulation active:scale-95"
                            >
                              {copiedCode === offer.code ? (
                                <Check className="h-4 w-4 mr-1.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-4 w-4 mr-1.5" />
                              )}
                              Get Code
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Referral Tab */}
            <TabsContent value="referral" className="mt-5 sm:mt-6">
              <div className="space-y-4 sm:space-y-6">
                {/* Referral Banner */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-0 bg-gradient-to-r from-primary/20 to-eats/20 shadow-xl overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-eats/10" />
                    <CardContent className="p-5 sm:p-8 text-center relative">
                      <h3 className="font-display font-bold text-2xl sm:text-3xl mb-2 sm:mb-3">
                        Give ${referralStats.refereeDiscount}, Get ${referralStats.referrerReward}
                      </h3>
                      <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
                        Share your code with friends. They get ${referralStats.refereeDiscount} off their first ride, 
                        you get ${referralStats.referrerReward} credit when they complete it.
                      </p>
                      <div className="flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 bg-background/80 backdrop-blur-sm rounded-xl sm:rounded-2xl max-w-sm mx-auto">
                        <code className="text-base sm:text-xl font-mono font-bold">{referralStats.code}</code>
                        <Button size="icon" onClick={() => copyCode(referralStats.code)} className="rounded-xl touch-manipulation active:scale-95 h-9 w-9 sm:h-10 sm:w-10" aria-label="Copy referral code">
                          {copiedCode === referralStats.code ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button size="icon" variant="outline" className="rounded-xl touch-manipulation active:scale-95 h-9 w-9 sm:h-10 sm:w-10" aria-label="Share referral code">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Referral Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  {referralLoading ? (
                    <div className="col-span-3 flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : null}
                  {!referralLoading && [
                    { value: referralStats.totalReferrals, label: "Referrals", gradient: "from-primary to-teal-400" },
                    { value: `$${referralStats.pendingCredits.toFixed(0)}`, label: "Pending", gradient: "from-amber-500 to-orange-500" },
                    { value: `$${referralStats.earnedTotal.toFixed(0)}`, label: "Earned", gradient: "from-emerald-500 to-green-500" },
                  ].map((stat, index) => (
                    <div
                      key={stat.label}
                      className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <Card className="border-0 bg-gradient-to-br from-card/90 to-card shadow-xl">
                        <CardContent className="p-3 sm:p-5 text-center">
                          <p className={`text-xl sm:text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>{stat.value}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>

                {/* How It Works */}
                <Card className="border-0 bg-gradient-to-br from-card/90 to-card shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">How It Works</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
                      {[
                        { step: 1, title: "Share Your Code", desc: "Send your unique code to friends via text, email, or social media" },
                        { step: 2, title: "Friend Signs Up", desc: `They enter your code and get $${referralStats.refereeDiscount} off their first ride` },
                        { step: 3, title: "You Both Win", desc: `After their first ride, you get $${referralStats.referrerReward} credit` },
                      ].map((item) => (
                        <div key={item.step} className="text-center">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg shadow-primary/30">
                            <span className="font-bold text-base sm:text-xl text-primary-foreground">{item.step}</span>
                          </div>
                          <h4 className="font-bold text-sm sm:text-base mb-1 sm:mb-2">{item.title}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Loyalty Tab */}
            <TabsContent value="loyalty" className="mt-5 sm:mt-6">
              <div className="space-y-4 sm:space-y-6">
                {/* Points Overview */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-0 bg-gradient-to-br from-card/90 to-card shadow-xl overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5" />
                    <CardContent className="p-4 sm:p-6 relative">
                      <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Your Points</p>
                          <p className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">{loyaltyPoints.current.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="text-sm sm:text-lg px-2 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground border-0 font-bold shadow-lg shadow-amber-500/30">
                            <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                            {loyaltyPoints.tier}
                          </Badge>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                            {loyaltyPoints.multiplier}x points multiplier
                          </p>
                        </div>
                      </div>
                      {loyaltyLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="font-medium">Progress to {loyaltyPoints.nextTier}</span>
                            <span className="text-muted-foreground">{loyaltyPoints.pointsToNext} pts to go</span>
                          </div>
                          <Progress
                            value={tierInfo.target > 0 ? Math.min(100, ((tierInfo.target - loyaltyPoints.pointsToNext) / tierInfo.target) * 100) : 100}
                            className="h-2 sm:h-3 rounded-full"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Tier Benefits */}
                <Card className="border-0 bg-gradient-to-br from-card/90 to-card shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                      Tier Benefits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
                      {[
                        { name: "Silver", points: "1x" },
                        { name: "Gold", points: "1.5x" },
                        { name: "Platinum", points: "2x" },
                        { name: "Diamond", points: "3x" },
                      ].map((tier) => {
                        const isActive = tier.name.toLowerCase() === tierKey;
                        return (
                        <div
                          key={tier.name}
                          className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
                            isActive
                              ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-2 ring-amber-500"
                              : "bg-muted/50"
                          }`}
                        >
                          <p className={`font-bold text-xs sm:text-base ${isActive ? "text-amber-500" : ""}`}>{tier.name}</p>
                          <p className="text-[10px] sm:text-sm text-muted-foreground">{tier.points}</p>
                        </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Redeem Rewards */}
                <Card className="border-0 bg-gradient-to-br from-card/90 to-card shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Redeem Rewards</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Use your points for free rides, credits, and more</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 sm:space-y-3">
                      {rewards.map((reward, index) => (
                        <div
                          key={reward.name}
                          className={`flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all animate-in fade-in slide-in-from-left-4 duration-300 ${
                            reward.available && loyaltyPoints.current >= reward.points
                              ? "bg-muted/50 hover:bg-muted cursor-pointer"
                              : "bg-muted/20 opacity-60"
                          }`}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center ${
                              reward.available && loyaltyPoints.current >= reward.points
                                ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30"
                                : "bg-muted"
                            }`}>
                              <Star className={`h-5 w-5 sm:h-6 sm:w-6 ${
                                reward.available && loyaltyPoints.current >= reward.points
                                  ? "text-primary-foreground"
                                  : "text-muted-foreground"
                              }`} />
                            </div>
                            <div>
                              <p className="font-semibold text-sm sm:text-base">{reward.name}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">{reward.points.toLocaleString()} points</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={!reward.available || loyaltyPoints.current < reward.points}
                            className="rounded-xl font-semibold text-xs sm:text-sm touch-manipulation active:scale-95"
                          >
                            Redeem
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* === WAVE 11: Rich Promotions Content === */}

        {/* Seasonal Campaigns */}
        <div className="mt-10 mb-8">
          <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-eats" />
            Seasonal Campaigns
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: "Spring Break Deals", period: "Mar 1 – Apr 15", discount: "Up to 35% off", desc: "Flights & hotels to top beach destinations", emoji: "🌴", gradient: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20" },
              { name: "Summer Sale", period: "Jun 1 – Aug 31", discount: "Up to 40% off", desc: "Early bird Europe & Asia packages", emoji: "☀️", gradient: "from-amber-500/10 to-orange-500/10 border-amber-500/20" },
              { name: "Holiday Special", period: "Nov 15 – Jan 5", discount: "Up to 50% off", desc: "Year-end travel extravaganza", emoji: "🎄", gradient: "from-muted to-muted" },
            ].map(c => (
              <Card key={c.name} className={`border ${c.gradient} hover:shadow-lg transition-all`}>
                <CardContent className="p-5">
                  <span className="text-2xl">{c.emoji}</span>
                  <h4 className="font-bold text-sm mt-2">{c.name}</h4>
                  <p className="text-[10px] text-muted-foreground">{c.period}</p>
                  <p className="text-sm font-bold text-primary mt-2">{c.discount}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Savings Milestones */}
        <Card className="mb-8 border-0 bg-gradient-to-br from-card/90 to-card shadow-xl">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4 text-center">Your Savings Milestones</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { milestone: "$50 Saved", status: "Unlocked", emoji: "🥉", unlocked: true },
                { milestone: "$200 Saved", status: "Unlocked", emoji: "🥈", unlocked: true },
                { milestone: "$500 Saved", status: "$320 to go", emoji: "🥇", unlocked: false },
                { milestone: "$1,000 Saved", status: "$820 to go", emoji: "💎", unlocked: false },
              ].map(m => (
                <div key={m.milestone} className={`p-4 rounded-xl border ${m.unlocked ? "border-primary/20 bg-primary/5" : "border-border/50 bg-muted/20 opacity-60"}`}>
                  <span className="text-2xl">{m.emoji}</span>
                  <p className="text-xs font-bold mt-2">{m.milestone}</p>
                  <p className="text-[10px] text-muted-foreground">{m.status}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Promo Tips */}
        <div className="mb-8">
          <h3 className="font-display font-bold text-lg mb-4 text-center">💡 Pro Tips to Save More</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { tip: "Stack promo codes with loyalty points for maximum discounts", icon: "🔥" },
              { tip: "Book on Tuesdays for the cheapest flight prices on average", icon: "📅" },
              { tip: "Refer 5 friends to unlock the Gold referral tier ($25/referral)", icon: "👥" },
              { tip: "Enable deal alerts to get notified of flash sales instantly", icon: "🔔" },
            ].map(t => (
              <Card key={t.tip} className="border-border/50 hover:border-primary/20 transition-all">
                <CardContent className="p-4 flex items-start gap-3">
                  <span className="text-lg">{t.icon}</span>
                  <p className="text-sm text-muted-foreground">{t.tip}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Promotions;