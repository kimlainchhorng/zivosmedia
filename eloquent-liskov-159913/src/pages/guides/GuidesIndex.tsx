/**
 * GuidesIndex Page
 * Hub for all travel guides and content
 */

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { 
  Plane, Hotel, Car, MapPin, Clock, DollarSign, 
  Calendar, Globe, BookOpen, ArrowRight, Search 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";

const GUIDE_CATEGORIES = [
  {
    title: "Booking Tips",
    description: "Save money and time with expert booking strategies",
    icon: DollarSign,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    guides: [
      { title: "How to Find Cheap Flights", slug: "cheap-flights" },
      { title: "Best Time to Book Flights", slug: "best-time-to-book" },
      { title: "Flight Booking Mistakes to Avoid", slug: "booking-mistakes" },
      { title: "Using Price Alerts Effectively", slug: "price-alerts" },
    ],
  },
  {
    title: "Destination Guides",
    description: "Everything you need to know about popular destinations",
    icon: MapPin,
    color: "text-sky-500",
    bgColor: "bg-sky-500/10",
    guides: [
      { title: "New York City Guide", slug: "new-york" },
      { title: "Los Angeles Guide", slug: "los-angeles" },
      { title: "Miami Guide", slug: "miami" },
      { title: "London Guide", slug: "london" },
      { title: "Paris Guide", slug: "paris" },
      { title: "Tokyo Guide", slug: "tokyo" },
    ],
  },
  {
    title: "Airport Guides",
    description: "Navigate airports like a pro",
    icon: Plane,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    guides: [
      { title: "JFK Airport Guide", slug: "jfk", isAirport: true },
      { title: "LAX Airport Guide", slug: "lax", isAirport: true },
      { title: "ORD (Chicago) Guide", slug: "ord", isAirport: true },
      { title: "MIA Airport Guide", slug: "mia", isAirport: true },
    ],
  },
  {
    title: "Travel Planning",
    description: "Plan your perfect trip from start to finish",
    icon: Calendar,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    guides: [
      { title: "First-Time Traveler's Guide", slug: "first-time-traveler" },
      { title: "Budget Travel Tips", slug: "budget-travel" },
      { title: "Family Travel Guide", slug: "family-travel" },
      { title: "Business Travel Guide", slug: "business-travel" },
    ],
  },
];

export default function GuidesIndex() {
  return (
    <>
      <Helmet>
        <title>Travel Guides & Tips | ZIVO</title>
        <meta 
          name="description" 
          content="Expert travel guides, booking tips, and destination information to help you plan your perfect trip." 
        />
      </Helmet>

      <NavBar />

      <main className="min-h-screen bg-background pt-20">
        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
              <BookOpen className="w-4 h-4" />
              Travel Resources
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Travel Guides & Tips
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Expert advice, destination guides, and insider tips to help you 
              travel smarter and save more on every trip.
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search guides..."
                className="pl-10 h-12 rounded-xl"
              />
            </div>
          </div>
        </section>

        {/* Featured Guides */}
        <section className="py-12 border-y border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-semibold mb-6">Popular Guides</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  title: "How to Find Cheap Flights in 2024",
                  description: "12 proven strategies to save on airfare",
                  slug: "cheap-flights",
                  icon: DollarSign,
                  color: "text-emerald-500",
                },
                {
                  title: "Best Time to Book Flights",
                  description: "When to book for the lowest prices",
                  slug: "best-time-to-book",
                  icon: Clock,
                  color: "text-sky-500",
                },
                {
                  title: "New York City Travel Guide",
                  description: "Everything you need for your NYC trip",
                  slug: "new-york",
                  icon: MapPin,
                  color: "text-amber-500",
                },
              ].map((guide) => (
                <Link
                  key={guide.slug}
                  to={`/guides/${guide.slug}`}
                  className="group p-5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3`}>
                    <guide.icon className={`w-5 h-5 ${guide.color}`} />
                  </div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {guide.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {guide.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* All Categories */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="space-y-12">
              {GUIDE_CATEGORIES.map((category) => (
                <div key={category.title}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl ${category.bgColor} flex items-center justify-center`}>
                      <category.icon className={`w-5 h-5 ${category.color}`} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{category.title}</h2>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {category.guides.map((guide) => (
                      <Link
                        key={guide.slug}
                        to={guide.isAirport ? `/airports/${guide.slug}` : `/guides/${guide.slug}`}
                        className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors group"
                      >
                        <span className="text-sm font-medium flex-1 group-hover:text-primary transition-colors">
                          {guide.title}
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary/5">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-2">Ready to Book Your Trip?</h2>
            <p className="text-muted-foreground mb-6">
              Find the best deals on flights, hotels, and more
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button asChild size="lg" className="gap-2">
                <Link to="/flights">
                  <Plane className="w-4 h-4" />
                  Search Flights
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link to="/hotels">
                  <Hotel className="w-4 h-4" />
                  Find Hotels
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
