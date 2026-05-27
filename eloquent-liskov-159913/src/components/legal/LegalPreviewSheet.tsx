import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

type LegalKind = "terms" | "privacy";

interface LegalPreviewLinkProps {
  kind: LegalKind;
  className?: string;
  children: React.ReactNode;
}

const TERMS_SECTIONS = [
  { title: "1. Who We Are", body: "ZIVO is a global travel, social, and lifestyle platform operated by ZIVO LLC. We provide search, booking referral, social feed, reels, chat, live streaming, ride, food, and grocery services. Some features are operated by partners (merchants of record)." },
  { title: "2. Eligibility & Age", body: "You must be at least 13 to create a personal account, 18 to book travel, make payments, send/receive gifts, go live, or access age-restricted content. Some features may require additional verification (ID, phone, payment method)." },
  { title: "3. Your Account", body: "You're responsible for keeping your credentials safe, providing accurate info, and all activity under your account. We may require phone verification for bookings, rides, and payouts. One person, one account — no impersonation, bots, or resale of accounts." },
  { title: "4. Bookings, Payments & Tickets", body: "Travel bookings, ticketing, and payments are handled by licensed partners (the merchant of record). ZIVO does not collect card payments for air travel. For rides, food, grocery, gifts, and ZIVO+ subscriptions, payments are processed by Stripe or supported local processors. A 2% platform service fee may apply on card transactions." },
  { title: "5. Pricing, Fees & Refunds", body: "Prices shown are estimates from partners. The final price, taxes, baggage, and cancellation rules are confirmed at partner checkout. Refunds, changes, and cancellations follow the partner's terms. ZIVO+ subscriptions auto-renew until cancelled and follow the refund policy displayed at purchase." },
  { title: "6. User Content & License", body: "You keep ownership of what you post (photos, reels, comments, livestreams, reviews). By posting, you grant ZIVO a worldwide, non-exclusive, royalty-free license to host, display, distribute, adapt, and promote your content across the platform and our marketing — solely to operate and improve the service." },
  { title: "7. Acceptable Use", body: "Don't post or send: illegal content, hate speech, harassment, sexual content involving minors, non-consensual intimate imagery, terrorism, scams, spam, malware, IP infringement, or doxxing. Don't scrape, reverse-engineer, or interfere with the platform. Don't use ZIVO to launder money or evade sanctions." },
  { title: "8. Adult & Sensitive Content", body: "Sexually explicit content is not permitted on ZIVO. Mature themes (alcohol, suggestive content) may be limited to verified adult viewers and hidden from minors. Live streaming has additional safety, nudity, and behavior rules — violations result in immediate stream termination and account action." },
  { title: "9. Monetization & Creator Earnings", body: "Eligible creators may earn from gifts (Z Coins), tips, locked media, and ZIVO+ revenue share. Earnings are subject to platform fees, identity and tax verification, minimum payout thresholds, refund clawbacks, and chargeback liability. Fraudulent or self-bought engagement results in forfeiture." },
  { title: "10. Live Streaming, Calls & Chat", body: "Calls, chat, and livestreams may be moderated by automated systems and human reviewers for safety. Recording others without consent where prohibited by law is forbidden. Group calls and broadcasts must follow community guidelines." },
  { title: "11. Rides, Food & Grocery", body: "Mobility, food, and grocery services are provided by independent third parties (drivers, restaurants, stores). ZIVO is a marketplace and is not the provider. You agree to follow local laws, treat partners respectfully, and pay all fares, tips, taxes, and surcharges shown at checkout." },
  { title: "12. AI Features", body: "ZIVO uses AI for search ranking, recommendations, fraud detection, pricing, moderation, and chat assistance. AI output may be inaccurate — always verify important information. We may use de-identified content to train and improve AI models, subject to your privacy choices." },
  { title: "13. Intellectual Property", body: "ZIVO, hiZIVO, the Z logo, Z Coins, and all platform software are owned by ZIVO LLC. You may not copy, modify, or create derivative works of the platform. Report copyright infringement under the DMCA to copyright@hizivo.com." },
  { title: "14. Suspension & Termination", body: "We may suspend, restrict, or terminate accounts for policy violations, fraud, safety risks, legal orders, or extended inactivity. You can delete your account anytime — there is a 30-day grace period to log back in and cancel deletion before data is permanently removed." },
  { title: "15. Disclaimers", body: "ZIVO is provided 'as is' and 'as available'. We disclaim all warranties to the maximum extent permitted by law, including merchantability, fitness for purpose, and non-infringement. We don't guarantee uninterrupted service, accuracy of partner content, or specific outcomes." },
  { title: "16. Limitation of Liability", body: "To the maximum extent allowed by law, ZIVO's total liability is limited to the greater of $100 USD or fees you paid ZIVO in the 12 months before the claim. We are not liable for indirect, incidental, special, consequential, or punitive damages, or for partner actions." },
  { title: "17. Indemnification", body: "You agree to indemnify and hold ZIVO harmless from claims arising from your content, your use of the platform, your interactions with other users or partners, or your violation of these Terms or applicable law." },
  { title: "18. Disputes & Arbitration", body: "Most disputes are resolved through binding individual arbitration under the rules of the AAA, seated in the United States, and governed by the laws of the State of Delaware. You waive class actions. You may opt out of arbitration within 30 days of accepting these Terms by emailing legal@hizivo.com." },
  { title: "19. Changes to These Terms", body: "We may update these Terms. Material changes will be notified by email or in-app at least 7 days before taking effect. Continued use after changes means you accept them." },
  { title: "20. Contact", body: "Questions: legal@hizivo.com · Safety: safety@hizivo.com · Copyright: copyright@hizivo.com · Mail: ZIVO LLC, United States." },
];

