import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, UserX, AlertTriangle, Clock, Ban, Lock, FileText, Database, Undo2, Bell, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Shield, title: "1. Right to Terminate", content: "ZIVO RESERVES THE ABSOLUTE AND UNCONDITIONAL RIGHT TO SUSPEND, RESTRICT, OR PERMANENTLY TERMINATE YOUR ACCOUNT AT ANY TIME, FOR ANY REASON OR NO REASON, WITH OR WITHOUT NOTICE. This includes but is not limited to violations of these Terms, suspected fraud, legal requirements, business decisions, or at ZIVO's sole discretion. You acknowledge that ZIVO is under no obligation to continue providing services to any user." },
  { icon: AlertTriangle, title: "2. Grounds for Immediate Termination", content: "Your account may be immediately terminated without prior notice for: (a) violating any provision of these Terms; (b) engaging in fraudulent activity; (c) providing false identity information; (d) being under 18 years of age; (e) threatening, harassing, or abusing ZIVO employees or service providers; (f) attempting to circumvent security measures; (g) using the platform for illegal purposes; (h) initiating excessive chargebacks; (i) creating multiple accounts; (j) engaging in price manipulation or exploitation; (k) violating any applicable law or regulation; (l) court order or legal requirement." },
  { icon: UserX, title: "3. Effect of Termination", content: "Upon termination of your account: (a) your right to access the Services immediately ceases; (b) any pending bookings may be cancelled without refund; (c) loyalty points, rewards, and credits are forfeited; (d) gift card balances may be forfeited if termination is for cause; (e) you remain liable for all charges incurred before termination; (f) ZIVO may retain your data as required by law or business needs; (g) any licenses granted to you are immediately revoked; (h) you must immediately cease all use of ZIVO's intellectual property." },
  { icon: Ban, title: "4. Permanent Bans", content: "Users who are permanently banned may not create new accounts, use the Services under another person's account, or access the platform through any means. Circumventing a ban constitutes trespass and may result in legal action. ZIVO reserves the right to use technical measures including IP blocking, device fingerprinting, and identity verification to enforce bans." },
  { icon: Clock, title: "5. Account Suspension", content: "ZIVO may temporarily suspend your account pending investigation for: (a) suspected Terms violations; (b) unusual account activity; (c) security concerns; (d) payment disputes; (e) identity verification; (f) compliance reviews. During suspension, you may not access the Services, and pending transactions may be held. ZIVO is not liable for any losses during the suspension period." },
  { icon: Database, title: "6. Data After Termination", content: "Following account termination, ZIVO will handle your data according to our Data Retention Policy and applicable law. You may request a copy of your personal data before account closure. After termination, ZIVO may retain certain data for: (a) legal compliance; (b) fraud prevention; (c) dispute resolution; (d) enforcing Terms; (e) backup and archival purposes. Anonymized data may be retained indefinitely for analytics." },
  { icon: Lock, title: "7. Voluntary Account Deletion", content: "You may request account deletion at any time through the Settings page. Voluntary deletion requests are subject to a 30-day cooling-off period during which you may cancel the request. After the cooling-off period, your account will be permanently deleted, subject to data retention requirements. You must settle all outstanding charges before account deletion." },
  { icon: Undo2, title: "8. No Right to Reinstatement", content: "If your account is terminated by ZIVO, you have NO RIGHT to reinstatement, appeal, or review. ZIVO's decision to terminate an account is final and not subject to challenge. ZIVO is under no obligation to explain the reasons for termination. You waive any right to a hearing, review, or appeal process regarding account termination." },
  { icon: FileText, title: "9. Surviving Obligations", content: "The following obligations survive account termination: (a) all payment obligations for services already rendered; (b) indemnification obligations; (c) limitation of liability provisions; (d) dispute resolution and arbitration agreements; (e) intellectual property restrictions; (f) confidentiality obligations; (g) any other provisions that by their nature should survive." },
  { icon: Bell, title: "10. Notice of Termination", content: "Where practicable, ZIVO will provide notice of termination via email to your registered address. However, failure to provide notice does not affect the validity of termination. You are responsible for maintaining a current email address. ZIVO is not liable for notices sent to outdated email addresses." },
  { icon: Gavel, title: "11. Legal Consequences", content: "Account termination does not limit ZIVO's right to pursue legal remedies for violations of these Terms, including but not limited to: monetary damages, injunctive relief, reporting to law enforcement, and cooperation with regulatory investigations. Termination is without prejudice to any other rights or remedies ZIVO may have." },
];

export default function AccountTermination() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Account Termination</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-semibold mb-3">
            <UserX className="h-3 w-3" /> Account Management
          </span>
          <h2 className="text-2xl font-bold">Account Termination Policy</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        {sections.map((s) => { const Icon = s.icon; return (
          <div key={s.title} className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
            <div className="rounded-2xl bg-card border border-border/40 p-4"><p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p></div>
          </div>
        ); })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Account questions?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">support@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
