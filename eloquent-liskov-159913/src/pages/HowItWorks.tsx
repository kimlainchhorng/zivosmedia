import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  ArrowRight, 
  ExternalLink,
  CheckCircle2,
  Zap,
  Shield,
  DollarSign,
  Clock,
  Globe,
  Plane,
  Hotel,
  Car,
  MousePointerClick,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const steps = [
  {
    step: 1,
    title: "Search & Compare",
    description: "ZIVO searches live prices from licensed airlines, hotels, and car rental partners. Enter your destination, dates, and preferences to see all available options.",
    icon: Search,
    color: "from-sky-500 to-blue-600",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
  },
  {
    step: 2,
    title: "Choose the Best Option",
    description: "Compare prices, policies, and flexibility before booking. Use filters to narrow down by price, stops, ratings, cancellation terms, and more.",
    icon: MousePointerClick,
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
  },
  {
    step: 3,
    title: "Secure Checkout",
    description: "Bookings are completed securely through licensed providers or ZIVO checkout, depending on availability. Your payment is always protected.",
    icon: Shield,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  {
    step: 4,
    title: "Confirmation",
    description: "Tickets or reservations are issued instantly by authorized partners. You'll receive confirmation details directly to your email.",
    icon: CheckCircle2,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
];

const benefits = [
  {
    icon: DollarSign,
    title: "Free to Use",
    description: "No fees or charges for using ZIVO's comparison service",
    color: "text-emerald-500",
  },
  {
    icon: Clock,
    title: "Save Time",
    description: "Compare multiple providers in one place instead of visiting each site",
    color: "text-sky-500",
  },
  {
    icon: Shield,
    title: "Trusted Partners",
    description: "We only work with reputable airlines and booking platforms",
    color: "text-violet-500",
  },
  {
    icon: Globe,
    title: "Global Coverage",
    description: "Search flights, hotels, and cars worldwide",
    color: "text-amber-500",
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="How ZIVO Works – Search, Compare & Book Travel"
        description="Learn how ZIVO helps you find and compare flights, hotels, and car rentals from trusted partners. Search, compare, and book in three simple steps."
      />
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
              <Zap className="w-3 h-3 mr-1" />
              Simple Process
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              How ZIVO Works
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Finding and comparing travel options is easy. Just search, compare, and book with our trusted partners.
            </p>
          </motion.div>

          {/* 3-Step Process */}
          <div className="mb-20">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((item, index) => (
                <div key={item.step} className="relative">
                  <Card className={cn("h-full border-2 hover:shadow-lg hover:-translate-y-1 transition-all duration-300", item.borderColor)}>
                    <CardContent className="p-8">
                      {/* Step Number */}
                      <div className={cn(
                        "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 shadow-lg",
                        item.color
                      )}>
                        <item.icon className="w-8 h-8 text-primary-foreground" />
                      </div>
                      
                      {/* Step Badge */}
                      <Badge className={cn("mb-4", item.bgColor, "border-0")}>
                        Step {item.step}
                      </Badge>
                      
                      <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                    </CardContent>
                  </Card>
                  
                  {/* Arrow between steps (desktop only) */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Visual Flow */}
          <Card className="mb-16 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-teal-500/5 overflow-hidden">
            <CardContent className="p-8 md:p-12">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Your Journey with ZIVO</h2>
                <p className="text-muted-foreground">From search to confirmation in minutes</p>
              </div>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Search className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Search</p>
                    <p className="text-[10px] text-muted-foreground">Live prices</p>
                  </div>
                </div>
                
                <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90 md:rotate-0" />
                
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Compare</p>
                    <p className="text-[10px] text-muted-foreground">Best options</p>
                  </div>
                </div>
                
                <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90 md:rotate-0" />
                
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Checkout</p>
                    <p className="text-[10px] text-muted-foreground">Secure booking</p>
                  </div>
                </div>
                
                <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90 md:rotate-0" />
                
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Confirm</p>
                    <p className="text-[10px] text-muted-foreground">Instant tickets</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <div className="mb-16">
            <div className="text-center mb-10">
              <Badge className="mb-4 bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Benefits
              </Badge>
              <h2 className="text-3xl font-bold mb-4">Why Use ZIVO</h2>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit) => (
                <Card key={benefit.title} className="text-center border-border/50 hover:border-primary/20 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  <CardContent className="p-6">
                    <benefit.icon className={cn("w-10 h-10 mx-auto mb-4", benefit.color)} />
                    <h3 className="font-bold mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Important Clarification */}
          <Card className="mb-12 border-muted bg-muted/30">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">Important to Know</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    ZIVO is a search and comparison platform. <strong>We don't sell tickets directly</strong> — 
                    we help you find the best prices and redirect you to trusted booking partners. 
                    All bookings, payments, and customer service are handled by the partner you choose to book with.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* === WAVE 11: Rich HowItWorks Content === */}

          {/* User Satisfaction Stats */}
          <Card className="mb-12 border-primary/20 bg-primary/5">
            <CardContent className="p-8">
              <h3 className="font-bold text-xl text-center mb-6">ZIVO by the Numbers</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                {[
                  { stat: "2M+", label: "Searches per month", emoji: "🔍" },
                  { stat: "500+", label: "Partner airlines", emoji: "✈️" },
                  { stat: "4.8★", label: "User rating", emoji: "⭐" },
                  { stat: "<2s", label: "Average search time", emoji: "⚡" },
                ].map(s => (
                  <div key={s.label}>
                    <span className="text-2xl">{s.emoji}</span>
                    <p className="text-2xl font-bold text-primary mt-2">{s.stat}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Common Questions */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-6">Common Questions</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { q: "Is ZIVO free to use?", a: "Yes! ZIVO is completely free. We earn a small referral commission from partners — you never pay extra." },
                { q: "Do I book directly on ZIVO?", a: "ZIVO redirects you to the partner's checkout. Some bookings may be completed via embedded partner checkout on our site." },
                { q: "Are the prices accurate?", a: "Prices are fetched in real-time from partners. Final price is confirmed on the partner's checkout page." },
                { q: "Can I cancel or change my booking?", a: "Cancellations and changes are handled by the booking partner. ZIVO provides links and guidance to their support." },
                { q: "How does ZIVO make money?", a: "We earn referral commissions from travel partners when you book through our links. This never affects the price you pay." },
                { q: "Is my payment secure?", a: "All payments are processed by licensed, PCI-compliant travel partners. ZIVO never stores your payment information." },
              ].map(f => (
                <Card key={f.q} className="border-border/50 hover:border-primary/20 transition-all">
                  <CardContent className="p-4">
                    <p className="text-sm font-bold">{f.q}</p>
                    <p className="text-xs text-muted-foreground mt-1">{f.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Traveler Testimonials */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-6">What Travelers Say</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { name: "Sarah K.", quote: "Found a flight $200 cheaper than booking direct. ZIVO is my go-to now!", rating: 5, from: "New York" },
                { name: "Tom B.", quote: "The comparison feature saved me hours of checking different hotel sites.", rating: 5, from: "Chicago" },
                { name: "Mei L.", quote: "Super easy to use. Booked flights and a rental car in under 10 minutes.", rating: 5, from: "San Francisco" },
              ].map(t => (
                <Card key={t.name} className="border-border/50 hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex gap-0.5 mb-3">
                      {Array(t.rating).fill(0).map((_, i) => (
                        <span key={i} className="text-amber-400 text-sm">★</span>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground italic mb-3">"{t.quote}"</p>
                    <p className="text-xs font-bold">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.from}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* === WAVE 16: Additional HowItWorks Content === */}

          {/* Service Comparison */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-6">What You Can Book</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { service: "Flights", providers: "500+ airlines", coverage: "Global", speed: "Instant results", emoji: "✈️", features: ["Price alerts", "Fare calendar", "Multi-city"] },
                { service: "Hotels", providers: "1M+ properties", coverage: "195 countries", speed: "Real-time rates", emoji: "🏨", features: ["Free cancellation filter", "Guest reviews", "Map view"] },
                { service: "Car Rentals", providers: "50+ companies", coverage: "150+ countries", speed: "Compare in seconds", emoji: "🚗", features: ["Insurance options", "Fuel policy info", "Airport pickup"] },
              ].map(s => (
                <Card key={s.service} className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <span className="text-3xl">{s.emoji}</span>
                    <h3 className="font-bold text-lg mt-3">{s.service}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{s.providers} · {s.coverage}</p>
                    <p className="text-[10px] text-primary font-medium mt-1">{s.speed}</p>
                    <ul className="mt-3 space-y-1">
                      {s.features.map(f => (
                        <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Tips for Best Results */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-6">Tips for the Best Deals</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { tip: "Be Flexible with Dates", desc: "Shifting your trip by 1-2 days can save 20-30% on flights.", emoji: "📅" },
                { tip: "Book 3 Weeks Ahead", desc: "Domestic flights are cheapest about 21 days before departure.", emoji: "⏰" },
                { tip: "Use Price Alerts", desc: "Set alerts and we'll notify you when prices drop on your route.", emoji: "🔔" },
                { tip: "Compare Across Services", desc: "Sometimes a flight+hotel bundle saves more than booking separately.", emoji: "💡" },
              ].map(t => (
                <div key={t.tip} className="p-4 rounded-xl border border-border/50 hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{t.emoji}</span>
                    <span className="font-bold text-sm">{t.tip}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Badges */}
          <Card className="mb-12 border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <h3 className="font-bold text-center mb-4">Why Travelers Trust ZIVO</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                {[
                  { badge: "SSL Encrypted", emoji: "🔒" },
                  { badge: "No Hidden Fees", emoji: "💎" },
                  { badge: "24/7 Support", emoji: "🛟" },
                  { badge: "Best Price Guarantee", emoji: "🏆" },
                ].map(b => (
                  <div key={b.badge}>
                    <span className="text-2xl">{b.emoji}</span>
                    <p className="text-xs font-bold mt-2">{b.badge}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center bg-gradient-to-r from-primary/10 via-background to-teal-500/10 rounded-3xl p-10 border border-primary/20">
            <h2 className="text-3xl font-bold mb-4">Ready to Start?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Search and compare travel options from trusted partners worldwide.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/book-flight">
                <Button size="lg" className="gap-2 bg-secondary">
                  <Plane className="w-4 h-4" />
                  Search Flights
                </Button>
              </Link>
              <Link to="/book-hotel">
                <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 gap-2">
                  <Hotel className="w-4 h-4" />
                  Find Hotels
                </Button>
              </Link>
              <Link to="/rent-car">
                <Button size="lg" className="gap-2 bg-secondary">
                  <Car className="w-4 h-4" />
                  Rent a Car
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
