/**
 * Embedded Partner Checkout Page
 * 
 * Displays partner checkout in an iframe within Hizovo
 * User never leaves hizovo.com during checkout
 * 
 * IMPORTANT: Hizovo is NOT the merchant of record
 * All payments handled by licensed travel partners
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Lock,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  Info,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { cn } from "@/lib/utils";
import { FLIGHT_DISCLAIMERS } from "@/config/flightCompliance";

type CheckoutStatus = "loading" | "ready" | "error" | "timeout";

const EmbeddedCheckout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CheckoutStatus>("loading");
  const [iframeError, setIframeError] = useState(false);

  // Get checkout parameters
  const partnerUrl = searchParams.get("url");
  const partnerName = searchParams.get("partner") || "our travel partner";
  const serviceType = searchParams.get("service") || "flight";
  const sessionId = searchParams.get("session");

  // Simulate loading state
  useEffect(() => {
    if (!partnerUrl) {
      // No URL provided - show placeholder
      const timer = setTimeout(() => setStatus("ready"), 1500);
      return () => clearTimeout(timer);
    }

    // Set timeout for iframe load
    const timeout = setTimeout(() => {
      if (status === "loading") {
        setStatus("timeout");
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [partnerUrl, status]);

  // Handle iframe load success
  const handleIframeLoad = () => {
    setStatus("ready");
  };

  // Handle iframe load error
  const handleIframeError = () => {
    setIframeError(true);
    setStatus("error");
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead 
          title="Secure Checkout – Hizovo" 
          description="Complete your booking securely with our licensed travel partner."
          noIndex
        />
        
        {/* Locked Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border pt-safe">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-emerald-500" />
              <span className="font-semibold">Secure Partner Checkout</span>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              SSL Encrypted
            </Badge>
          </div>
        </header>

        <main className="pt-24 pb-20 flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Loading secure checkout...</h1>
            <p className="text-muted-foreground mb-6">
              Connecting you to our licensed travel partner
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4 text-emerald-500" />
              <span>Your connection is encrypted and secure</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error or timeout state
  if (status === "error" || status === "timeout" || iframeError) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead 
          title="Checkout Issue – Hizovo" 
          description="There was an issue loading the checkout."
          noIndex
        />
        
        {/* Locked Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border pt-safe">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            <Badge variant="outline" className="gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              SSL Encrypted
            </Badge>
          </div>
        </header>

        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-lg">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
                <h1 className="text-xl font-bold mb-2">Checkout Loading Issue</h1>
                <p className="text-muted-foreground mb-6">
                  The partner checkout is taking longer than expected. You can continue directly on the partner site.
                </p>
                
                {partnerUrl && (
                  <Button 
                    size="lg" 
                    className="w-full gap-2 mb-4"
                    onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(partnerUrl))}
                  >
                    Continue on Partner Site
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={() => navigate(-1)} 
                  className="w-full"
                >
                  Go Back
                </Button>

                <p className="text-xs text-muted-foreground mt-4">
                  {FLIGHT_DISCLAIMERS.ticketing}
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Ready state - show iframe or placeholder
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead 
        title="Secure Checkout – Hizovo" 
        description="Complete your booking securely with our licensed travel partner."
        noIndex
      />
      
      {/* Locked Header - No navigation during checkout */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border pt-safe">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-sm">Secure Partner Checkout</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5 hidden sm:flex">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              SSL Encrypted
            </Badge>
            <Button variant="ghost" size="icon" aria-label="Help" onClick={() => navigate("/help")}>
              <HelpCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Partner Notice Bar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-secondary border-b border-border py-2">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Info className="w-4 h-4 text-foreground" />
            <span className="text-muted-foreground">
              Payment and ticketing handled by <strong className="text-foreground">{partnerName}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Checkout Area */}
      <main className="flex-1 pt-28 pb-24">
        {partnerUrl ? (
          // Real iframe when URL is provided
          <div className="h-full min-h-[600px]">
            <iframe
              src={partnerUrl}
              className="w-full h-full min-h-[600px] border-0"
              title="Partner Checkout"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
              allow="payment"
            />
          </div>
        ) : (
          // Placeholder when no URL (demo mode)
          <div className="container mx-auto px-4 max-w-2xl">
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">Partner Checkout Ready</h2>
                <p className="text-muted-foreground mb-6">
                  The partner checkout will load here when configured. This is a placeholder for the embedded checkout experience.
                </p>
                
                <Alert className="text-left mb-6">
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    <strong>How it works:</strong> When you proceed with a booking, the partner's secure checkout will load in this space. You'll complete payment directly with the licensed travel partner without leaving Hizovo.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-left">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Secure partner checkout</p>
                      <p className="text-xs text-muted-foreground">Payment handled by licensed partners</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-left">
                    <Lock className="w-5 h-5 text-foreground shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Stay on Hizovo</p>
                      <p className="text-xs text-muted-foreground">No redirects to external sites</p>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => navigate(-1)} 
                  className="mt-6"
                >
                  Go Back
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Bottom Disclosure Bar */}
      <footer
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border py-3 z-40"
        style={{ paddingBottom: "calc(var(--zivo-safe-bottom,0px) + 0.75rem)" }}
      >
        <div className="container mx-auto px-4">
          <p className="text-center text-xs text-muted-foreground">
            {FLIGHT_DISCLAIMERS.ticketing}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default EmbeddedCheckout;
