import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Car, Plane, UtensilsCrossed, Shield, Heart, Globe, Smartphone, CloudLightning, Lock, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: AlertTriangle,
    title: "1. General Assumption of Risk",
    content: "BY USING ZIVO, YOU ACKNOWLEDGE AND AGREE THAT YOU VOLUNTARILY ASSUME ALL RISKS ASSOCIATED WITH YOUR USE OF THE PLATFORM AND ANY SERVICES ACCESSED THROUGH IT. This includes, but is not limited to, risks of personal injury, death, property damage, financial loss, data breach, identity theft, dissatisfaction with services, and emotional distress. ZIVO is a technology platform and does not provide the underlying services directly. You expressly waive any claim that ZIVO failed to adequately warn you of any risks."
  },
  {
    icon: Car,
    title: "2. Transportation Risks",
    content: "You acknowledge that using ride-hailing and car rental services involves inherent and significant risks including but not limited to: traffic accidents, vehicle collisions, rollover incidents, vehicle breakdowns, mechanical failures, delayed pickups, route deviations, carjacking, property damage, theft of personal belongings, and personal injury including serious bodily harm or death. Drivers are independent contractors, NOT ZIVO employees. ZIVO does not guarantee driver conduct, vehicle condition, driver sobriety, or trip safety. You assume FULL responsibility for your decision to use transportation services and release ZIVO from all liability."
  },
  {
    icon: UtensilsCrossed,
    title: "3. Food Delivery Risks",
    content: "You acknowledge risks associated with food delivery including but not limited to: allergic reactions (including anaphylaxis), foodborne illness, food poisoning, bacterial contamination, incorrect orders, undisclosed ingredients, cross-contamination, late delivery resulting in food temperature issues, spoilage, and contamination during transit. Restaurants are independent partners solely responsible for food preparation, safety, hygiene, and compliance with health codes. ZIVO does NOT prepare, handle, inspect, or test food. You assume FULL responsibility for reviewing allergen information, dietary suitability, and food safety before ordering and consuming any food."
  },
  {
    icon: Plane,
    title: "4. Travel & Aviation Risks",
    content: "You acknowledge that air travel and hotel stays involve inherent risks including but not limited to: flight delays, cancellations, diversions, overbooking, denied boarding, lost or damaged luggage, travel document issues (expired passports, visa denials), health risks (deep vein thrombosis, jet lag, altitude sickness), exposure to communicable diseases, natural disasters, political instability, terrorism, hijacking, and personal safety concerns at destinations. ZIVO is not an airline and has no control over flight operations. You assume all risks associated with your travel decisions. COMPREHENSIVE TRAVEL INSURANCE IS STRONGLY RECOMMENDED."
  },
  {
    icon: Shield,
    title: "5. Financial Risks",
    content: "You acknowledge and accept the following financial risks: (a) prices displayed on ZIVO are estimates and may change before booking confirmation; (b) exchange rates may fluctuate causing actual charges to differ; (c) third-party charges (baggage fees, resort fees, tolls, parking, taxes) may apply and are your responsibility; (d) promotional offers may have limitations, restrictions, or may expire; (e) refund eligibility varies by service, provider, and fare type; (f) loyalty points and credits may lose value or expire; (g) payment disputes may take weeks to resolve; and (h) chargebacks may result in account suspension. You agree that ZIVO is not responsible for any financial losses resulting from price changes, booking errors you make, third-party charges, or market fluctuations."
  },
  {
    icon: Heart,
    title: "6. Health, Safety & Medical Risks",
    content: "You are solely responsible for your own health and safety when using services accessed through ZIVO. This includes: ensuring you are medically fit to travel, checking travel advisories and vaccination requirements, carrying necessary medications, informing service providers of medical conditions or disabilities, following all safety instructions, wearing seatbelts, and complying with airline safety procedures. ZIVO does not provide medical advice, health screenings, or safety inspections. You assume all risk of illness, injury, or medical emergency occurring during or as a result of services booked through ZIVO."
  },
  {
    icon: Globe,
    title: "7. International Travel Risks",
    content: "For international travel, you assume additional risks including but not limited to: visa denials and entry refusals, customs delays and seizure of goods, currency conversion losses, foreign legal systems with different standards, language barriers leading to misunderstandings, different safety standards and regulations, political or civil unrest, kidnapping or detention, inadequate medical facilities, infectious disease outbreaks, and natural disasters. You are solely responsible for ensuring you have valid travel documents, necessary visas, required vaccinations, and compliance with entry/exit requirements for all destinations."
  },
  {
    icon: CloudLightning,
    title: "8. Environmental & Natural Disaster Risks",
    content: "You acknowledge risks related to weather and natural events including but not limited to: hurricanes, tornadoes, earthquakes, tsunamis, volcanic eruptions, floods, wildfires, extreme temperatures, severe storms, and pandemic/epidemic outbreaks. These events may affect travel plans, cause service disruptions, endanger personal safety, or result in financial loss. ZIVO has no control over natural events and is not liable for any losses, damages, or injuries resulting from them."
  },
  {
    icon: Smartphone,
    title: "9. Technology & Platform Risks",
    content: "You acknowledge risks associated with the use of technology, including: (a) app crashes or malfunctions during critical booking moments; (b) inaccurate GPS or location data; (c) delayed notifications; (d) data breaches or unauthorized access to your account; (e) phishing attempts using ZIVO's branding; (f) loss of booking data; (g) internet connectivity issues preventing access to bookings; and (h) incompatibility with your device. ZIVO employs industry-standard security measures but cannot guarantee against all technology risks."
  },
  {
    icon: Lock,
    title: "10. Privacy & Data Risks",
    content: "While ZIVO implements robust security measures, you acknowledge that: (a) no internet transmission is 100% secure; (b) data breaches may occur despite best efforts; (c) third-party service providers may have different privacy standards; (d) personal information shared for bookings may be subject to foreign data protection laws; (e) location data may be accessible to service providers during active bookings. You assume the risk of providing personal information through the platform."
  },
  {
    icon: DollarSign,
    title: "11. Third-Party Provider Risks",
    content: "All services accessed through ZIVO are provided by independent third-party providers. You acknowledge and accept risks including: (a) providers may go bankrupt or cease operations; (b) providers may not honor bookings; (c) provider quality may vary significantly; (d) providers may change terms or pricing without notice; (e) providers may have inadequate insurance; (f) providers may not comply with local regulations; and (g) providers may not meet your expectations. ZIVO does not control, supervise, or audit third-party providers and disclaims all liability for their acts or omissions."
  },
  {
    icon: Users,
    title: "12. Interaction Risks with Other Users",
    content: "You acknowledge risks associated with interacting with other platform users, including drivers, hosts, and fellow travelers. These risks include but are not limited to: harassment, assault, theft, fraud, miscommunication, cultural misunderstandings, and disputes. ZIVO does not perform comprehensive background checks on all users and cannot guarantee the identity, character, or conduct of any user. You are solely responsible for exercising caution and good judgment in all interactions."
  },
  {
    icon: AlertTriangle,
    title: "13. Voluntary Participation & Release",
    content: "YOUR USE OF ZIVO AND ITS SERVICES IS ENTIRELY VOLUNTARY. By continuing to use the platform, you acknowledge that you have read, understood, and accepted all risks described herein. YOU HEREBY RELEASE AND FOREVER DISCHARGE ZIVO LLC, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND AFFILIATES FROM ANY AND ALL CLAIMS, DAMAGES, LOSSES, AND EXPENSES ARISING FROM OR RELATED TO YOUR USE OF THE SERVICES, TO THE MAXIMUM EXTENT PERMITTED BY LAW. This release is binding on your heirs, executors, administrators, and assigns."
  },
];

export default function AssumptionOfRisk() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Assumption of Risk</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-semibold mb-3">
            <AlertTriangle className="h-3 w-3" /> Comprehensive Risk Disclosure
          </span>
          <h2 className="text-2xl font-bold">Assumption of Risk</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4">
          <p className="text-sm leading-relaxed font-medium">BY USING ZIVO, YOU VOLUNTARILY AND KNOWINGLY ASSUME ALL RISKS ASSOCIATED WITH THE SERVICES, INCLUDING RISK OF PERSONAL INJURY, DEATH, PROPERTY DAMAGE, AND FINANCIAL LOSS. PLEASE READ THIS DOCUMENT CAREFULLY BEFORE PROCEEDING.</p>
        </div>
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
              </div>
            </div>
          );
        })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Questions?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">legal@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}