import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Handshake, Plane, Hotel, Car, DollarSign, BarChart3, Users,
  CheckCircle, ChevronRight, Mail, Building2, Globe, Sparkles, ArrowRight,
  Shield, Star, TrendingUp, UserPlus, Store, UtensilsCrossed, Truck,
  ShoppingBag, Briefcase, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PARTNER_TYPES = [
  {
    icon: Plane,
    title: "Airlines",
    description: "List your flights on ZIVO and reach millions of travelers worldwide",
    gradient: "from-muted to-muted",
    glow: "shadow-sky-500/25",
    stat: "500+ Airlines",
  },
  {
    icon: Hotel,
    title: "Hotels",
    description: "Showcase your properties to travelers booking complete trips",
    gradient: "from-amber-500 to-orange-500",
    glow: "shadow-amber-500/25",
    stat: "2M+ Properties",
  },
  {
    icon: Car,
    title: "Car Rentals",
    description: "Connect with travelers seeking ground transportation solutions",
    gradient: "from-muted to-muted",
    glow: "shadow-violet-500/25",
    stat: "150+ Countries",
  },
  {
    icon: Building2,
    title: "Travel Agencies",
    description: "Distribute your curated inventory through our platform",
    gradient: "from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/25",
    stat: "Global Network",
  },
  {
    icon: UtensilsCrossed,
    title: "Restaurants",
    description: "Serve hungry travelers and locals through ZIVO Eats ordering",
    gradient: "from-muted to-muted",
    glow: "shadow-rose-500/25",
    stat: "10K+ Restaurants",
  },
  {
    icon: Store,
    title: "Stores",
    description: "Sell products to travelers and locals through ZIVO marketplace",
    gradient: "from-muted to-muted",
    glow: "shadow-indigo-500/25",
    stat: "5K+ Stores",
  },
  {
    icon: Truck,
    title: "Drivers",
    description: "Join our fleet and earn by delivering rides and food orders",
    gradient: "from-muted to-muted",
    glow: "shadow-cyan-500/25",
    stat: "50K+ Drivers",
  },
  {
    icon: ShoppingBag,
    title: "Food Delivery",
    description: "Partner with ZIVO Eats to expand your delivery reach",
    gradient: "from-orange-500 to-red-500",
    glow: "shadow-orange-500/25",
    stat: "1M+ Orders",
  },
  {
    icon: Briefcase,
    title: "Employers",
    description: "Post jobs and manage shift workers through the ZIVO workforce hub",
    gradient: "from-amber-500 to-yellow-500",
    glow: "shadow-amber-500/25",
    stat: "HR & Staffing",
  },
];

const BENEFITS = [
  { icon: Users, title: "Millions of Users", description: "Access our rapidly growing base of active travelers", number: "2M+" },
  { icon: DollarSign, title: "Competitive Commission", description: "Transparent and flexible revenue sharing models", number: "15%" },
  { icon: BarChart3, title: "Real-Time Analytics", description: "Track performance, conversions, and optimize your ROI", number: "24/7" },
  { icon: Globe, title: "Global Reach", description: "Expand into new markets across 150+ countries", number: "150+" },
];

const STEPS = [
  { step: "01", title: "Apply", description: "Submit your partnership inquiry below" },
  { step: "02", title: "Review", description: "Our team evaluates your application" },
  { step: "03", title: "Integrate", description: "Connect your inventory to ZIVO" },
  { step: "04", title: "Grow", description: "Start reaching millions of travelers" },
];

/* Map URL ?type= param values to Select values */
const TYPE_PARAM_MAP: Record<string, string> = {
  driver: "driver",
  restaurant: "restaurant",
  lodging: "hotel",
  property: "property",
  employer: "employer",
  hotel: "hotel",
  store: "store",
  airline: "airline",
};

