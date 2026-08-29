/**
 * BrandDealsPage — Creator brand partnerships marketplace.
 * The marketplace is not live yet, so this page is an honest "launching soon"
 * waitlist. It reuses the shared `service-waitlist-submit` edge function
 * (same pattern as ServicesPage) with the service identifier "Brand Deals".
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Handshake, Sparkles, Mail, CheckCircle2, Megaphone, Users, BadgeDollarSign } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGoBack } from "@/hooks/useGoBack";

const WAITLIST_SERVICE = "Brand Deals";

const WHAT_TO_EXPECT = [
  {
    icon: Megaphone,
    title: "Real brand campaigns",
    description: "Vetted partnership briefs from brands — no invented offers, no fake payouts.",
  },
  {
    icon: Users,
    title: "Matched to your audience",
    description: "Eligibility based on your real reach, so you only see deals you can actually take.",
  },
  {
    icon: BadgeDollarSign,
    title: "Transparent earnings",
    description: "Clear payout terms up front, paid through your ZIVO wallet.",
  },
];

export default function BrandDealsPage() {
  const navigate = useNavigate();
  const goBack = useGoBack("/");
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("service-waitlist-submit", {
        body: {
          email: trimmed,
          service: WAITLIST_SERVICE,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
      });
      if (error) throw error;
    } catch {
      toast.error("Couldn't join the waitlist. Please try again.");
      setLoading(false);
      return;
    }
    setLoading(false);
    setSubmitted(true);
    toast.success("You're on the Brand Deals waitlist!");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background">
      <SEOHead title="Brand Deals · ZIVO" description="Brand partnerships for creators — launching soon." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            aria-label="Back"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={goBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Handshake className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Brand Deals</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        {/* Launching-soon hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 rounded-2xl p-6 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Coming soon</p>
            <p className="text-3xl font-bold leading-tight mt-1">Brand Deals is launching soon</p>
            <p className="text-sm text-white/80 leading-snug mt-2 max-w-md">
              We're building a marketplace where creators connect with brands for
              sponsorships and paid partnerships. Join the waitlist and we'll
              email you the moment it opens.
            </p>
          </div>
        </motion.div>

        {/* Waitlist form / success state */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-4 rounded-2xl bg-card border border-border p-5"
        >
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-bold text-base text-foreground">You're on the list!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We'll email {email.trim()} when Brand Deals launches.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[15px] font-bold text-foreground">Get notified at launch</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Drop your email and you'll be first to know when brand campaigns go live.
                </p>
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-muted/40 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <button
                type="button"
                disabled={!email.trim() || loading}
                onClick={handleSubmit}
                className="w-full h-12 rounded-2xl bg-ig-gradient text-white font-bold text-sm disabled:opacity-50 hover:opacity-90 active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {loading ? "Joining…" : "Notify me when it launches"}
              </button>
            </div>
          )}
        </motion.div>

        {/* What to expect */}
        <div className="mt-6 space-y-3">
          {WHAT_TO_EXPECT.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + idx * 0.05 }}
              className="rounded-2xl bg-card border border-border p-4 flex items-start gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-foreground leading-tight">{item.title}</p>
                <p className="text-sm text-muted-foreground leading-snug mt-1">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground text-center px-6 pt-8">
          No brand campaigns are live yet. Any deals shown elsewhere are not affiliated with ZIVO.
        </p>
      </div>
    </SwipeBackContainer>
  );
}
