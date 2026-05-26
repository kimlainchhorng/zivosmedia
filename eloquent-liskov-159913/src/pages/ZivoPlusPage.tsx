/**
 * ZIVO+ Membership Page — Premium subscription with pricing cards
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { withRedirectParam } from "@/lib/authRedirect";
import { motion } from "framer-motion";
import {
  ArrowLeft, Crown, Zap, Shield, Star,
  Check, Loader2, Settings, Sparkles, X, Lock, MessageCircle,
  Car, Headphones, Percent, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useZivoPlus } from "@/contexts/ZivoPlusContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { ScrollArea } from "@/components/ui/scroll-area";

const BENEFITS = [
  { icon: Sparkles, title: "No Service Fee", desc: "Save 5% on every grocery order — service fee completely waived." },
  { icon: Zap, title: "Priority Delivery", desc: "Your orders are matched with drivers first for faster fulfillment." },
  { icon: Shield, title: "Extended Guarantee", desc: "48-hour freshness guarantee (vs. 24h for standard)." },
  { icon: Star, title: "Exclusive Deals", desc: "Members-only discounts and early access to seasonal promotions." },
  { icon: Lock, title: "Lock & Unlock Media", desc: "Send locked photos & videos in chat — set your own price and earn when others unlock.", plan: "chat" },
  { icon: Car, title: "Ride Discounts", desc: "10% off all ZIVO rides with priority pickup matching.", plan: "pro" },
  { icon: Headphones, title: "VIP Support", desc: "24/7 dedicated support line with priority response times.", plan: "pro" },
  { icon: Gift, title: "Monthly Perks", desc: "Free delivery credits, surprise rewards, and early feature access.", plan: "pro" },
];

type PlanId = "monthly" | "chat" | "pro" | "annual";

const PLANS: { id: PlanId; name: string; price: string; period: string; savings: string | null; badge: string | null; highlight?: string; desc?: string }[] = [
  { id: "monthly", name: "Basic", price: "$9.99", period: "/mo", savings: null, badge: null, desc: "Essential perks" },
  { id: "chat", name: "Chat+", price: "$15.99", period: "/mo", savings: null, badge: "Popular", highlight: "Lock & Unlock", desc: "Creator tools" },
  { id: "pro", name: "Pro", price: "$29.99", period: "/mo", savings: null, badge: "Best", highlight: "All perks", desc: "Everything included" },
  { id: "annual", name: "Annual", price: "$79.99", period: "/yr", savings: "Save 33%", badge: null, desc: "Basic plan, yearly" },
];

/* ── Inline Legal Content ── */
function TermsContent() {
  return (
    <div className="space-y-5 text-[13px] leading-relaxed text-foreground/90">
      <p>By accessing or using ZIVO, you agree to these Terms of Service. Please read them carefully.</p>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">1. ZIVO Services</h3>
        <p>ZIVO is an online travel platform that allows users to search, compare, and book travel services including flights, hotels, and car rentals. ZIVO operates a hybrid business model:</p>
        <ul className="mt-2 space-y-1.5 list-disc list-inside text-foreground/80">
          <li><strong>Hotels & Car Rentals:</strong> ZIVO is the merchant of record.</li>
          <li><strong>Flights:</strong> ZIVO is NOT the merchant of record. Bookings are completed with licensed airline partners.</li>
        </ul>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">2. Hotels & Car Rentals (Direct Sale)</h3>
        <p>For hotel and car rental bookings, ZIVO acts as the merchant of record. ZIVO collects payment via secure payment processors (Stripe, Adyen), issues booking confirmations, and handles customer support.</p>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">3. Flights (Partner Ticketing)</h3>
        <p className="font-medium text-amber-600">⚠ Important: ZIVO does not issue airline tickets.</p>
        <p className="mt-1">Flight bookings are completed with licensed airline partners who process payments and issue tickets. Changes, cancellations, and refunds are handled by the airline partner.</p>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">4. Third-Party Providers</h3>
        <p>ZIVO works with various third-party suppliers. The actual service is delivered by the respective property, rental company, or airline.</p>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">5. Accuracy of Information</h3>
        <p>ZIVO displays information provided by third-party suppliers. We do not guarantee pricing, availability, or completeness. Prices may change before checkout is completed.</p>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">6. Prohibited Use</h3>
        <p>You agree not to misuse the platform, attempt unauthorized access, scrape data, make fraudulent bookings, or use ZIVO for unlawful purposes.</p>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">7. Platform Role</h3>
        <p>ZIVO acts as a travel booking platform and sub-agent. ZIVO does not operate airlines, hotels, or transportation services.</p>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">8. Limitation of Liability</h3>
        <p>To the maximum extent permitted by law, ZIVO shall not be liable for any indirect, incidental, or consequential damages.</p>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">9. Force Majeure</h3>
        <p>ZIVO is not liable for disruptions caused by events beyond reasonable control.</p>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">10. Fraud Prevention</h3>
        <p>ZIVO reserves the right to cancel bookings, suspend accounts, or refuse service in cases of suspected fraud or abuse.</p>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">11. Changes</h3>
        <p>ZIVO may update these Terms at any time. Continued use constitutes acceptance.</p>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">Contact</h3>
        <p>For questions: <a href="mailto:support@hizivo.com" className="text-primary underline">support@hizivo.com</a></p>
      </div>
      <p className="text-[11px] text-muted-foreground">Last updated: February 2, 2026</p>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-5 text-[13px] leading-relaxed text-foreground/90">
      <p>ZIVO respects your privacy. This policy explains how we collect, use, and protect your information.</p>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">How We Operate</h3>
        <ul className="space-y-1.5 list-disc list-inside text-foreground/80">
          <li><strong>Hotels & Car Rentals:</strong> ZIVO is the merchant of record. We process your payment and booking information directly.</li>
          <li><strong>Flights:</strong> We share your details with airline partners (with your consent) for ticketing.</li>
        </ul>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">Information We Collect</h3>
        <ul className="space-y-1.5 list-disc list-inside text-foreground/80">
          <li><strong>Account Information:</strong> Name, email, phone number</li>
          <li><strong>Booking Information:</strong> Traveler/guest details, travel dates, preferences</li>
          <li><strong>Payment Information:</strong> For Hotels & Car Rentals only, processed securely via Stripe/Adyen</li>
          <li><strong>Technical Data:</strong> Device information, browser type, IP address, cookies</li>
        </ul>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">How We Use Information</h3>
        <ul className="space-y-1.5 list-disc list-inside text-foreground/80">
          <li>To process and confirm your bookings</li>
          <li>To share traveler information with airline partners (with consent)</li>
          <li>To send booking confirmations and travel updates</li>
          <li>To process refunds and handle support requests</li>
          <li>To improve platform performance and security</li>
        </ul>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">Information Sharing</h3>
        <p>We share your information only as necessary:</p>
        <ul className="mt-1.5 space-y-1.5 list-disc list-inside text-foreground/80">
          <li><strong>Airline Partners:</strong> Traveler details shared with your consent</li>
          <li><strong>Wholesaler APIs:</strong> Booking details to confirm reservations</li>
          <li><strong>Payment Processors:</strong> Stripe/Adyen for secure processing</li>
        </ul>
        <p className="mt-2 font-medium">We do not sell personal data to third parties.</p>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">Cookies</h3>
        <p>We use cookies to operate and improve our services. You can control cookies via your browser settings.</p>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">Your Rights</h3>
        <ul className="space-y-1 list-disc list-inside text-foreground/80">
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your personal information</li>
          <li>Opt out of marketing communications</li>
        </ul>
        <p className="mt-2 text-muted-foreground">Contact us at support@hizivo.com to exercise these rights.</p>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-2">Contact</h3>
        <p>For privacy-related questions: <a href="mailto:support@hizivo.com" className="text-primary underline">support@hizivo.com</a></p>
      </div>
      <p className="text-[11px] text-muted-foreground">Last updated: February 2, 2026</p>
    </div>
  );
}

