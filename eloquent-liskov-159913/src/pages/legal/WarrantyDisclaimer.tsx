import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, FileText, Scale, Globe, AlertTriangle, Users, Gavel, Eye, DollarSign, Lock, Ban, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Shield, title: "1. Warranty Disclaimer", content: "ZIVO LLC PROVIDES THE SERVICES ON AN 'AS IS' AND 'AS AVAILABLE' BASIS. ZIVO EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. No advice or information, whether oral or written, obtained from ZIVO or through the Services, shall create any warranty not expressly stated herein." },
  { icon: AlertTriangle, title: "2. No Warranty of Results", content: "ZIVO MAKES NO WARRANTY THAT: (a) the Services will meet your requirements or expectations; (b) the Services will be uninterrupted, timely, secure, or error-free; (c) the results obtained from using the Services will be accurate, reliable, or complete; (d) the quality of any services obtained through the platform will meet your expectations; (e) any errors in the Services will be corrected; (f) the Services will be compatible with your hardware, software, or internet connection; (g) any stored data will be preserved without loss." },
  { icon: Globe, title: "3. Third-Party Service Disclaimer", content: "ZIVO MAKES NO WARRANTIES REGARDING THIRD-PARTY SERVICE PROVIDERS, including airlines, hotels, restaurants, drivers, car owners, or any other service provider accessible through the platform. ZIVO does not warrant the safety, quality, legality, or suitability of any third-party service. All third-party services are provided at your own risk. ZIVO is not responsible for vetting, endorsing, or guaranteeing any service provider." },
  { icon: DollarSign, title: "4. Pricing Disclaimer", content: "ALL PRICES DISPLAYED ON ZIVO ARE ESTIMATES AND ARE NOT GUARANTEED. Prices may change between the time of display and the time of booking. ZIVO does not guarantee: (a) the accuracy of displayed prices; (b) that any particular price will be available; (c) that prices will not increase; (d) that promotional prices will be honored; (e) that final prices at checkout will match displayed prices. Final prices are determined by the third-party service provider at the time of booking." },
  { icon: Eye, title: "5. Content Disclaimer", content: "ZIVO does not warrant the accuracy, completeness, or usefulness of any content on the platform, including but not limited to: user reviews, ratings, photos, descriptions, maps, directions, travel information, or any other informational content. All content is provided for general informational purposes only and should not be relied upon as the sole basis for any decision." },
  { icon: Scale, title: "6. Legal Advice Disclaimer", content: "NOTHING ON THE ZIVO PLATFORM CONSTITUTES LEGAL, FINANCIAL, TAX, MEDICAL, OR PROFESSIONAL ADVICE. The legal policies, terms, and informational content on this platform are provided for informational purposes only. You should consult with qualified professionals before making decisions based on information obtained from the platform." },
  { icon: Users, title: "7. User-Generated Content Disclaimer", content: "ZIVO does not endorse, guarantee, or warrant any user-generated content including reviews, ratings, tips, photos, or comments. User-generated content represents the personal opinions of individual users and not the views of ZIVO. ZIVO is not responsible for the accuracy, legality, or appropriateness of user-generated content." },
  { icon: Lock, title: "8. Security Disclaimer", content: "While ZIVO implements industry-standard security measures, NO SYSTEM IS 100% SECURE. ZIVO does not warrant that: (a) the Services are free from vulnerabilities; (b) your data will never be compromised; (c) unauthorized access will never occur; (d) the Services are free from malware, viruses, or other harmful code; (e) security measures will prevent all possible threats." },
  { icon: Ban, title: "9. Availability Disclaimer", content: "ZIVO does not guarantee continuous, uninterrupted access to the Services. The platform may be unavailable due to maintenance, updates, technical issues, force majeure events, or other reasons. ZIVO is not liable for any losses resulting from service unavailability." },
  { icon: FileText, title: "10. Regulatory Disclaimer", content: "ZIVO's compliance with laws and regulations is based on our good-faith interpretation of applicable requirements. ZIVO does not warrant that its practices comply with all laws in all jurisdictions. Regulatory requirements change frequently, and ZIVO cannot guarantee continuous compliance with all evolving regulations." },
  { icon: Gavel, title: "11. Enforceability", content: "If any warranty disclaimer is found unenforceable in a particular jurisdiction, only that specific disclaimer shall be modified to the minimum extent required by law, and all other disclaimers shall remain in full force and effect. The remaining disclaimers reflect the parties' intent to disclaim warranties to the maximum extent permitted by applicable law." },
  { icon: Clock, title: "12. Acknowledgment", content: "BY USING ZIVO, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREED TO THESE WARRANTY DISCLAIMERS. You understand that these disclaimers significantly limit ZIVO's obligations and your remedies. You accept these disclaimers as reasonable and as part of the consideration for access to the Services." },
];

export default function WarrantyDisclaimer() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Warranty Disclaimer</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-semibold mb-3">
            <AlertTriangle className="h-3 w-3" /> As-Is Disclaimer
          </span>
          <h2 className="text-2xl font-bold">Warranty Disclaimer</h2>
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
