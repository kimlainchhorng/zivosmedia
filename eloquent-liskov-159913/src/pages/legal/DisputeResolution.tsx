import { useNavigate } from "react-router-dom";
import { ArrowLeft, Scale, MessageSquare, Gavel, Clock, Users, FileText, Shield, Ban, AlertTriangle, Lock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: MessageSquare,
    title: "1. Informal Resolution First",
    content: "Before initiating formal proceedings, you MUST first attempt to resolve the dispute informally by contacting us at support@hizivo.com with a detailed description of your concern. We commit to responding within 5 business days and working toward a fair resolution within 30 days. You agree not to file any arbitration claim or court action until this 30-day informal resolution period has expired. Most disputes can be resolved through direct communication."
  },
  {
    icon: Scale,
    title: "2. Binding Arbitration Agreement",
    content: "IF INFORMAL RESOLUTION FAILS, YOU AND ZIVO AGREE THAT ALL DISPUTES SHALL BE RESOLVED THROUGH FINAL AND BINDING INDIVIDUAL ARBITRATION, RATHER THAN IN COURT. Arbitration will be administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. Arbitration will be conducted in English, in the county of the user's residence (or remotely via video conference at ZIVO's discretion). The arbitrator shall apply the substantive law of the State of Delaware. The arbitrator's decision is final, binding, and enforceable in any court of competent jurisdiction. BY AGREEING TO ARBITRATION, YOU ARE WAIVING YOUR RIGHT TO A JURY TRIAL."
  },
  {
    icon: Gavel,
    title: "3. Class Action & Collective Action Waiver",
    content: "YOU AND ZIVO AGREE THAT ALL DISPUTES WILL BE RESOLVED ON AN INDIVIDUAL BASIS ONLY. YOU WAIVE ANY RIGHT TO: (a) participate in a class action lawsuit against ZIVO; (b) participate in class-wide or collective arbitration; (c) act as a private attorney general; (d) participate in any representative action; (e) consolidate your claims with those of other individuals; or (f) participate in any joint or multi-party proceeding. This waiver applies to all claims, regardless of legal theory. If this class action waiver is found to be unenforceable, the entire arbitration agreement shall be void."
  },
  {
    icon: Clock,
    title: "4. Time Limitation on Claims",
    content: "ANY CLAIM OR DISPUTE MUST BE FILED WITHIN ONE (1) YEAR AFTER THE CAUSE OF ACTION ARISES. Claims filed after this period will be PERMANENTLY BARRED. This limitation applies to all claims, regardless of the legal theory (contract, tort, statutory, or otherwise). The one-year period begins when you knew or should have known of the facts giving rise to the claim. This limitation supersedes any longer statute of limitations that might otherwise apply."
  },
  {
    icon: Users,
    title: "5. Small Claims Court Exception",
    content: "Notwithstanding the arbitration agreement, either party may bring an individual action in small claims court for disputes within the court's jurisdictional limits ($10,000 or less in most jurisdictions). If the claim exceeds small claims limits, it must proceed to binding arbitration. The small claims exception is only available for individual claims — not class actions, representative actions, or collective proceedings."
  },
  {
    icon: DollarSign,
    title: "6. Arbitration Costs & Fees",
    content: "ZIVO will pay all AAA filing fees and arbitrator fees for claims of $10,000 or less. For claims exceeding $10,000, costs will be allocated as determined by the AAA Consumer Arbitration Rules. Each party shall bear its own attorneys' fees unless the arbitrator awards fees to the prevailing party as permitted by applicable law. If the arbitrator finds that the substance of your claim or the relief sought was frivolous or brought for an improper purpose, you agree to reimburse ZIVO for all fees and costs, including reasonable attorneys' fees."
  },
  {
    icon: Shield,
    title: "7. Injunctive Relief Exception",
    content: "Notwithstanding the arbitration agreement, either party may seek temporary injunctive relief, preliminary injunctions, or other equitable relief in any court of competent jurisdiction to prevent irreparable harm pending the outcome of arbitration. Such action does not waive either party's right to arbitrate. ZIVO may seek injunctive relief without posting a bond to protect its intellectual property, confidential information, or platform integrity."
  },
  {
    icon: Ban,
    title: "8. Mass Arbitration Procedures",
    content: "If 25 or more claimants submit demands for arbitration raising similar claims, those claims shall be deemed a 'Mass Filing.' In the event of a Mass Filing: (a) only 10 claims at a time will be arbitrated in a bellwether process; (b) remaining claims will be stayed pending resolution; (c) the parties will attempt to negotiate a global resolution; (d) if no resolution is reached, remaining claims will proceed in batches of 10. This process is designed to ensure fair and efficient resolution while preventing abuse of the arbitration system."
  },
  {
    icon: Lock,
    title: "9. Confidentiality of Proceedings",
    content: "All arbitration proceedings, including filings, evidence, testimony, and the arbitrator's decision, shall be kept strictly confidential. Neither party may disclose the existence or content of arbitration proceedings to any third party except: (a) as required by law or court order; (b) to enforce the arbitration award; (c) to legal counsel or financial advisors bound by confidentiality obligations; or (d) as necessary in connection with a judicial challenge to the arbitration award."
  },
  {
    icon: FileText,
    title: "10. Governing Law & Jurisdiction",
    content: "These Terms and any disputes are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. For matters not subject to arbitration, exclusive jurisdiction lies with the state and federal courts located in Wilmington, Delaware. You consent to personal jurisdiction in Delaware and waive any objection based on forum non conveniens. The United Nations Convention on Contracts for the International Sale of Goods does not apply."
  },
  {
    icon: AlertTriangle,
    title: "11. 30-Day Opt-Out Right",
    content: "You may opt out of the arbitration agreement by sending written notice to legal@hizivo.com within 30 DAYS of first accepting these Terms. Your opt-out notice must include your full name, email address, mailing address, and a clear statement that you wish to opt out of the arbitration agreement. If you opt out, all other provisions of these Terms remain in full force and effect. Opting out of arbitration does not affect the class action waiver or the time limitation on claims."
  },
  {
    icon: Gavel,
    title: "12. Severability & Survival",
    content: "If any provision of this Dispute Resolution section is found to be unenforceable, the remaining provisions shall continue in full force and effect. If the class action waiver (Section 3) is found unenforceable, the entire arbitration agreement shall be null and void (but the remaining Terms shall survive). This Dispute Resolution section survives the termination of your account and your relationship with ZIVO. Any dispute arising after termination shall still be subject to these provisions."
  },
];

export default function DisputeResolution() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Dispute Resolution</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold mb-3">
            <Scale className="h-3 w-3" /> Mandatory Arbitration
          </span>
          <h2 className="text-2xl font-bold">Dispute Resolution & Arbitration</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4">
          <p className="text-sm leading-relaxed font-medium">THIS SECTION CONTAINS A BINDING ARBITRATION AGREEMENT AND CLASS ACTION WAIVER. IT AFFECTS YOUR LEGAL RIGHTS. BY USING ZIVO, YOU AGREE TO RESOLVE DISPUTES THROUGH INDIVIDUAL BINDING ARBITRATION AND WAIVE YOUR RIGHT TO A JURY TRIAL AND CLASS ACTION PARTICIPATION.</p>
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
          <p className="text-sm font-semibold">Have a Dispute?</p>
          <p className="text-xs text-muted-foreground">Start with <span className="text-primary font-semibold">support@hizivo.com</span> — we'll try to resolve it informally first</p>
        </div>
      </div>
    </div>
  );
}