/**
 * Meta CAPI Privacy Disclosure — Required for App Store compliance.
 * Explains how ZIVO uses Meta Conversions API for ad attribution.
 */
import { ArrowLeft, Shield, Eye, Lock, Database, ExternalLink } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import SEOHead from "@/components/SEOHead";

export default function MetaPrivacyDisclosure() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <SEOHead
        title="Data & Advertising Privacy — ZIVO"
        description="How ZIVO uses Meta Conversions API for ad attribution and personalized experiences."
      />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur-md border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Data & Advertising Privacy</h1>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5 max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground leading-relaxed">
          ZIVO is committed to transparency about how we use your data. This page explains our
          use of Meta's Conversions API (CAPI) and how it improves your experience while
          respecting your privacy.
        </p>

        {[
          {
            icon: Eye,
            title: "What We Track",
            content:
              "We track certain events — such as signups, searches, and purchases — to measure ad performance and improve the relevance of content you see. This includes aggregated, pseudonymized data like purchase amount, service type, and city. We never sell your personal data.",
          },
          {
            icon: Database,
            title: "How Meta CAPI Works",
            content:
              "Meta Conversions API sends event data directly from our secure servers to Meta. Unlike browser-based tracking (pixels), this method is more reliable and privacy-friendly because it reduces reliance on cookies. Data is hashed (encrypted) before transmission, meaning Meta receives anonymized identifiers — not raw personal information.",
          },
          {
            icon: Lock,
            title: "Data Security & Hashing",
            content:
              "Before any data leaves our servers, we hash (one-way encrypt) sensitive fields like email addresses and phone numbers using SHA-256. This means even Meta cannot reverse-engineer your actual email or phone number from the data we send. We also use event deduplication to prevent double-counting.",
          },
          {
            icon: Shield,
            title: "Your Rights & Opt-Out",
            content:
              "You can opt out of personalized advertising at any time through your device settings (iOS: Settings → Privacy → Tracking; Android: Settings → Google → Ads). You can also request data deletion by contacting support@hizivo.com. We comply with GDPR, CCPA, and Cambodia's data protection regulations.",
          },
        ].map((section) => (
          <Card key={section.title} className="border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <section.icon className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-bold text-sm">{section.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
            </CardContent>
          </Card>
        ))}

        {/* Data categories table */}
        <Card className="border-border/30">
          <CardContent className="p-4">
            <h2 className="font-bold text-sm mb-3">Data Categories We Share</h2>
            <div className="space-y-2">
              {[
                { category: "Hashed Email", purpose: "Ad measurement & attribution", retention: "90 days" },
                { category: "Hashed Phone", purpose: "Cross-device matching", retention: "90 days" },
                { category: "Purchase Amount", purpose: "Revenue attribution", retention: "90 days" },
                { category: "Event Type", purpose: "Conversion tracking", retention: "90 days" },
                { category: "City / Region", purpose: "Geo-targeted ads", retention: "90 days" },
              ].map((row) => (
                <div key={row.category} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                  <span className="text-xs font-medium">{row.category}</span>
                  <span className="text-[10px] text-muted-foreground">{row.purpose}</span>
                  <span className="text-[10px] text-muted-foreground">{row.retention}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-2 pt-2">
          <p className="text-[11px] text-muted-foreground">
            For full privacy details, see our{" "}
            <Link to="/privacy" className="text-primary underline">
              Privacy Policy
            </Link>
            {" "}and{" "}
            <Link to="/cookies" className="text-primary underline">
              Cookie Policy
            </Link>
            .
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Last updated: April 2026 · Contact: support@hizivo.com
          </p>
        </div>
      </div>
    </div>
  );
}
