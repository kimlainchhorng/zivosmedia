import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, FileText, Bell, Clock, Gavel, Scale, RefreshCw, BookOpen, Eye, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Shield, title: "1. Right to Modify", content: "ZIVO RESERVES THE RIGHT, IN ITS SOLE AND ABSOLUTE DISCRETION, TO MODIFY, AMEND, UPDATE, OR REPLACE ANY PART OF THESE TERMS OF SERVICE AND ALL RELATED POLICIES AT ANY TIME WITHOUT PRIOR NOTICE. This includes the right to: (a) add new terms or conditions; (b) remove existing terms; (c) change pricing, fees, or charges; (d) modify service descriptions; (e) alter dispute resolution procedures; (f) update privacy practices; (g) change any other aspect of the agreement between you and ZIVO." },
  { icon: Bell, title: "2. Notice of Changes", content: "ZIVO will make reasonable efforts to notify you of material changes by: (a) posting the updated terms on the platform; (b) updating the 'Last Modified' date; (c) sending an email notification for significant changes; (d) displaying an in-app banner or notification. However, FAILURE TO PROVIDE NOTICE DOES NOT INVALIDATE ANY CHANGES. It is your sole responsibility to check the Terms periodically for updates." },
  { icon: Clock, title: "3. Effective Date of Changes", content: "Changes to these Terms take effect immediately upon posting unless otherwise specified. For material changes, ZIVO may provide a notice period of up to 30 days. If you do not agree with the modified terms, your sole remedy is to stop using the Services and close your account before the changes take effect. CONTINUED USE OF THE SERVICES AFTER CHANGES ARE POSTED CONSTITUTES YOUR ACCEPTANCE OF THE MODIFIED TERMS." },
  { icon: RefreshCw, title: "4. Deemed Acceptance", content: "Your continued use of the Services following any modification constitutes your binding acceptance of the modified Terms. You waive any right to receive specific notice of each change. By using the Services, you agree to be bound by the then-current version of these Terms, including all modifications made since you last reviewed them." },
  { icon: Eye, title: "5. Duty to Review", content: "YOU HAVE AN AFFIRMATIVE DUTY TO REVIEW THESE TERMS REGULARLY. ZIVO recommends reviewing the Terms at least once per month. Failure to review the Terms does not excuse compliance with modified provisions. You may not claim that you were unaware of changes as a defense to enforcement of the current Terms." },
  { icon: FileText, title: "6. Version History", content: "ZIVO maintains a record of all material changes to these Terms. The current version date is displayed at the top of each policy page. Previous versions may be available upon request by contacting legal@hizivo.com. However, ZIVO is not obligated to maintain or provide access to historical versions of the Terms." },
  { icon: Scale, title: "7. Retroactive Application", content: "Unless otherwise stated, modifications to these Terms apply prospectively only and do not retroactively alter the terms that governed any transaction completed before the modification. However, procedural modifications (including changes to dispute resolution, arbitration, or limitation periods) may apply to existing disputes to the extent permitted by law." },
  { icon: Gavel, title: "8. Severability of Modifications", content: "If any modification is found to be unenforceable, the prior version of that provision shall apply, and all other modifications shall remain in effect. The unenforceability of one modification does not affect the enforceability of other modifications or of the Terms as a whole." },
  { icon: Lock, title: "9. No Oral Modifications", content: "These Terms may only be modified through written changes posted on the ZIVO platform or sent via official ZIVO communications. No employee, agent, representative, or customer service representative of ZIVO has the authority to modify these Terms orally. Any oral statements contradicting these Terms are not binding on ZIVO." },
  { icon: AlertTriangle, title: "10. Material Change Examples", content: "Examples of material changes that may warrant enhanced notice include but are not limited to: (a) changes to the liability cap; (b) changes to the dispute resolution or arbitration process; (c) changes to data privacy practices; (d) introduction of new fees; (e) changes to refund policies; (f) changes to age restrictions. ZIVO determines what constitutes a 'material change' in its sole discretion." },
  { icon: BookOpen, title: "11. Entire Agreement", content: "These Terms, together with the Privacy Policy, all legal policies linked from the Account Settings page, and any supplemental terms for specific services, constitute the entire agreement between you and ZIVO. This agreement supersedes all prior agreements, representations, warranties, and understandings, whether written, oral, or implied. No course of dealing or usage of trade shall modify these Terms." },
];

export default function ModificationOfTerms() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Modification of Terms</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-semibold mb-3">
            <RefreshCw className="h-3 w-3" /> Terms Updates
          </span>
          <h2 className="text-2xl font-bold">Modification of Terms</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        {sections.map((s) => { const Icon = s.icon; return (
          <div key={s.title} className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
            <div className="rounded-2xl bg-card border border-border/40 p-4"><p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p></div>
          </div>
        ); })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Questions about changes?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">legal@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
