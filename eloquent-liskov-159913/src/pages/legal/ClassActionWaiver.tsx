import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Users, Ban, AlertTriangle, Gavel, Scale, Eye, DollarSign, Globe, Lock, Siren, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Users, title: "1. Class Action Waiver", content: "YOU AND ZIVO AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, REPRESENTATIVE, OR MULTI-PARTY ACTION. By using the Services, you waive any right to participate in a class action lawsuit, class-wide arbitration, or any other representative proceeding against ZIVO. This waiver applies to all claims whether arising under contract, tort, statute, or any other legal theory." },
  { icon: Ban, title: "2. No Representative Actions", content: "You may not bring any claim as a private attorney general or in any other representative capacity. You waive any right to bring claims on behalf of other users, the general public, or any group of individuals. Each user must bring their own individual claim. No arbitrator or court may consolidate more than one person's claims or otherwise preside over any representative or class proceeding." },
  { icon: AlertTriangle, title: "3. Mass Arbitration Limitations", content: "To prevent abuse of the arbitration process, you agree that: (a) claims must be filed individually, not as part of a coordinated mass filing; (b) if 25 or more similar claims are filed simultaneously, they shall be subject to a bellwether process where a randomly selected subset of claims are arbitrated first; (c) the results of bellwether arbitrations may be used to resolve remaining claims; (d) ZIVO reserves the right to seek a court order staying mass filings pending bellwether resolution." },
  { icon: DollarSign, title: "4. No Aggregation of Damages", content: "You agree that damages cannot be aggregated across multiple users or claims. Each claim is limited to the individual liability cap set forth in the Limitation of Liability. The total damages available in any single proceeding are subject to the $100 aggregate cap regardless of how many claims are asserted. You may not combine your claim with the claims of others to circumvent liability caps." },
  { icon: Gavel, title: "5. Jury Trial Waiver", content: "TO THE FULLEST EXTENT PERMITTED BY LAW, YOU IRREVOCABLY WAIVE YOUR RIGHT TO A TRIAL BY JURY IN ANY LEGAL PROCEEDING ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICES. This waiver applies whether the proceeding is in court (if the arbitration clause is found unenforceable) or in any other forum. You acknowledge that you are making this waiver knowingly, voluntarily, and with full understanding of its consequences." },
  { icon: Scale, title: "6. Severability", content: "If any part of this Class Action & Jury Trial Waiver is found to be unenforceable as to a particular claim or type of relief, then that particular claim or type of relief (and only that claim or relief) must be severed from the waiver and may be brought in court. All remaining claims must still be arbitrated individually. If the class action waiver as a whole is found unenforceable, then the entire dispute resolution section shall be null and void, and disputes shall proceed in court subject to all other terms." },
  { icon: Eye, title: "7. Opt-Out Right", content: "You may opt out of this Class Action & Jury Trial Waiver by sending written notice to legal@hizivo.com within thirty (30) days of first accepting these Terms. The notice must include: (a) your full name; (b) your email address associated with your ZIVO account; (c) a clear statement that you wish to opt out. If you opt out, you may still be bound by any prior class action waiver you agreed to. Opting out does not affect any other provisions of these Terms." },
  { icon: Globe, title: "8. Scope of Waiver", content: "This waiver applies to all claims arising out of or relating to: (a) these Terms; (b) the Services; (c) your use of the platform; (d) any transaction conducted through ZIVO; (e) any communication from ZIVO; (f) any advertising or marketing by ZIVO; (g) your relationship with ZIVO; and (h) the formation, validity, or enforceability of these Terms, including this waiver itself." },
  { icon: Lock, title: "9. Acknowledgment", content: "YOU ACKNOWLEDGE THAT YOU HAVE READ THIS CLASS ACTION AND JURY TRIAL WAIVER, UNDERSTAND ITS IMPLICATIONS, AND AGREE TO BE BOUND BY IT. You understand that by agreeing to this waiver, you are giving up substantial legal rights, including the right to participate in group litigation and the right to a jury trial. You have had the opportunity to consult with an attorney before accepting these terms." },
  { icon: Siren, title: "10. Exceptions", content: "Notwithstanding the foregoing, nothing in this waiver prevents you from: (a) filing an individual complaint with the FTC, CFPB, or applicable state attorney general; (b) seeking individual injunctive relief in small claims court for claims within that court's jurisdiction; (c) bringing claims that cannot be waived by law. However, you may not seek class-wide relief through any government agency complaint." },
  { icon: FileText, title: "11. Survival", content: "This Class Action & Jury Trial Waiver survives: (a) termination of your account; (b) termination of the Services; (c) any modification to these Terms (unless the modification specifically revokes this waiver); (d) bankruptcy or dissolution of ZIVO; and (e) any transfer or assignment of these Terms." },
];

export default function ClassActionWaiver() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Class Action & Jury Waiver</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-semibold mb-3">
            <Gavel className="h-3 w-3" /> Critical Legal Waiver
          </span>
          <h2 className="text-2xl font-bold">Class Action & Jury Trial Waiver</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4">
          <p className="text-sm leading-relaxed font-medium">BY USING ZIVO, YOU WAIVE YOUR RIGHT TO PARTICIPATE IN CLASS ACTIONS AND YOUR RIGHT TO A JURY TRIAL. READ THIS SECTION CAREFULLY.</p>
        </div>
        {sections.map((s) => { const Icon = s.icon; return (
          <div key={s.title} className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
            <div className="rounded-2xl bg-card border border-border/40 p-4"><p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p></div>
          </div>
        ); })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Legal questions?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">legal@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
