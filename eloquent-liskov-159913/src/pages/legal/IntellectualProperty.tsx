import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Brain, Lock, FileText, Eye, Globe, Fingerprint, Palette, Code, Scale, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Shield, title: "1. Ownership of Platform", content: "ZIVO LLC owns and retains all right, title, and interest in and to the ZIVO platform, including all software, code, databases, algorithms, user interfaces, designs, text, graphics, logos, icons, images, audio clips, video clips, data compilations, and all other content and materials available through the Services (collectively, 'ZIVO Content'). The Services and ZIVO Content are protected by copyright, trademark, patent, trade secret, and other intellectual property laws of the United States and foreign countries." },
  { icon: Palette, title: "2. Trademarks & Brand Assets", content: "ZIVO, the ZIVO logo, HIZIVO.COM, and all related names, logos, product and service names, designs, slogans, and trade dress are trademarks or registered trademarks of ZIVO LLC. You may not use such marks without the prior written permission of ZIVO. All other names, logos, product and service names, designs, and slogans on the platform are the trademarks of their respective owners. Any unauthorized use of ZIVO's trademarks may result in legal action including injunctive relief and damages." },
  { icon: Code, title: "3. Software & Source Code", content: "The software powering ZIVO, including all source code, object code, APIs, algorithms, machine learning models, and databases, is the exclusive property of ZIVO LLC and is protected by copyright and trade secret laws. You may not: (a) reverse engineer, decompile, or disassemble any software; (b) attempt to derive source code; (c) create derivative works; (d) copy, modify, or distribute the software; (e) rent, lease, or lend the software; (f) use automated tools to scrape, crawl, or extract data from the platform." },
  { icon: Brain, title: "4. AI & Algorithm Ownership", content: "All artificial intelligence models, machine learning algorithms, recommendation engines, pricing algorithms, search ranking systems, and predictive analytics used by ZIVO are proprietary trade secrets. You agree not to: (a) attempt to reverse engineer any algorithm; (b) probe or test the vulnerability of any system; (c) systematically collect data to understand algorithm behavior; (d) share insights about ZIVO's algorithms with competitors. Any information about ZIVO's algorithms obtained through use is confidential." },
  { icon: Lock, title: "5. License to Use the Platform", content: "ZIVO grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Services for personal, non-commercial purposes in accordance with these Terms. This license does not include: (a) any resale or commercial use of the Services or ZIVO Content; (b) any collection or use of product listings, descriptions, or prices; (c) any derivative use of the Services; (d) any downloading or copying of account information for another's benefit; (e) any use of data mining, robots, or similar tools." },
  { icon: FileText, title: "6. User Content License", content: "By submitting, posting, or displaying content on or through the Services (including reviews, photos, feedback, and suggestions), you grant ZIVO a worldwide, non-exclusive, royalty-free, perpetual, irrevocable, sublicensable, and transferable license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, perform, and display such content in any media or distribution channels. You represent that you own or have the necessary rights to grant this license." },
  { icon: Eye, title: "7. Feedback & Suggestions", content: "If you provide ZIVO with any feedback, ideas, suggestions, improvements, or other input ('Feedback'), you agree that: (a) ZIVO may freely use, disclose, reproduce, license, and distribute the Feedback without compensation to you; (b) ZIVO owns all rights to the Feedback; (c) you waive any moral rights in the Feedback; (d) ZIVO has no obligation to implement or maintain confidentiality of any Feedback; (e) you are not entitled to any compensation if ZIVO uses your Feedback." },
  { icon: Globe, title: "8. DMCA & Copyright Infringement", content: "ZIVO respects intellectual property rights and complies with the Digital Millennium Copyright Act (DMCA). If you believe content on ZIVO infringes your copyright, submit a notice to our designated agent at legal@hizivo.com containing: (a) identification of the copyrighted work; (b) identification of the infringing material; (c) your contact information; (d) a statement of good faith belief; (e) a statement under penalty of perjury; (f) your physical or electronic signature. Repeat infringers will have their accounts terminated." },
  { icon: Fingerprint, title: "9. Data & Compilation Rights", content: "The selection, arrangement, and compilation of all content on the platform is the exclusive property of ZIVO and is protected by U.S. and international copyright laws. Any unauthorized use of compiled data, including but not limited to price data, availability data, route data, or user data, constitutes theft of trade secrets and copyright infringement." },
  { icon: Scale, title: "10. Enforcement & Remedies", content: "ZIVO reserves the right to pursue all legal remedies for intellectual property violations, including but not limited to: (a) injunctive relief; (b) actual damages and lost profits; (c) statutory damages up to $150,000 per work infringed; (d) attorney's fees and costs; (e) criminal referral for willful infringement. Any violation of this section may result in immediate account termination without notice." },
  { icon: Award, title: "11. Patent Rights", content: "ZIVO may hold or have applied for patents covering certain aspects of the Services, including business methods, user interfaces, algorithms, and technical processes. Nothing in these Terms grants you any license under any such patents. ZIVO reserves all patent rights and may enforce them against unauthorized use of patented features or processes." },
];

export default function IntellectualProperty() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Intellectual Property</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold mb-3">
            <Shield className="h-3 w-3" /> IP Protection
          </span>
          <h2 className="text-2xl font-bold">Intellectual Property Rights</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        {sections.map((s) => { const Icon = s.icon; return (
          <div key={s.title} className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
            <div className="rounded-2xl bg-card border border-border/40 p-4"><p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p></div>
          </div>
        ); })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">IP concerns?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">legal@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
