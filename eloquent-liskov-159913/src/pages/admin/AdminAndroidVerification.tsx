/**
 * AdminAndroidVerification — Developer Verification Checklist for 2026 Android requirements
 * Government ID, D-U-N-S, Certified Device verification
 */
import { useState } from "react";
import { ArrowLeft, Shield, CheckCircle2, Circle, AlertTriangle, ExternalLink, Building2, CreditCard, Fingerprint, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  link?: string;
  linkLabel?: string;
  critical: boolean;
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: "identity",
    title: "Government-Issued ID Verification",
    description: "Upload a government-issued photo ID (passport, driver's license, or national ID) for the primary account holder. Required for all new developer accounts since January 2026.",
    icon: CreditCard,
    link: "https://play.google.com/console/signup",
    linkLabel: "Google Play Console",
    critical: true,
  },
  {
    id: "duns",
    title: "D-U-N-S Number Registration",
    description: "Obtain a D-U-N-S number from Dun & Bradstreet for your business entity. This is mandatory for organization accounts and the new 'Certified Device' program.",
    icon: Building2,
    link: "https://www.dnb.com/duns-number/get-a-duns.html",
    linkLabel: "Get D-U-N-S Number",
    critical: true,
  },
  {
    id: "certified_device",
    title: "Certified Device Program Enrollment",
    description: "Enroll in Google's 2026 'Certified Device' program. Apps must pass enhanced security audits for apps handling payments, location data, or PII.",
    icon: Fingerprint,
    link: "https://developer.android.com/distribute/play-policies",
    linkLabel: "Android Policy Center",
    critical: true,
  },
  {
    id: "data_safety",
    title: "Data Safety Section Complete",
    description: "Ensure your Google Play Data Safety section accurately declares all collected data types: Location, Contacts, Purchase History, Device IDs, and Meta CAPI tracking.",
    icon: Shield,
    link: "https://play.google.com/console",
    linkLabel: "Play Console Data Safety",
    critical: true,
  },
  {
    id: "privacy_policy",
    title: "Privacy Policy URL Verified",
    description: "Confirm your privacy policy at hizovo.com/privacy is accessible, up-to-date, and covers GDPR/CCPA/Cambodia data protection requirements.",
    icon: Globe,
    link: "https://hizovo.com/privacy",
    linkLabel: "View Privacy Policy",
    critical: false,
  },
  {
    id: "target_api",
    title: "Target API Level 35+ (Android 15)",
    description: "All apps submitted after August 2026 must target API level 35 or higher. Update your build.gradle and test on Android 15 devices.",
    icon: Shield,
    critical: false,
  },
  {
    id: "app_integrity",
    title: "Play Integrity API Integrated",
    description: "Integrate the Play Integrity API to protect against tampered or sideloaded APKs. Required for apps processing payments.",
    icon: Fingerprint,
    link: "https://developer.android.com/google/play/integrity",
    linkLabel: "Play Integrity Docs",
    critical: false,
  },
  {
    id: "contact_info",
    title: "Developer Contact Information",
    description: "Provide a verified email, phone number, and physical address. Google may contact you for identity verification within 7 business days.",
    icon: Building2,
    critical: false,
  },
];

export default function AdminAndroidVerification() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const progress = (completed.size / CHECKLIST.length) * 100;
  const criticalRemaining = CHECKLIST.filter(c => c.critical && !completed.has(c.id)).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Android Developer Verification</h1>
            <p className="text-xs text-muted-foreground">2026 Certified Device & Play Store Requirements</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Progress */}
        <Card className="rounded-2xl border-border/40">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Verification Progress</p>
              <span className="text-sm font-bold text-primary">{completed.size}/{CHECKLIST.length}</span>
            </div>
            <Progress value={progress} className="h-3 rounded-full" />
            {criticalRemaining > 0 && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 rounded-xl px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p className="text-xs font-medium">{criticalRemaining} critical item{criticalRemaining > 1 ? "s" : ""} remaining — submission will be rejected without these</p>
              </div>
            )}
            {criticalRemaining === 0 && (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-500/10 rounded-xl px-3 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <p className="text-xs font-medium">All critical items complete — ready for Play Store submission</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checklist */}
        <div className="space-y-3">
          {CHECKLIST.map(item => {
            const Icon = item.icon;
            const done = completed.has(item.id);
            return (
              <Card
                key={item.id}
                className={`rounded-2xl border-2 transition-all cursor-pointer ${
                  done ? "border-emerald-500/30 bg-emerald-500/5" : item.critical ? "border-amber-500/30" : "border-border/40"
                }`}
                onClick={() => toggle(item.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${done ? "text-emerald-500" : "text-primary"}`} />
                        <p className={`text-sm font-bold ${done ? "line-through text-muted-foreground" : ""}`}>
                          {item.title}
                        </p>
                        {item.critical && !done && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">
                            REQUIRED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {item.linkLabel}
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
