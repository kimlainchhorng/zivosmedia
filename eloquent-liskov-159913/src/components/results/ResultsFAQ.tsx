/**
 * Results FAQ Component
 * Collapsible FAQ accordion with JSON-LD FAQPage schema
 * and internal cross-links for SEO
 */

import { Link } from "react-router-dom";
import { HelpCircle, Plane, Hotel, Car, Sparkles, Mail } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import FAQSchema, { type FAQItem } from "@/components/shared/FAQSchema";
import { cn } from "@/lib/utils";

export type ResultsServiceType = "flights" | "hotels" | "cars";

interface ResultsFAQProps {
  service: ResultsServiceType;
  className?: string;
}

// Service-specific accent colors
const serviceColors = {
  flights: {
    accent: "text-sky-500",
    iconBg: "bg-sky-500/10",
    border: "border-sky-500/20",
    hoverBg: "hover:bg-sky-500/5",
  },
  hotels: {
    accent: "text-amber-500",
    iconBg: "bg-amber-500/10",
    border: "border-amber-500/20",
    hoverBg: "hover:bg-amber-500/5",
  },
  cars: {
    accent: "text-violet-500",
    iconBg: "bg-violet-500/10",
    border: "border-violet-500/20",
    hoverBg: "hover:bg-violet-500/5",
  },
};

