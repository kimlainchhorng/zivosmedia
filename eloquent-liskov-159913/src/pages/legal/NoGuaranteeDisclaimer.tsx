import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, DollarSign, TrendingDown, Search, Shield, Scale, Ban, Globe, Star, Cpu, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: DollarSign,
    title: "1. No Price Guarantee",
    content: "ZIVO DOES NOT GUARANTEE THAT PRICES DISPLAYED ON THE PLATFORM ARE THE LOWEST AVAILABLE. Prices are sourced from third-party providers and affiliates and may change at any time without notice. The price you see when searching may differ from the final price at checkout. Historical pricing, 'deals,' and 'savings' indicators are estimates based on available data and do not constitute guarantees or promises of savings. ZIVO is not liable for any price differences between our platform and other booking services."
  },
  {
    icon: TrendingDown,
    title: "2. No Savings Guarantee",
    content: "Any savings, discounts, or deal indicators displayed on ZIVO are for informational purposes only. ZIVO does not guarantee that: (a) you will save money by using our platform; (b) displayed discounts are the best available; (c) sale prices reflect true market value; (d) promotional prices will remain available; (e) comparison prices are current; (f) bundled packages offer actual savings over individual bookings; or (g) loyalty rewards will offset costs. You are responsible for conducting your own price comparisons before making purchasing decisions."
  },
  {
    icon: Search,
    title: "3. No Availability Guarantee",
    content: "ZIVO does not guarantee the availability of any service, product, flight, hotel room, vehicle, or other offering displayed on the platform. Availability is determined by third-party providers and may change at any time without notice. Displayed options may become unavailable between your search and booking attempt. ZIVO is not liable for any losses, costs, or inconvenience resulting from unavailability of displayed services, including but not limited to alternative booking costs, travel disruptions, or missed opportunities."
  },
  {
    icon: AlertTriangle,
    title: "4. No Outcome Guarantee",
    content: "ZIVO DOES NOT GUARANTEE ANY PARTICULAR OUTCOME FROM YOUR USE OF THE PLATFORM. This includes but is not limited to: (a) quality of rides, meals, hotels, or car rentals; (b) accuracy of estimated arrival times or delivery windows; (c) satisfaction with third-party services; (d) return on loyalty points or credits; (e) successful completion of bookings; (f) achievement of any travel-related goal; (g) accuracy of reviews or ratings; (h) safety of any service; (i) weather conditions at destinations; and (j) immigration or customs processing. All outcomes are subject to third-party performance and external factors beyond ZIVO's control."
  },
  {
    icon: Shield,
    title: "5. No Investment or Financial Advice",
    content: "Nothing on ZIVO constitutes financial, investment, or professional advice. ZIVO does not provide recommendations on how much to spend on travel, whether to purchase travel insurance, or the financial wisdom of any booking decision. Any money spent on or through the platform is at your sole discretion and risk. ZIVO IS NOT RESPONSIBLE FOR YOUR SPENDING DECISIONS OR ANY FINANCIAL CONSEQUENCES THEREOF. You should consult with qualified financial advisors before making significant travel expenditures."
  },
  {
    icon: Scale,
    title: "6. Third-Party Content & Accuracy Disclaimer",
    content: "ZIVO displays content provided by third-party partners including hotel descriptions, restaurant menus, flight details, vehicle specifications, photos, and ratings. ZIVO does not independently verify, guarantee, or endorse the accuracy, completeness, reliability, or timeliness of any third-party content. Third-party descriptions, photos, ratings, and reviews may not accurately reflect current conditions. You should verify all important details directly with the service provider before booking. ZIVO is not liable for any inaccuracies in third-party content."
  },
  {
    icon: Ban,
    title: "7. Waiver of Claims for Overspending",
    content: "BY USING ZIVO, YOU EXPRESSLY WAIVE ANY AND ALL CLAIMS AGAINST ZIVO RELATING TO: (a) the total amount you spend on the platform; (b) perceived lack of value or savings; (c) price differences between ZIVO and other platforms; (d) subscription or membership fees that do not yield expected returns; (e) promotional offers that do not meet your expectations; (f) any claim that ZIVO induced, encouraged, or caused you to spend more money than intended; (g) impulse purchases or buyer's remorse; (h) services that did not meet your subjective expectations; and (i) any accumulated spending across multiple transactions. You acknowledge that ALL spending decisions are VOLUNTARY and within your control."
  },
  {
    icon: Cpu,
    title: "8. Algorithm & Search Results Disclaimer",
    content: "ZIVO uses algorithms and automated systems to rank, sort, and display search results. These algorithms consider multiple factors including price, availability, relevance, and partner relationships. ZIVO does not guarantee that: (a) search results are comprehensive or include all available options; (b) ranking reflects the objectively 'best' option for you; (c) recommended options are optimal for your specific needs; (d) AI-powered suggestions are accurate or suitable; or (e) personalized results are free from bias. You are responsible for reviewing all available options and making independent decisions."
  },
  {
    icon: Star,
    title: "9. Reviews & Ratings Disclaimer",
    content: "User reviews and ratings on ZIVO are subjective opinions of individual users. ZIVO does not guarantee that reviews are: (a) authentic or from genuine customers; (b) accurate or representative of current conditions; (c) free from bias or manipulation; (d) complete or comprehensive; or (e) applicable to your personal experience. Average ratings may not reflect the quality of a specific transaction. ZIVO does not endorse or verify user-generated reviews and is not liable for decisions made based on them."
  },
  {
    icon: Globe,
    title: "10. International Services Disclaimer",
    content: "For services involving international travel or cross-border transactions, ZIVO makes no guarantees regarding: (a) compliance with destination country regulations; (b) accuracy of currency conversions; (c) applicability of consumer protections in foreign jurisdictions; (d) availability of customer support in local languages; (e) compatibility of services with local infrastructure; or (f) political stability or safety of destinations. Users traveling internationally assume all risks and are solely responsible for understanding destination-specific requirements."
  },
  {
    icon: Clock,
    title: "11. Time-Sensitive Information Disclaimer",
    content: "Prices, availability, schedules, and other time-sensitive information on ZIVO are subject to change without notice. Information displayed may be cached, delayed, or outdated. Flight schedules, hotel availability, and promotional offers may change between the time of display and the time of booking. ZIVO is not liable for any losses resulting from reliance on time-sensitive information that has changed or expired."
  },
  {
    icon: DollarSign,
    title: "12. No Guarantee Against Loss",
    content: "ZIVO DOES NOT GUARANTEE THAT YOU WILL NOT EXPERIENCE FINANCIAL LOSS, INCONVENIENCE, OR DISSATISFACTION WHEN USING THE PLATFORM. Travel inherently involves risk, and services accessed through ZIVO are provided by independent third parties. You acknowledge and accept that: (a) bookings may be cancelled by providers; (b) services may not meet expectations; (c) refunds are not guaranteed; (d) credits may expire; and (e) your total expenditure on the platform is your sole responsibility. ZIVO SHALL HAVE NO LIABILITY FOR ANY AGGREGATE AMOUNT YOU CHOOSE TO SPEND."
  },
];

export default function NoGuaranteeDisclaimer() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">No Guarantee Disclaimer</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-semibold mb-3">
            <AlertTriangle className="h-3 w-3" /> Important Disclaimer
          </span>
          <h2 className="text-2xl font-bold">No Guarantee Disclaimer</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4">
          <p className="text-sm leading-relaxed font-medium">ZIVO MAKES NO GUARANTEES REGARDING PRICES, SAVINGS, AVAILABILITY, QUALITY, SAFETY, OR OUTCOMES. ALL SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE." BY USING ZIVO, YOU ACKNOWLEDGE AND ACCEPT THESE DISCLAIMERS IN THEIR ENTIRETY.</p>
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
          <p className="text-sm font-semibold">Questions about these disclaimers?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">legal@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}