export default function PartnerWithZivo() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialType = TYPE_PARAM_MAP[params.get("type") ?? ""] ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [partnerType, setPartnerType] = useState(initialType);
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (!partnerType) {
      toast.error("Please select a partner type");
      return;
    }
    if (!agreed) {
      toast.error("Please agree to the Terms of Service");
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: contactName, company: companyName } },
      });
      if (authErr) throw authErr;
      const userId = authData.user?.id;
      if (!userId) throw new Error("Could not create account — please try again.");

      const { error: appErr } = await (supabase as any)
        .from("partner_applications")
        .insert({
          user_id: userId,
          business_name: companyName,
          partner_kind: partnerType,
          contact_email: email,
          contact_phone: phone || null,
          status: "pending",
        });
      if (appErr) throw appErr;

      toast.success("Account created!", {
        description: "Let's finish setting up your partner profile.",
      });
      navigate(`/partner-onboarding?type=${partnerType}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="sticky top-0 safe-area-top z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-lg">Partner with ZIVO</h1>
            <p className="text-xs text-muted-foreground">Grow your business with us</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-16">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center pt-4"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="relative w-24 h-24 rounded-[28px] bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/30"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/25 via-transparent to-black/10" />
            <Handshake className="h-12 w-12 text-primary-foreground relative z-10" />
          </motion.div>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold mb-5 tracking-tight">
            Become a ZIVO Partner
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
            Join our network of travel providers and connect with millions of travelers
            searching for their next adventure.
          </p>

          {/* Trust Stats Row */}
          <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
            {[
              { label: "Active Users", value: "2M+" },
              { label: "Countries", value: "150+" },
              { label: "Partners", value: "500+" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-primary">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Partner Types */}
        <section>
          <div className="text-center mb-10">
            <p className="text-primary text-xs font-bold tracking-widest uppercase mb-2">Partnership Categories</p>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold">Who We Partner With</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PARTNER_TYPES.map((type, i) => (
              <motion.div
                key={type.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.4 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <Card className={`relative overflow-hidden border-0 bg-card shadow-xl ${type.glow} h-full cursor-default`}>
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${type.gradient}`} />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/[0.02] pointer-events-none" />
                  <CardContent className="p-6 text-center relative z-10">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${type.gradient} flex items-center justify-center mx-auto mb-4 shadow-lg ${type.glow} relative`}>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 via-transparent to-black/10" />
                      <type.icon className="h-8 w-8 text-primary-foreground relative z-10" />
                    </div>
                    <h4 className="font-bold text-base mb-1.5">{type.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{type.description}</p>
                    <span className="inline-block text-[10px] font-bold tracking-wider uppercase text-primary/80 bg-primary/10 px-3 py-1 rounded-full">
                      {type.stat}
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section>
          <div className="text-center mb-10">
            <p className="text-primary text-xs font-bold tracking-widest uppercase mb-2">Simple Process</p>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold">How It Works</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 * i }}
                className="relative text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-3 border border-primary/10 relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent" />
                  <span className="text-xl font-extrabold text-primary relative z-10">{s.step}</span>
                </div>
                <h4 className="font-bold text-sm mb-1">{s.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-snug">{s.description}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-7 -right-2 text-muted-foreground/30">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section>
          <div className="text-center mb-10">
            <p className="text-primary text-xs font-bold tracking-widest uppercase mb-2">Advantages</p>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold">Why Partner with ZIVO?</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {BENEFITS.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden rounded-2xl bg-card border border-border/50 p-5 shadow-lg"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10 relative">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent" />
                    <benefit.icon className="h-6 w-6 text-primary relative z-10" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm">{benefit.title}</h4>
                      <span className="text-lg font-extrabold text-primary/70">{benefit.number}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Signup Form */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="relative overflow-hidden border-0 bg-card shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/50" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-transparent pointer-events-none" />
            <CardHeader className="relative z-10 pb-2">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 relative">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/10 to-transparent" />
                  <UserPlus className="h-5 w-5 text-primary relative z-10" />
                </div>
                <div>
                  <CardTitle className="text-xl font-extrabold">Setup Partner Account</CardTitle>
                  <CardDescription className="text-xs">
                    Create your ZIVO Partner account to get started
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Account credentials */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">Business Email *</Label>
                  <Input
                    id="email"
                    required
                    type="email"
                    placeholder="business@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-semibold">Password *</Label>
                    <Input
                      id="password"
                      required
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-xs font-semibold">Confirm Password *</Label>
                    <Input
                      id="confirm-password"
                      required
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Business Details</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="company-name" className="text-xs font-semibold">Company Name *</Label>
                    <Input
                      id="company-name"
                      required
                      placeholder="Your company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-11 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="partner-type" className="text-xs font-semibold">Partner Type *</Label>
                    <Select
                      required
                      value={partnerType}
                      onValueChange={setPartnerType}
                    >
                      <SelectTrigger id="partner-type" className="h-11 rounded-xl bg-muted/30 border-border/50">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="airline">Airline</SelectItem>
                        <SelectItem value="hotel">Hotel / Accommodation</SelectItem>
                        <SelectItem value="car">Car Rental</SelectItem>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="store">Store / Retail</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="food_delivery">Food Delivery</SelectItem>
                        <SelectItem value="agency">Travel Agency</SelectItem>
                        <SelectItem value="employer">Employer / HR</SelectItem>
                        <SelectItem value="property">Property Rental</SelectItem>
                        <SelectItem value="affiliate">Affiliate Marketer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name" className="text-xs font-semibold">Contact Name *</Label>
                    <Input
                      id="contact-name"
                      required
                      placeholder="Full name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="h-11 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-xs font-semibold">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="h-11 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50"
                  />
                </div>

                {/* Terms */}
                <label className="flex items-start gap-3 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    required
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    I agree to the{" "}
                    <Link to="/terms" className="text-primary hover:underline font-medium">Terms of Service</Link>
                    {" "}and{" "}
                    <Link to="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>
                    {" "}for ZIVO Partners.
                  </span>
                </label>

                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground h-13 rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/10 pointer-events-none" />
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin relative z-10" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2 relative z-10" />
                    )}
                    <span className="relative z-10">{loading ? "Creating account…" : "Create Partner Account"}</span>
                    {!loading && <ArrowRight className="h-4 w-4 ml-2 relative z-10 group-hover:translate-x-1 transition-transform" />}
                  </Button>
                </motion.div>

                <div className="flex items-center justify-center gap-4 pt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure &amp; Encrypted</span>
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Free to join</span>
                </div>

                <p className="text-center text-xs text-muted-foreground pt-1">
                  Already a partner?{" "}
                  <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.section>

        {/* Disclaimer */}
        <section className="text-center pb-8">
          <div className="bg-muted/20 rounded-2xl p-6 max-w-2xl mx-auto border border-border/30">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Partner Disclosure:</strong> ZIVO acts as a booking facilitator
              and sub-agent. Travel services are provided by licensed partners. All partnerships are subject to
              review and approval based on ZIVO's quality and compliance standards.
            </p>
          </div>
          <div className="mt-4">
            <Link to="/partner-disclosure" className="text-primary text-xs font-semibold hover:underline inline-flex items-center gap-1">
              Read full Partner Disclosure
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
