import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plane,
  Search,
  ExternalLink,
  Shield,
  Users,
  Globe,
  TrendingUp,
  CheckCircle,
  Car,
  Hotel,
  MapPin,
  Smartphone,
  Zap,
  DollarSign,
  Building2,
  Wifi,
  Ticket,
  Luggage,
  Sparkles,
  Star,
  Apple,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import packageJson from "../../package.json";

const CHANGELOG: { version: string; date: string; highlights: string[] }[] = [
  {
    version: packageJson.version,
    date: "Apr 2026",
    highlights: [
      "Expanded account settings with Help & Support, About, and Sign Out",
      "New Accessibility preferences (text size, reduce motion, high contrast)",
      "Auto-translate for messages and posts",
      "GDPR-style cookie consent in Data Rights",
      "More verification categories (athlete, media, government, nonprofit)",
    ],
  },
  {
    version: "1.0.3",
    date: "Mar 2026",
    highlights: [
      "Real Supabase analytics on profile views, likes, and engagement",
      "Loyalty referral codes wired to live data",
      "Distance, temperature, time & date format preferences",
    ],
  },
  {
    version: "1.0.2",
    date: "Feb 2026",
    highlights: [
      "Notification quiet hours and SMS opt-in flow",
      "Linked devices (multi-device QR sign-in)",
      "Two-factor authentication via TOTP and SMS backup",
    ],
  },
  {
    version: "1.0.1",
    date: "Jan 2026",
    highlights: [
      "Initial public release of ZIVO travel & social platform",
      "Flights, hotels, car rentals comparison",
      "Profile, posts, and follow system",
    ],
  },
];

