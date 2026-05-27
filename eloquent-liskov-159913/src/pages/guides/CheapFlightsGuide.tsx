/**
 * CheapFlightsGuide Page
 * SEO content page for finding cheap flights
 */

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { 
  Plane, Calendar, Bell, Clock, DollarSign, 
  CheckCircle, ArrowRight, Lightbulb, TrendingDown 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";

const TIPS = [
  {
    title: "Book 6-8 Weeks in Advance",
    description: "For domestic flights, the sweet spot is typically 1-3 months before departure. International flights often have best prices 2-8 months ahead.",
    icon: Calendar,
  },
  {
    title: "Be Flexible with Dates",
    description: "Flying mid-week (Tuesday/Wednesday) is often cheaper. Use flexible date search to compare prices across different days.",
    icon: Clock,
  },
  {
    title: "Set Price Alerts",
    description: "Let ZIVO track prices for you. We'll notify you when prices drop on routes you're watching.",
    icon: Bell,
  },
  {
    title: "Consider Nearby Airports",
    description: "Flying into/out of alternative airports can save hundreds. Compare prices across all airports in your area.",
    icon: Plane,
  },
  {
    title: "Clear Your Cookies",
    description: "Some sites track your searches and may raise prices. Use incognito mode or clear cookies before booking.",
    icon: Lightbulb,
  },
  {
    title: "Book Connecting Flights",
    description: "Direct flights are convenient but often pricier. One stop can save 20-40% on many routes.",
    icon: TrendingDown,
  },
];

const BEST_TIMES = [
  { month: "January", savings: "15-30% off", reason: "Post-holiday low season" },
  { month: "February", savings: "10-25% off", reason: "Before spring break rush" },
  { month: "September", savings: "20-35% off", reason: "Kids back in school" },
  { month: "October", savings: "15-25% off", reason: "Shoulder season deals" },
  { month: "November (early)", savings: "10-20% off", reason: "Pre-Thanksgiving lull" },
];

export default function CheapFlightsGuide() {
  return (
    <>
      <Helmet>
        <title>How to Find Cheap Flights in 2024 | ZIVO Travel Guide</title>
        <meta 
          name="description" 
          content="Expert tips and strategies to find the cheapest flights. Learn when to book, how to use price alerts, and save money on your next trip." 
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "How to Find Cheap Flights in 2024",
            "description": "Expert tips and strategies to find the cheapest flights",
            "author": { "@type": "Organization", "name": "ZIVO" },
            "publisher": { "@type": "Organization", "name": "ZIVO" },
          })}
        </script>
      </Helmet>

      <NavBar />

      <main className="min-h-screen bg-background pt-20">
        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-emerald-500/5 to-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Link to="/guides" className="hover:text-primary">Guides</Link>
                <span>/</span>
                <span>Booking Tips</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                How to Find Cheap Flights in 2024
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                12 proven strategies to save money on airfare, from booking timing 
                to price tracking and everything in between.
              </p>
              
              <div className="flex items-center gap-4 flex-wrap">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/flights">
                    <Plane className="w-4 h-4" />
                    Search Flights
                  </Link>
                </Button>
                <span className="text-sm text-muted-foreground">
                  Updated: January 2024
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Summary */}
        <section className="py-8 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-4">
              {[
                { label: "Book", value: "6-8 weeks early", icon: Calendar },
                { label: "Best days", value: "Tue/Wed flights", icon: Clock },
                { label: "Avg savings", value: "20-40%", icon: DollarSign },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
                  <stat.icon className="w-8 h-8 text-emerald-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="font-semibold">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Top Tips for Finding Cheap Flights</h2>
              
              <div className="space-y-6">
                {TIPS.map((tip, index) => (
                  <div key={tip.title} className="flex gap-4 p-5 rounded-2xl border border-border bg-card hover:border-emerald-500/30 hover:shadow-md transition-all duration-200">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <tip.icon className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">
                        {index + 1}. {tip.title}
                      </h3>
                      <p className="text-muted-foreground">{tip.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Best Times to Book */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Best Months for Cheap Flights</h2>
              
              <div className="space-y-3">
                {BEST_TIMES.map((time) => (
                  <div 
                    key={time.month}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="font-medium">{time.month}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-emerald-500">{time.savings}</span>
                      <p className="text-xs text-muted-foreground">{time.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-2">Start Saving on Your Next Flight</h2>
              <p className="text-muted-foreground mb-6">
                Compare prices from hundreds of airlines and booking sites in one search.
              </p>
              <Button asChild size="lg" className="gap-2">
                <Link to="/flights">
                  Search Flights Now
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
