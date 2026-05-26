/**
 * BestTimeToBook Page
 * SEO content page for optimal booking timing
 */

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { 
  Calendar, Clock, Plane, TrendingDown, 
  AlertCircle, CheckCircle, ArrowRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";

const BOOKING_WINDOWS = [
  {
    type: "Domestic Flights (US)",
    ideal: "1-3 months before",
    tooEarly: "More than 6 months",
    tooLate: "Less than 2 weeks",
    tip: "Prices typically drop 6-8 weeks before departure, then rise sharply within 2 weeks.",
  },
  {
    type: "International Flights",
    ideal: "2-8 months before",
    tooEarly: "More than 11 months",
    tooLate: "Less than 3 weeks",
    tip: "Long-haul flights have longer price curves. Book earlier for peak seasons.",
  },
  {
    type: "Hotels",
    ideal: "2-4 weeks before",
    tooEarly: "More than 4 months",
    tooLate: "Day of arrival",
    tip: "Business hotels drop prices on weekends. Vacation spots have different patterns.",
  },
  {
    type: "Car Rentals",
    ideal: "2-4 weeks before",
    tooEarly: "More than 2 months",
    tooLate: "Day of rental",
    tip: "Book early for peak seasons, but check for price drops and rebook if cheaper.",
  },
];

const DAY_RECOMMENDATIONS = [
  { day: "Tuesday", recommendation: "Best day to book domestic flights", savings: "~15% cheaper" },
  { day: "Wednesday", recommendation: "Good for booking and flying", savings: "~12% cheaper" },
  { day: "Saturday", recommendation: "Best for booking international", savings: "~10% cheaper" },
  { day: "Sunday", recommendation: "Avoid booking (highest prices)", savings: "Most expensive" },
];

export default function BestTimeToBook() {
  return (
    <>
      <Helmet>
        <title>Best Time to Book Flights & Hotels | ZIVO Travel Guide</title>
        <meta 
          name="description" 
          content="Learn when to book flights and hotels for the lowest prices. Expert timing strategies for domestic, international travel, and accommodations." 
        />
      </Helmet>

      <NavBar />

      <main className="min-h-screen bg-background pt-20">
        {/* Hero */}
        <section className="py-16 to-background bg-secondary">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Link to="/guides" className="hover:text-primary">Guides</Link>
                <span>/</span>
                <span>Booking Tips</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Best Time to Book Flights & Hotels
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Timing is everything. Learn exactly when to book for the lowest prices 
                on flights, hotels, and car rentals.
              </p>
              
              <Button asChild size="lg" className="gap-2">
                <Link to="/flights">
                  <Plane className="w-4 h-4" />
                  Start Searching
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Key Insight */}
        <section className="py-8 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto flex items-start gap-4 p-5 rounded-2xl bg-secondary border border-border">
              <Clock className="w-8 h-8 text-foreground shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">The Golden Rule</h3>
                <p className="text-muted-foreground">
                  For most domestic flights, book <strong>6-8 weeks</strong> in advance. 
                  For international flights, <strong>2-4 months</strong> ahead gets the best prices. 
                  Always set price alerts to catch drops!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Booking Windows */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Optimal Booking Windows</h2>
              
              <div className="space-y-4">
                {BOOKING_WINDOWS.map((window) => (
                  <div key={window.type} className="p-5 rounded-2xl border border-border bg-card hover:border-emerald-500/30 hover:shadow-md transition-all duration-200">
                    <h3 className="font-semibold text-lg mb-4">{window.type}</h3>
                    
                    <div className="grid sm:grid-cols-3 gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-emerald-500/10">
                        <div className="flex items-center gap-2 text-emerald-500 mb-1">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Ideal Window</span>
                        </div>
                        <p className="font-semibold text-sm">{window.ideal}</p>
                      </div>
                      
                      <div className="p-3 rounded-xl bg-amber-500/10">
                        <div className="flex items-center gap-2 text-amber-500 mb-1">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Too Early</span>
                        </div>
                        <p className="font-semibold text-sm">{window.tooEarly}</p>
                      </div>
                      
                      <div className="p-3 rounded-xl bg-red-500/10">
                        <div className="flex items-center gap-2 text-red-500 mb-1">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Too Late</span>
                        </div>
                        <p className="font-semibold text-sm">{window.tooLate}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{window.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Best Days to Book */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Best Days of the Week to Book</h2>
              
              <div className="space-y-3">
                {DAY_RECOMMENDATIONS.map((day) => (
                  <div 
                    key={day.day}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <span className="font-semibold">{day.day}</span>
                        <p className="text-xs text-muted-foreground">{day.recommendation}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${
                      day.savings.includes("expensive") ? "text-red-500" : "text-emerald-500"
                    }`}>
                      {day.savings}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pro Tips */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Pro Tips</h2>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  "Set price alerts and wait for drops",
                  "Be flexible with dates (+/- 3 days)",
                  "Check prices in incognito mode",
                  "Compare multiple booking sites",
                  "Consider nearby airports",
                  "Book early for peak seasons",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                    <TrendingDown className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-sm">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary/5">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-2">Ready to Find the Best Deal?</h2>
            <p className="text-muted-foreground mb-6">
              Compare prices across hundreds of providers and set alerts for price drops.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link to="/flights">
                Search Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