const About = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.replace("#", "");
    if (!hash) return;
    const t = setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="About ZIVO – Global Travel Search & Comparison Platform"
        description="ZIVO is a global travel search and comparison platform helping users find and compare flights, hotels, car rentals, and travel services from trusted partners worldwide."
      />
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-16">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
              <Globe className="w-3 h-3 mr-1" />
              About Us
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              About ZIVO
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              ZIVO is a global travel search and comparison platform that helps users find and compare 
              flights, hotels, car rentals, and travel services from trusted partners worldwide.
            </p>
          </motion.div>

          {/* What We Do - Hero Card */}
          <Card className="mb-12 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-teal-500/10 overflow-hidden">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-4">What We Do</h2>
                  <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
                    <p>
                      ZIVO aggregates and compares travel options from multiple trusted partners, 
                      helping travelers find the best flights, hotels, car rentals, and travel services 
                      in one place.
                    </p>
                    <p className="font-medium text-foreground">
                      ZIVO does not sell tickets or process payments.
                    </p>
                    <p>
                      When users are ready to book, they are redirected to our travel partners to 
                      complete their reservation securely.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-2xl bg-card/80 border border-border/50 text-center hover:border-border hover:shadow-lg hover:hover:-translate-y-1 transition-all duration-300">
                    <Plane className="w-8 h-8 text-foreground mx-auto mb-3" />
                    <p className="font-semibold">Flights</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-card/80 border border-border/50 text-center hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-1 transition-all duration-300">
                    <Hotel className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                    <p className="font-semibold">Hotels</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-card/80 border border-border/50 text-center hover:border-border hover:shadow-lg hover:hover:-translate-y-1 transition-all duration-300">
                    <Car className="w-8 h-8 text-foreground mx-auto mb-3" />
                    <p className="font-semibold">Car Rentals</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-card/80 border border-border/50 text-center hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-300">
                    <Ticket className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                    <p className="font-semibold">Activities</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Model - How We Make Money */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <Badge className="mb-4 bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                <DollarSign className="w-3 h-3 mr-1" />
                Transparent Model
              </Badge>
              <h2 className="text-3xl font-bold mb-4">How ZIVO Makes Money</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We believe in full transparency about our business model.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Users,
                  title: "Free for Users",
                  description: "ZIVO is completely free for travelers to use",
                  color: "text-sky-500",
                  bgColor: "bg-sky-500/10"
                },
                {
                  icon: DollarSign,
                  title: "No Booking Fees",
                  description: "We never charge fees for using our platform",
                  color: "text-emerald-500",
                  bgColor: "bg-emerald-500/10"
                },
                {
                  icon: Building2,
                  title: "Affiliate Revenue",
                  description: "We earn commissions when users book through partner links",
                  color: "text-violet-500",
                  bgColor: "bg-violet-500/10"
                },
                {
                  icon: CheckCircle,
                  title: "No Price Impact",
                  description: "Our commission has no impact on the price you pay",
                  color: "text-amber-500",
                  bgColor: "bg-amber-500/10"
                }
              ].map((item) => (
                <Card key={item.title} className="text-center border-border/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className={`w-14 h-14 rounded-2xl ${item.bgColor} flex items-center justify-center mx-auto mb-4`}>
                      <item.icon className={`w-7 h-7 ${item.color}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Platform Scale */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <Badge className="mb-4 bg-secondary text-foreground border-border">
                <Globe className="w-3 h-3 mr-1" />
                Global Platform
              </Badge>
              <h2 className="text-3xl font-bold mb-4">Built for Scale</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                ZIVO is a growing travel platform with global coverage and expanding services.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
               <Card className="border-border/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <Globe className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h3 className="font-bold text-xl mb-2">Global Coverage</h3>
                  <p className="text-muted-foreground text-sm">
                    Access to flights, hotels, and services across 195+ countries worldwide
                  </p>
                </CardContent>
              </Card>
               <Card className="border-border/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <Building2 className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h3 className="font-bold text-xl mb-2">Multiple Partners</h3>
                  <p className="text-muted-foreground text-sm">
                    Connected to trusted travel partners, airlines, and booking platforms
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <Smartphone className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h3 className="font-bold text-xl mb-2">Mobile-First</h3>
                  <p className="text-muted-foreground text-sm">
                    Optimized for seamless experience on any device
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Expanding Services */}
            <Card className="border-border/50 bg-muted/30">
              <CardContent className="p-8">
                <h3 className="font-bold text-xl mb-6 text-center">Expanding Travel Ecosystem</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    { icon: Plane, label: "Flights", color: "text-sky-500" },
                    { icon: Hotel, label: "Hotels", color: "text-amber-500" },
                    { icon: Car, label: "Car Rentals", color: "text-violet-500" },
                    { icon: MapPin, label: "Transfers", color: "text-orange-500" },
                    { icon: Ticket, label: "Activities", color: "text-emerald-500" },
                    { icon: Wifi, label: "eSIM", color: "text-cyan-500" },
                    { icon: Luggage, label: "Luggage Storage", color: "text-pink-500" },
                  ].map((service) => (
                    <div key={service.label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50">
                      <service.icon className={`w-4 h-4 ${service.color}`} />
                      <span className="text-sm font-medium">{service.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Important Notice */}
          <Card className="mb-12 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-amber-500">Important Notice</h3>
                  <p className="text-muted-foreground">
                    <strong>ZIVO does not sell airline tickets, hotel rooms, or car rentals directly.</strong> We are a 
                    search and comparison platform. When you select an option, you will be redirected to our 
                    trusted travel partners to complete your purchase. All bookings, payments, and customer 
                    service are handled by the respective partner.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* === WAVE 14: Rich About Content === */}

          {/* Leadership Principles */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">Our Principles</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { principle: "Traveler First", desc: "Every decision starts with: does this make the traveler's life easier?", emoji: "🧭" },
                { principle: "Radical Transparency", desc: "No hidden fees, no dark patterns. We show you what you're getting.", emoji: "🔍" },
                { principle: "Partner Integrity", desc: "We only work with licensed, trusted travel partners.", emoji: "🤝" },
                { principle: "Build in Public", desc: "We share our progress, learnings, and roadmap openly.", emoji: "🏗️" },
                { principle: "Speed & Craft", desc: "Move fast but never compromise on quality or user experience.", emoji: "⚡" },
                { principle: "Global Mindset", desc: "Built for travelers everywhere, by a team from everywhere.", emoji: "🌏" },
              ].map(p => (
                <Card key={p.principle} className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <span className="text-2xl">{p.emoji}</span>
                    <h3 className="font-bold mt-2">{p.principle}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">Our Journey</h2>
            <div className="space-y-3">
              {[
                { date: "Q1 2025", event: "Launched ZIVO Rides, Eats, and Move verticals", emoji: "🚀" },
                { date: "Q4 2024", event: "ZIVO Miles loyalty program launched for all users", emoji: "⭐" },
                { date: "Q3 2024", event: "Added hotel and car rental comparison", emoji: "🏨" },
                { date: "Q2 2024", event: "ZIVO founded — flight search MVP launched", emoji: "✈️" },
              ].map(t => (
                <div key={t.date} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-primary/20 transition-all">
                  <span className="text-xl">{t.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{t.event}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{t.date}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Trust & Security */}
          <div className="mb-16">
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-center mb-6">Trust & Security</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { title: "SSL Encrypted", desc: "All data transmitted with 256-bit encryption", icon: Shield },
                    { title: "GDPR Compliant", desc: "Full data privacy compliance for all users", icon: CheckCircle },
                    { title: "SOC 2 Type II", desc: "Enterprise-grade security controls and audits", icon: Shield },
                  ].map(s => (
                    <div key={s.title} className="text-center p-4 rounded-xl bg-card/60 border border-emerald-500/10">
                      <s.icon className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-sm">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* What's New / Changelog */}
          <section id="changelog" className="scroll-mt-24 mb-16">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-secondary text-foreground border-border">
                <Sparkles className="w-3 h-3 mr-1" />
                What's New
              </Badge>
              <h2 className="text-3xl font-bold mb-2">Changelog</h2>
              <p className="text-muted-foreground">Latest features and improvements</p>
            </div>
            <div className="space-y-4 max-w-3xl mx-auto">
              {CHANGELOG.map((entry, i) => (
                <motion.div
                  key={entry.version}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Card className="border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          v{entry.version}
                          {i === 0 && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Latest</Badge>}
                        </h3>
                        <span className="text-xs text-muted-foreground">{entry.date}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {entry.highlights.map((h, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Rate the App */}
          <section id="rate" className="scroll-mt-24 mb-16">
            <Card className="bg-gradient-to-br from-yellow-500/5 via-background to-amber-500/5 border-yellow-500/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <Star className="w-8 h-8 text-white fill-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Loving ZIVO?</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Your rating helps other travelers and creators discover us. It only takes a few seconds.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <a
                    href="https://apps.apple.com/app/zivo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
                  >
                    <Apple className="w-4 h-4" />
                    Rate on App Store
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.zivo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
                  >
                    <Smartphone className="w-4 h-4" />
                    Rate on Google Play
                  </a>
                  <Link
                    to="/feedback"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border hover:bg-accent transition-colors"
                  >
                    Send written feedback
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* CTA */}
          <div className="text-center bg-gradient-to-r from-primary/10 via-background to-teal-500/10 rounded-3xl p-10 border border-primary/20">
            <h2 className="text-3xl font-bold mb-4">Start Your Journey</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Compare flights, hotels, and car rentals from trusted partners worldwide.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/book-flight">
                <Button size="lg" className="bg-gradient-to-r from-primary to-teal-400 gap-2">
                  <Plane className="w-4 h-4" />
                  Search Flights
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button size="lg" variant="outline" className="gap-2">
                  <Zap className="w-4 h-4" />
                  How It Works
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
