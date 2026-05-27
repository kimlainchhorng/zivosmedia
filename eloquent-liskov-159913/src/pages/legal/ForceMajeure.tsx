import { useNavigate } from "react-router-dom";
import { ArrowLeft, CloudLightning, Shield, Globe, AlertTriangle, Clock, Scale, Lock, Bell, Gavel, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: CloudLightning,
    title: "1. Force Majeure Events Defined",
    content: "ZIVO shall not be liable for any failure or delay in performing its obligations where such failure or delay results from Force Majeure Events, including but not limited to: natural disasters (earthquakes, hurricanes, floods, volcanic eruptions, tsunamis, wildfires, landslides, avalanches), pandemics, epidemics, or public health emergencies (including COVID-19 and successor variants), war, terrorism, civil unrest, insurrection, riots, or armed conflict, government actions, sanctions, embargoes, travel bans, border closures, or regulatory changes, strikes, labor disputes, or work stoppages, power outages, telecommunications failures, satellite failures, or internet disruptions, cyberattacks, ransomware, hacking, or distributed denial-of-service attacks, supply chain disruptions, fuel shortages, or infrastructure failures, nuclear or industrial accidents, and any other events beyond ZIVO's reasonable control."
  },
  {
    icon: Globe,
    title: "2. Travel-Specific Force Majeure Events",
    content: "Additional Force Majeure Events specific to travel services include: airline strikes or air traffic control disruptions, pilot shortages or crew scheduling issues, airport closures or security incidents, severe weather grounding flights or disrupting ground transportation, volcanic ash clouds or airspace restrictions, cruise port closures or maritime emergencies, natural disaster damage to hotels, airports, or rental properties, disease outbreaks or quarantine orders affecting travel destinations, civil aviation authority directives or airspace closures, border closures, visa processing delays, or immigration system failures, and acts of piracy, hijacking, or terrorism. ZIVO is not liable for any costs, losses, damages, additional expenses, or inconvenience resulting from these events."
  },
  {
    icon: Shield,
    title: "3. Effect on ZIVO's Obligations",
    content: "During a Force Majeure Event: (a) ZIVO's obligations under these Terms are suspended for the duration of the event plus a reasonable recovery period; (b) all deadlines, response times, and service level commitments are extended by the duration of the disruption; (c) ZIVO is NOT required to provide refunds for service disruptions caused by Force Majeure Events unless specifically required by applicable mandatory law; (d) ZIVO will use commercially reasonable efforts to resume services as soon as practicable; (e) ZIVO will communicate known impacts through available channels; (f) ZIVO's liability cap shall be reduced proportionally during Force Majeure Events; and (g) ZIVO may modify, reduce, or suspend services as necessary."
  },
  {
    icon: AlertTriangle,
    title: "4. User Responsibilities During Force Majeure",
    content: "During Force Majeure Events, you are solely responsible for: (a) monitoring travel advisories, government notices, and official guidance; (b) maintaining comprehensive travel insurance that covers Force Majeure scenarios including trip cancellation, interruption, and emergency evacuation; (c) making and paying for alternative travel arrangements at your own expense; (d) complying with all government orders, quarantine requirements, and safety directives; (e) mitigating your own losses and damages where possible; (f) evacuating dangerous areas and seeking shelter; (g) maintaining copies of all travel documents; and (h) registering with your country's embassy when traveling internationally. ZIVO strongly recommends 'cancel for any reason' travel insurance for all bookings."
  },
  {
    icon: Clock,
    title: "5. Duration, Termination & Credits",
    content: "If a Force Majeure Event continues for more than sixty (60) consecutive days, either party may terminate the affected booking or service without penalty. In such cases: (a) ZIVO may issue platform credits at its sole discretion; (b) credits issued are non-transferable and expire within 12 months; (c) cash refunds are not guaranteed unless required by mandatory applicable law; (d) any costs already paid to third-party providers (airlines, hotels, etc.) by ZIVO are non-refundable to you; and (e) ZIVO will make good faith efforts to assist affected travelers where commercially practicable."
  },
  {
    icon: Heart,
    title: "6. Pandemic & Public Health Emergencies",
    content: "You acknowledge that pandemics, epidemics, and public health emergencies constitute Force Majeure Events. During such events: (a) travel restrictions may be imposed with little or no notice; (b) quarantine requirements may affect your travel plans and duration of stay; (c) health screening and testing requirements may delay travel; (d) service providers may operate with reduced capacity or modified procedures; (e) ZIVO is not responsible for health risks associated with travel during public health emergencies; and (f) you travel at your own risk and assume responsibility for your health and the health of your travel companions."
  },
  {
    icon: Lock,
    title: "7. Cybersecurity Events",
    content: "Cybersecurity events including but not limited to ransomware attacks, data breaches, DDoS attacks, and critical infrastructure hacking constitute Force Majeure Events when they are beyond ZIVO's reasonable control despite implementation of industry-standard security measures. During cybersecurity events: (a) services may be temporarily unavailable; (b) booking data may be inaccessible; (c) payment processing may be disrupted; and (d) ZIVO will notify affected users as soon as practicable. ZIVO maintains cyber insurance and incident response procedures but cannot guarantee uninterrupted service."
  },
  {
    icon: Bell,
    title: "8. Notice Requirements",
    content: "ZIVO will provide notice of Force Majeure Events affecting its services as soon as reasonably practicable through: (a) email notifications to affected users; (b) in-app announcements; (c) website status page updates at status.hizivo.com; (d) social media communications; and (e) push notifications where enabled. Failure to provide notice does not waive ZIVO's right to invoke Force Majeure protections. Users are responsible for independently monitoring conditions affecting their travel plans."
  },
  {
    icon: Scale,
    title: "9. No Waiver & Cumulative Rights",
    content: "ZIVO's invocation of a Force Majeure Event does not constitute a waiver of any other rights or remedies available under these Terms or applicable law. The burden of proving that a Force Majeure Event has occurred and that it caused the failure or delay rests with the party seeking relief. Force Majeure protections are cumulative and in addition to (not in replacement of) other limitations of liability in these Terms."
  },
  {
    icon: Gavel,
    title: "10. Insurance Recommendation",
    content: "ZIVO STRONGLY AND EXPLICITLY RECOMMENDS that all users purchase comprehensive travel insurance before booking any travel through the platform. Such insurance should cover: (a) trip cancellation for any reason; (b) trip interruption; (c) emergency medical evacuation; (d) lost or delayed baggage; (e) travel delays; (f) pandemic-related cancellations; (g) political evacuation; and (h) natural disaster disruptions. Failure to maintain adequate travel insurance does not increase ZIVO's liability or diminish the applicability of this Force Majeure policy."
  },
];

export default function ForceMajeure() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Force Majeure</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold mb-3">
            <CloudLightning className="h-3 w-3" /> Events Beyond Our Control
          </span>
          <h2 className="text-2xl font-bold">Force Majeure Policy</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4">
          <p className="text-sm leading-relaxed">This policy explains how ZIVO handles extraordinary events beyond our reasonable control that may affect service delivery, bookings, or platform availability. These provisions are essential to the agreement between you and ZIVO.</p>
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
          <p className="text-sm font-semibold">Active disruptions?</p>
          <p className="text-xs text-muted-foreground">Check <span className="text-primary font-semibold">status.hizivo.com</span> for service updates</p>
        </div>
      </div>
    </div>
  );
}