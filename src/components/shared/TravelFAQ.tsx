import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Info } from "lucide-react";
import FAQSchema from "./FAQSchema";
import type { FAQItem } from "./FAQSchema";
import { Link } from "react-router-dom";

/**
 * Travel FAQ Section with built-in schema for SEO
 * Use on Flights, Hotels, Car Rental pages
 */

interface TravelFAQProps {
  serviceType: 'flights' | 'hotels' | 'cars';
  className?: string;
}

const FAQ_DATA: Record<string, FAQItem[]> = {
  flights: [
    {
      question: "How does ZIVO Flights work?",
      answer: "ZIVO is a licensed flight booking platform. Search and compare flights from 500+ airlines, then book directly on ZIVO. We issue your e-ticket instantly after payment."
    },
    {
      question: "Does ZIVO issue tickets directly?",
      answer: "Yes. ZIVO sells flight tickets as a sub-agent of licensed ticketing providers. After you complete payment on ZIVO, your e-ticket is issued automatically and sent to your email."
    },
    {
      question: "How do I change or cancel my flight booking?",
      answer: "Contact ZIVO Support for any changes, cancellations, or refunds. Airline fare rules and fees apply. You can find your booking in 'My Trips' in your account."
    },
    {
      question: "Are the prices on ZIVO final?",
      answer: "Yes. Prices shown include all taxes and fees. The total you see is the total you pay. No hidden charges at checkout."
    },
    {
      question: "Are there booking fees on ZIVO?",
      answer: "ZIVO does not add hidden booking fees. The price shown includes all taxes, carrier-imposed fees, and service charges."
    },
    {
      question: "What if I have a problem with my booking?",
      answer: "Contact ZIVO Support for any issues with your booking. We handle all customer service for flights booked through our platform."
    },
  ],
  hotels: [
    {
      question: "How does ZIVO Hotels work?",
      answer: "ZIVO helps you compare hotel prices from multiple booking sites including Booking.com, Hotels.com, Expedia, and more. When you find a hotel you like, click 'View Deal' to be redirected to the booking site to complete your reservation."
    },
    {
      // Scoped to the COMPARISON path, which is what this FAQ is about. The
      // previous answer opened "No. ZIVO is a comparison platform only" and
      // stated flatly that "we do not process payments" — false for the other
      // hotel path: ZIVO also sells its own lodging, takes deposits, and runs
      // its own checkout (create-lodging-deposit, create-lodging-square-checkout,
      // hotel_bookings). A guest who booked through ZIVO and read this would be
      // told their own payment was somebody else's to fix.
      question: "Does ZIVO handle hotel payments or reservations?",
      answer: "It depends on how you booked. If you compared prices here and were redirected to a partner site like Booking.com or Hotels.com, that site holds your reservation and handles the payment, changes, and cancellation. If you booked a stay directly on ZIVO, we take the payment and are the merchant of record — contact ZIVO support and see our Refund Policy."
    },
    {
      question: "How do I cancel or modify my hotel booking?",
      answer: "Please contact the hotel directly or the booking site where you made your reservation. Check your confirmation email for contact details and cancellation policies."
    },
    {
      question: "Why do hotel prices vary between sites?",
      answer: "Different booking sites may have different rates, promotions, or availability. ZIVO shows you multiple options so you can compare and choose the best deal for your stay."
    },
    {
      question: "Are prices on ZIVO accurate?",
      answer: "Prices are sourced in real-time from our partners and are indicative. The final price, including taxes and fees, will be confirmed on the booking site before you pay."
    },
    {
      question: "Does ZIVO charge any fees?",
      answer: "Browsing and comparing is free. For bookings you complete on a partner site, we are paid a commission by that partner at no extra cost to you. For anything you book and pay for on ZIVO, any payment processing fee is included in the total shown before you confirm, and cancellation fees are set out in our Cancellation Policy."
    },
  ],
  cars: [
    {
      question: "How does ZIVO Car Rental work?",
      answer: "ZIVO compares car rental prices from major providers like Rentalcars.com, Kayak, Expedia, and local rental companies. Find the best deal, then click 'Rent Now' to complete your booking on the rental company's website."
    },
    {
      question: "Does ZIVO process car rental payments?",
      answer: "It depends on how you booked. If you compared prices here and were redirected to a rental company or booking site, they take the payment and handle insurance and modifications. If you booked a vehicle directly on ZIVO, we take the payment and are the merchant of record — contact ZIVO support and see our Refund Policy."
    },
    {
      question: "How do I modify or cancel my car rental?",
      answer: "Contact the car rental company or booking site where you made your reservation. Your confirmation email will have their contact information and cancellation policies."
    },
    {
      question: "Why do prices change after I search?",
      answer: "Car rental prices are dynamic and change based on availability, location, and demand. Prices on ZIVO are indicative; the final price is confirmed when you complete your booking with the rental provider."
    },
    {
      question: "What do I need to rent a car?",
      answer: "Most rental companies require a valid driver's license, credit card, and minimum age (usually 21-25). Some may require an International Driving Permit. Requirements vary by provider and location."
    },
    {
      question: "Does ZIVO charge booking fees?",
      answer: "Browsing and comparing is free. Where you complete a rental with a partner, they pay us a commission at no extra cost to you. For a vehicle booked and paid for on ZIVO, the total shown before you confirm includes any payment processing fee, and cancellation terms are in our Cancellation Policy."
    },
  ],
};

