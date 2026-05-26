import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, FileText, Shield, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

const policyContent: Record<string, { badge: string; intro: string; sections: { title: string; content: string }[] }> = {};

function slugToTitle(slug: string): string {
  return slug
    .replace(/^\/legal\//, "")
    .split("-")
    .map((w) => {
      const upper = w.charAt(0).toUpperCase() + w.slice(1);
      const acronyms: Record<string, string> = {
        ai: "AI", api: "API", bipa: "BIPA", bnpl: "BNPL", ccpa: "CCPA", coppa: "COPPA",
        covid: "COVID-19", cpa: "CPA", csam: "CSAM", ctdpa: "CTDPA", dma: "DMA",
        dpa: "DPA", dpdp: "DPDP", dsa: "DSA", eaa: "EAA", eu: "EU", fedramp: "FedRAMP",
        ferpa: "FERPA", foia: "FOIA", gdpr: "GDPR", hipaa: "HIPAA", iot: "IoT",
        iso27001: "ISO 27001", itar: "ITAR", lgpd: "LGPD", mfa: "MFA", msa: "MSA",
        nda: "NDA", nft: "NFT", pci: "PCI-DSS", pdpa: "PDPA", pipl: "PIPL",
        pipa: "PIPA", pipeda: "PIPEDA", sdk: "SDK", sla: "SLA", sms: "SMS",
        soc2: "SOC 2", tdpsa: "TDPSA", uk: "UK", us: "US", uae: "UAE",
        vcdpa: "VCDPA", voip: "VoIP", wcag: "WCAG 2.2", defi: "DeFi",
        "24hr": "24-Hour", ada: "ADA", iii: "III",
      };
      return acronyms[w] || upper;
    })
    .join(" ");
}

export default function GenericLegalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const title = slugToTitle(location.pathname);
  const custom = policyContent[location.pathname];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold line-clamp-1">{title}</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <Scale className="h-3 w-3" /> Legal
          </span>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>

        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4">
          <p className="text-sm leading-relaxed">
            {custom?.intro ||
              `This policy outlines ZIVO's terms regarding ${title.toLowerCase()}. By accessing or using ZIVO services, you acknowledge that you have read, understood, and agree to be bound by the terms set forth in this policy. This policy is incorporated by reference into ZIVO's Terms of Service.`}
          </p>
        </div>

        {(custom?.sections || [
          {
            title: "1. Scope & Applicability",
            content: `This ${title} policy applies to all users, visitors, partners, and third parties who access or use ZIVO's platform, mobile applications, websites, APIs, and related services. This policy is governed by the laws of the State of Delaware, United States, and constitutes a legally binding agreement between you and ZIVO LLC. By continuing to use our services, you consent to the terms described herein.`,
          },
          {
            title: "2. Definitions & Interpretation",
            content: `For the purposes of this policy: "ZIVO" refers to ZIVO LLC, its subsidiaries, affiliates, officers, directors, employees, agents, and assigns. "User" or "You" refers to any individual or entity accessing ZIVO services. "Platform" means all ZIVO websites, mobile applications, APIs, and connected services. "Services" encompasses all products, features, content, and functionality offered through the Platform. "Personal Data" means any information relating to an identified or identifiable natural person as defined under applicable data protection laws.`,
          },
          {
            title: "3. ZIVO's Rights & Obligations",
            content: `ZIVO reserves the right to: (a) modify, update, or discontinue any aspect of this policy at any time with or without prior notice; (b) enforce this policy at its sole discretion; (c) suspend or terminate access for violations; (d) cooperate with law enforcement and regulatory authorities as required; (e) collect, process, and retain data as described in our Privacy Policy; (f) assign or transfer rights under this policy without restriction; and (g) seek injunctive relief for violations that may cause irreparable harm. ZIVO will use commercially reasonable efforts to maintain the accuracy and currency of this policy.`,
          },
          {
            title: "4. User Responsibilities & Compliance",
            content: `You are responsible for: (a) reading and understanding this policy in its entirety; (b) complying with all applicable local, state, national, and international laws and regulations; (c) maintaining the confidentiality of your account credentials; (d) promptly reporting any suspected violations or security incidents to legal@hizivo.com; (e) cooperating with ZIVO in any investigation related to policy violations; (f) ensuring that your use of ZIVO services does not infringe upon the rights of any third party; and (g) accepting all risks associated with your use of the platform as described in our Assumption of Risk policy.`,
          },
          {
            title: "5. Limitation of Liability",
            content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ZIVO'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THIS POLICY SHALL NOT EXCEED ONE HUNDRED DOLLARS ($100.00 USD). ZIVO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, REGARDLESS OF WHETHER ZIVO HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. This limitation applies to all claims, whether based on warranty, contract, tort (including negligence), strict liability, or any other legal theory.`,
          },
          {
            title: "6. Dispute Resolution & Arbitration",
            content: `Any dispute, claim, or controversy arising out of or relating to this policy shall be resolved through binding arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. Arbitration shall take place in Wilmington, Delaware. YOU AGREE TO WAIVE YOUR RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN A CLASS ACTION, CLASS ARBITRATION, OR REPRESENTATIVE PROCEEDING. The arbitrator's decision shall be final and binding. Each party shall bear its own costs and attorneys' fees unless the arbitrator determines otherwise. Small claims court actions are exempt from this arbitration requirement.`,
          },
          {
            title: "7. Governing Law & Jurisdiction",
            content: `This policy shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any legal action or proceeding not subject to arbitration shall be brought exclusively in the federal or state courts located in Wilmington, Delaware. You consent to the personal jurisdiction of such courts and waive any objection to venue, including on the basis of forum non conveniens.`,
          },
          {
            title: "8. Severability & Entire Agreement",
            content: `If any provision of this policy is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it valid and enforceable, or if modification is not possible, shall be severed from this policy. The remaining provisions shall continue in full force and effect. This policy, together with ZIVO's Terms of Service and Privacy Policy, constitutes the entire agreement between you and ZIVO regarding the subject matter herein and supersedes all prior agreements and understandings.`,
          },
          {
            title: "9. Contact & Notices",
            content: `For questions, concerns, or notices regarding this policy, contact ZIVO's Legal Department at: legal@hizivo.com. Written notices should be sent to: ZIVO LLC, Legal Department, Wilmington, Delaware, United States. ZIVO may provide notices to you via email, in-app notification, or by posting updates on the platform. It is your responsibility to regularly review this policy for updates. Continued use of ZIVO services after any modifications constitutes acceptance of the updated terms.`,
          },
        ]).map((s, i) => (
          <div key={i} className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-bold">
              {i === 0 ? <FileText className="h-4 w-4 text-primary" /> : <Shield className="h-4 w-4 text-primary" />}
              {s.title}
            </h3>
            <div className="rounded-2xl bg-card border border-border/40 p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
            </div>
          </div>
        ))}

        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Questions about this policy?</p>
          <p className="text-xs text-muted-foreground">Contact us at <span className="text-primary font-semibold">legal@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