/* ── Legal Sheet Overlay ── */
function LegalSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background rounded-t-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
      >
        <div className="pt-3 pb-2 px-5">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-foreground">{title}</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-muted/60 transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <ScrollArea className="flex-1 px-5 pb-8">
          {children}
        </ScrollArea>
      </motion.div>
    </motion.div>
  );
}

export default function ZivoPlusPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isPlus, plan, subscriptionEnd, isLoading, refresh } = useZivoPlus();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("chat");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [legalSheet, setLegalSheet] = useState<"terms" | "privacy" | null>(null);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Welcome to ZIVO+! Your membership is now active.");
      refresh();
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Checkout was canceled.");
    }
  }, [searchParams, refresh]);

  const handleCheckout = async () => {
    if (!user) {
      navigate(withRedirectParam("/login", "/zivo-plus"));
      return;
    }
    setIsCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-zivo-plus-checkout", {
        body: { plan: selectedPlan },
      });
      if (error) throw error;
      if (data?.url) {
        const { isAllowedCheckoutUrl } = await import("@/lib/urlSafety");
        if (!isAllowedCheckoutUrl(data.url)) {
          throw new Error("Invalid checkout URL");
        }
        const { openExternalUrl } = await import("@/lib/openExternalUrl");
        await openExternalUrl(data.url);
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleManage = async () => {
    setIsManaging(true);
    try {
      const { data, error } = await supabase.functions.invoke("zivo-plus-portal");
      if (error) throw error;
      if (data?.url) {
        const { isAllowedCheckoutUrl } = await import("@/lib/urlSafety");
        if (!isAllowedCheckoutUrl(data.url)) {
          throw new Error("Invalid portal URL");
        }
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal");
    } finally {
      setIsManaging(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-2xl border-b border-border/20">
        <div className="flex items-center gap-3 px-4 py-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} aria-label="Go back" className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-2xl hover:bg-muted/60 touch-manipulation">
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h1 className="text-base font-bold">ZIVO+</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-primary/5 to-amber-600/10 border border-amber-500/20 p-6 text-center"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.08),transparent_50%)]" />
          <div className="relative z-10 space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/25">
              <Crown className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-foreground">ZIVO+ Membership</h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Skip the service fee, get priority delivery, and enjoy exclusive member perks on every order.
            </p>
          </div>
        </motion.div>

        {/* Active membership card */}
        {isPlus && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-600/5 p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-amber-500" />
              <span className="text-[14px] font-bold text-foreground">Active Member</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 uppercase">
                {plan}
              </span>
            </div>
            {subscriptionEnd && (
              <p className="text-[11px] text-muted-foreground">
                Renews on {new Date(subscriptionEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
            <Button variant="outline" size="sm" onClick={handleManage} disabled={isManaging} className="gap-2">
              {isManaging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Settings className="h-3.5 w-3.5" />}
              Manage Subscription
            </Button>
          </motion.div>
        )}

        {/* Benefits */}
        <div className="space-y-2.5">
          <h3 className="text-[14px] font-bold text-foreground px-1">Member Benefits</h3>
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-3 p-4 rounded-2xl border border-border/20 bg-card"
            >
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <b.icon className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold text-foreground">{b.title}</p>
                  {(b as any).plan && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 uppercase">
                      {(b as any).plan === "chat" ? "Chat+" : "Pro"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pricing cards */}
        {!isPlus && (
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-foreground px-1">Choose Your Plan</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {PLANS.map((p) => (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`relative p-3.5 rounded-2xl border-2 text-left transition-all duration-200 ${
                    selectedPlan === p.id
                      ? "border-amber-500/50 bg-amber-500/5 shadow-md shadow-amber-500/10"
                      : "border-border/20 bg-card hover:border-border/40"
                  }`}
                >
                  {p.badge && (
                    <span className={`absolute -top-2.5 right-2.5 text-[8px] font-bold px-2 py-0.5 rounded-full shadow-sm text-white ${
                      p.badge === "Best" ? "bg-gradient-to-r from-violet-500 to-purple-600" : "bg-amber-500"
                    }`}>
                      {p.badge}
                    </span>
                  )}
                  {selectedPlan === p.id && (
                    <motion.div
                      layoutId="plan-check"
                      className="absolute top-2.5 left-2.5 h-4.5 w-4.5 rounded-full bg-amber-500 flex items-center justify-center"
                    >
                      <Check className="h-2.5 w-2.5 text-white" />
                    </motion.div>
                  )}
                  <p className="text-[11px] font-bold text-amber-600 mb-0.5">{p.name}</p>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[20px] font-extrabold text-foreground">{p.price}</span>
                    <span className="text-[9px] text-muted-foreground">{p.period}</span>
                  </div>
                  {p.desc && (
                    <p className="text-[9px] text-muted-foreground mt-0.5">{p.desc}</p>
                  )}
                  {p.savings && (
                    <p className="text-[9px] font-bold text-emerald-600 mt-1">{p.savings}</p>
                  )}
                  {p.highlight && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Lock className="h-2.5 w-2.5 text-amber-500" />
                      <p className="text-[8px] font-semibold text-amber-600 leading-tight">{p.highlight}</p>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>

            {/* CTA */}
            <motion.div whileTap={!isCheckingOut ? { scale: 0.97 } : {}}>
              <Button
                className="w-full h-[52px] rounded-2xl text-[14px] font-bold gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25"
                disabled={isCheckingOut || isLoading}
                onClick={handleCheckout}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing checkout…
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4" />
                    {user ? "Subscribe to ZIVO+" : "Sign in to Subscribe"}
                  </>
                )}
              </Button>
            </motion.div>

            <p className="text-[9px] text-muted-foreground/60 text-center leading-relaxed px-4">
              Cancel anytime from your account settings. By subscribing you agree to our{" "}
              <button type="button" onClick={() => setLegalSheet("terms")} className="text-primary/60 underline hover:text-primary transition-colors">Terms</button> and{" "}
              <button type="button" onClick={() => setLegalSheet("privacy")} className="text-primary/60 underline hover:text-primary transition-colors">Privacy Policy</button>.
            </p>
          </div>
        )}

        {/* Comparison */}
        <div className="space-y-2">
          <h3 className="text-[14px] font-bold text-foreground px-1">Plan Comparison</h3>
          <div className="rounded-2xl border border-border/20 overflow-hidden">
            <div className="grid grid-cols-[1fr_50px_50px_50px] bg-muted/20 px-3 py-2.5 border-b border-border/10">
              <span className="text-[9px] font-bold text-muted-foreground uppercase">Feature</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase text-center">Basic</span>
              <span className="text-[9px] font-bold text-amber-600 uppercase text-center">Chat+</span>
              <span className="text-[9px] font-bold text-foreground uppercase text-center">Pro</span>
            </div>
            {[
              { feat: "Service Fee", basic: "Free", chat: "Free", pro: "Free" },
              { feat: "Priority Delivery", basic: "✓", chat: "✓", pro: "✓" },
              { feat: "48h Guarantee", basic: "✓", chat: "✓", pro: "✓" },
              { feat: "Member Deals", basic: "✓", chat: "✓", pro: "✓" },
              { feat: "Lock & Unlock", basic: "—", chat: "✓", pro: "✓" },
              { feat: "Ride Discounts", basic: "—", chat: "—", pro: "10%" },
              { feat: "VIP Support", basic: "—", chat: "—", pro: "✓" },
              { feat: "Monthly Perks", basic: "—", chat: "—", pro: "✓" },
            ].map((row, i) => (
              <div key={row.feat} className={`grid grid-cols-[1fr_50px_50px_50px] px-3 py-2.5 ${i < 7 ? "border-b border-border/10" : ""}`}>
                <span className="text-[10px] text-foreground/90 font-medium">{row.feat}</span>
                <span className="text-[10px] text-muted-foreground text-center">{row.basic}</span>
                <span className="text-[10px] text-amber-600 font-bold text-center">{row.chat}</span>
                <span className="text-[10px] text-foreground font-bold text-center">{row.pro}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legal Bottom Sheets */}
      {legalSheet === "terms" && (
        <LegalSheet title="Terms of Service" onClose={() => setLegalSheet(null)}>
          <TermsContent />
        </LegalSheet>
      )}
      {legalSheet === "privacy" && (
        <LegalSheet title="Privacy Policy" onClose={() => setLegalSheet(null)}>
          <PrivacyContent />
        </LegalSheet>
      )}

      <ZivoMobileNav />
    </div>
  );
}