const PRIVACY_SECTIONS = [
  { title: "1. What We Collect", body: "Account info (name, email, phone, password hash, date of birth), profile content (photo, bio, posts, reels, livestreams, messages), bookings and orders, payment info (processed by Stripe — we don't store full card numbers), location (with permission), device and usage data, contacts (with permission), and customer support communications." },
  { title: "2. How We Use Data", body: "Operate accounts and bookings; rank feed/reels/search; personalize content and ads; process payments and payouts; prevent fraud, spam, and abuse; moderate content; deliver notifications; provide AI assistance; comply with legal obligations; and improve the platform." },
  { title: "3. Legal Bases (GDPR/UK)", body: "We rely on: contract (to deliver the service you requested), legitimate interests (security, analytics, product improvement), consent (marketing, precise location, optional cookies), and legal obligation (tax, anti-fraud, law enforcement requests)." },
  { title: "4. Sharing Your Data", body: "With travel, ride, food, and grocery partners to fulfill your bookings; with Stripe and payment processors; with hosting, analytics, email, SMS, push, and moderation vendors under strict data agreements; with other users (only what your privacy settings allow); with law enforcement when legally required; and in corporate transactions (merger, acquisition) with notice." },
  { title: "5. We Do Not Sell Your Data", body: "ZIVO does not sell your personal information. We may share limited audience signals with advertising partners only with your consent under applicable law (CCPA/CPRA opt-out available)." },
  { title: "6. Cookies & Tracking", body: "We use essential cookies (login, security), functional cookies (preferences), and — with consent — analytics and advertising cookies (Meta, Google, TikTok pixels). Manage choices anytime in Settings → Privacy → Cookies." },
  { title: "7. Location Data", body: "Precise location is used for rides, nearby restaurants, stores, and live discovery — only when you grant permission. You can revoke at any time in your device settings; some features may stop working." },
  { title: "8. Content Moderation & Safety", body: "Posts, reels, livestreams, messages, and gifts may be scanned by automated systems and reviewed by trained moderators to detect CSAM, terrorism, fraud, spam, and policy violations. We report illegal content to NCMEC and law enforcement as required by law." },
  { title: "9. Children's Privacy", body: "ZIVO is not for children under 13 (under 16 in some regions). We do not knowingly collect data from children. If you believe a child has an account, contact privacy@hizivo.com — we'll delete it." },
  { title: "10. Your Rights", body: "Access, correct, export, restrict, object, or delete your data. EU/UK residents have GDPR rights; California residents have CCPA/CPRA rights (including 'Do Not Sell or Share'); Brazilian residents have LGPD rights. Submit requests in Settings → Privacy or email privacy@hizivo.com." },
  { title: "11. Account Deletion & Retention", body: "Delete your account in Settings → Security. There's a 30-day grace period — log back in to cancel. After 30 days, personal data is permanently deleted, except where we must retain records for tax (7 years), fraud prevention, legal claims, or anonymized analytics." },
  { title: "12. International Transfers", body: "Your data may be processed in the United States and other countries with different data laws. We use Standard Contractual Clauses (SCCs) and equivalent safeguards for cross-border transfers from the EU/UK." },
  { title: "13. Security", body: "We use TLS encryption in transit, AES-256 at rest for sensitive data, hashed passwords, Row-Level Security on databases, audit logging, 2FA for admins, and rate limiting. No system is 100% secure — report concerns to security@hizivo.com." },
  { title: "14. AI & Automated Decisions", body: "AI helps rank content, detect fraud, moderate, and price rides. Decisions with significant effect (account suspension, payout holds) include human review on request. You can request information about automated decisions affecting you." },
  { title: "15. Marketing Communications", body: "We may send transactional (booking, security) and — with consent — promotional emails, SMS, and push notifications. Unsubscribe anytime via the link in each email or in Settings → Notifications." },
  { title: "16. Data Breach Notification", body: "If a breach affects your personal data and creates risk, we'll notify you and applicable authorities within 72 hours as required by law." },
  { title: "17. Changes to This Policy", body: "We'll notify you of material changes by email or in-app at least 7 days before they take effect." },
  { title: "18. Contact Our Privacy Team", body: "Privacy: privacy@hizivo.com · DPO (EU): dpo@hizivo.com · Mail: ZIVO LLC, United States. We respond to verified requests within 30 days (45 in some regions)." },
];

export function LegalPreviewLink({ kind, className, children }: LegalPreviewLinkProps) {
  const [open, setOpen] = useState(false);
  const isTerms = kind === "terms";
  const Icon = isTerms ? FileText : ShieldCheck;
  const title = isTerms ? "Terms of Service" : "Privacy Policy";
  const subtitle = isTerms
    ? "How ZIVO works as a travel search and referral platform."
    : "How we collect, use, and protect your data.";
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  const fullPath = isTerms ? "/terms" : "/privacy";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={className}
      >
        {children}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/50 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base font-bold">{title}</SheetTitle>
                <SheetDescription className="text-xs">{subtitle}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-5 py-4">
            <div className="space-y-4 pb-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Effective Date · February 1, 2026
              </p>
              {sections.map((s) => (
                <section key={s.title} className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </section>
              ))}
              <div className="rounded-xl bg-muted/40 border border-border/40 p-3 text-xs text-muted-foreground">
                This is a summary for quick review. The full legal document is available on the dedicated page.
              </div>
            </div>
          </ScrollArea>

          <div className="border-t border-border/50 p-3 flex gap-2 safe-area-bottom">
            <Button asChild variant="outline" className="flex-1 h-11 rounded-xl">
              <Link to={fullPath} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Full page
              </Link>
            </Button>
            <Button
              onClick={() => setOpen(false)}
              className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Got it
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
