import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Users, Scale, AlertTriangle, FileText, Gavel, Globe, DollarSign, Bell, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: Shield,
    title: "1. Your Indemnification Obligation",
    content: "You agree to indemnify, defend, and hold harmless ZIVO LLC, its parent company, subsidiaries, affiliates, officers, directors, employees, agents, licensors, and suppliers (collectively, the 'ZIVO Parties') from and against any and all claims, liabilities, damages, judgments, awards, losses, costs, expenses, and fees (including reasonable attorneys' fees) arising out of or relating to your: (a) use or misuse of the Services; (b) violation of these Terms or any applicable law; (c) violation of any rights of a third party; (d) User Content you submit or transmit; (e) any activity under your account; (f) negligent or willful misconduct; and (g) failure to comply with any representation or warranty made by you."
  },
  {
    icon: Users,
    title: "2. Third-Party Claims",
    content: "You shall indemnify the ZIVO Parties against any claims brought by third parties resulting from: (a) your interactions with drivers, restaurants, hotels, airlines, or car owners; (b) accidents, injuries, or property damage arising from services accessed through the platform; (c) disputes with other users or service providers; (d) your failure to comply with applicable travel regulations, visa requirements, or local laws; (e) your provision of false, misleading, or inaccurate information; (f) your violation of any third party's privacy or data protection rights; (g) damage to third-party property while using rental vehicles; and (h) any claims by passengers, co-travelers, or guests related to bookings made through your account."
  },
  {
    icon: Scale,
    title: "3. Intellectual Property Claims",
    content: "You agree to indemnify ZIVO against any claims that User Content you submit infringes upon or violates the intellectual property rights, privacy rights, publicity rights, or other rights of any third party. This includes content you post in reviews, profiles, stories, comments, or any other user-generated content feature. You represent and warrant that you own or have all necessary licenses, rights, consents, and permissions to submit such content."
  },
  {
    icon: AlertTriangle,
    title: "4. Scope of Indemnification",
    content: "Your indemnification obligation includes: (a) all damages awarded in any proceeding; (b) settlement amounts approved by ZIVO; (c) reasonable attorneys' fees and expert witness fees; (d) court costs and litigation expenses; (e) costs of investigation and pre-litigation work; (f) interest on any of the foregoing; (g) costs of enforcement of this indemnification provision; (h) any fines or penalties imposed by governmental or regulatory bodies. This indemnification obligation survives the termination of your account and these Terms indefinitely."
  },
  {
    icon: FileText,
    title: "5. Defense and Control",
    content: "ZIVO reserves the right, at its own expense, to assume the exclusive defense and control of any matter subject to your indemnification. You agree to cooperate fully with ZIVO in asserting any available defenses. You shall not settle any claim without ZIVO's prior written consent. If ZIVO elects not to assume defense, you shall defend the claim with counsel reasonably acceptable to ZIVO and shall not admit liability or consent to any judgment without ZIVO's prior written approval."
  },
  {
    icon: DollarSign,
    title: "6. Tax & Regulatory Liability",
    content: "You agree to indemnify ZIVO for any tax liabilities, penalties, or assessments arising from your use of the Services, including but not limited to: (a) sales, use, or value-added taxes on services you receive; (b) income taxes on earnings from services provided through the platform; (c) penalties for failure to report income; (d) customs duties or import/export taxes; (e) any regulatory fines resulting from your failure to obtain required licenses or permits. You are solely responsible for your own tax obligations."
  },
  {
    icon: Globe,
    title: "7. Government & Regulatory Claims",
    content: "You shall indemnify and hold harmless the ZIVO Parties from and against any claims, investigations, inquiries, or enforcement actions by any government or regulatory body arising from: (a) your violation of any law, regulation, or ordinance; (b) your failure to maintain required licenses, permits, or registrations; (c) your violation of consumer protection, anti-discrimination, or employment laws; (d) environmental damage or violations; and (e) any violations of sanctions, export controls, or anti-money laundering regulations."
  },
  {
    icon: Bell,
    title: "8. Notice of Claims",
    content: "ZIVO will provide you with prompt written notice of any claim for which indemnification is sought, provided that failure to provide timely notice shall not relieve you of your indemnification obligations except to the extent you are materially prejudiced by such delay. You must respond to any indemnification notice within ten (10) business days with your proposed course of action."
  },
  {
    icon: Lock,
    title: "9. Insurance Recommendation",
    content: "ZIVO strongly recommends that you maintain adequate insurance coverage for activities conducted through the platform, including but not limited to: personal liability insurance, travel insurance, rental car insurance, and health insurance. Your failure to maintain adequate insurance does not diminish your indemnification obligations under these Terms."
  },
  {
    icon: Gavel,
    title: "10. No Limitation on Other Remedies",
    content: "The indemnification obligations set forth herein are in addition to, and not in lieu of, any other remedies available to ZIVO under law or equity. ZIVO's failure to exercise or enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. ZIVO may seek injunctive or other equitable relief in addition to indemnification where appropriate. These indemnification provisions are intended to be enforceable to the fullest extent permitted by applicable law."
  },
];

export default function IndemnificationPolicy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Indemnification</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-semibold mb-3">
            <Shield className="h-3 w-3" /> Legal Protection
          </span>
          <h2 className="text-2xl font-bold">Indemnification Agreement</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4">
          <p className="text-sm leading-relaxed font-medium">BY USING ZIVO, YOU AGREE TO INDEMNIFY AND HOLD HARMLESS ZIVO AND ITS AFFILIATES FROM ANY AND ALL CLAIMS ARISING FROM YOUR USE OF THE PLATFORM. THIS IS A LEGALLY BINDING OBLIGATION.</p>
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
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Legal questions?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">legal@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}