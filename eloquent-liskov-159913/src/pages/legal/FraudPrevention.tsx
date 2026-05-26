import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Ban, AlertTriangle, Scale, Eye, DollarSign, Globe, Lock, FileText, Gavel, Users, Fingerprint, Clock, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Shield, title: "1. Zero Tolerance Policy", content: "ZIVO MAINTAINS A STRICT ZERO-TOLERANCE POLICY AGAINST FRAUD. Any user found engaging in fraudulent activity will be immediately and permanently banned from the platform, all pending transactions will be frozen, and the matter will be referred to law enforcement. ZIVO cooperates fully with federal, state, and local law enforcement agencies investigating fraud." },
  { icon: AlertTriangle, title: "2. Types of Fraud", content: "Prohibited fraudulent activities include but are not limited to: (a) identity theft or impersonation; (b) use of stolen payment methods (credit cards, debit cards, digital wallets); (c) chargeback fraud (friendly fraud); (d) account takeover; (e) creating fake accounts; (f) false claims for refunds or credits; (g) manipulating prices, promotions, or loyalty programs; (h) referral fraud; (i) collusion with service providers; (j) synthetic identity fraud; (k) phishing or social engineering attacks targeting ZIVO users; (l) money laundering through the platform." },
  { icon: Eye, title: "3. Fraud Detection Systems", content: "ZIVO employs advanced fraud detection technologies including: (a) machine learning algorithms analyzing transaction patterns; (b) real-time risk scoring on all transactions; (c) device fingerprinting and behavioral analysis; (d) velocity checks on account activity; (e) IP geolocation verification; (f) cross-referencing with known fraud databases; (g) automated monitoring of account creation patterns; (h) anomaly detection in booking and spending behavior. ZIVO'S FRAUD DETECTION METHODS ARE PROPRIETARY AND CONFIDENTIAL." },
  { icon: Ban, title: "4. Chargeback & Friendly Fraud", content: "FILING A CHARGEBACK OR PAYMENT DISPUTE FOR A LEGITIMATE TRANSACTION CONSTITUTES FRAUD. If you file a chargeback for a service you received or a transaction you authorized, ZIVO reserves the right to: (a) immediately suspend your account; (b) contest the chargeback with your bank; (c) report the fraudulent chargeback to credit bureaus; (d) pursue legal action for damages including the chargeback amount, bank fees, and legal costs; (e) permanently ban you from the platform; (f) report the incident to law enforcement." },
  { icon: DollarSign, title: "5. Financial Liability for Fraud", content: "Users who engage in fraud are liable for: (a) the full amount of the fraudulent transaction; (b) chargeback fees (typically $15-$100 per incident); (c) investigation costs; (d) legal fees incurred by ZIVO; (e) any damages suffered by third parties as a result of the fraud; (f) statutory damages where applicable; (g) treble damages under applicable consumer fraud statutes. ZIVO WILL PURSUE ALL AVAILABLE LEGAL REMEDIES AGAINST FRAUDSTERS." },
  { icon: Lock, title: "6. Account Security & Fraud Prevention", content: "Users are responsible for preventing fraud on their accounts by: (a) using strong, unique passwords; (b) enabling two-factor authentication; (c) not sharing login credentials; (d) immediately reporting lost or stolen devices; (e) monitoring account activity regularly; (f) reporting suspicious activity within 24 hours; (g) keeping payment information current; (h) not using VPNs to circumvent geographic restrictions." },
  { icon: Scale, title: "7. Investigation Process", content: "When fraud is suspected, ZIVO will: (a) freeze the affected account and any pending transactions; (b) conduct an internal investigation; (c) request additional verification from the user; (d) review transaction history and patterns; (e) coordinate with payment processors and banks; (f) preserve evidence for potential legal action; (g) report to law enforcement when criminal activity is suspected. USERS UNDER INVESTIGATION HAVE NO RIGHT TO ACCESS THEIR ACCOUNT DURING THE INVESTIGATION." },
  { icon: Gavel, title: "8. Legal Consequences", content: "Fraud against ZIVO may result in: (a) civil lawsuits for damages; (b) criminal prosecution under federal wire fraud statutes (18 U.S.C. § 1343) carrying penalties of up to 20 years imprisonment; (c) prosecution under state fraud statutes; (d) prosecution under the Computer Fraud and Abuse Act (18 U.S.C. § 1030); (e) reporting to the FTC and state attorneys general; (f) reporting to credit bureaus; (g) inclusion in fraud databases shared among merchants." },
  { icon: Users, title: "9. Third-Party Fraud Reporting", content: "ZIVO participates in fraud intelligence sharing networks with: (a) major payment processors; (b) fraud prevention consortiums; (c) law enforcement agencies; (d) other technology platforms. Information about confirmed fraudsters may be shared with these networks to prevent fraud across platforms. This sharing is conducted in compliance with applicable privacy laws." },
  { icon: Fingerprint, title: "10. Identity Verification", content: "ZIVO may require enhanced identity verification for: (a) high-value transactions; (b) accounts flagged for suspicious activity; (c) new accounts with rapid activity; (d) changes to payment methods; (e) account recovery requests; (f) transactions from new devices or locations. Verification may include government ID, selfie verification, address proof, or phone verification." },
  { icon: Clock, title: "11. Statute of Limitations for Fraud Claims", content: "ZIVO reserves the right to investigate and take action on fraudulent activity for up to five (5) years after the fraudulent act occurred. This includes the right to retroactively terminate accounts, pursue legal action, and recover damages for fraud discovered after the fact." },
  { icon: Database, title: "12. Record Keeping", content: "ZIVO retains all transaction records, account activity logs, device information, and communication records for a minimum of seven (7) years for fraud prevention and investigation purposes. These records may be provided to law enforcement or used as evidence in legal proceedings without additional notice to you." },
  { icon: Globe, title: "13. International Fraud", content: "For fraud committed from outside the United States, ZIVO will: (a) cooperate with international law enforcement through mutual legal assistance treaties; (b) work with Interpol when appropriate; (c) pursue civil action in the user's jurisdiction; (d) report to local law enforcement in the user's country; (e) block access from countries associated with high fraud rates." },
  { icon: FileText, title: "14. Whistleblower Protection", content: "ZIVO encourages reporting of suspected fraud. Users who report fraud in good faith will not face retaliation. Reports can be submitted anonymously to fraud@hizivo.com. ZIVO will investigate all reports and may offer rewards for information leading to the identification and prosecution of fraudsters." },
];

export default function FraudPrevention() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Fraud Prevention</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold mb-3">
            <Shield className="h-3 w-3" /> Zero Tolerance
          </span>
          <h2 className="text-2xl font-bold">Fraud Prevention & Enforcement</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4">
          <p className="text-sm leading-relaxed font-medium">WARNING: FRAUD IS A FEDERAL CRIME. ZIVO WILL PROSECUTE ALL INSTANCES OF FRAUD TO THE FULLEST EXTENT OF THE LAW. THIS INCLUDES CHARGEBACK FRAUD, IDENTITY THEFT, AND ABUSE OF PROMOTIONS.</p>
        </div>
        {sections.map((s) => { const Icon = s.icon; return (
          <div key={s.title} className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
            <div className="rounded-2xl bg-card border border-border/40 p-4"><p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p></div>
          </div>
        ); })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Report fraud</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">fraud@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
