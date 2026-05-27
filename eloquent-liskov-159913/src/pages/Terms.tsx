import { ArrowLeft, FileText, Mail, Shield, ExternalLink, Ban, Scale, AlertTriangle, RefreshCw, Search, CreditCard, Plane, Building2, Car } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Terms of Service - ZIVO | Travel Platform"
        description="Read the terms of service for using ZIVO. Understand how we handle Hotels, Car Rentals (direct sale), and Flights (partner ticketing)."
        canonical="https://hizivo.com/terms"
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
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Legal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">
            Last updated: February 2, 2026
          </p>
        </motion.div>

        {/* Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <section className="bg-card/50 rounded-2xl p-6 border border-border">
            <p className="text-foreground leading-relaxed">
              By accessing or using ZIVO, you agree to these Terms of Service. Please read them carefully.
            </p>
          </section>

          {/* 1. ZIVO Services */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-secondary">
                <Search className="w-5 h-5 text-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">1. ZIVO Services</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed">
                ZIVO is an online travel platform that allows users to search, compare, and book travel services including flights, hotels, and car rentals. ZIVO operates a <strong>hybrid business model</strong>:
              </p>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <span><strong>Hotels:</strong> ZIVO is the merchant of record. Payments are processed by ZIVO.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Car className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Car Rentals:</strong> ZIVO is the merchant of record. Payments are processed by ZIVO.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Plane className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                  <span><strong>Flights:</strong> ZIVO is NOT the merchant of record. Flight bookings are completed with licensed airline partners who process payments and issue tickets.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 2. Hotels & Car Rentals (Direct Sale) */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">2. Hotels & Car Rentals (Direct Sale)</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border space-y-4">
              <p className="text-foreground leading-relaxed">
                For hotel and car rental bookings, ZIVO acts as the <strong>merchant of record</strong>. This means:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground">
                <li>ZIVO collects payment via secure payment processors (Stripe, Adyen)</li>
                <li>ZIVO issues booking confirmations directly to you</li>
                <li>ZIVO handles customer support for bookings made on our platform</li>
                <li>Refunds and cancellations are processed according to our policies</li>
              </ul>
              <p className="text-foreground leading-relaxed">
                Inventory is sourced from licensed B2B wholesaler partners (such as Hotelbeds, RateHawk, and similar providers). Final fulfillment is completed by the hotel property or rental company.
              </p>
            </div>
          </section>

          {/* 3. Flights (Partner Ticketing) */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-secondary">
                <Plane className="w-5 h-5 text-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">3. Flights (Partner Ticketing)</h2>
            </div>
            <div className="bg-amber-500/10 rounded-2xl p-6 border border-amber-500/20 space-y-4">
              <p className="text-foreground leading-relaxed font-medium">
                <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" /> Important: ZIVO does not issue airline tickets.
              </p>
              <p className="text-foreground leading-relaxed">
                Flight bookings are completed with licensed airline partners. When you select a flight offer:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground">
                <li>You will be redirected to the airline partner's secure checkout</li>
                <li>The airline partner processes your payment and issues your ticket</li>
                <li>Changes, cancellations, and refunds are handled by the airline partner</li>
                <li>You are subject to the airline partner's terms and conditions</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                For flight booking support, please contact the airline partner listed in your confirmation email.
              </p>
            </div>
          </section>

          {/* 4. Third-Party Providers */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ExternalLink className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">4. Third-Party Providers</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed">
                ZIVO works with various third-party suppliers, including hotel properties, car rental companies, and airline partners. While we source inventory from licensed providers, the actual service (accommodation, vehicle, or flight) is delivered by the respective property, rental company, or airline.
              </p>
            </div>
          </section>

          {/* 5. Accuracy of Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <AlertTriangle className="w-5 h-5 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">5. Accuracy of Information</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed">
                ZIVO displays information provided by third-party suppliers. While we strive for accuracy, we do not guarantee pricing, availability, or completeness of information. Prices may change before checkout is completed.
              </p>
            </div>
          </section>

          {/* 6. Prohibited Use */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Ban className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">6. Prohibited Use</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed">
                You agree not to misuse the platform, attempt unauthorized access, scrape data, make fraudulent bookings, or use ZIVO for unlawful purposes.
              </p>
            </div>
          </section>

          {/* 7. Platform Role */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">7. Platform Role</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed">
                ZIVO acts as a travel booking platform and sub-agent. ZIVO does not operate airlines, hotels, or transportation services. All services are provided by independent third-party providers.
              </p>
            </div>
          </section>

          {/* 8. Limitation of Liability */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-secondary">
                <Scale className="w-5 h-5 text-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">8. Limitation of Liability</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed">
                To the maximum extent permitted by law, ZIVO shall not be liable for any indirect, incidental, or consequential damages. ZIVO is not responsible for delays, cancellations, overbookings, or service failures caused by third-party providers.
              </p>
            </div>
          </section>

          {/* 9. Force Majeure */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">9. Force Majeure</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed">
                ZIVO is not liable for disruptions caused by events beyond reasonable control, including natural disasters, strikes, system outages, pandemics, acts of terrorism, or government actions.
              </p>
            </div>
          </section>

          {/* 10. Fraud Prevention */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Shield className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">10. Fraud Prevention</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed">
                ZIVO reserves the right to cancel bookings, suspend accounts, or refuse service in cases of suspected fraud or abuse. We employ automated fraud detection systems to protect users and partners.
              </p>
            </div>
          </section>

          {/* 11. Changes */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-secondary">
                <RefreshCw className="w-5 h-5 text-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">11. Changes</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed">
                ZIVO may update these Terms at any time. Continued use of the platform constitutes acceptance of the updated Terms.
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
                For questions about these Terms:
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
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/refund-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Refund Policy
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

export default Terms;
