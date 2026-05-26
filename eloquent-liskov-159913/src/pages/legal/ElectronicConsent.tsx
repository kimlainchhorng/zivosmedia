import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, FileText, Shield, Monitor, Smartphone, CheckCircle2, Archive, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: FileText,
    title: "1. Consent to Electronic Communications",
    content: "By creating an account or using ZIVO services, you consent to receive ALL communications from ZIVO electronically, including but not limited to: terms of service updates, privacy policy changes, billing statements and invoices, receipts and booking confirmations, account notifications and security alerts, legal notices and regulatory disclosures, dispute resolution communications, tax documents (1099s, receipts), promotional communications (where you have opted in), and any other communications required by law. This consent is provided in accordance with the Electronic Signatures in Global and National Commerce Act (E-SIGN Act), 15 U.S.C. §§ 7001-7006, and the Uniform Electronic Transactions Act (UETA)."
  },
  {
    icon: Mail,
    title: "2. Methods of Delivery",
    content: "Electronic communications may be delivered via: (a) email to the address associated with your account; (b) push notifications on your mobile device; (c) in-app messages and notifications; (d) SMS/text messages to your registered phone number (standard rates may apply); (e) posting on your ZIVO account dashboard; (f) posting on our website at hizivo.com; or (g) through secure document portals. Communications sent electronically are deemed delivered when sent, posted, or made available, REGARDLESS of whether you have read them. You bear the risk of not reading communications."
  },
  {
    icon: Monitor,
    title: "3. Hardware & Software Requirements",
    content: "To receive electronic communications, you need: (a) a device with internet access (computer, tablet, or smartphone); (b) a current web browser (Chrome, Firefox, Safari, or Edge, latest two major versions); (c) a valid and actively monitored email address; (d) sufficient storage to save or print communications; (e) a PDF viewer (Adobe Acrobat or equivalent) for certain documents; (f) enabled JavaScript and cookies; and (g) a printer or the ability to save electronic files for your records. You confirm that you currently have the required hardware and software, and will maintain them throughout your use of ZIVO."
  },
  {
    icon: Shield,
    title: "4. Legal Equivalence & Binding Effect",
    content: "You agree that all electronic communications from ZIVO satisfy any legal requirement that such communications be 'in writing.' Electronic records of transactions, agreements, disclosures, and notices constitute 'writings' and 'signed writings' under applicable federal and state law. Your electronic acceptance of terms, clicking 'I Agree,' tapping 'Accept,' checking confirmation boxes, or continued use of the Services constitutes your legally binding electronic signature with the same legal force and effect as a handwritten signature."
  },
  {
    icon: Smartphone,
    title: "5. Updating Contact Information",
    content: "You are SOLELY responsible for keeping your email address, phone number, and mailing address current and accurate. If your contact information changes, update it immediately in Account Settings. ZIVO is NOT responsible for communications that fail to reach you due to outdated, incorrect, or inactive contact information. Failed delivery due to your outdated information does NOT invalidate the legal effectiveness of the communication. You acknowledge that failure to receive a communication does not relieve you of any obligation."
  },
  {
    icon: Archive,
    title: "6. Record Retention & Access",
    content: "You are responsible for maintaining your own copies of all electronic communications. ZIVO will make reasonable efforts to maintain copies of communications for the periods specified in our Data Retention Policy, but does not guarantee indefinite access. You may request copies of specific communications by contacting support@hizivo.com. ZIVO may charge a reasonable fee for retrieval of archived communications beyond standard retention periods. We recommend you save or print copies of all important communications at the time you receive them."
  },
  {
    icon: Globe,
    title: "7. Scope of Consent",
    content: "This consent applies to all communications between you and ZIVO, including but not limited to: (a) pre-contractual disclosures; (b) terms and conditions; (c) privacy notices; (d) billing and payment communications; (e) booking confirmations and itineraries; (f) legal notices and claims; (g) dispute resolution communications; (h) regulatory disclosures required by federal, state, or local law; (i) annual statements and tax documents; and (j) any other communications related to your account or services."
  },
  {
    icon: Lock,
    title: "8. Security of Electronic Communications",
    content: "ZIVO employs industry-standard security measures to protect electronic communications, including TLS encryption for email transmission and secure HTTPS connections. However, you acknowledge that: (a) no electronic communication method is 100% secure; (b) email can be intercepted by third parties; (c) you should verify the sender of any communication purporting to be from ZIVO; (d) ZIVO will never ask for your password via email or text; and (e) you should report suspected phishing attempts to security@hizivo.com immediately."
  },
  {
    icon: CheckCircle2,
    title: "9. Withdrawal of Consent",
    content: "You may withdraw your consent to receive electronic communications by sending written notice to legal@hizivo.com. However, withdrawing consent may result in: (a) immediate inability to use ZIVO services that require electronic agreement; (b) account limitations, suspension, or termination; (c) inability to process bookings, payments, or transactions; (d) loss of access to electronic records and booking history; (e) requirement to receive paper communications at YOUR expense (including printing, postage, and handling fees); and (f) significant delays in receiving legally required disclosures. Withdrawal of consent does NOT affect the validity or legal effect of any prior electronic communications already delivered."
  },
  {
    icon: FileText,
    title: "10. Federal & State Law Compliance",
    content: "This Electronic Consent Agreement complies with: (a) the Electronic Signatures in Global and National Commerce Act (E-SIGN Act), 15 U.S.C. §§ 7001-7006; (b) the Uniform Electronic Transactions Act (UETA) as adopted by applicable states; (c) the Federal Reserve Board's Regulation E (Electronic Fund Transfers); (d) the Truth in Lending Act (TILA) electronic disclosure requirements; (e) state-specific electronic commerce laws; and (f) applicable international electronic signature and communication laws for users outside the United States."
  },
];

export default function ElectronicConsent() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Electronic Consent</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold mb-3">
            <Mail className="h-3 w-3" /> E-SIGN Act Compliance
          </span>
          <h2 className="text-2xl font-bold">Electronic Communications Consent</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4">
          <p className="text-sm leading-relaxed">This document explains how ZIVO communicates with you electronically and your legally binding consent to receive all notices, disclosures, and communications in electronic form. By using ZIVO, you agree to all terms in this document.</p>
        </div>
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
              </div>
            </div>
          );
        })}
        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Need paper communications?</p>
          <p className="text-xs text-muted-foreground">Email <span className="text-primary font-semibold">legal@hizivo.com</span> to request opt-out (fees may apply)</p>
        </div>
      </div>
    </div>
  );
}