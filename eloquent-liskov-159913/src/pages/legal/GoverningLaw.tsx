import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, MapPin, Globe, Scale, FileText, Gavel, BookOpen, Landmark, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: MapPin, title: "1. Governing Law", content: "These Terms of Service and all related documents, policies, and agreements shall be governed by and construed in accordance with the laws of the State of Delaware, United States of America, without regard to its conflict of law provisions. You agree that the laws of Delaware shall govern these Terms regardless of where you reside, where you access the Services, or where any transaction occurs. The application of the United Nations Convention on Contracts for the International Sale of Goods is expressly excluded." },
  { icon: Landmark, title: "2. Exclusive Jurisdiction & Venue", content: "Any legal action or proceeding arising out of or relating to these Terms or the Services shall be brought exclusively in the federal or state courts located in Wilmington, Delaware. You irrevocably consent to the personal jurisdiction and venue of such courts and waive any objection based on inconvenient forum or lack of jurisdiction. You agree that service of process may be made by certified mail or overnight courier to your last known address." },
  { icon: Globe, title: "3. Choice of Forum", content: "The parties agree that any disputes, claims, or controversies shall be resolved in the courts specified in Section 2 above, and you WAIVE any right to bring proceedings in any other jurisdiction. This includes waiving any right to bring suit in the jurisdiction of your residence, domicile, or the location where any alleged harm occurred, to the maximum extent permitted by applicable law." },
  { icon: Scale, title: "4. Conflict of Laws", content: "In the event of any conflict between the laws of different jurisdictions, the laws of the State of Delaware shall prevail. If any provision of these Terms is found to be unenforceable under the laws of a particular jurisdiction, that provision shall be modified to the minimum extent necessary to make it enforceable, and all other provisions shall remain in full force and effect. The invalidity of a provision in one jurisdiction does not affect its validity in other jurisdictions." },
  { icon: Gavel, title: "5. Waiver of Jury Trial", content: "TO THE FULLEST EXTENT PERMITTED BY LAW, YOU AND ZIVO EACH IRREVOCABLY WAIVE THE RIGHT TO A TRIAL BY JURY IN ANY LEGAL PROCEEDING ARISING OUT OF OR RELATING TO THESE TERMS, THE SERVICES, OR ANY TRANSACTION CONDUCTED THROUGH THE PLATFORM. This waiver applies to all claims whether in contract, tort, equity, or otherwise. You acknowledge that this waiver is knowing, voluntary, and made after consultation with (or the opportunity to consult with) legal counsel." },
  { icon: Shield, title: "6. Sovereign Immunity Waiver", content: "If you are a government entity or agent, you waive any sovereign immunity defense to the fullest extent permitted by law with respect to any claims or disputes arising under these Terms. You agree that these Terms constitute a valid and binding contract and that you have the authority to enter into this agreement." },
  { icon: Flag, title: "7. International Users", content: "If you access the Services from outside the United States, you do so at your own risk and are responsible for compliance with all local laws. ZIVO makes no representation that the Services are appropriate or available for use outside the United States. These Terms shall be interpreted according to U.S. law regardless of your location. Any translation of these Terms is provided for convenience only; the English version shall control in the event of any conflict." },
  { icon: FileText, title: "8. Legal Notices & Service of Process", content: "All legal notices to ZIVO must be sent to: ZIVO LLC, Legal Department, legal@hizivo.com. Notices sent by email are deemed received on the business day following transmission. Notices sent by certified mail are deemed received five (5) business days after mailing. You agree to accept service of process at the email address associated with your account. ZIVO may provide legal notices to you via email, in-app notification, or posting on the platform." },
  { icon: BookOpen, title: "9. Compliance with Local Laws", content: "You are solely responsible for compliance with all applicable local, state, national, and international laws, regulations, and rules in connection with your use of the Services. This includes but is not limited to: tax obligations, import/export regulations, sanctions compliance, consumer protection laws, data privacy laws, and any industry-specific regulations that may apply to your use of services obtained through ZIVO." },
  { icon: Landmark, title: "10. Enforcement & Remedies", content: "ZIVO's failure to enforce any provision of these Terms shall not constitute a waiver of that provision or any other provision. ZIVO reserves the right to enforce these Terms at any time, even if enforcement was previously delayed or waived. All remedies available to ZIVO under these Terms are cumulative and not exclusive of any other remedies available at law or in equity." },
];

export default function GoverningLaw() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Governing Law & Jurisdiction</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold mb-3">
            <Gavel className="h-3 w-3" /> Jurisdictional Framework
          </span>
          <h2 className="text-2xl font-bold">Governing Law & Jurisdiction</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
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
