import { useNavigate } from "react-router-dom";
import { ArrowLeft, Database, Clock, Trash2, Shield, Server, Globe, Lock, AlertTriangle, Bell, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: Database,
    title: "1. What Data We Retain",
    content: "We retain personal data you provide (name, email, phone, date of birth, travel preferences, payment information) and transactional data (bookings, payments, search history, support interactions, reviews) as necessary to provide our services, comply with legal obligations, resolve disputes, enforce agreements, and improve your experience. We also retain device identifiers, IP addresses, location data, and usage analytics for security and fraud prevention purposes."
  },
  {
    icon: Clock,
    title: "2. Retention Periods",
    items: [
      { label: "Account profile data", period: "Duration of account + 30 days after deletion request" },
      { label: "Booking & reservation records", period: "7 years (tax & legal compliance, IRS requirements)" },
      { label: "Payment & transaction records", period: "7 years (financial regulations, PCI-DSS, SOX)" },
      { label: "Customer support conversations", period: "3 years after resolution" },
      { label: "Dispute & chargeback records", period: "7 years (legal compliance)" },
      { label: "Search & browsing history", period: "12 months (then anonymized)" },
      { label: "Marketing preferences & consent", period: "Until consent is withdrawn + 3 years proof" },
      { label: "Security & access logs", period: "2 years" },
      { label: "Fraud detection data", period: "5 years" },
      { label: "Analytics data", period: "Aggregated indefinitely (fully anonymized)" },
      { label: "Legal hold data", period: "Duration of legal proceedings + 1 year" },
      { label: "Driver/partner verification docs", period: "Duration of partnership + 3 years" },
      { label: "DMCA/copyright notices", period: "3 years" },
      { label: "Consent & acceptance records", period: "7 years (legal proof)" },
    ]
  },
  {
    icon: Trash2,
    title: "3. Data Deletion & Your Rights",
    content: "You may request deletion of your personal data at any time via Account Settings → Delete Account or by emailing privacy@hizivo.com. Upon verified request, we will delete or irreversibly anonymize your data within 30 days, EXCEPT where retention is required by: (a) applicable law (tax, financial regulations); (b) ongoing legal proceedings or disputes; (c) fraud prevention obligations; (d) regulatory investigations; or (e) legitimate business interests as permitted by law. Backup copies may persist in encrypted backups for up to 90 days before automatic purge. Deletion is permanent and irreversible — we cannot recover deleted data."
  },
  {
    icon: Server,
    title: "4. Data Storage, Security & Infrastructure",
    content: "Your data is stored on secure, encrypted servers located in the United States, hosted by SOC 2 Type II certified cloud providers. We implement: AES-256 encryption for data at rest, TLS 1.3 for data in transit, role-based access controls with principle of least privilege, multi-factor authentication for all administrative access, regular security audits and penetration testing, automated intrusion detection and prevention systems, encrypted database backups with geographic redundancy, and real-time monitoring of all data access. Third-party processors are bound by written data processing agreements with equivalent or superior security standards."
  },
  {
    icon: Shield,
    title: "5. Legal Basis for Retention",
    content: "We retain data based on: (a) contractual necessity — to fulfill bookings and provide requested services; (b) legal obligations — under tax law (IRC §6001), financial regulations (SOX, PCI-DSS), and state recordkeeping requirements; (c) legitimate interests — including fraud prevention, security, service improvement, and analytics; (d) your consent — for marketing communications (withdrawable at any time); and (e) defense of legal claims — to establish, exercise, or defend legal rights. You may withdraw consent for consent-based processing at any time without affecting the lawfulness of prior processing."
  },
  {
    icon: Globe,
    title: "6. Cross-Border Data Transfers",
    content: "Your data is primarily stored in the United States. If data is transferred to third-party service providers in other countries, we ensure appropriate safeguards are in place, including: Standard Contractual Clauses (SCCs) approved by relevant authorities, data processing agreements with equivalent protection requirements, adequacy determinations where available, and binding corporate rules for multinational partners. By using ZIVO, you consent to the transfer of your data to the United States and acknowledge that data protection laws may differ from your jurisdiction."
  },
  {
    icon: Lock,
    title: "7. Automated Decision Making & Profiling",
    content: "ZIVO may use automated systems for: fraud detection and prevention, risk scoring for account verification, personalized pricing and recommendations, and content moderation. You have the right to: (a) be informed about automated decision making; (b) request human review of automated decisions that significantly affect you; (c) express your point of view and contest decisions; and (d) opt out of certain profiling activities. Contact privacy@hizivo.com to exercise these rights."
  },
  {
    icon: AlertTriangle,
    title: "8. Data Breach Notification",
    content: "In the event of a data breach affecting your personal information, ZIVO will: (a) notify affected users within 72 hours of confirmed breach discovery via email and in-app notification; (b) notify relevant regulatory authorities as required by law (e.g., state attorneys general per state breach notification laws); (c) provide details about the nature of the breach, data affected, and remedial actions; (d) offer credit monitoring services where appropriate; (e) take immediate steps to contain and remediate the breach; and (f) document the breach for regulatory compliance. We maintain cyber liability insurance to cover breach-related costs."
  },
  {
    icon: Bell,
    title: "9. Government & Law Enforcement Requests",
    content: "ZIVO may be required to disclose retained data in response to: (a) valid court orders and subpoenas; (b) search warrants; (c) national security letters; (d) regulatory investigations; or (e) emergency requests involving imminent danger to life. We will: notify you of government requests unless prohibited by law or court order, narrowly construe all government demands, challenge overly broad or legally deficient requests, and publish an annual transparency report detailing the number and type of government requests received."
  },
  {
    icon: FileText,
    title: "10. Your Data Access Rights",
    content: "You have the right to: (a) request a copy of all personal data we hold about you (data portability); (b) correct inaccurate data; (c) restrict processing of your data in certain circumstances; (d) object to processing based on legitimate interests; (e) request deletion of your data (right to be forgotten, subject to legal retention requirements); and (f) file a complaint with relevant data protection authorities. Requests can be submitted to privacy@hizivo.com and will be processed within 30 days. We may verify your identity before fulfilling requests."
  },
];

export default function DataRetentionPolicy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Data Retention Policy</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-semibold mb-3">
            <Database className="h-3 w-3" /> Data Governance
          </span>
          <h2 className="text-2xl font-bold">Data Retention Policy</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4">
          <p className="text-sm leading-relaxed">This policy explains what personal data ZIVO retains, how long we keep it, how it is secured, and how you can exercise your data rights including requesting deletion.</p>
        </div>
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                {s.content && <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>}
                {s.items && (
                  <div className="space-y-2">
                    {s.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-start gap-2 text-sm">
                        <span className="text-foreground font-medium">{item.label}</span>
                        <span className="text-muted-foreground text-right text-xs">{item.period}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Data Deletion or Access Request</p>
          <p className="text-xs text-muted-foreground">Email <span className="text-primary font-semibold">privacy@hizivo.com</span> or use Account Settings → Delete Account</p>
        </div>
      </div>
    </div>
  );
}