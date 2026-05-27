import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Globe, Lock, Eye, FileText, Scale, Database, Users, Bell, Fingerprint, Server, Ban, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Shield, title: "1. GDPR Applicability", content: "If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you may have additional rights under the General Data Protection Regulation (GDPR) and applicable local data protection laws. This policy supplements our Privacy Policy and describes how ZIVO handles personal data of EEA/UK/Swiss users. ZIVO LLC acts as the data controller for personal data collected through the platform." },
  { icon: Scale, title: "2. Legal Bases for Processing", content: "ZIVO processes your personal data under the following legal bases: (a) CONSENT — where you have given explicit consent for processing (e.g., marketing communications); (b) CONTRACT — where processing is necessary to perform a contract with you (e.g., facilitating bookings); (c) LEGITIMATE INTEREST — where processing is in our legitimate business interests and not overridden by your rights; (d) LEGAL OBLIGATION — where we are required by law to process your data (e.g., tax reporting, AML compliance)." },
  { icon: Eye, title: "3. Your GDPR Rights", content: "Under the GDPR, you have the right to: (a) ACCESS — request a copy of your personal data; (b) RECTIFICATION — correct inaccurate personal data; (c) ERASURE ('Right to be Forgotten') — request deletion of your personal data; (d) RESTRICTION — restrict processing of your personal data; (e) DATA PORTABILITY — receive your data in a structured, machine-readable format; (f) OBJECT — object to processing based on legitimate interests or direct marketing; (g) AUTOMATED DECISION-MAKING — not be subject to decisions based solely on automated processing." },
  { icon: FileText, title: "4. Exercising Your Rights", content: "To exercise your GDPR rights, submit a request to gdpr@hizivo.com. We will: (a) acknowledge your request within 72 hours; (b) verify your identity; (c) respond to your request within 30 days (extendable by 60 days for complex requests); (d) provide a free copy of your data (reasonable fees may apply for additional copies); (e) inform any third-party recipients of corrections or deletions." },
  { icon: Globe, title: "5. International Data Transfers", content: "ZIVO is based in the United States. If you are in the EEA/UK/Switzerland, your data will be transferred to the United States. We protect these transfers through: (a) Standard Contractual Clauses (SCCs) approved by the European Commission; (b) additional technical and organizational safeguards; (c) data transfer impact assessments where required. You acknowledge and consent to this transfer by using the Services." },
  { icon: Database, title: "6. Data Retention Under GDPR", content: "We retain personal data only for as long as necessary for the purposes for which it was collected, unless a longer retention period is required by law. When data is no longer needed, we securely delete or anonymize it. You may request erasure at any time, subject to legal retention obligations." },
  { icon: Lock, title: "7. Data Protection Measures", content: "ZIVO implements appropriate technical and organizational measures to protect personal data, including: (a) encryption of data in transit and at rest; (b) access controls and authentication; (c) regular security assessments; (d) employee data protection training; (e) data processing agreements with subprocessors; (f) incident response procedures." },
  { icon: Users, title: "8. Sub-processors", content: "ZIVO uses sub-processors to provide the Services. A current list of sub-processors is available upon request. We maintain data processing agreements with all sub-processors that include GDPR-required protections. We will notify you of any new sub-processors and give you the opportunity to object." },
  { icon: Fingerprint, title: "9. Cookies & Tracking Under GDPR", content: "For EEA/UK users, ZIVO obtains explicit consent before placing non-essential cookies or tracking technologies. You may withdraw consent at any time through our cookie settings. Essential cookies required for the functioning of the Services do not require consent. See our Cookie Policy for details." },
  { icon: Bell, title: "10. Data Breach Notification", content: "In the event of a personal data breach, ZIVO will: (a) notify the relevant supervisory authority within 72 hours of becoming aware of the breach (when required); (b) notify affected individuals without undue delay when the breach poses a high risk to their rights and freedoms; (c) document all breaches, including effects and remedial actions taken." },
  { icon: Server, title: "11. Data Protection Officer", content: "For GDPR-related inquiries, contact our data protection representative at gdpr@hizivo.com. While ZIVO is not currently required to appoint a formal DPO under Article 37 of the GDPR, we have designated a privacy team to handle all data protection matters." },
  { icon: Ban, title: "12. Right to Lodge a Complaint", content: "If you believe ZIVO has violated your data protection rights, you have the right to lodge a complaint with your local supervisory authority. For EU residents, a list of supervisory authorities is available at the European Data Protection Board website. We encourage you to contact us first to resolve any concerns." },
  { icon: AlertTriangle, title: "13. Children's Data (Under 16)", content: "ZIVO does not knowingly collect personal data from children under 16 in the EEA (or the applicable age in your jurisdiction). If we become aware that we have collected data from a child under the applicable age without parental consent, we will take steps to delete such data immediately." },
];

export default function GDPRCompliance() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">GDPR Compliance</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-semibold mb-3">
            <Globe className="h-3 w-3" /> EU Data Protection
          </span>
          <h2 className="text-2xl font-bold">GDPR Compliance & EU Privacy</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        {sections.map((s) => { const Icon = s.icon; return (
          <div key={s.title} className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
            <div className="rounded-2xl bg-card border border-border/40 p-4"><p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p></div>
          </div>
        ); })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">GDPR requests?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">gdpr@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
