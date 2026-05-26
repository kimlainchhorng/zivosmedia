/**
 * Car Rental Confirmation Page
 * Booking reference with partner info and cross-sell
 */

import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, ExternalLink, Car, Home, ArrowRight, Share2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";

export default function CarConfirmationPage() {
  const [searchParams] = useSearchParams();

  const category = searchParams.get("category") || "Economy";
  const name = searchParams.get("name") || "Guest";
  const bookingRef = searchParams.get("ref") || `ZV${Date.now().toString().slice(-8)}`;
  const partner = searchParams.get("partner") || "EconomyBookings";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Booking Confirmed | Car Rental | ZIVO"
        description="Your car rental booking has been confirmed."
      />
      <Header />

      <main className="pt-20 pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="container mx-auto px-4 max-w-2xl">
          {/* Success Card */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-[var(--shadow-card)] p-8 text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>

            <h1 className="text-2xl font-bold text-ig-gradient mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-muted-foreground mb-6">
              Thank you, {name}. Your {category} car rental is booked.
            </p>

            {/* Booking Reference */}
            <div className="bg-muted/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">Booking Reference</p>
              <p className="text-2xl font-mono font-bold text-primary">{bookingRef}</p>
            </div>

            <div className="text-left space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium">{partner}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Confirmation email</span>
                <span className="font-medium">Sent to your email</span>
              </div>
            </div>

            {/* Manage Booking */}
            <Button variant="outline" className="w-full gap-2 mb-4">
              Manage Booking on {partner}
              <ExternalLink className="w-4 h-4" />
            </Button>

            <div className="flex gap-3 mb-4">
              <Button
                variant="outline"
                onClick={() => openShareToChat({
                  kind: "ride",
                  title: `${category} Car Rental Booked`,
                  meta: `Ref: ${bookingRef}`,
                  deepLink: `/`,
                  image: null,
                  badge: "ZIVO",
                })}
                className="flex-1 gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Link to="/" className="flex-1">
                <Button variant="ghost" className="w-full gap-2">
                  <Home className="w-4 h-4" />
                  Home
                </Button>
              </Link>
            </div>
          </div>

          {/* Cross-Sell: ZIVO Driver */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Need a ride or food delivery?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Book a ride or order food delivery right from ZIVO.
                </p>
                <div className="flex gap-3">
                  <Link to="/rides/hub">
                    <Button variant="outline" className="gap-2">
                      Book a Ride
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to="/eats">
                    <Button className="gap-2">
                      Order Food
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
