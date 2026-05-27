/**
 * Car Rental Checkout Page
 * Embedded partner checkout with security messaging
 */

import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Lock, CheckCircle, ExternalLink, Tag, X, CheckCircle2, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RampGlobalDisclaimer } from "@/components/results";
import { usePromotionValidation } from "@/hooks/usePromotionValidation";

export default function CarCheckoutPage() {
  const [searchParams] = useSearchParams();

  const category = searchParams.get("category") || "Economy";
  const name = searchParams.get("name") || "";
  const [promoCode, setPromoCode] = useState("");
  const { isValidating: promoValidating, appliedPromo, error: promoError, validateCode: validatePromo, removePromo } = usePromotionValidation({ serviceType: 'cars' });

  const handleApplyPromo = async () => {
    if (!promoCode.trim() || promoValidating) return;
    await validatePromo(promoCode.trim(), 0);
  };

  const handleRemovePromo = () => {
    setPromoCode("");
    removePromo();
  };

  // For now, redirect to partner site
  const handleProceedToPartner = () => {
    // This would be replaced with actual partner checkout URL
    const partnerUrl = `https://www.economybookings.com/en?${searchParams.toString()}`;
    import("@/lib/openExternalUrl").then(({ openExternalUrl: oe }) => oe(partnerUrl));
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Secure Checkout | Car Rental | ZIVO"
        description="Complete your car rental booking securely with our licensed travel partner."
      />
      
      {/* Locked Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border/60 pt-safe">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-bold text-xl text-primary">ZIVO</Link>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm text-muted-foreground">Secure Checkout</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>SSL Encrypted</span>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="container mx-auto px-4 max-w-3xl"
        >
          {/* Back Link */}
          <Link 
            to={`/rent-car/traveler-info?${searchParams.toString()}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to traveler info
          </Link>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Details</span>
            </div>
            <div className="flex-1 h-px bg-primary" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Traveler Info</span>
            </div>
            <div className="flex-1 h-px bg-primary" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="text-sm font-medium">Payment</span>
            </div>
          </div>

          {/* Security Message */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h2 className="font-semibold text-lg text-foreground mb-1">
                  Secure Partner Checkout
                </h2>
                <p className="text-sm text-muted-foreground">
                  Payment is processed by our licensed travel partner. Your card information is encrypted and never stored by ZIVO.
                </p>
              </div>
            </div>
          </div>

          {/* Checkout Card */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-[var(--shadow-card)] overflow-hidden">
            {/* Partner iframe placeholder */}
            <div className="bg-muted/30 p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Partner Checkout</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-md">
                You'll be redirected to our partner's secure checkout to complete your {category} car rental booking.
              </p>
              {name && (
                <p className="text-sm text-muted-foreground mb-4">
                  Booking for: <span className="font-medium text-foreground">{name}</span>
                </p>
              )}
              {/* Promo Code */}
              <div className="w-full max-w-sm mb-4">
                {appliedPromo?.valid ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">{appliedPromo.code}</span>
                      </div>
                      {appliedPromo.description && <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 truncate">{appliedPromo.description}</p>}
                    </div>
                    <button type="button" onClick={handleRemovePromo} className="p-1.5 rounded-lg hover:bg-emerald-500/10" aria-label="Remove promo">
                      <X className="w-4 h-4 text-emerald-500" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                          placeholder="Promo code"
                          disabled={promoValidating}
                          className="pl-10 h-11 uppercase"
                          style={{ fontSize: "16px" }}
                        />
                      </div>
                      <Button onClick={handleApplyPromo} disabled={!promoCode.trim() || promoValidating} className="h-11 px-5">
                        {promoValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                    {promoError && <p className="text-xs text-destructive">{promoError}</p>}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleProceedToPartner}
                size="lg"
                className="gap-2 font-medium"
              >
                Continue to Partner Checkout
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/30 border-t border-border/40">
              <p className="text-[11px] text-muted-foreground text-center">
                By proceeding, you agree to the partner's terms of service and privacy policy. 
                Final price will be confirmed before payment.
              </p>
            </div>
          </div>

          <RampGlobalDisclaimer className="mt-6" />
        </motion.div>
      </main>
    </div>
  );
}
