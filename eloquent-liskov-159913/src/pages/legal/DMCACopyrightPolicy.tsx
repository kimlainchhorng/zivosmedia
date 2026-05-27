import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copyright, AlertTriangle, FileText, Mail, CheckCircle2, Shield, Ban, Scale, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: Copyright,
    title: "1. Overview & Legal Basis",
    content: "ZIVO LLC respects the intellectual property rights of others and expects all users to do the same. This policy outlines how copyright owners can report alleged infringement on our platform and how we process such claims in full compliance with the Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512. ZIVO qualifies as an online service provider under the DMCA safe harbor provisions and maintains procedures designed to expeditiously respond to valid infringement notices."
  },
  {
    icon: FileText,
    title: "2. Filing a DMCA Takedown Notice",
    content: "To file a copyright infringement claim, you must send a written notice to our designated agent containing ALL of the following (incomplete notices will be returned):",
    items: [
      "A physical or electronic signature of the copyright owner or person authorized to act on their behalf",
      "Identification of the copyrighted work(s) you claim is being infringed (include registration number if available)",
      "Identification of the specific infringing material and its exact location on ZIVO (URL, page, or content identifier)",
      "Your full legal name, mailing address, telephone number, and email address",
      "A statement that you have a good faith belief that the use of the material is not authorized by the copyright owner, its agent, or the law",
      "A statement, UNDER PENALTY OF PERJURY, that the information in the notice is accurate and that you are the copyright owner or authorized to act on behalf of the owner",
    ]
  },
  {
    icon: Mail,
    title: "3. Designated DMCA Agent",
    content: "All DMCA notices must be sent to:\n\nZIVO LLC — DMCA Designated Agent\nEmail: dmca@hizivo.com\nMail: ZIVO LLC, Attn: DMCA Agent, [Address on file with U.S. Copyright Office]\n\nWe will acknowledge receipt of all valid DMCA notices within 2 business days. Please note that DMCA notices are legal documents — knowingly submitting a false notice may subject you to liability for damages, including attorneys' fees, under 17 U.S.C. § 512(f)."
  },
  {
    icon: AlertTriangle,
    title: "4. Counter-Notification Process",
    content: "If you believe your content was removed or disabled in error or due to misidentification, you may submit a counter-notification to our DMCA Agent containing: (a) your physical or electronic signature; (b) identification of the removed material and its location before removal; (c) a statement under penalty of perjury that you have a good faith belief the material was removed by mistake or misidentification; (d) your full name, address, telephone number, and email; and (e) a statement consenting to the jurisdiction of the Federal District Court in the district where your address is located (or, if outside the US, in Delaware). We will forward the counter-notification to the original complainant. If the complainant does not file a court action within 10–14 business days, we will restore the removed material."
  },
  {
    icon: Ban,
    title: "5. Repeat Infringer Policy",
    content: "ZIVO maintains a strict repeat infringer policy. We will terminate, in appropriate circumstances, the accounts of users who are repeat infringers. Specifically: (a) accounts receiving 2 valid DMCA strikes within any 12-month period will receive a final warning; (b) accounts receiving 3 valid DMCA strikes will be permanently terminated; (c) terminated accounts cannot be reinstated; (d) we track DMCA notices per account and per user; (e) circumventing termination by creating new accounts is prohibited and will result in immediate re-termination. This policy is implemented regardless of whether the infringement was intentional."
  },
  {
    icon: Shield,
    title: "6. DMCA Safe Harbor",
    content: "ZIVO relies on the safe harbor provisions of the DMCA (17 U.S.C. § 512) for user-generated content. As a condition of this safe harbor: (a) we have designated a DMCA agent registered with the U.S. Copyright Office; (b) we implement and reasonably enforce our repeat infringer policy; (c) we accommodate standard technical measures used by copyright owners to identify or protect copyrighted works; (d) we do not have actual knowledge of infringing activity; and (e) we act expeditiously to remove or disable access to infringing material upon receiving valid notices."
  },
  {
    icon: Scale,
    title: "7. User-Generated Content & Licensing",
    content: "By uploading content to ZIVO (reviews, photos, stories, comments), you represent and warrant that: (a) you own the content or have all necessary rights and permissions; (b) the content does not infringe any third-party intellectual property rights; (c) you grant ZIVO a non-exclusive, worldwide, royalty-free, sublicensable license to use, display, modify, and distribute the content in connection with the Services; (d) you waive any moral rights to the extent permitted by law; and (e) you indemnify ZIVO against any claims of infringement related to your content."
  },
  {
    icon: Copyright,
    title: "8. ZIVO's Intellectual Property",
    content: "All ZIVO trademarks, service marks, trade names, logos, domain names, trade dress, and copyrighted materials (including website design, text, graphics, interfaces, code, and software) are the exclusive property of ZIVO LLC. No right, title, or interest in any ZIVO intellectual property is transferred to you. Unauthorized use of ZIVO's intellectual property may result in civil and criminal penalties under applicable trademark (15 U.S.C. § 1114) and copyright (17 U.S.C. § 504) laws."
  },
  {
    icon: Globe,
    title: "9. International Copyright",
    content: "ZIVO respects international copyright protections under the Berne Convention, the WIPO Copyright Treaty, and applicable national laws. If you are a copyright owner outside the United States, you may submit a DMCA notice following the same procedures outlined above. We will process international notices in accordance with U.S. law and applicable international treaties."
  },
  {
    icon: CheckCircle2,
    title: "10. Misrepresentation & Penalties",
    content: "Under 17 U.S.C. § 512(f), any person who knowingly materially misrepresents that content is infringing, or that content was removed by mistake, may be liable for damages, including costs and attorneys' fees incurred by the alleged infringer, ZIVO, or the copyright owner. ZIVO reserves the right to seek damages against any party who submits a fraudulent DMCA notice or counter-notification. Filing false DMCA claims may also result in termination of your ZIVO account."
  },
];

export default function DMCACopyrightPolicy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">DMCA / Copyright Policy</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-semibold mb-3">
            <Copyright className="h-3 w-3" /> Intellectual Property Protection
          </span>
          <h2 className="text-2xl font-bold">DMCA / Copyright Policy</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4">
          <p className="text-sm leading-relaxed">This policy explains how to report copyright infringement on ZIVO, how we handle such claims under the Digital Millennium Copyright Act, and our repeat infringer policy.</p>
        </div>
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                {s.content && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.content}</p>}
                {s.items && (
                  <ul className="mt-2 space-y-2">
                    {s.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Report Copyright Infringement</p>
          <p className="text-xs text-muted-foreground">Email <span className="text-primary font-semibold">dmca@hizivo.com</span> with all required information</p>
        </div>
      </div>
    </div>
  );
}