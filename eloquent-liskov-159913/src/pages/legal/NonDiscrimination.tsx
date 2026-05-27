import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle, Lock, Eye, FileText, Scale, Globe, Users, Ban, Heart, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Shield, title: "1. Non-Discrimination Policy", content: "ZIVO IS COMMITTED TO PROVIDING SERVICES FREE FROM DISCRIMINATION. ZIVO does not discriminate against any user on the basis of race, color, national origin, religion, sex, gender identity, sexual orientation, age, disability, marital status, veteran status, genetic information, or any other characteristic protected by applicable federal, state, or local law. This policy applies to all aspects of the Services, including account access, pricing, customer service, and dispute resolution." },
  { icon: Users, title: "2. Service Provider Requirements", content: "All third-party service providers operating through the ZIVO platform (drivers, hosts, restaurant partners, etc.) must comply with applicable non-discrimination laws including: (a) Title II of the Civil Rights Act of 1964; (b) the Americans with Disabilities Act (ADA); (c) the Fair Housing Act; (d) state and local anti-discrimination laws. Service providers who engage in discriminatory conduct will be permanently removed from the platform." },
  { icon: Eye, title: "3. Accessibility Commitment", content: "ZIVO is committed to making our platform accessible to all users, including those with disabilities. We strive to comply with: (a) Web Content Accessibility Guidelines (WCAG) 2.1 Level AA; (b) Section 508 of the Rehabilitation Act; (c) the Americans with Disabilities Act (ADA). If you encounter accessibility barriers, please contact accessibility@hizivo.com." },
  { icon: Heart, title: "4. Inclusive Design", content: "ZIVO designs its platform and services to be inclusive of all users. This includes: (a) providing content in multiple languages where feasible; (b) accommodating assistive technologies; (c) ensuring color contrast meets accessibility standards; (d) providing alternative text for images; (e) ensuring keyboard navigability; (f) supporting screen readers." },
  { icon: AlertTriangle, title: "5. Reporting Discrimination", content: "If you believe you have experienced discrimination while using ZIVO, you may: (a) report the incident through the app; (b) email discrimination@hizivo.com; (c) file a complaint with your local civil rights office; (d) contact the U.S. Department of Justice Civil Rights Division. ZIVO will investigate all reports of discrimination and take appropriate action, including removing offending users or service providers." },
  { icon: Ban, title: "6. Hate Speech & Harassment", content: "ZIVO has zero tolerance for hate speech, harassment, or intimidation based on any protected characteristic. Users who engage in such behavior will be: (a) immediately suspended pending investigation; (b) permanently banned if the behavior is confirmed; (c) reported to law enforcement if the behavior constitutes a hate crime; (d) held liable for any damages caused." },
  { icon: Scale, title: "7. Equal Pricing", content: "ZIVO does not engage in discriminatory pricing. All pricing algorithms are designed to be neutral with respect to protected characteristics. Dynamic pricing is based solely on legitimate factors such as demand, time, distance, and service type. Any user who believes they have experienced discriminatory pricing should report it immediately." },
  { icon: Globe, title: "8. International Non-Discrimination", content: "For users outside the United States, ZIVO complies with applicable local anti-discrimination laws, including but not limited to: (a) the EU Equal Treatment Directives; (b) the UK Equality Act 2010; (c) the Canadian Human Rights Act; and (d) applicable local laws in each jurisdiction where ZIVO operates." },
  { icon: DollarSign, title: "9. Remedies for Discrimination", content: "Users who have experienced discrimination through the ZIVO platform may be entitled to: (a) account credits or refunds; (b) removal of the offending service provider; (c) assistance in filing complaints with regulatory agencies; (d) additional remedies as required by applicable law. ZIVO cooperates fully with civil rights investigations." },
  { icon: Lock, title: "10. Privacy in Discrimination Reports", content: "All discrimination reports are treated confidentially. ZIVO will not retaliate against any user who reports discrimination in good faith. Reporter identity is protected and will only be disclosed as required by law or with the reporter's consent." },
  { icon: FileText, title: "11. Training & Compliance", content: "ZIVO provides anti-discrimination training to all employees and requires service providers to acknowledge non-discrimination policies before using the platform. We regularly review our algorithms, policies, and practices for potential discriminatory impact." },
];

export default function NonDiscrimination() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Non-Discrimination</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold mb-3">
            <Heart className="h-3 w-3" /> Equal Access
          </span>
          <h2 className="text-2xl font-bold">Non-Discrimination & Equal Access Policy</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        {sections.map((s) => { const Icon = s.icon; return (
          <div key={s.title} className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
            <div className="rounded-2xl bg-card border border-border/40 p-4"><p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p></div>
          </div>
        ); })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Report discrimination</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">discrimination@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
