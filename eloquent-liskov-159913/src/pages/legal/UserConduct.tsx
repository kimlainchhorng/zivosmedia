import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Ban, AlertTriangle, UserX, Lock, Eye, Scale, Gavel, Globe, Smartphone, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Shield, title: "1. Expected User Conduct", content: "By using ZIVO, you agree to conduct yourself in a lawful, respectful, and responsible manner at all times. You are solely responsible for all activity that occurs under your account. You agree to use the Services only for lawful purposes and in accordance with these Terms, all applicable laws, and commonly accepted practices of the internet community." },
  { icon: Ban, title: "2. Prohibited Activities — General", content: "You agree NOT to: (a) use the Services for any unlawful purpose; (b) violate any applicable law, regulation, or ordinance; (c) infringe upon the rights of others; (d) engage in any activity that is harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable; (e) impersonate any person or entity; (f) provide false, misleading, or inaccurate information; (g) interfere with or disrupt the Services; (h) attempt to gain unauthorized access to any part of the Services." },
  { icon: AlertTriangle, title: "3. Prohibited Activities — Technical", content: "You agree NOT to: (a) use automated scripts, bots, scrapers, or crawlers; (b) reverse engineer, decompile, or disassemble the platform; (c) attempt to probe, scan, or test the vulnerability of the system; (d) circumvent any security or authentication measures; (e) use the platform to transmit malware, viruses, or harmful code; (f) overload, flood, or spam the Services; (g) harvest or collect user data without consent; (h) use the platform for competitive intelligence." },
  { icon: UserX, title: "4. Prohibited Activities — Commercial", content: "You agree NOT to: (a) resell or commercially exploit the Services without authorization; (b) use the Services to operate a competing business; (c) use the platform for unauthorized advertising or solicitation; (d) engage in price manipulation or fare gaming; (e) abuse promotional offers, coupons, or loyalty programs; (f) create multiple accounts to exploit benefits; (g) engage in ticket scalping or fare arbitrage; (h) use the platform for any fraudulent scheme." },
  { icon: Lock, title: "5. Account Security Obligations", content: "You are responsible for: (a) maintaining the confidentiality of your account credentials; (b) restricting access to your device and account; (c) immediately notifying ZIVO of unauthorized access; (d) using strong, unique passwords; (e) enabling two-factor authentication when available; (f) not sharing your account with others; (g) logging out from shared devices. You are liable for all activities under your account regardless of whether you authorized them." },
  { icon: Eye, title: "6. Content Standards", content: "Any content you submit to the platform (reviews, photos, messages, feedback) must: (a) be accurate and not misleading; (b) not infringe any third-party rights; (c) not contain illegal, threatening, or harmful material; (d) not contain personally identifiable information of others; (e) not include spam, advertising, or promotional content; (f) not contain discriminatory, racist, or hateful content; (g) comply with all applicable laws." },
  { icon: Scale, title: "7. Interaction with Service Providers", content: "When interacting with third-party service providers through ZIVO, you agree to: (a) treat drivers, delivery personnel, hotel staff, and other service providers with respect; (b) not engage in discrimination, harassment, or abuse; (c) comply with all applicable laws during service interactions; (d) not request or encourage service providers to violate laws or their terms of engagement; (e) not make fraudulent claims against service providers." },
  { icon: Gavel, title: "8. Consequences of Violations", content: "Violation of this User Conduct Policy may result in: (a) warning and notice; (b) temporary account suspension; (c) permanent account termination; (d) forfeiture of rewards, points, or credits; (e) restriction from creating new accounts; (f) reporting to law enforcement; (g) civil legal action including damages and injunctive relief; (h) criminal prosecution where applicable. ZIVO determines violations in its sole discretion and is not required to provide specific evidence." },
  { icon: Globe, title: "9. Reporting Violations", content: "If you become aware of any violation of these conduct standards, you may report it to support@hizivo.com. ZIVO will investigate reports at its discretion but is not obligated to take action or inform you of the outcome. You agree not to make false or frivolous reports." },
  { icon: Smartphone, title: "10. Platform Integrity", content: "You agree not to take any action that could undermine the integrity, security, or proper functioning of the platform. This includes not manipulating search results, ratings, reviews, or prices; not engaging in coordinated inauthentic behavior; and not exploiting bugs or vulnerabilities (which must be reported to security@hizivo.com)." },
  { icon: MessageSquare, title: "11. Communication Standards", content: "All communications through the platform must be respectful and professional. You agree not to: (a) send unsolicited messages; (b) use threatening or abusive language; (c) share inappropriate content; (d) attempt to contact service providers outside the platform to circumvent ZIVO; (e) make false complaints or reviews as retaliation." },
  { icon: FileText, title: "12. Compliance Certification", content: "By using the Services, you certify that: (a) you have read and understood this User Conduct Policy; (b) you agree to comply with all provisions; (c) you understand the consequences of violations; (d) you will report known violations; (e) you accept ZIVO's authority to enforce this policy at its discretion." },
];

export default function UserConduct() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">User Conduct Policy</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-3">
            <Shield className="h-3 w-3" /> Platform Rules
          </span>
          <h2 className="text-2xl font-bold">User Conduct & Prohibited Activities</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        {sections.map((s) => { const Icon = s.icon; return (
          <div key={s.title} className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
            <div className="rounded-2xl bg-card border border-border/40 p-4"><p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p></div>
          </div>
        ); })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Report a violation?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">support@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
