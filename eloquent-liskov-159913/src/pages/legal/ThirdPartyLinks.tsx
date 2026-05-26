import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Link, Globe, ExternalLink, AlertTriangle, Eye, FileText, Lock, Ban, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Link, title: "1. Third-Party Links on ZIVO", content: "The ZIVO platform may contain links, references, or redirects to third-party websites, applications, and services that are not owned, operated, or controlled by ZIVO. These links are provided solely for your convenience and informational purposes. ZIVO does not endorse, approve, verify, monitor, or control the content, products, services, privacy practices, or policies of any third-party website or service. You access third-party links entirely at your own risk." },
  { icon: AlertTriangle, title: "2. No Responsibility for Third-Party Content", content: "ZIVO IS NOT RESPONSIBLE OR LIABLE FOR: (a) the content, accuracy, or opinions expressed on third-party websites; (b) the availability or functionality of third-party services; (c) the privacy practices or data collection of third parties; (d) any transactions you enter into with third parties; (e) any losses, damages, or harm resulting from your interaction with third-party websites; (f) malware, viruses, or harmful content on third-party sites; (g) any violations of law by third-party websites." },
  { icon: Globe, title: "3. Travel Partner Redirects", content: "When you click to book flights, hotels, car rentals, or other travel services through ZIVO, you may be redirected to a third-party travel partner's website to complete your booking. Once redirected: (a) you are subject to that partner's terms and conditions; (b) ZIVO has no control over the booking process; (c) payment is processed by the partner, not ZIVO; (d) customer service for the booking is provided by the partner; (e) ZIVO is not a party to your contract with the partner." },
  { icon: Shield, title: "4. Affiliate & Advertising Links", content: "Some links on ZIVO may be affiliate links, meaning ZIVO may receive compensation if you click the link or make a purchase. The presence of affiliate links does not: (a) affect the price you pay; (b) constitute an endorsement of the product or service; (c) create any warranty or guarantee; (d) establish any agency relationship between ZIVO and the advertiser. ZIVO discloses affiliate relationships in compliance with FTC guidelines." },
  { icon: Lock, title: "5. Security of Third-Party Sites", content: "ZIVO cannot guarantee the security of third-party websites. You should review the privacy policy and security practices of any third-party site before providing personal information. ZIVO is not responsible for data breaches, identity theft, or other security incidents that occur on third-party platforms, even if you accessed those platforms through a link on ZIVO." },
  { icon: Eye, title: "6. Embedded Content", content: "The Services may display embedded content from third parties (such as maps, videos, social media feeds, or reviews). Such content is provided by the respective third-party services and is subject to their terms. ZIVO does not control embedded content and is not responsible for its accuracy, legality, or appropriateness." },
  { icon: ExternalLink, title: "7. API Integrations", content: "ZIVO integrates with third-party APIs for functionality including flight search, payment processing, mapping, and communications. ZIVO is not liable for: (a) API outages or errors; (b) data inaccuracies from third-party APIs; (c) changes to third-party API terms or availability; (d) security vulnerabilities in third-party systems; (e) any disruption to ZIVO services caused by third-party API failures." },
  { icon: FileText, title: "8. User Responsibility", content: "You are solely responsible for: (a) evaluating the trustworthiness of third-party websites before interacting with them; (b) reading and understanding third-party terms and privacy policies; (c) protecting your personal and financial information on third-party sites; (d) any consequences of engaging with third-party services accessed through ZIVO." },
  { icon: Ban, title: "9. No Agency Relationship", content: "The inclusion of third-party links on ZIVO does not create any agency, partnership, joint venture, or employment relationship between ZIVO and the third party. ZIVO is not responsible for the acts or omissions of any third party, and no third party is authorized to make representations or commitments on behalf of ZIVO." },
  { icon: Scale, title: "10. Indemnification for Third-Party Interactions", content: "You agree to indemnify and hold harmless ZIVO from any claims, damages, losses, or expenses arising from your interaction with third-party websites, services, or content accessed through or linked from the ZIVO platform." },
];

export default function ThirdPartyLinks() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Third-Party Links</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-3">
            <ExternalLink className="h-3 w-3" /> External Links
          </span>
          <h2 className="text-2xl font-bold">Third-Party Links Disclaimer</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        {sections.map((s) => { const Icon = s.icon; return (
          <div key={s.title} className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
            <div className="rounded-2xl bg-card border border-border/40 p-4"><p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p></div>
          </div>
        ); })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Questions?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">legal@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
