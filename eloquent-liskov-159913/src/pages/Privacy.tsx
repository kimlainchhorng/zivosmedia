import { ArrowLeft, Shield, Mail, Database, Share2, Cookie, UserCheck, CreditCard, Plane, Building2, Car } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Privacy Policy - ZIVO | Travel Platform"
        description="Learn how ZIVO handles your data for Hotels, Car Rentals (direct sale), and Flights (partner referral). We protect your information."
        canonical="https://hizivo.com/privacy"
      />
      
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Button */}
        <Link to="/">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Legal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: February 2, 2026
          </p>
        </motion.div>

        {/* Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <section className="bg-card/50 rounded-2xl p-6 border border-border">
            <p className="text-foreground leading-relaxed text-lg">
              ZIVO respects your privacy. This policy explains how we collect, use, and protect your information when you use our travel platform.
            </p>
          </section>

          {/* Business Model Context */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">How We Operate</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed mb-4">
                ZIVO operates a hybrid business model which affects how your data is handled:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-foreground">
                  <Building2 className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <span><strong>Hotels & Car Rentals:</strong> ZIVO is the merchant of record. We collect and process your payment and booking information directly.</span>
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <Plane className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                  <span><strong>Flights:</strong> We share your search criteria and traveler details with airline partners (with your consent) who process your payment and issue tickets.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-secondary">
                <Database className="w-5 h-5 text-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Information We Collect</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 shrink-0" />
                  <strong>Account Information:</strong> Name, email, phone number when you create an account
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 shrink-0" />
                  <strong>Booking Information:</strong> Traveler/guest details, travel dates, preferences
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 shrink-0" />
                  <strong>Payment Information:</strong> For Hotels & Car Rentals only, payment details are processed securely via Stripe/Adyen (we do not store full card numbers)
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 shrink-0" />
                  <strong>Technical Data:</strong> Device information, browser type, IP address, cookies, analytics
                </li>
              </ul>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <UserCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">How We Use Information</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  To process and confirm your hotel and car rental bookings
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  To share traveler information with airline partners for flight bookings (with consent)
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  To send booking confirmations and travel updates
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  To process refunds and handle customer support requests
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  To improve platform performance, security, and user experience
                </li>
              </ul>
            </div>
          </section>

          {/* Information Sharing */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Share2 className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Information Sharing</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border space-y-4">
              <p className="text-foreground leading-relaxed">
                We share your information only as necessary to provide our services:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                  <strong>Airline Partners (Flights):</strong> Traveler details shared with your consent for ticketing
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                  <strong>Wholesaler APIs (Hotels/Cars):</strong> Booking details shared to confirm reservations
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                  <strong>Payment Processors:</strong> Stripe/Adyen for secure payment processing
                </li>
              </ul>
              <p className="text-foreground leading-relaxed font-medium">
                We do not sell personal data to third parties.
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-secondary">
                <Cookie className="w-5 h-5 text-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Cookies</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed">
                We use cookies to operate and improve our services, remember your preferences, and analyze usage. You can control cookies via your browser settings. See our <Link to="/cookies" className="text-primary hover:underline">Cookie Policy</Link> for details.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-secondary">
                <Shield className="w-5 h-5 text-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Your Rights</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed mb-4">
                Depending on your location, you may have the right to:
              </p>
              <ul className="space-y-2 text-foreground">
                <li>• Access the personal information we hold about you</li>
                <li>• Request correction of inaccurate information</li>
                <li>• Request deletion of your personal information</li>
                <li>• Opt out of marketing communications</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                To exercise these rights, contact us at support@hizivo.com.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Contact</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground mb-4">
                For privacy-related questions:
              </p>
              <a 
                href="mailto:support@hizivo.com" 
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <Mail className="w-4 h-4" />
                support@hizivo.com
              </a>
            </div>
          </section>

          {/* Related Links */}
          <div className="flex flex-wrap gap-4 justify-center pt-8 border-t border-border">
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/cookies" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Cookie Policy
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/partner-disclosure" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Partner Disclosure
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
