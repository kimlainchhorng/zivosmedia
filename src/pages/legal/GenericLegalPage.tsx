import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, FileText, Shield, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

const policyContent: Record<string, { badge: string; intro: string; sections: { title: string; content: string }[] }> = {
  "/legal/automated-decisions": {
    badge: "AI Governance",
    intro:
      "This policy explains how ZIVO uses automated signals, AI, and machine learning to support ranking, recommendations, fraud review, moderation, pricing estimates, and safety decisions.",
    sections: [
      {
        title: "1. Automated Decision Uses",
        content:
          "ZIVO may use automated systems for search ranking, feed and reels recommendations, fraud detection, spam and abuse prevention, content moderation, safety review, ad relevance, pricing estimates, support routing, and account protection.",
      },
      {
        title: "2. Significant Decisions",
        content:
          "Significant decisions such as account suspension, payout holds, content removal, booking risk review, payment risk review, live-stream restrictions, or marketplace risk controls may include automated signals and human reviewer input.",
      },
      {
        title: "3. Human Review & Appeals",
        content:
          "You can request information about automated decisions affecting you and request human review or submit an appeal where available. Moderation appeals are submitted through the ZIVO appeal flow and reviewed under our safety procedures.",
      },
      {
        title: "4. User Responsibilities",
        content:
          "You may not scrape, reverse-engineer, manipulate, test, bypass, or interfere with ZIVO ranking, recommendation, fraud, safety, moderation, advertising, or pricing systems.",
      },
      {
        title: "5. Related Policies",
        content:
          "This policy works with our Privacy Policy, Terms of Service, Data Retention Policy, GDPR Compliance page, and Automated Data Collection Disclosure.",
      },
    ],
  },
  "/legal/automated-data-collection": {
    badge: "Data Collection",
    intro:
      "This disclosure explains how ZIVO collects device, usage, location, transaction, content, and security signals automatically when you use our websites, apps, and platform services.",
    sections: [
      {
        title: "1. Automatically Collected Data",
        content:
          "ZIVO may collect device identifiers, IP address, app events, page views, search queries, booking activity, payment and payout events, approximate or precise location where permitted, content interactions, crash logs, security logs, cookie choices, and ad attribution signals where you consent.",
      },
      {
        title: "2. Why We Collect It",
        content:
          "We use automated collection to operate the service, keep accounts secure, prevent fraud and abuse, personalize recommendations, measure performance, process bookings and payments, improve accessibility, debug errors, and honor privacy and cookie preferences.",
      },
      {
        title: "3. Consent & Controls",
        content:
          "Essential collection is required for security and service delivery. Optional analytics and marketing collection depends on your cookie and privacy choices, including Do Not Sell or Share controls where applicable.",
      },
      {
        title: "4. Retention & De-Identification",
        content:
          "Automated collection records are retained according to the Data Retention Policy. Some data may be aggregated, anonymized, or de-identified for analytics, service improvement, fraud prevention, and AI system improvement where permitted.",
      },
      {
        title: "5. Your Rights",
        content:
          "You may request access, correction, deletion, portability, opt-out, restriction, or information about automated processing through account privacy controls or by contacting privacy@hizivo.com.",
      },
    ],
  },
  "/legal/data-portability": {
    badge: "Data Rights",
    intro:
      "This policy explains how ZIVO supports your right to receive a portable copy of personal data associated with your account.",
    sections: [
      {
        title: "1. Portable Export Scope",
        content:
          "Your portable export may include profile data, messages, media metadata, comments, saved locations, trips, bookings, wallet transactions, devices, consent records, legal acceptance records, support records, and auth user information where available.",
      },
      {
        title: "2. Authoritative Export",
        content:
          "The authoritative account export is generated through the account-export Edge Function, requires re-authentication with TOTP where configured, and records a compliance audit log for GDPR Article 15 and CCPA portability evidence.",
      },
      {
        title: "3. Formats & Limits",
        content:
          "Exports are generally provided as structured JSON and may include CSV-style category exports in account tools. Some partner, fraud, security, legal hold, and third-party records may be withheld, redacted, or summarized where required by law or to protect other users.",
      },
      {
        title: "4. How to Request",
        content:
          "Use Account Settings, Account Data Rights, or contact privacy@hizivo.com to request access, download, or portability. We may verify your identity before fulfilling your request.",
      },
      {
        title: "5. Related Policies",
        content:
          "This policy works with the Privacy Policy, Data Retention Policy, DSAR policy, Right to Be Forgotten policy, and Terms of Service.",
      },
    ],
  },
  "/legal/right-to-be-forgotten": {
    badge: "Deletion Rights",
    intro:
      "This policy explains how ZIVO handles account deletion and right-to-erasure requests, including the limits that apply when records must be retained.",
    sections: [
      {
        title: "1. Deletion Request Options",
        content:
          "You may request deletion from inside the app, from Account Data Rights, or from the public delete-account page. ZIVO schedules account deletion with a 30-day grace period so you can sign back in and cancel if the request was accidental.",
      },
      {
        title: "2. Self-Service Erasure",
        content:
          "The account-delete-self Edge Function enforces re-authentication with AAL2/TOTP where configured, requires the confirmation phrase DELETE MY ACCOUNT, deletes user-owned records where permitted, removes storage where applicable, and deletes the auth user.",
      },
      {
        title: "3. Records We May Retain",
        content:
          "Some records may be retained or anonymized where required for legal, tax, fraud prevention, payment, dispute, chargeback, safety, regulatory, or audit obligations, as described in the Data Retention Policy.",
      },
      {
        title: "4. Irreversible Deletion",
        content:
          "After the grace period and completion of deletion, your account cannot be recovered. Backup copies may remain for a limited period before automatic purge according to backup retention controls.",
      },
      {
        title: "5. Help With Deletion",
        content:
          "If you cannot access your account, email privacy@hizivo.com or support@hizivo.com from the address connected to your ZIVO account with the subject Delete my ZIVO account.",
      },
    ],
  },
  "/legal/dsar": {
    badge: "Privacy Requests",
    intro:
      "This policy explains how ZIVO receives, verifies, tracks, and responds to data subject access requests and related privacy rights requests.",
    sections: [
      {
        title: "1. Request Types",
        content:
          "You may request access, download, correction, deletion, opt-out of sale or sharing, portability, restriction, objection, consent withdrawal, or information about automated decisions affecting you.",
      },
      {
        title: "2. Server-Side Intake",
        content:
          "Privacy requests and consent-change requests are submitted through the privacy-request-submit Edge Function, categorized as dsar_request or consent_change, protected by authenticated user checks, and recorded for compliance review.",
      },
      {
        title: "3. Verification & Timing",
        content:
          "We may verify your identity before responding. GDPR requests are generally handled within 30 days, and CCPA requests follow applicable legal timeframes, with extensions where allowed for complex requests.",
      },
      {
        title: "4. Request Outcomes",
        content:
          "Depending on the request, we may provide access, download, correction, deletion, restriction, opt-out confirmation, portability files, or an explanation when a request cannot be fully completed because of legal, safety, fraud, payment, or rights-of-others limits.",
      },
      {
        title: "5. How to Submit",
        content:
          "Use Account Data Rights, Account Security, or email privacy@hizivo.com. Do not send sensitive documents unless requested through a secure verification workflow.",
      },
    ],
  },
  "/legal/location-data": {
    badge: "Location Privacy",
    intro:
      "This policy explains how ZIVO collects, uses, shares, and protects location data for rides, delivery, travel, discovery, safety, fraud prevention, and nearby services.",
    sections: [
      {
        title: "1. Location Data We Use",
        content:
          "ZIVO may use precise GPS location during active rides, deliveries, maps, nearby discovery, live sharing, check-ins, safety features, and support investigations. We may use approximate location from IP address or device settings for localization, fraud prevention, taxes, availability, and regional compliance.",
      },
      {
        title: "2. Consent & Device Controls",
        content:
          "Precise location is collected only when you grant device permission or actively use a feature that needs it. You can disable location access in iOS or Android settings, but rides, delivery tracking, nearby search, and safety features may stop working or become less accurate.",
      },
      {
        title: "3. Sharing Location",
        content:
          "We share only the location data needed to fulfill the service, such as pickup and drop-off locations with drivers, delivery addresses with merchants and couriers, booking locations with travel partners, and live trip status with people you choose.",
      },
      {
        title: "4. Retention & Safety",
        content:
          "Trip, delivery, booking, fraud, and safety location records are retained according to the Data Retention Policy. Some location records may be anonymized or aggregated for analytics, safety, demand planning, fraud prevention, and service improvement.",
      },
      {
        title: "5. Your Rights",
        content:
          "You may request access, deletion, correction, portability, or restriction of location data through Account Data Rights or privacy@hizivo.com, subject to legal, safety, fraud, payment, dispute, and regulatory retention limits.",
      },
    ],
  },
  "/legal/biometric-data": {
    badge: "Biometric Privacy",
    intro:
      "This policy explains how ZIVO treats biometric identifiers and biometric information, including face geometry, liveness checks, voiceprints, identity verification signals, and similar sensitive data.",
    sections: [
      {
        title: "1. Limited Biometric Use",
        content:
          "ZIVO may process biometric-related data for identity verification, liveness detection, account security, fraud prevention, creator or partner verification, camera effects, accessibility, and safety. We do not sell biometric identifiers or biometric information.",
      },
      {
        title: "2. Consent & Alternatives",
        content:
          "Where required by law, ZIVO obtains consent before collecting or processing biometric identifiers. If a feature requires biometric verification, we may offer an alternative verification path where reasonably available.",
      },
      {
        title: "3. Storage & Providers",
        content:
          "Biometric templates or verification results may be processed by vetted service providers under written data protection terms. ZIVO uses encryption, access controls, audit logging, and least-privilege access for sensitive verification records.",
      },
      {
        title: "4. Retention & Deletion",
        content:
          "Biometric identifiers are retained only as long as needed for verification, fraud prevention, security, legal claims, or regulatory obligations, then deleted or de-identified according to the Data Retention Policy and applicable law.",
      },
      {
        title: "5. Your Rights",
        content:
          "You may request access, deletion, correction, or information about biometric processing through Account Data Rights or privacy@hizivo.com. Some requests may be limited by security, fraud, legal, or identity-verification obligations.",
      },
    ],
  },
  "/legal/facial-recognition": {
    badge: "Face Data",
    intro:
      "This policy explains how ZIVO handles facial recognition, face detection, face geometry, liveness detection, and camera-based features.",
    sections: [
      {
        title: "1. Face Detection vs. Recognition",
        content:
          "Some ZIVO camera features may detect a face on-device to place filters, effects, or framing overlays without identifying you. Facial recognition or face geometry used for identity verification is treated as sensitive data and is subject to stricter consent, security, retention, and access controls.",
      },
      {
        title: "2. Identity & Safety Uses",
        content:
          "ZIVO may use facial recognition or liveness detection for driver, merchant, creator, payout, account recovery, anti-fraud, underage-access prevention, and safety verification where permitted by law.",
      },
      {
        title: "3. Restrictions",
        content:
          "ZIVO does not use facial recognition to identify people in public posts, scan private messages for identity matching, or sell face geometry. We do not permit users or partners to upload face data to identify another person without lawful authority and consent.",
      },
      {
        title: "4. Notice, Consent & Controls",
        content:
          "Where facial recognition is required or optional, ZIVO provides notice and obtains consent where required. You may disable camera permissions in device settings, though live, story, verification, and camera-effect features may be unavailable.",
      },
      {
        title: "5. Retention & Rights",
        content:
          "Face verification records are retained according to the Data Retention Policy and may be deleted, de-identified, or retained for fraud, security, legal, payout, or regulatory obligations. Contact privacy@hizivo.com to exercise applicable rights.",
      },
    ],
  },
};

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