export default function TravelFAQ({ serviceType, className = '' }: TravelFAQProps) {
  const faqs = FAQ_DATA[serviceType];
  
  const serviceLabels = {
    flights: { label: 'Flights', color: 'bg-sky-500/20 text-sky-500 border-sky-500/30' },
    hotels: { label: 'Hotels', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
    cars: { label: 'Car Rentals', color: 'bg-violet-500/20 text-violet-500 border-violet-500/30' },
  };
  
  const { label, color } = serviceLabels[serviceType];

  return (
    <section className={`py-12 px-4 ${className}`}>
      {/* Inject FAQ Schema for SEO */}
      <FAQSchema faqs={faqs} pageType={serviceType} />
      
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Badge className={`mb-3 ${color}`}>
            <HelpCircle className="w-3 h-3 mr-1" />
            Frequently Asked Questions
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            {label} FAQ
          </h2>
          <p className="text-muted-foreground">
            Common questions about searching and comparing {label.toLowerCase()} on ZIVO
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`faq-${index}`}
              className="border border-border/50 rounded-xl px-5 bg-card/50 backdrop-blur-sm"
            >
              <AccordionTrigger className="hover:no-underline text-left font-semibold py-4 text-sm md:text-base">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4 text-sm">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Disclosure - varies by service */}
        <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/50 flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {serviceType === 'flights' ? (
              <>
                <strong className="text-foreground">About Flight Bookings:</strong> ZIVO sells flight tickets as a sub-agent of licensed ticketing providers. 
                Tickets are issued by authorized partners under applicable airline rules.{' '}
                <Link to="/legal/terms" className="text-foreground hover:underline">View terms</Link>
              </>
            ) : (
              <>
                {/* Split by who actually took the money. The previous wording
                    said every booking, payment, and refund is "handled directly
                    by our travel partners" — false for stays and vehicles booked
                    on ZIVO itself, which run through ZIVO's own checkout
                    (create-lodging-deposit, capture-car-rental-balance). A guest
                    reading that would chase a refund from the wrong company. */}
                <strong className="text-foreground">Important:</strong> Where you compared prices here and
                were redirected to a partner site, that partner holds the booking and handles payments,
                refunds, and changes. Stays and vehicles booked directly on ZIVO are handled by ZIVO —
                see our{' '}
                <Link to="/legal/refunds" className="text-foreground hover:underline">Refund Policy</Link>
                {' '}or{' '}
                <Link to="/legal/partner-disclosure" className="text-foreground hover:underline">partner disclosure</Link>
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
