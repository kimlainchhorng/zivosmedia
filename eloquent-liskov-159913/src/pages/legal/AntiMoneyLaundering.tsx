import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, DollarSign, AlertTriangle, Ban, Eye, Lock, FileText, Globe, Scale, Landmark, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Shield, title: "1. AML Policy Statement", content: "ZIVO LLC is committed to preventing money laundering, terrorist financing, and other financial crimes. This Anti-Money Laundering (AML) Policy establishes the framework for identifying, monitoring, and reporting suspicious activities in compliance with the Bank Secrecy Act (BSA), USA PATRIOT Act, and Financial Crimes Enforcement Network (FinCEN) regulations. All users must comply with this policy as a condition of using the Services." },
  { icon: Eye, title: "2. Know Your Customer (KYC)", content: "ZIVO reserves the right to verify the identity of any user. Identity verification may include: (a) government-issued photo ID; (b) proof of address; (c) Social Security Number verification; (d) phone number verification; (e) email verification; (f) selfie verification; (g) additional documentation as needed. Failure to provide requested verification documents may result in account suspension or termination." },
  { icon: AlertTriangle, title: "3. Suspicious Activity Monitoring", content: "ZIVO monitors transactions and account activity for suspicious behavior including: (a) unusual transaction patterns; (b) rapid successive bookings; (c) use of multiple payment methods; (d) transactions inconsistent with user profile; (e) attempts to structure transactions to avoid reporting thresholds; (f) transactions involving sanctioned countries or persons; (g) use of anonymous or prepaid payment methods; (h) repeated chargebacks or disputes." },
  { icon: DollarSign, title: "4. Transaction Limits", content: "ZIVO may impose transaction limits to comply with AML regulations. These limits may include: (a) daily transaction caps; (b) monthly spending limits; (c) per-transaction maximums; (d) cumulative thresholds triggering enhanced review. Users who exceed transaction limits may be subject to enhanced due diligence, including requests for source of funds documentation." },
  { icon: Landmark, title: "5. Reporting Obligations", content: "ZIVO is required by law to file Suspicious Activity Reports (SARs) with FinCEN for transactions that ZIVO knows, suspects, or has reason to suspect: (a) involve funds from illegal activity; (b) are designed to evade reporting requirements; (c) lack a lawful purpose; (d) involve use of the platform to facilitate criminal activity. ZIVO IS PROHIBITED BY LAW FROM INFORMING YOU IF A SAR HAS BEEN FILED REGARDING YOUR ACCOUNT." },
  { icon: Ban, title: "6. OFAC Compliance & Sanctions", content: "ZIVO screens all users against the Office of Foreign Assets Control (OFAC) Specially Designated Nationals (SDN) list and other sanctions lists. Users who appear on any sanctions list will be immediately denied service. ZIVO will not knowingly facilitate transactions involving: (a) sanctioned countries; (b) sanctioned individuals or entities; (c) blocked persons; (d) any party subject to trade restrictions." },
  { icon: Lock, title: "7. Record Retention", content: "In compliance with the BSA, ZIVO retains all transaction records, KYC documentation, and account information for a minimum of five (5) years after account closure or transaction completion. These records may be provided to law enforcement or regulatory agencies upon lawful request without notice to you." },
  { icon: CreditCard, title: "8. Payment Method Restrictions", content: "To prevent money laundering, ZIVO may: (a) restrict certain payment methods; (b) require payment methods to be in the account holder's name; (c) reject payments from high-risk jurisdictions; (d) decline transactions that present AML risks; (e) freeze funds pending investigation; (f) return funds to the original payment method only." },
  { icon: Globe, title: "9. International Compliance", content: "For users outside the United States, ZIVO complies with applicable international AML regulations including: EU Anti-Money Laundering Directives, UK Proceeds of Crime Act, FATF recommendations, and local AML laws. Users are responsible for compliance with their own jurisdiction's AML requirements." },
  { icon: Scale, title: "10. Cooperation with Authorities", content: "ZIVO fully cooperates with law enforcement agencies, regulatory bodies, and financial intelligence units investigating financial crimes. ZIVO may share user data, transaction records, and account information with authorities without notice to you as permitted by law. You agree not to hold ZIVO liable for any consequences of such cooperation." },
  { icon: FileText, title: "11. User Obligations", content: "You agree that: (a) you will not use ZIVO for money laundering or terrorist financing; (b) all funds used on the platform are from legitimate sources; (c) you will promptly provide identity verification when requested; (d) you will not attempt to circumvent transaction monitoring; (e) you will report any suspected fraudulent activity; (f) violation of this AML policy may result in immediate account termination and referral to law enforcement." },
];

export default function AntiMoneyLaundering() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Anti-Money Laundering</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-semibold mb-3">
            <Shield className="h-3 w-3" /> BSA/AML Compliance
          </span>
          <h2 className="text-2xl font-bold">Anti-Money Laundering Policy</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        {sections.map((s) => { const Icon = s.icon; return (
          <div key={s.title} className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
            <div className="rounded-2xl bg-card border border-border/40 p-4"><p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p></div>
          </div>
        ); })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Compliance questions?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">compliance@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
