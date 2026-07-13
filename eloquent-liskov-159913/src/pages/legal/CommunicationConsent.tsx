import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Bell, Mail, Smartphone, MessageSquare, FileText, Globe, Lock, Ban, Settings, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Bell, title: "1. Consent to Communications", content: "BY CREATING A ZIVO ACCOUNT, YOU EXPRESSLY CONSENT TO RECEIVE COMMUNICATIONS FROM ZIVO INCLUDING: (a) transactional emails (booking confirmations, receipts, account notifications); (b) service updates and announcements; (c) security alerts; (d) legal notices; (e) marketing and promotional communications; (f) push notifications (if enabled on your device); (g) SMS/text messages (if you provide a phone number); (h) in-app messages and notifications. This consent is given pursuant to the Telephone Consumer Protection Act (TCPA), CAN-SPAM Act, and applicable state laws." },
  { icon: Mail, title: "2. Email Communications", content: "ZIVO will send emails to your registered email address for: (a) booking confirmations and itinerary updates; (b) payment receipts and invoices; (c) account security alerts; (d) Terms of Service updates; (e) promotional offers and deals; (f) newsletters and travel content; (g) survey requests and feedback solicitation; (h) re-engagement communications. You may opt out of marketing emails at any time but cannot opt out of transactional and legal communications while your account remains active." },
  { icon: Smartphone, title: "3. Push Notifications", content: "If you enable push notifications: (a) ZIVO may send notifications for booking updates, price alerts, deals, reminders, and promotions; (b) frequency and content are at ZIVO's discretion; (c) you may disable push notifications in your device settings at any time; (d) disabling push notifications does not affect other communication channels; (e) ZIVO is not liable for notifications that fail to deliver due to device settings, connectivity, or technical issues." },
  { icon: MessageSquare, title: "4. SMS/Text Messages", content: "By providing your phone number, you consent to receive SMS/text messages from ZIVO including: (a) booking confirmations; (b) verification codes; (c) delivery updates; (d) ride status notifications; (e) promotional messages. Message and data rates may apply. Message frequency varies. Text STOP to opt out of promotional texts. Text HELP for help. Opting out of texts does not opt you out of the service. ZIVO is not liable for carrier charges." },
  { icon: Globe, title: "5. TCPA Compliance", content: "ZIVO complies with the Telephone Consumer Protection Act (TCPA). By providing your telephone number, you give ZIVO express written consent to contact you using automated dialing systems, prerecorded messages, and artificial voice technology for both marketing and non-marketing purposes. This consent is not a condition of purchase. You may revoke consent at any time by contacting support@hizivo.com." },
  { icon: FileText, title: "6. CAN-SPAM Compliance", content: "All marketing emails from ZIVO comply with the CAN-SPAM Act and include: (a) clear identification as advertising; (b) a valid physical mailing address; (c) a working unsubscribe mechanism; (d) accurate header information; (e) honest subject lines. Unsubscribe requests are honored within 10 business days." },
  { icon: Lock, title: "7. Communication Data", content: "ZIVO may collect and analyze data from your interactions with our communications, including: open rates, click rates, device information, and engagement patterns. This data is used to improve our communications and personalize your experience. See our Privacy Policy for details on how communication data is handled." },
  { icon: Ban, title: "8. Third-Party Communications", content: "By using ZIVO, you may receive communications from third-party service providers (airlines, hotels, restaurants, drivers) related to your bookings. ZIVO is not responsible for the content, frequency, or opt-out mechanisms of third-party communications. Contact the third party directly to manage those communications." },
  { icon: Settings, title: "9. Communication Preferences", content: "You may manage your communication preferences through your account settings. Available controls include: (a) email subscription categories; (b) push notification types; (c) SMS opt-in/opt-out; (d) marketing communication frequency. Changes to preferences may take up to 48 hours to take effect." },
  { icon: Clock, title: "10. Retention of Communication Records", content: "ZIVO retains records of all communications sent to you for: (a) legal compliance purposes; (b) dispute resolution; (c) proof of consent; (d) service improvement. Communication records may be retained for up to seven (7) years after your last interaction with ZIVO." },
];

export default function CommunicationConsent() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Communication Consent</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold mb-3">
            <Bell className="h-3 w-3" /> TCPA & CAN-SPAM Compliant
          </span>
          <h2 className="text-2xl font-bold">Communication Consent</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        {sections.map((s) => { const Icon = s.icon; return (
          <div key={s.title} className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
            <div className="rounded-2xl bg-card border border-border/40 p-4"><p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p></div>
          </div>
        ); })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Communication questions?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">support@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
