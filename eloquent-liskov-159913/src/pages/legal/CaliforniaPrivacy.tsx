import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Eye, EyeOff, Globe, Lock, FileText, Ban, UserX, Bell, Scale, Database, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Shield, title: "1. CCPA Rights Overview", content: "Under the California Consumer Privacy Act (CCPA) as amended by the California Privacy Rights Act (CPRA), California residents have specific rights regarding their personal information. This policy supplements our Privacy Policy and applies solely to residents of the State of California. ZIVO respects your privacy rights and is committed to transparency in data practices." },
  { icon: Eye, title: "2. Right to Know", content: "You have the right to request that ZIVO disclose: (a) the categories of personal information collected; (b) the specific pieces of personal information collected; (c) the categories of sources from which personal information is collected; (d) the business or commercial purpose for collecting or selling personal information; (e) the categories of third parties with whom personal information is shared; (f) the categories of personal information sold or disclosed for a business purpose." },
  { icon: Ban, title: "3. Right to Delete", content: "You have the right to request deletion of personal information collected from you, subject to exceptions including: (a) completing transactions; (b) detecting security incidents; (c) debugging; (d) exercising free speech rights; (e) compliance with legal obligations; (f) internal uses reasonably aligned with consumer expectations; (g) other internal and lawful uses compatible with the context in which you provided the information." },
  { icon: EyeOff, title: "4. Right to Opt-Out of Sale/Sharing", content: "You have the right to opt out of the 'sale' or 'sharing' of your personal information. While ZIVO does not sell personal information in the traditional sense, certain data sharing with advertising partners may constitute a 'sale' under CCPA. To opt out, visit our 'Do Not Sell My Personal Information' page or contact privacy@hizivo.com." },
  { icon: Lock, title: "5. Right to Correct", content: "You have the right to request that ZIVO correct inaccurate personal information. Upon receiving a verified request, ZIVO will use commercially reasonable efforts to correct the information. You may submit correction requests through your account settings or by contacting privacy@hizivo.com." },
  { icon: UserX, title: "6. Right to Limit Use of Sensitive Information", content: "You have the right to limit the use and disclosure of sensitive personal information (including precise geolocation, racial/ethnic origin, social security numbers, and financial account information) to uses necessary to perform the services or as permitted by law." },
  { icon: Scale, title: "7. Non-Discrimination", content: "ZIVO will not discriminate against you for exercising your CCPA rights. We will not: (a) deny goods or services; (b) charge different prices; (c) provide a different level of quality; (d) suggest you will receive different treatment. However, ZIVO may offer financial incentives for the collection, sale, or retention of personal information, which may result in different prices, rates, or quality levels." },
  { icon: FileText, title: "8. Submitting Requests", content: "To exercise your CCPA rights, submit a verifiable consumer request by: (a) emailing privacy@hizivo.com; (b) calling our toll-free number; (c) using the privacy request form in your account settings. We must verify your identity before fulfilling requests. Only you or an authorized agent may make a request on your behalf. We will respond within 45 days (extendable by an additional 45 days with notice)." },
  { icon: Database, title: "9. Categories of Information Collected", content: "ZIVO may collect the following categories of personal information: (a) identifiers (name, email, phone, IP address); (b) commercial information (booking history, transaction records); (c) internet/electronic activity (browsing history, search history); (d) geolocation data; (e) professional information; (f) inferences drawn from other categories; (g) sensitive personal information (account login, precise geolocation, financial information)." },
  { icon: Globe, title: "10. Additional State Privacy Rights", content: "In addition to California, residents of Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), and other states with comprehensive privacy laws have similar rights. ZIVO extends the same privacy rights to all U.S. users regardless of state of residence. Contact privacy@hizivo.com to exercise your rights." },
  { icon: Bell, title: "11. Annual Metrics", content: "As required by the CCPA, ZIVO will publish annual metrics regarding consumer requests received, including: number of requests to know, delete, and opt-out; median response time; and number of requests denied. These metrics will be available on our Privacy Policy page." },
  { icon: Smartphone, title: "12. Global Privacy Control", content: "ZIVO honors Global Privacy Control (GPC) signals from your browser as a valid opt-out of sale/sharing of personal information under the CCPA. If your browser sends a GPC signal, we will treat it as a valid request to opt out." },
];

export default function CaliforniaPrivacy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">California Privacy (CCPA)</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-semibold mb-3">
            <Shield className="h-3 w-3" /> CCPA/CPRA Compliance
          </span>
          <h2 className="text-2xl font-bold">California Privacy Rights (CCPA/CPRA)</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        {sections.map((s) => { const Icon = s.icon; return (
          <div key={s.title} className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
            <div className="rounded-2xl bg-card border border-border/40 p-4"><p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p></div>
          </div>
        ); })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Privacy requests?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">privacy@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
