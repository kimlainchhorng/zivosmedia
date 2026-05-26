import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserX, Shield, AlertTriangle, Scale, Ban, FileText, Globe, Lock, Eye, Users, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: UserX,
    title: "1. Minimum Age Requirement",
    content: "ZIVO services are strictly limited to individuals who are at least EIGHTEEN (18) YEARS OF AGE. If you are under the age of 18, you are NOT permitted to create an account, access, or use any ZIVO services. By creating an account or using ZIVO, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into a binding agreement. This representation is material to ZIVO's willingness to provide you access to the Services."
  },
  {
    icon: Shield,
    title: "2. Age Verification",
    content: "ZIVO reserves the right to verify your age at any time through any reasonable means. We may require government-issued identification, date of birth verification, or third-party age verification services. If we determine or reasonably suspect that you are under 18, we will immediately: (a) terminate your account without notice or liability; (b) cancel any pending bookings or transactions; (c) forfeit any credits, rewards, or loyalty points; (d) retain any fees already paid as liquidated damages; (e) report the violation to appropriate authorities if required by law; and (f) pursue any legal remedies available."
  },
  {
    icon: AlertTriangle,
    title: "3. COPPA Compliance",
    content: "ZIVO complies with the Children's Online Privacy Protection Act (COPPA), 15 U.S.C. §§ 6501–6506. We do NOT knowingly collect, use, or disclose personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will delete that information immediately and terminate any associated account. Parents or guardians who believe their child has provided personal information to ZIVO should contact us at privacy@hizivo.com immediately."
  },
  {
    icon: Scale,
    title: "4. Parental Responsibility & Liability",
    content: "Parents and legal guardians are responsible for monitoring their children's internet use and ensuring minors do not access ZIVO. If a minor (under 18) accesses ZIVO services using an adult's account, the account holder is FULLY responsible and liable for: (a) all activity conducted under the account; (b) all charges, fees, and financial obligations incurred; (c) any legal consequences arising from the minor's use; (d) any harm or damages to third parties; and (e) indemnification of ZIVO for any claims arising from unauthorized use by minors. ZIVO is not liable for any unauthorized use by minors under any circumstances."
  },
  {
    icon: Ban,
    title: "5. Service-Specific Age Requirements",
    items: [
      "Account creation: Must be 18+ in all cases — no exceptions",
      "Ride-hailing: Must be 18+ to request rides independently",
      "Alcohol delivery: Must be 21+ with valid government-issued photo ID required at delivery",
      "Car rental: Must be 21+ (25+ for luxury/premium vehicle classes)",
      "Flight booking: Must be 18+ to book independently; valid ID matching booking required",
      "Hotel booking: Must be 18+ (21+ at select properties per hotel policy)",
      "Payment methods: Must be 18+ to add any payment information",
      "Reviews & social features: Must be 18+ to post content",
    ]
  },
  {
    icon: FileText,
    title: "6. Consequences of Age Misrepresentation",
    content: "If you misrepresent your age to gain access to ZIVO services, you agree that: (a) your account will be permanently terminated without refund; (b) you forfeit all rights to refunds for any and all transactions ever conducted; (c) you may be held liable for any damages incurred by ZIVO as a result of your misrepresentation, including legal fees, regulatory fines, and reputational harm; (d) ZIVO may take legal action against you or your parent/guardian for fraud; (e) you indemnify ZIVO against any and all claims arising from your unauthorized use; and (f) your misrepresentation constitutes a material breach of these Terms entitling ZIVO to all available legal remedies."
  },
  {
    icon: Globe,
    title: "7. International Users",
    content: "If you are accessing ZIVO from outside the United States, you must meet both: (a) the minimum age of 18, AND (b) the legal age of majority in your jurisdiction, whichever is HIGHER. Some jurisdictions impose additional age requirements for specific services (e.g., alcohol, gambling, transportation). You are solely responsible for knowing and complying with your local laws. ZIVO makes no representation that the Services are lawful for use by any person in any particular jurisdiction."
  },
  {
    icon: Lock,
    title: "8. Data Protection for Minors",
    content: "If ZIVO discovers that data has been collected from a minor in violation of this policy: (a) all personal data will be permanently deleted within 48 hours; (b) all transaction records will be anonymized; (c) the account will be immediately and permanently disabled; (d) any third parties who received the minor's data will be notified and requested to delete it; and (e) the incident will be logged for regulatory compliance purposes. ZIVO maintains strict data handling procedures for suspected minor accounts."
  },
  {
    icon: Eye,
    title: "9. Monitoring & Detection",
    content: "ZIVO employs automated and manual monitoring systems to detect potential underage use, including but not limited to: behavioral analysis, device fingerprinting, content analysis, payment method verification, and anomaly detection. Any account flagged for potential underage use will be temporarily suspended pending verification. Users must provide satisfactory proof of age within 72 hours of a verification request or the account will be permanently terminated."
  },
  {
    icon: Users,
    title: "10. Reporting Underage Users",
    content: "If you become aware of any individual under 18 using ZIVO services, you are encouraged to report it immediately to safety@hizivo.com. Reports can be made anonymously. ZIVO will investigate all reports within 24 hours. Knowingly aiding a minor in accessing ZIVO services (e.g., sharing account credentials) is a violation of these Terms and may result in your account being permanently terminated."
  },
  {
    icon: Gavel,
    title: "11. Legal Compliance & Enforcement",
    content: "This Age Restriction Policy is designed to comply with: COPPA (15 U.S.C. §§ 6501–6506), state-specific age verification laws, the FTC's guidelines on children's online privacy, and applicable international regulations including GDPR Article 8 (digital age of consent). ZIVO cooperates fully with law enforcement agencies investigating potential violations involving minors. We reserve the right to update age requirements as laws evolve."
  },
];

export default function AgeRestrictionPolicy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Age Restriction Policy</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-semibold mb-3">
            <UserX className="h-3 w-3" /> Age Restriction — 18+ Only
          </span>
          <h2 className="text-2xl font-bold">Age Restriction Policy</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4">
          <p className="text-sm leading-relaxed font-medium">YOU MUST BE AT LEAST 18 YEARS OLD TO USE ZIVO. NO EXCEPTIONS. USE BY MINORS IS STRICTLY PROHIBITED AND WILL RESULT IN IMMEDIATE ACCOUNT TERMINATION AND MAY RESULT IN LEGAL ACTION AGAINST THE MINOR AND/OR THEIR PARENT OR GUARDIAN.</p>
        </div>
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                {s.content && <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>}
                {s.items && (
                  <ul className="space-y-2">
                    {s.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
        <div className="rounded-2xl bg-destructive/5 border border-destructive/10 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Report Underage Use</p>
          <p className="text-xs text-muted-foreground">Email <span className="text-primary font-semibold">safety@hizivo.com</span> to report suspected underage users</p>
        </div>
      </div>
    </div>
  );
}