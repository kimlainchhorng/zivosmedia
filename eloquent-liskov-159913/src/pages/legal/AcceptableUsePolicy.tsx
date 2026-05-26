import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gavel, CheckCircle2, XCircle, Shield, Globe, AlertTriangle, Scale, Lock, Users, Ban, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const acceptableUses = [
  "Search and book travel services for personal or authorized business use",
  "Create and manage your user profile and travel preferences",
  "Leave honest reviews and ratings based on genuine firsthand experiences",
  "Share travel content (photos, stories) that you own or have proper rights to",
  "Communicate respectfully with other users, drivers, and support staff",
  "Use referral, loyalty, and reward programs as intended and within their terms",
  "Access the platform using supported browsers and applications",
  "Report policy violations, safety concerns, and suspicious activity",
];

const prohibitedUses = [
  "Accessing or attempting to access accounts belonging to other users",
  "Scraping, crawling, spidering, or automated data extraction from ZIVO",
  "Reverse engineering, decompiling, disassembling, or modifying ZIVO software",
  "Using ZIVO to distribute malware, phishing emails, or spam",
  "Creating fake accounts, sock puppet accounts, or impersonating others",
  "Manipulating search results, reviews, or pricing through deceptive means",
  "Using the platform for money laundering, terrorist financing, or sanctions evasion",
  "Circumventing security measures, rate limits, geo-restrictions, or access controls",
  "Reselling or commercially exploiting services obtained through ZIVO without authorization",
  "Using bots, scripts, or automated tools to make bookings or interact with the platform",
  "Exploiting bugs, glitches, or vulnerabilities for personal gain (report to security@hizivo.com instead)",
  "Using ZIVO's APIs without written authorization or in violation of API terms",
  "Engaging in price manipulation, fare gouging, or ticket scalping through the platform",
  "Creating bookings with intent to defraud, chargeback, or commit friendly fraud",
  "Using stolen, unauthorized, or fraudulent payment methods",
];

