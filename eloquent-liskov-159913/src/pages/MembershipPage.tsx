/**
 * MembershipPage - ZIVO+ Subscription Management
 * Join, manage, and view membership benefits
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { withRedirectParam } from "@/lib/authRedirect";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Crown,
  Check,
  Truck,
  Percent,
  Headphones,
  Sparkles,
  ArrowLeft,
  Calendar,
  CreditCard,
  AlertCircle,
  Loader2,
  ExternalLink,
  Star,
  Users,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useMembership, 
  useMembershipPlans, 
  useCreateMembershipCheckout,
  useCancelMembership,
  useOpenCustomerPortal,
} from "@/hooks/useMembership";
import SEOHead from "@/components/SEOHead";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { format } from "date-fns";
import { useMembershipSavings } from "@/hooks/useMembershipSavings";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const benefits = [
  {
    icon: Truck,
    title: "Free Delivery",
    description: "Free delivery on orders $15+",
    highlight: true,
  },
  {
    icon: Percent,
    title: "Reduced Service Fees",
    description: "50% off service fees on every order",
    highlight: true,
  },
  {
    icon: Headphones,
    title: "Priority Support",
    description: "Skip the queue with dedicated support",
  },
  {
    icon: Sparkles,
    title: "Exclusive Deals",
    description: "Member-only promotions and early access",
  },
];

export default function MembershipPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [isAnnual, setIsAnnual] = useState(true);

  const { membership, isActive, isPastDue, isLoading: membershipLoading, refetch } = useMembership();
  const { data: plans, isLoading: plansLoading } = useMembershipPlans();
  const { data: savingsData } = useMembershipSavings();
  const createCheckout = useCreateMembershipCheckout();
  const cancelMembership = useCancelMembership();
  const openPortal = useOpenCustomerPortal();
  const handlePullRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  // Handle success/cancel from Stripe redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Welcome to ZIVO+! Your membership is now active.");
      refetch();
    } else if (searchParams.get("cancelled") === "true") {
      toast.info("Checkout cancelled. No charges were made.");
    }
  }, [searchParams, refetch]);

  const plan = plans?.[0]; // Get first (and typically only) plan
  const monthlyPrice = plan?.price_monthly || 9.99;
  const annualPrice = plan?.price_yearly || 79.99;
  const annualSavings = Math.round((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12) * 100);

  const handleJoin = async () => {
    if (!user) {
      navigate(withRedirectParam("/login", "/membership"));
      return;
    }

    if (!plan) {
      toast.error("No plans available");
      return;
    }

    try {
      const result = await createCheckout.mutateAsync({
        planId: plan.id,
        billingCycle: isAnnual ? "yearly" : "monthly",
      });

      if (result.url) {
        import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(result.url));
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMembership.mutateAsync();
      refetch();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleManage = () => {
    openPortal.mutate();
  };

  const isLoading = authLoading || membershipLoading || plansLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <Skeleton className="h-48 rounded-2xl mb-6" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handlePullRefresh} className="min-h-screen bg-background">
      <SEOHead 
        title="ZIVO+ Membership" 
        description="Join ZIVO+ for free delivery, reduced fees, and priority support" 
      />
      <NavBar />
      
      <main className="pt-24 pb-16">
        {/* Back Button */}
        <div className="container mx-auto px-4 mb-6">
          <button type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
        </div>

        {/* Hero */}
        <section className="container mx-auto px-4 text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-6">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-400">Premium Membership</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">ZIVO+</h1>
            <p className="text-muted-foreground">
              Free delivery, reduced fees, and exclusive perks
            </p>
          </motion.div>
        </section>

        <div className="container mx-auto px-4 max-w-2xl space-y-8">
          {/* Active Membership Card */}
          {isActive && membership && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <Crown className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold">You're a ZIVO+ Member</h2>
                        {membership.cancelled_at && (
                          <Badge variant="secondary" className="text-xs">Cancelling</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {membership.plan?.name || "ZIVO+"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {membership.current_period_end && (
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {membership.cancelled_at ? "Access until" : "Next billing"}:
                        </span>
                        <span className="font-medium">
                          {format(new Date(membership.current_period_end), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleManage}
                      disabled={openPortal.isPending}
                    >
                      {openPortal.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Manage Billing
                        </>
                      )}
                    </Button>

                    {!membership.cancelled_at && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                            Cancel
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel ZIVO+ Membership?</AlertDialogTitle>
                            <AlertDialogDescription>
                              You'll lose access to free delivery, reduced fees, and priority support at the end of your current billing period.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Membership</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleCancel}
                              className="bg-red-500 hover:bg-red-600"
                              disabled={cancelMembership.isPending}
                            >
                              {cancelMembership.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Cancel Membership"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Monthly Savings Card - Show for active members with savings */}
          {isActive && savingsData && savingsData.thisMonthCents > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                      <Sparkles className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Your savings this month</p>
                      <p className="text-2xl font-bold text-amber-400">
                        ${savingsData.thisMonthDollars.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {savingsData.orderCount} order{savingsData.orderCount !== 1 ? 's' : ''} with ZIVO+ benefits
                    </span>
                    <Link 
                      to="/eats/orders" 
                      className="text-sm text-amber-500 hover:text-amber-400 font-medium"
                    >
                      View Orders →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Past Due Warning */}
          {isPastDue && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-red-500/30 bg-red-500/10">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-red-400 mb-1">Payment Failed</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Your subscription payment failed. Please update your payment method to continue enjoying ZIVO+ benefits.
                      </p>
                      <Button onClick={handleManage} variant="outline" size="sm">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Update Payment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Join Card (show if not active) */}
          {!isActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
                <CardContent className="p-8">
                  {/* Toggle */}
                  <div className="flex items-center justify-center gap-4 mb-8">
                    <span className={cn("text-sm font-medium", !isAnnual && "text-foreground", isAnnual && "text-muted-foreground")}>
                      Monthly
                    </span>
                    <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
                    <span className={cn("text-sm font-medium flex items-center gap-2", isAnnual && "text-foreground", !isAnnual && "text-muted-foreground")}>
                      Annual
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                        Save {annualSavings}%
                      </Badge>
                    </span>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold">
                        ${isAnnual ? annualPrice : monthlyPrice}
                      </span>
                      <span className="text-muted-foreground">
                        /{isAnnual ? "year" : "month"}
                      </span>
                    </div>
                    {isAnnual && (
                      <p className="text-sm text-muted-foreground mt-2">
                        That's just ${(annualPrice / 12).toFixed(2)}/month
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <Button 
                    onClick={handleJoin}
                    disabled={createCheckout.isPending}
                    className="w-full h-14 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 gap-2"
                  >
                    {createCheckout.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Crown className="w-5 h-5" />
                        Join ZIVO+
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Cancel anytime. No commitment required.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Benefits Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-xl font-bold mb-4">Member Benefits</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {benefits.map((benefit, index) => (
                <Card key={benefit.title} className={cn(
                  "transition-all",
                  benefit.highlight && "border-amber-500/20 bg-amber-500/5"
                )}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      benefit.highlight 
                        ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30"
                        : "bg-muted"
                    )}>
                      <benefit.icon className={cn(
                        "w-5 h-5",
                        benefit.highlight ? "text-amber-500" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{benefit.title}</h3>
                      <p className="text-xs text-muted-foreground">{benefit.description}</p>
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-auto" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* === WAVE 7: Premium Membership Content === */}

          {/* Member Testimonials */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="text-xl font-bold mb-4">What Members Say</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { name: "Jessica R.", quote: "ZIVO+ paid for itself in the first week. Free delivery is a game changer!", rating: 5, savings: "$47/mo" },
                { name: "David M.", quote: "Priority support saved me during a flight change. Worth every penny.", rating: 5, savings: "$32/mo" },
                { name: "Aisha K.", quote: "The exclusive deals alone make it worth it. Got 40% off a resort!", rating: 5, savings: "$89/mo" },
                { name: "Carlos T.", quote: "Reduced service fees add up fast when you travel often.", rating: 4, savings: "$28/mo" },
              ].map(t => (
                <Card key={t.name} className="border-border/40">
                  <CardContent className="p-4">
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />)}
                    </div>
                    <p className="text-xs text-muted-foreground italic mb-2">"{t.quote}"</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-foreground">{t.name}</p>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[8px]">Saves {t.savings}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Membership Comparison */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-xl font-bold mb-4">Free vs ZIVO+</h2>
            <Card className="border-border/40 overflow-hidden">
              <CardContent className="p-0">
                <div className="grid grid-cols-3 text-xs">
                  <div className="p-3 border-b border-r border-border/30 font-bold text-foreground">Feature</div>
                  <div className="p-3 border-b border-r border-border/30 text-center text-muted-foreground">Free</div>
                  <div className="p-3 border-b border-border/30 text-center font-bold text-amber-500">ZIVO+</div>
                  {[
                    { feature: "Delivery Fee", free: "$2.99-$5.99", plus: "Free" },
                    { feature: "Service Fee", free: "Full", plus: "50% off" },
                    { feature: "Support", free: "Standard", plus: "Priority" },
                    { feature: "Deals", free: "Public", plus: "Exclusive" },
                    { feature: "Points Bonus", free: "1x", plus: "2x" },
                    { feature: "Cancel/Change", free: "Standard", plus: "Free" },
                  ].map(row => (
                    <>
                      <div key={row.feature} className="p-2.5 border-b border-r border-border/20 text-[11px] text-foreground">{row.feature}</div>
                      <div className="p-2.5 border-b border-r border-border/20 text-center text-[11px] text-muted-foreground">{row.free}</div>
                      <div className="p-2.5 border-b border-border/20 text-center text-[11px] font-bold text-emerald-500">{row.plus}</div>
                    </>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Usage Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h2 className="text-xl font-bold mb-4">ZIVO+ by the Numbers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { stat: "50K+", label: "Active Members", icon: Users },
                { stat: "$2.4M", label: "Total Saved", icon: DollarSign },
                { stat: "4.9★", label: "Avg Rating", icon: Star },
                { stat: "92%", label: "Renewal Rate", icon: TrendingUp },
              ].map(s => (
                <Card key={s.label} className="border-border/40">
                  <CardContent className="p-3 text-center">
                    <s.icon className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-bold text-foreground">{s.stat}</p>
                    <p className="text-[9px] text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Exclusive Perks Preview */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-xl font-bold mb-4">This Month's Exclusive Perks</h2>
            <div className="space-y-2">
              {[
                { perk: "30% off Cancún flights", expiry: "Ends Mar 5", tag: "Flights" },
                { perk: "Free room upgrade at Marriott", expiry: "Ends Mar 10", tag: "Hotels" },
                { perk: "2x points on all rentals", expiry: "All month", tag: "Cars" },
                { perk: "Early access: Summer deals", expiry: "Members only", tag: "Deals" },
              ].map(p => (
                <Card key={p.perk} className="border-amber-500/15 hover:border-amber-500/25 transition-all">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground">{p.perk}</p>
                      <p className="text-[10px] text-muted-foreground">{p.expiry}</p>
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[8px]">{p.tag}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* === WAVE 13: Extra Membership Content === */}

          {/* Member Milestones */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="text-xl font-bold mb-4">Member Milestones</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { milestone: "1 Month", reward: "Welcome: 500 points", emoji: "🎉", unlocked: true },
                { milestone: "3 Months", reward: "Free lounge pass", emoji: "✈️", unlocked: true },
                { milestone: "6 Months", reward: "Birthday $25 credit", emoji: "🎂", unlocked: false },
                { milestone: "1 Year", reward: "Free hotel night", emoji: "🏆", unlocked: false },
              ].map(m => (
                <Card key={m.milestone} className={`border-border/40 ${m.unlocked ? "border-amber-500/20 bg-amber-500/5" : "opacity-60"}`}>
                  <CardContent className="p-3 text-center">
                    <span className="text-xl">{m.emoji}</span>
                    <p className="text-xs font-bold mt-1">{m.milestone}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">{m.reward}</p>
                    {m.unlocked && <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[7px] mt-1">Unlocked</Badge>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Membership FAQ */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <h2 className="text-xl font-bold mb-4">Membership FAQ</h2>
            <div className="space-y-2">
              {[
                { q: "When does my membership start?", a: "Immediately after payment. Benefits apply to all orders after activation." },
                { q: "Can I switch monthly to annual?", a: "Yes! Go to Manage Billing and switch. You'll get prorated credit." },
                { q: "What happens when I cancel?", a: "Benefits continue until end of current billing period." },
                { q: "Do benefits apply to all services?", a: "Yes — flights, hotels, cars, rides, and food delivery." },
              ].map(f => (
                <Card key={f.q} className="border-border/40">
                  <CardContent className="p-3">
                    <p className="text-xs font-bold">{f.q}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{f.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Savings Calculator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold mb-4">Example Savings</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>$30.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through text-muted-foreground">$3.99</span>
                      <span className="text-emerald-400 font-medium">$0.00</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through text-muted-foreground">$1.50</span>
                      <span className="text-emerald-400 font-medium">$0.75</span>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between font-bold">
                    <span>You Save</span>
                    <span className="text-amber-500">$4.74</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Order 3x per month and your membership pays for itself!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      
      <Footer />
    </PullToRefresh>
  );
}
