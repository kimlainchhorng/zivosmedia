import { useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, MessageCircle, Camera, Shield, AlertTriangle, Users, Heart, Ban, Globe, Scale, Lock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: Users,
    title: "1. Community Standards",
    content: "ZIVO's social features — including profiles, posts, stories, and comments — are designed to foster a respectful travel community. All users must treat others with dignity and respect. Harassment, bullying, stalking, hate speech, discrimination based on race, gender, religion, sexual orientation, disability, or any protected characteristic is STRICTLY PROHIBITED and will result in immediate account action."
  },
  {
    icon: Camera,
    title: "2. Content Guidelines & Ownership",
    content: "Users are responsible for ALL content they share on the platform. Content must be original or properly licensed. By posting content, you represent and warrant that you own all rights to it. Do not post: copyrighted material without authorization, explicit/adult content, graphic violence, misleading or false information, personal information of others without consent, or content promoting illegal activities. Travel photos, reviews, and genuine experiences are encouraged. All content must comply with applicable local, state, and federal laws."
  },
  {
    icon: MessageCircle,
    title: "3. Interactions & Messaging Rules",
    content: "Be respectful in ALL interactions. Prohibited messaging behavior includes: spam or unsolicited commercial messages, repetitive or excessive messaging, impersonation of other users, ZIVO staff, or partner representatives, sharing personal information of other users without consent, threatening or intimidating language, solicitation for services outside the platform, and sharing links to malware or phishing sites. Report suspicious accounts or messages immediately."
  },
  {
    icon: Shield,
    title: "4. Privacy & Data Protection",
    content: "Do not share other users' personal information (phone numbers, addresses, travel documents, financial information, photos) without their explicit written consent. Respect all profile privacy settings. Screenshots of private conversations must NOT be shared publicly. Doxing (publishing private information with malicious intent) is strictly prohibited and may result in legal action. ZIVO moderates content to protect user privacy and will remove personal information shared without consent."
  },
  {
    icon: Heart,
    title: "5. Reviews, Ratings & Integrity",
    content: "Reviews must reflect genuine, firsthand experiences. The following are STRICTLY PROHIBITED: fake reviews, paid reviews without disclosure, reviews written as part of an exchange agreement, review bombing (coordinated negative reviews), reviews designed to manipulate ratings or harm competitors, and personal attacks against service providers. Constructive criticism is welcome; defamation is not. ZIVO reserves the right to remove fraudulent, misleading, or abusive reviews and may suspend accounts engaged in review manipulation."
  },
  {
    icon: Ban,
    title: "6. Prohibited Content",
    items: [
      "Illegal activity promotion, solicitation, or facilitation",
      "Scams, phishing, pyramid schemes, or fraudulent schemes",
      "Malware, viruses, trojans, or harmful links",
      "Spam, commercial advertising, or MLM solicitation without authorization",
      "Content promoting dangerous, reckless, or self-harmful behavior",
      "Misinformation about travel safety, health regulations, or visa requirements",
      "Impersonation of individuals, organizations, or government officials",
      "Content that exploits or endangers minors in any way",
      "Terrorist propaganda or violent extremist content",
      "Revenge content or non-consensual intimate images",
      "Content that promotes discrimination or violence against any group",
    ]
  },
  {
    icon: Eye,
    title: "7. Content Moderation & AI Review",
    content: "ZIVO employs both automated AI-powered content moderation and human review teams. Automated systems scan uploads for policy violations in real-time. Content flagged by AI is queued for human review. All reported content is reviewed within 24–48 hours. ZIVO reserves the right to remove content at its sole discretion without prior notice. Content decisions are final, though appeals may be submitted within 14 days."
  },
  {
    icon: AlertTriangle,
    title: "8. Enforcement & Consequences",
    content: "Violations may result in escalating consequences: (a) content removal and first warning; (b) temporary account restriction (7-30 days) for repeated violations; (c) permanent account suspension for severe or repeated violations; (d) reporting to law enforcement for illegal activity; and (e) civil legal action for damages caused by policy violations. ZIVO reviews reported content within 24–48 hours. Appeals can be submitted to support@hizivo.com within 14 days of enforcement action, including a detailed explanation of why you believe the action was in error."
  },
  {
    icon: Share2,
    title: "9. Third-Party Platforms & Cross-Posting",
    content: "When sharing ZIVO content on external platforms (Instagram, TikTok, X, YouTube, etc.), users must comply with both ZIVO's and the third-party platform's terms. ZIVO is not responsible for content once shared outside our platform. Linking to ZIVO services must not misrepresent our brand, partnerships, or offerings. Do not use ZIVO's name or branding to imply endorsement of any product, service, or viewpoint without written authorization."
  },
  {
    icon: Lock,
    title: "10. Influencer & Sponsorship Disclosure",
    content: "Users who receive compensation (monetary, free services, discounts, or other benefits) in exchange for content on ZIVO must clearly disclose the relationship in compliance with FTC guidelines (16 CFR Part 255). Disclosures must be: (a) clear and conspicuous; (b) placed before any 'Read More' or 'See More' break; (c) written in plain language (e.g., '#Ad,' '#Sponsored,' 'Paid partnership'); and (d) not hidden among hashtags. Failure to disclose sponsored content is a violation of both this policy and federal law."
  },
  {
    icon: Globe,
    title: "11. International Content Standards",
    content: "Users posting content about international destinations must be sensitive to cultural differences and local laws. Content that is legal in one jurisdiction may violate laws in another. ZIVO may restrict or remove content that violates the laws of any jurisdiction where our services are available. Users traveling internationally should be aware that social media posts may have legal implications in certain countries."
  },
  {
    icon: Scale,
    title: "12. Intellectual Property in Social Content",
    content: "When using ZIVO's social features, you must respect all intellectual property rights: (a) do not post copyrighted music, film clips, or broadcasts without permission; (b) do not reproduce others' travel itineraries or proprietary content; (c) do not use ZIVO's proprietary data (pricing, analytics) in external content; (d) properly attribute quotes and referenced content; and (e) do not use others' photos without explicit permission. Violations will be handled under our DMCA/Copyright Policy."
  },
];

export default function SocialMediaPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Social Media Policy</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold mb-3">
            <Share2 className="h-3 w-3" /> Community Guidelines
          </span>
          <h2 className="text-2xl font-bold text-foreground">Social Media Policy</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>

        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4">
          <p className="text-sm text-foreground leading-relaxed">
            This policy governs the use of ALL social features within the ZIVO platform, including profiles, posts, stories, reviews, ratings, comments, and messaging. By using our social features, you agree to follow these guidelines. Violations will result in enforcement action up to and including permanent account termination.
          </p>
        </div>

        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {section.title}
              </h3>
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                {section.content && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                )}
                {section.items && (
                  <ul className="space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}

        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">Report a Concern</p>
          <p className="text-xs text-muted-foreground">
            Report violations in-app or email{" "}
            <span className="text-primary font-semibold">support@hizivo.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}