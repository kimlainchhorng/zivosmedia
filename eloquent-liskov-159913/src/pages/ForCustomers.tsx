import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import FAQSchema from "@/components/shared/FAQSchema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Car,
  Plane,
  Hotel,
  UtensilsCrossed,
  Package,
  Shield,
  DollarSign,
  CheckCircle,
  Smartphone,
  Search,
  Star,
  ArrowRight,
} from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const services = [
  { icon: Plane, label: "Search Flights", desc: "Compare fares from 500+ airlines worldwide", link: "/flights" },
  { icon: Hotel, label: "Compare Hotels", desc: "Find the best stay at the best price", link: "/hotels" },
  { icon: Car, label: "Rides", desc: "Get a ride anywhere, anytime", link: "/rides/hub" },
  { icon: UtensilsCrossed, label: "Eats", desc: "Order food from local restaurants", link: "/eats" },
  { icon: Package, label: "Travel Extras", desc: "Insurance, transfers & more", link: "/extras" },
  { icon: Search, label: "Car Rentals", desc: "Pick up and drop off anywhere", link: "/rent-car" },
];

const benefits = [
  { icon: DollarSign, title: "No Hidden Fees", desc: "Transparent pricing — what you see is what you pay." },
  { icon: Shield, title: "Trusted Partners", desc: "Every booking goes through verified, licensed travel providers." },
  { icon: Star, title: "Compare Options", desc: "Side-by-side results so you always get the best deal." },
  { icon: CheckCircle, title: "One App, All Services", desc: "Flights, hotels, cars, food, rides, and deliveries in one place." },
];

const faqs = [
  { question: "Is ZIVO free to use?", answer: "Yes! Searching and comparing on ZIVO is completely free. You only pay when you book through our partner." },
  { question: "Does ZIVO charge booking fees?", answer: "ZIVO does not add booking fees. Final pricing is set by the travel partner at checkout." },
  { question: "How does ZIVO make money?", answer: "We earn a small referral commission from our travel partners when you book — at no extra cost to you." },
  { question: "Can I manage my booking on ZIVO?", answer: "Booking changes, cancellations, and support are handled directly by the travel partner who issued your ticket or reservation." },
  { question: "Is my payment information safe?", answer: "Yes. Payments are processed securely on the partner's site. ZIVO never stores your card details." },
];

const ForCustomers = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="ZIVO for Customers – Your All-in-One Travel & Mobility App"
        description="Book rides, order food, send packages, search flights, compare hotels, and rent cars — all in one app. No hidden fees on ZIVO."
      />
      <FAQSchema faqs={faqs} pageType="general" />
      <Header />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <motion.section {...fadeIn} className="container mx-auto px-4 text-center mb-20 max-w-4xl">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
            <Smartphone className="w-3 h-3 mr-1" />
            For Customers
          </Badge>
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
            Your all-in-one travel &amp; mobility app
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Search flights, compare hotels, rent cars, order food, book rides, and send packages — all from one platform. No booking fees.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="hero">
              <Link to="/signup">Get Started Free <ArrowRight className="ml-1 w-4 h-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/flights">Search Flights</Link>
            </Button>
          </div>
        </motion.section>

        {/* Services */}
        <motion.section {...fadeIn} className="container mx-auto px-4 mb-20 max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-10">Everything you need, in one place</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <Link to={s.link} key={s.label}>
                <Card className="hover:shadow-lg hover:-translate-y-1 transition-all h-full">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-3 shrink-0">
                      <s.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{s.label}</h3>
                      <p className="text-sm text-muted-foreground">{s.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* Benefits */}
        <motion.section {...fadeIn} className="container mx-auto px-4 mb-20 max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-10">Why travelers choose ZIVO</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="flex items-start gap-4">
                <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-3 shrink-0">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* How ZIVO Works Flow */}
        <motion.section {...fadeIn} className="container mx-auto px-4 mb-20 max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Search & Compare", desc: "Enter your travel details and instantly compare prices from hundreds of providers.", icon: Search },
              { step: "2", title: "Choose Your Option", desc: "Pick the best deal — we show you transparent pricing with no hidden fees.", icon: Star },
              { step: "3", title: "Book with Partner", desc: "Complete your booking securely on the partner's site. Your trip is confirmed instantly.", icon: CheckCircle },
            ].map((s) => (
              <div key={s.step} className="text-center p-6 rounded-2xl bg-muted/30 border border-border/50">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <s.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Trust Stats */}
        <motion.section {...fadeIn} className="container mx-auto px-4 mb-20 max-w-4xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: "500+", label: "Airline Partners" },
              { value: "1M+", label: "Hotel Options" },
              { value: "80+", label: "Rental Brands" },
              { value: "4.9/5", label: "User Rating" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* App Screenshot Placeholder */}
        <motion.section {...fadeIn} className="container mx-auto px-4 mb-20 max-w-3xl text-center">
          <div className="rounded-2xl border border-border/50 bg-muted/30 p-12 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Available on all devices</h3>
            <p className="text-muted-foreground mb-6">Download the ZIVO app or use it on the web — your bookings sync everywhere.</p>
            <Button asChild variant="default">
              <Link to="/install">Download App</Link>
            </Button>
          </div>
        </motion.section>

        {/* Customer Testimonials */}
        <motion.section {...fadeIn} className="container mx-auto px-4 mb-20 max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-10">What travelers say</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: "Sarah M.", quote: "Found a flight $200 cheaper than booking directly. ZIVO is my go-to now.", rating: 5 },
              { name: "James L.", quote: "The all-in-one approach saves so much time. Flights + hotel + car in one search.", rating: 5 },
              { name: "Priya K.", quote: "Love the transparent pricing. No surprises at checkout.", rating: 5 },
            ].map((t) => (
              <Card key={t.name} className="hover:shadow-lg transition-all">
                <CardContent className="p-5">
                  <div className="flex gap-0.5 mb-3">
                    {Array(t.rating).fill(0).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 italic">"{t.quote}"</p>
                  <p className="text-sm font-semibold">{t.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section {...fadeIn} className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.question}>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default ForCustomers;
