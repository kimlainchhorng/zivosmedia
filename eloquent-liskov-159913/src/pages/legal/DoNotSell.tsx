/**
 * Do Not Sell My Personal Information (CCPA)
 * California Consumer Privacy Act compliance page.
 */
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Shield, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function DoNotSell() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Do Not Sell My Personal Information | ZIVO"
        description="Exercise your California Consumer Privacy Act (CCPA) rights. Learn how ZIVO handles your personal information and how to opt out."
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Do Not Sell My Personal Information</h1>
              <p className="text-muted-foreground text-sm mt-1">
                California Consumer Privacy Act (CCPA) Rights
              </p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-3">Your Rights Under the CCPA</h2>
              <p className="text-muted-foreground leading-relaxed">
                Under the California Consumer Privacy Act (CCPA), California residents have the right to opt out of the "sale" of their personal information. ZIVO respects your privacy and provides this page to help you exercise that right.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Does ZIVO Sell Personal Information?</h2>
              <p className="text-muted-foreground leading-relaxed">
                ZIVO does not sell personal information in the traditional sense. However, under the CCPA's broad definition of "sale," certain data-sharing activities with our travel partners (such as sharing search preferences to display relevant offers) may be considered a "sale." These activities are essential to providing our price comparison and booking referral services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Categories of Information Shared</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Identifiers:</strong> Name, email address (when booking through partner sites)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Commercial information:</strong> Travel search preferences, booking history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Internet activity:</strong> Browsing and search history on our platform</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Geolocation data:</strong> Approximate location for service delivery</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">How to Opt Out</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To opt out of the sharing of your personal information, you can:
              </p>
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-border bg-card hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                  <h3 className="font-medium mb-1">1. Manage Cookie Preferences</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Adjust your cookie settings to limit data sharing with third-party partners.
                  </p>
                  <Link to="/cookies">
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Cookie Settings
                    </Button>
                  </Link>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                  <h3 className="font-medium mb-1">2. Email Us Directly</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Send a request to our privacy team and we will process your opt-out within 15 business days.
                  </p>
                  <a href="mailto:privacy@hizivo.com">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      privacy@hizivo.com
                    </Button>
                  </a>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                  <h3 className="font-medium mb-1">3. Account Privacy Controls</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    If you have a ZIVO account, manage your privacy preferences in your account settings.
                  </p>
                  <Link to="/account/privacy">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      Privacy Controls
                    </Button>
                  </Link>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Verification</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may need to verify your identity before processing your request. We will ask for information that matches what we have on file. We will not discriminate against you for exercising your CCPA rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Related Policies</h2>
              <div className="flex flex-wrap gap-3">
                <Link to="/privacy" className="text-primary hover:underline text-sm">Privacy Policy</Link>
                <span className="text-muted-foreground">•</span>
                <Link to="/cookies" className="text-primary hover:underline text-sm">Cookie Policy</Link>
                <span className="text-muted-foreground">•</span>
                <Link to="/terms" className="text-primary hover:underline text-sm">Terms of Service</Link>
              </div>
            </section>

            <p className="text-xs text-muted-foreground border-t border-border pt-6">
              Last updated: February 2026. This page is provided in compliance with the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA).
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