const sections = [
  {
    icon: Globe,
    title: "3. Network & System Integrity",
    content: "Users must not attempt to disrupt ZIVO's systems, overload servers, or interfere with other users' access to the Services. Prohibited activities include: denial-of-service attacks, packet sniffing, port scanning, IP spoofing, forging TCP/IP packet headers, DNS cache poisoning, and any other method of disrupting network communications. Any security vulnerability discovered must be reported responsibly to security@hizivo.com and must NOT be exploited, disclosed publicly, or shared with third parties. We operate a responsible disclosure program and will not pursue legal action against good-faith security researchers."
  },
  {
    icon: Scale,
    title: "4. Intellectual Property Protection",
    content: "All ZIVO branding, logos, designs, trade dress, algorithms, data compilations, and proprietary content are protected by U.S. and international copyright, trademark, and trade secret laws. Users may not: reproduce, distribute, modify, or create derivative works from ZIVO's intellectual property without express written permission; use ZIVO's trademarks in metatags, domain names, or advertising; frame or mirror any part of the platform; or claim ownership of ZIVO's proprietary content. User-generated content remains owned by users but is licensed to ZIVO as described in our Terms of Service."
  },
  {
    icon: Shield,
    title: "5. Compliance with Laws",
    content: "Users must comply with ALL applicable local, state, federal, and international laws when using ZIVO. This includes but is not limited to: export control and trade sanctions laws (ITAR, EAR, OFAC), anti-money laundering regulations (BSA, AML), anti-corruption laws (FCPA, UK Bribery Act), consumer protection laws (FTC Act, state consumer protection statutes), data protection regulations (CCPA, state privacy laws), anti-discrimination laws, telecommunications regulations, and tax reporting obligations. Violation of applicable laws may result in account termination and referral to law enforcement."
  },
  {
    icon: Lock,
    title: "6. Account Security Responsibilities",
    content: "You are responsible for maintaining the security of your account. You must: (a) use a strong, unique password not used on other platforms; (b) enable two-factor authentication when available; (c) never share your login credentials with anyone; (d) immediately report any unauthorized access to security@hizivo.com; (e) log out of shared or public devices; (f) keep your device's operating system and browser updated; and (g) not circumvent or disable security features. You are liable for all activity conducted through your account, regardless of whether you authorized it."
  },
  {
    icon: Users,
    title: "7. Fair Usage & Rate Limiting",
    content: "ZIVO reserves the right to impose rate limits, usage quotas, and fair use policies to ensure platform stability and equal access for all users. Excessive usage patterns that degrade service for others may result in: temporary access restrictions, reduced functionality, or account suspension. Examples of excessive usage include: making hundreds of search queries per minute, repeatedly creating and cancelling bookings, or generating excessive API calls. Automated monitoring systems enforce these limits."
  },
  {
    icon: Ban,
    title: "8. Anti-Fraud & Financial Integrity",
    content: "The following financial activities are strictly prohibited: (a) using stolen or unauthorized payment methods; (b) filing fraudulent chargebacks or disputes; (c) exploiting pricing errors or system glitches; (d) creating multiple accounts to abuse promotions; (e) using VPNs or location spoofing to access geo-restricted pricing; (f) coordinating with others to manipulate prices or availability; (g) purchasing services with intent to resell at markup; and (h) any form of friendly fraud. ZIVO employs advanced fraud detection systems and may report fraudulent activity to law enforcement and credit bureaus."
  },
  {
    icon: Eye,
    title: "9. Monitoring & Investigation",
    content: "ZIVO monitors platform usage through automated systems and may investigate suspected violations. We may: review account activity and transaction patterns, analyze usage data for anomalies, cooperate with law enforcement investigations, preserve data as required by legal process, and temporarily restrict access during investigations. You consent to such monitoring as a condition of using the Services. We strive to balance security with privacy and follow our Privacy Policy in all monitoring activities."
  },
  {
    icon: AlertTriangle,
    title: "10. Enforcement & Consequences",
    content: "ZIVO enforces this policy through a graduated response system: (a) first-time minor violations receive a written warning; (b) repeated or moderate violations result in temporary suspension (7-90 days); (c) severe violations (fraud, security breaches, illegal activity) result in IMMEDIATE permanent termination; (d) criminal activity is reported to relevant law enforcement agencies; (e) ZIVO may pursue civil legal action for damages, injunctive relief, and recovery of attorneys' fees. Enforcement decisions are at ZIVO's sole discretion and are final. Account termination under this policy forfeits all credits, rewards, and loyalty points."
  },
  {
    icon: Gavel,
    title: "11. Reporting Violations",
    content: "If you become aware of any violation of this Acceptable Use Policy, please report it immediately to: (a) In-app: Use the Report feature on any content or user profile; (b) Email: legal@hizivo.com for general violations; (c) Email: security@hizivo.com for security vulnerabilities; (d) Email: dmca@hizivo.com for copyright violations. Reports can be made anonymously. ZIVO will investigate all reports and take appropriate action. Retaliation against users who report violations in good faith is prohibited."
  },
];

export default function AcceptableUsePolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Acceptable Use Policy</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-3">
            <Gavel className="h-3 w-3" /> Platform Rules
          </span>
          <h2 className="text-2xl font-bold text-foreground">Acceptable Use Policy</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>

        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4">
          <p className="text-sm text-foreground leading-relaxed">
            This Acceptable Use Policy ("AUP") defines the permitted and prohibited uses of ZIVO's platform, services, and features. ALL users must comply with this policy as a condition of access. Violations may result in account suspension, permanent termination, and/or legal action.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            1. Acceptable Uses
          </h3>
          <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-2.5">
            {acceptableUses.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
            <XCircle className="h-4 w-4 text-destructive" />
            2. Prohibited Uses
          </h3>
          <div className="rounded-2xl bg-card border border-destructive/20 p-4 space-y-2.5">
            {prohibitedUses.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {section.title}
              </h3>
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            </div>
          );
        })}

        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">Report a Violation</p>
          <p className="text-xs text-muted-foreground">
            Contact <span className="text-primary font-semibold">legal@hizivo.com</span> for policy questions or to report violations
          </p>
        </div>
      </div>
    </div>
  );
}