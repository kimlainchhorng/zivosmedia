import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  Check, 
  Plane, 
  Hotel, 
  Car, 
  Package, 
  AlertTriangle, 
  FileText, 
  Phone, 
  ChevronRight,
  ChevronLeft,
  Star, 
  Heart, 
  Clock, 
  DollarSign,
  Globe,
  Users,
  Award,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TravelInsurance = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState("standard");

  const plans = [
    {
      id: "basic",
      name: "Basic",
      price: 29,
      period: "per trip",
      description: "Essential coverage for peace of mind",
      gradient: "from-muted-foreground to-muted-foreground/80",
      glow: "shadow-muted-foreground/20",
      features: [
        "Trip cancellation up to $2,500",
        "Medical expenses up to $10,000",
        "Baggage loss up to $500",
        "24/7 emergency hotline",
      ],
      excluded: [
        "Adventure sports",
        "Pre-existing conditions",
        "Cancel for any reason",
      ],
    },
    {
      id: "standard",
      name: "Standard",
      price: 59,
      period: "per trip",
      description: "Our most popular comprehensive coverage",
      recommended: true,
      gradient: "from-primary to-teal-400",
      glow: "shadow-primary/30",
      features: [
        "Trip cancellation up to $10,000",
        "Medical expenses up to $50,000",
        "Baggage loss up to $2,000",
        "Trip delay coverage",
        "Emergency evacuation",
        "24/7 emergency hotline",
      ],
      excluded: [
        "Pre-existing conditions",
        "Cancel for any reason",
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: 99,
      period: "per trip",
      description: "Maximum protection for worry-free travel",
      gradient: "from-amber-500 to-orange-500",
      glow: "shadow-amber-500/30",
      features: [
        "Trip cancellation up to $25,000",
        "Medical expenses up to $150,000",
        "Baggage loss up to $5,000",
        "Trip delay coverage",
        "Emergency evacuation",
        "Cancel for any reason (75% refund)",
        "Adventure sports covered",
        "Pre-existing conditions covered",
        "Concierge service",
        "24/7 emergency hotline",
      ],
      excluded: [],
    },
  ];

  const coverageTypes = [
    { icon: Plane, label: "Flights", description: "Flight delays & cancellations", gradient: "from-muted to-muted" },
    { icon: Hotel, label: "Hotels", description: "Booking protection", gradient: "from-amber-500 to-orange-500" },
    { icon: Car, label: "Car Rentals", description: "Rental car coverage", gradient: "from-muted to-muted" },
    { icon: Package, label: "Luggage", description: "Lost luggage protection", gradient: "from-emerald-500 to-green-500" },
  ];

  const stats = [
    { icon: Users, value: "2M+", label: "Customers Protected" },
    { icon: Globe, value: "195", label: "Countries Covered" },
    { icon: Star, value: "4.9", label: "Customer Rating" },
    { icon: Award, value: "A+", label: "Insurance Rating" },
  ];

  const benefits = [
    { icon: Clock, title: "Instant Coverage", description: "Protection starts immediately" },
    { icon: Phone, title: "24/7 Support", description: "Help when you need it" },
    { icon: DollarSign, title: "Fast Claims", description: "Get paid within 48 hours" },
    { icon: Star, title: "4.9 Rating", description: "Trusted by millions" },
  ];

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <Header />

      <main className="pt-16 sm:pt-20">
        {/* Hero Section */}
        <section className="relative py-12 sm:py-20 lg:py-32 overflow-hidden">
          {/* Enhanced background effects */}
          <div className="absolute inset-0 bg-gradient-radial via-transparent to-transparent opacity-70" />
          <div className="absolute top-1/3 right-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full blur-3xl bg-secondary" />
          <div className="absolute bottom-0 left-0 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-gradient-to-tr from-primary/15 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            {/* Back Navigation */}
            <div className="mb-6 sm:mb-8 animate-in fade-in slide-in-from-left-2 duration-300">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="gap-2 text-muted-foreground hover:text-foreground touch-manipulation active:scale-95 rounded-xl"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            </div>

            <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge className="mb-4 sm:mb-6 text-primary-foreground border-0 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold shadow-xl bg-foreground">
                <Sparkles className="w-4 h-4 mr-2" />
                New Service
              </Badge>
              <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-8 leading-tight">
                Travel with{" "}
                <span className="text-accent-foreground">
                  Confidence
                </span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-12 px-2">
                Comprehensive travel insurance that covers trip cancellations, medical emergencies, 
                lost luggage, and more.
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
                <Button size="lg" className="h-12 sm:h-14 px-6 sm:px-10 text-sm sm:text-lg font-bold rounded-2xl text-primary-foreground shadow-xl hover:opacity-90 gap-2 touch-manipulation active:scale-[0.98] bg-foreground">
                  Get Protected
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <Button variant="outline" size="lg" className="h-12 sm:h-14 px-6 sm:px-10 text-sm sm:text-lg font-bold rounded-2xl border-2 gap-2 touch-manipulation active:scale-[0.98]">
                  Compare Plans
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="text-center animate-in fade-in slide-in-from-bottom-4 duration-300"
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  <div className="w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-3 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg bg-secondary">
                    <stat.icon className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
                  </div>
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-accent-foreground">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Coverage Types */}
        <section className="py-10 sm:py-16 lg:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 sm:mb-14 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="font-display text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4">
                What We <span className="text-accent-foreground">Cover</span>
              </h2>
              <p className="text-sm sm:text-lg text-muted-foreground">Comprehensive protection for all aspects of your trip</p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 max-w-5xl mx-auto">
              {coverageTypes.map((type, index) => (
                <Card 
                  key={type.label}
                  className="text-center h-full border-0 bg-gradient-to-br from-card/90 to-card shadow-xl hover:shadow-2xl transition-all cursor-pointer group overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-secondary" />
                  <CardContent className="p-4 sm:pt-8 sm:pb-6 relative">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-5 rounded-xl sm:rounded-2xl bg-gradient-to-br ${type.gradient} flex items-center justify-center shadow-lg`}>
                      <type.icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
                    </div>
                    <h3 className="font-bold text-sm sm:text-xl mb-1 sm:mb-2">{type.label}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{type.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="py-10 sm:py-16 lg:py-24">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-8 sm:mb-14 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="font-display text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4">
                Choose Your <span className="text-accent-foreground">Plan</span>
              </h2>
              <p className="text-sm sm:text-lg text-muted-foreground">Select the coverage that fits your travel needs</p>
            </div>
            
            <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {plans.map((plan, index) => (
                <div
                  key={plan.id}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Label htmlFor={plan.id} className="cursor-pointer block h-full touch-manipulation">
                    <Card className={`relative h-full transition-all overflow-hidden border-0 bg-gradient-to-br from-card/90 to-card ${
                      selectedPlan === plan.id 
                        ? "ring-2 ring-primary shadow-2xl shadow-primary/20" 
                        : "shadow-xl hover:shadow-2xl"
                    }`}>
                      {plan.recommended && (
                        <Badge className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-primary to-teal-400 text-primary-foreground border-0 px-3 sm:px-4 py-1 sm:py-1.5 font-semibold shadow-lg text-xs sm:text-sm">
                          <Zap className="w-3 h-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                      <CardHeader className="text-center pb-3 sm:pb-4 pt-6 sm:pt-8">
                        <RadioGroupItem value={plan.id} id={plan.id} className="sr-only" />
                        <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg ${plan.glow}`}>
                          <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
                        </div>
                        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                        <div className="mt-4">
                          <span className="text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">${plan.price}</span>
                          <span className="text-muted-foreground">/{plan.period}</span>
                        </div>
                        <CardDescription className="mt-3 text-base">{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {plan.features.map((feature) => (
                          <div key={feature} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="h-3 w-3 text-emerald-500" />
                            </div>
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                        {plan.excluded.map((item) => (
                          <div key={item} className="flex items-start gap-3 text-muted-foreground">
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                              <AlertTriangle className="h-3 w-3" />
                            </div>
                            <span className="text-sm line-through">{item}</span>
                          </div>
                        ))}
                      </CardContent>
                      <CardFooter className="pt-3 sm:pt-4 pb-4 sm:pb-6">
                        <Button 
                          className={`w-full h-11 sm:h-12 font-bold rounded-xl touch-manipulation active:scale-[0.98] ${
                            selectedPlan === plan.id 
                              ? "bg-gradient-to-r from-primary to-teal-400 text-primary-foreground shadow-lg shadow-primary/30" 
                              : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          {selectedPlan === plan.id ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Selected
                            </>
                          ) : "Select Plan"}
                        </Button>
                      </CardFooter>
                    </Card>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-10 sm:py-16 lg:py-24 bg-muted/20">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-0 bg-gradient-to-br from-card/90 to-card shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-secondary" />
                <CardContent className="p-5 sm:p-8 lg:p-12 relative">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                    {benefits.map((benefit, index) => (
                      <div
                        key={benefit.title}
                        className="text-center animate-in fade-in slide-in-from-bottom-4 duration-300"
                        style={{ animationDelay: `${index * 75}ms` }}
                      >
                        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg bg-secondary">
                          <benefit.icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
                        </div>
                        <h4 className="font-bold text-sm sm:text-lg mb-1">{benefit.title}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">{benefit.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-10 sm:py-16 lg:py-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="font-display text-2xl sm:text-3xl lg:text-5xl font-bold mb-3 sm:mb-4">
                Ready to Travel <span className="text-accent-foreground">Worry-Free?</span>
              </h2>
              <p className="text-sm sm:text-lg text-muted-foreground mb-6 sm:mb-10">Get instant coverage and peace of mind for your next trip</p>
              
              <div className="inline-block mb-6 sm:mb-10">
                <Button size="lg" className="h-12 sm:h-16 px-6 sm:px-10 text-base sm:text-xl font-bold rounded-xl sm:rounded-2xl text-primary-foreground shadow-xl hover:opacity-90 gap-2 sm:gap-3 touch-manipulation active:scale-[0.98] bg-foreground">
                  Get Insured Now
                  <ArrowRight className="w-4 h-4 sm:w-6 sm:h-6" />
                </Button>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto">
                <Card className="cursor-pointer border-0 bg-gradient-to-br from-card/90 to-card shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all group touch-manipulation active:scale-[0.98]" onClick={() => navigate("/insurance")}>
                  <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0 bg-secondary">
                      <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-foreground" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h4 className="font-bold text-sm sm:text-lg">Full Policy Details</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">Read complete terms</p>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </CardContent>
                </Card>
                <Card className="cursor-pointer border-0 bg-gradient-to-br from-card/90 to-card shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all group touch-manipulation active:scale-[0.98]" onClick={() => navigate("/help#insurance")}>
                  <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0 bg-secondary">
                      <Heart className="h-5 w-5 sm:h-7 sm:w-7 text-foreground" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h4 className="font-bold text-sm sm:text-lg">Claims & Support</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">How to file a claim</p>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
        {/* === WAVE 10: Rich Insurance Content === */}

        {/* Claims Process */}
        <section className="py-10 sm:py-16 lg:py-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-8">
              How <span className="text-accent-foreground">Claims</span> Work
            </h2>
            <div className="grid sm:grid-cols-4 gap-4">
              {[
                { step: 1, title: "File Online", desc: "Submit your claim through the app or website in minutes", emoji: "📝" },
                { step: 2, title: "Upload Docs", desc: "Attach receipts, medical records, or proof of loss", emoji: "📎" },
                { step: 3, title: "Review", desc: "Our team reviews within 24 hours and may request info", emoji: "🔍" },
                { step: 4, title: "Get Paid", desc: "Approved claims paid within 48 hours to your account", emoji: "💰" },
              ].map(s => (
                <div key={s.step} className="text-center p-5 rounded-2xl border border-border/50 hover:border-border transition-all bg-card/80">
                  <span className="text-3xl">{s.emoji}</span>
                  <div className="w-8 h-8 rounded-full text-primary-foreground font-bold text-sm flex items-center justify-center mx-auto my-3 bg-foreground">{s.step}</div>
                  <p className="font-bold text-sm">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Real Claim Stories */}
        <section className="py-10 sm:py-16 bg-muted/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-8">Real Traveler Stories</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { name: "Rachel T.", story: "My flight was cancelled due to weather. ZIVO Insurance covered my hotel and rebooking — paid out in 36 hours!", claim: "$1,200", type: "Flight Cancellation", emoji: "✈️" },
                { name: "Marcus J.", story: "Lost my luggage on a connecting flight. Filed a claim on my phone and got reimbursed before the trip ended.", claim: "$850", type: "Lost Baggage", emoji: "🧳" },
                { name: "Sophie L.", story: "Needed emergency medical care abroad. ZIVO Insurance handled everything, from hospital coordination to payment.", claim: "$4,500", type: "Medical Emergency", emoji: "🏥" },
              ].map(s => (
                <Card key={s.name} className="border-0 shadow-xl bg-gradient-to-br from-card/90 to-card">
                  <CardContent className="p-5">
                    <span className="text-2xl">{s.emoji}</span>
                    <Badge variant="secondary" className="text-[10px] ml-2">{s.type}</Badge>
                    <p className="text-sm text-muted-foreground italic mt-3 mb-3">"{s.story}"</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold">{s.name}</p>
                      <p className="text-sm font-bold text-primary">{s.claim} claimed</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Insurance FAQ */}
        <section className="py-10 sm:py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {[
                { q: "When does coverage start?", a: "Coverage begins immediately upon purchase and confirmation. You're protected from the moment you buy." },
                { q: "Can I cancel my insurance?", a: "Yes, free cancellation within 14 days of purchase if no claim has been filed. After that, the policy is non-refundable." },
                { q: "Are pre-existing conditions covered?", a: "Only with our Premium plan. Basic and Standard plans exclude pre-existing medical conditions." },
                { q: "What's 'Cancel for Any Reason' (CFAR)?", a: "CFAR (Premium only) lets you cancel your trip for any reason and receive 75% of your trip cost back." },
                { q: "How do I file a claim?", a: "Log in to your ZIVO account, go to My Trips, select the trip, and click 'File Insurance Claim'. Upload supporting documents." },
                { q: "Is adventure sports covered?", a: "Yes, with our Premium plan. This includes skiing, scuba diving, hiking, and more. Extreme sports may have limits." },
              ].map(f => (
                <Card key={f.q} className="border-border/50 hover:border-border transition-all">
                  <CardContent className="p-4">
                    <p className="text-sm font-bold text-foreground">{f.q}</p>
                    <p className="text-xs text-muted-foreground mt-1">{f.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TravelInsurance;