// FAQ content per service with internal links
const faqContent: Record<ResultsServiceType, { question: string; answer: React.ReactNode; plainAnswer: string }[]> = {
  flights: [
    {
      question: "How does ZIVO find flight prices?",
      answer: (
        <>
          ZIVO connects directly to airline ticketing systems to display real-time availability and final prices.
        </>
      ),
      plainAnswer: "ZIVO connects directly to airline ticketing systems to display real-time availability and final prices.",
    },
    {
      question: "Are prices final?",
      answer: (
        <>
          Yes. Prices shown on ZIVO are final and confirmed before payment.
        </>
      ),
      plainAnswer: "Yes. Prices shown on ZIVO are final and confirmed before payment.",
    },
    {
      question: "Can I change my dates?",
      answer: (
        <>
          Yes! Use the "Edit search" button at the top of this page to modify your travel dates, destinations, 
          or number of passengers. Results will update automatically.
        </>
      ),
      plainAnswer: "Yes! Use the Edit search button at the top of this page to modify your travel dates, destinations, or number of passengers. Results will update automatically.",
    },
    {
      question: "Do I book on ZIVO or another site?",
      answer: (
        <>
          You book and pay directly on ZIVO. Tickets are issued by licensed ticketing partners under airline rules.
        </>
      ),
      plainAnswer: "You book and pay directly on ZIVO. Tickets are issued by licensed ticketing partners under airline rules.",
    },
    {
      question: "Is my payment secure?",
      answer: (
        <>
          All payments are processed securely on ZIVO using bank-grade encryption. Your payment data is protected.
        </>
      ),
      plainAnswer: "All payments are processed securely on ZIVO using bank-grade encryption. Your payment data is protected.",
    },
    {
      question: "Need help with your trip?",
      answer: (
        <>
          Check out our <Link to="/extras" className="text-foreground hover:underline font-medium">travel extras</Link> for 
          airport transfers, tours, eSIM data, and more. For any questions, visit our{" "}
          <Link to="/contact" className="text-foreground hover:underline font-medium">contact page</Link> or email us directly.
        </>
      ),
      plainAnswer: "Check out our travel extras for airport transfers, tours, eSIM data, and more. For any questions, visit our contact page or email us directly.",
    },
  ],
  hotels: [
    {
      question: "How are hotel prices calculated?",
      answer: (
        <>
          We aggregate prices from major booking platforms including Booking.com, Hotels.com, and others. 
          Prices are typically shown per night and may vary based on room type, dates, and availability.
        </>
      ),
      plainAnswer: "We aggregate prices from major booking platforms including Booking.com, Hotels.com, and others. Prices are typically shown per night and may vary based on room type, dates, and availability.",
    },
    {
      question: "Can I cancel my booking?",
      answer: (
        <>
          Cancellation policies vary by hotel and rate type. Look for "Free Cancellation" badges on listings. 
          Full cancellation terms will be shown on the partner's booking page before you confirm.
        </>
      ),
      plainAnswer: "Cancellation policies vary by hotel and rate type. Look for Free Cancellation badges on listings. Full cancellation terms will be shown on the partner's booking page before you confirm.",
    },
    {
      question: "Are taxes included in the price?",
      answer: (
        <>
          Most prices shown include taxes, but this may vary by destination and partner. The complete breakdown 
          including all fees will be displayed on the booking page before payment.
        </>
      ),
      plainAnswer: "Most prices shown include taxes, but this may vary by destination and partner. The complete breakdown including all fees will be displayed on the booking page before payment.",
    },
    {
      question: "When do I pay?",
      answer: (
        <>
          Payment timing depends on the rate and property. Many hotels offer "Pay at property" options, 
          while others require upfront payment. This information is shown during the booking process.
        </>
      ),
      plainAnswer: "Payment timing depends on the rate and property. Many hotels offer Pay at property options, while others require upfront payment. This information is shown during the booking process.",
    },
    {
      question: "Who provides customer support?",
      answer: (
        <>
          For booking-related support, contact the partner site where you completed your reservation. 
          For help using ZIVO, reach out via our <Link to="/contact" className="text-amber-500 hover:underline font-medium">contact page</Link>.
        </>
      ),
      plainAnswer: "For booking-related support, contact the partner site where you completed your reservation. For help using ZIVO, reach out via our contact page.",
    },
    {
      question: "Looking for more travel services?",
      answer: (
        <>
          Combine your hotel with <Link to="/flights" className="text-amber-500 hover:underline font-medium">flights</Link> or{" "}
          <Link to="/rent-car" className="text-amber-500 hover:underline font-medium">car rentals</Link> for a complete trip. 
          Don't forget to check our <Link to="/extras" className="text-amber-500 hover:underline font-medium">travel extras</Link> for 
          transfers, tours, and more.
        </>
      ),
      plainAnswer: "Combine your hotel with flights or car rentals for a complete trip. Don't forget to check our travel extras for transfers, tours, and more.",
    },
  ],
  cars: [
    {
      question: "What is included in the rental price?",
      answer: (
        <>
          Base rental prices typically include the vehicle, basic insurance, and applicable taxes. 
          Additional coverage, fuel options, and extras can be added during booking on the partner site.
        </>
      ),
      plainAnswer: "Base rental prices typically include the vehicle, basic insurance, and applicable taxes. Additional coverage, fuel options, and extras can be added during booking on the partner site.",
    },
    {
      question: "Do I need a credit card?",
      answer: (
        <>
          Most rental companies require a credit card for the security deposit. Some accept debit cards 
          with additional requirements. Check the specific terms on the booking page.
        </>
      ),
      plainAnswer: "Most rental companies require a credit card for the security deposit. Some accept debit cards with additional requirements. Check the specific terms on the booking page.",
    },
    {
      question: "Can I pick up at the airport?",
      answer: (
        <>
          Yes! Airport locations are the most common pickup points. Look for the terminal information 
          and shuttle details on the partner's booking page. Many offer 24/7 pickup.
        </>
      ),
      plainAnswer: "Yes! Airport locations are the most common pickup points. Look for the terminal information and shuttle details on the partner's booking page. Many offer 24/7 pickup.",
    },
    {
      question: "Is insurance included?",
      answer: (
        <>
          Basic insurance (CDW/LDW) is typically included, but coverage levels vary. You can usually add 
          full protection or personal effects coverage during booking for extra peace of mind.
        </>
      ),
      plainAnswer: "Basic insurance (CDW/LDW) is typically included, but coverage levels vary. You can usually add full protection or personal effects coverage during booking for extra peace of mind.",
    },
    {
      question: "Who handles the rental?",
      answer: (
        <>
          The rental is managed by the car rental company you choose (Hertz, Avis, Budget, etc.). 
          ZIVO connects you to the best deals, but the rental agreement is with the company directly.
        </>
      ),
      plainAnswer: "The rental is managed by the car rental company you choose (Hertz, Avis, Budget, etc.). ZIVO connects you to the best deals, but the rental agreement is with the company directly.",
    },
    {
      question: "Need extras for your trip?",
      answer: (
        <>
          Enhance your journey with our <Link to="/extras" className="text-foreground hover:underline font-medium">travel extras</Link>—book 
          airport transfers, activities, eSIM data plans, and luggage storage. Also check our{" "}
          <Link to="/flights" className="text-foreground hover:underline font-medium">flights</Link> and{" "}
          <Link to="/hotels" className="text-foreground hover:underline font-medium">hotels</Link> for a complete trip.
        </>
      ),
      plainAnswer: "Enhance your journey with our travel extras—book airport transfers, activities, eSIM data plans, and luggage storage. Also check our flights and hotels for a complete trip.",
    },
  ],
};

export function ResultsFAQ({ service, className }: ResultsFAQProps) {
  const colors = serviceColors[service];
  const faqs = faqContent[service];

  // Build plain-text FAQ items for schema
  const schemaFaqs: FAQItem[] = faqs.map((faq) => ({
    question: faq.question,
    answer: faq.plainAnswer,
  }));

  return (
    <>
      {/* JSON-LD FAQ Schema */}
      <FAQSchema faqs={schemaFaqs} pageType={service} />

      {/* Visual FAQ Section */}
      <section className={cn("py-10 bg-muted/30", className)}>
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className={cn("p-2 rounded-xl", colors.iconBg)}>
              <HelpCircle className={cn("w-5 h-5", colors.accent)} />
            </div>
            <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className={cn(
                  "bg-background rounded-xl border px-4 data-[state=open]:shadow-sm transition-shadow",
                  colors.border
                )}
              >
                <AccordionTrigger
                  className={cn(
                    "text-left text-sm sm:text-base font-medium py-4",
                    colors.hoverBg,
                    "rounded-xl -mx-2 px-2"
                  )}
                >
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}

export default ResultsFAQ;
