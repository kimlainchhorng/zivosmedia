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
      question: "Does ZIVO handle hotel payments or reservations?",
      answer: "No. ZIVO is a comparison platform only. All reservations, payments, cancellations, and modifications are handled by the booking site you choose (like Booking.com or Hotels.com). We do not process payments or hold reservations."
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
      answer: "No, ZIVO is free to use. We earn a commission from our partners when you complete a booking, at no additional cost to you."
    },
  ],
  cars: [
    {
      question: "How does ZIVO Car Rental work?",
      answer: "ZIVO compares car rental prices from major providers like Rentalcars.com, Kayak, Expedia, and local rental companies. Find the best deal, then click 'Rent Now' to complete your booking on the rental company's website."
    },
    {
      question: "Does ZIVO process car rental payments?",
      answer: "No. ZIVO is a search and comparison service. All rentals, payments, insurance, and modifications are handled directly by the car rental company or booking site you choose."
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
      answer: "No. ZIVO is free for travelers. We earn a small commission from our partners when you complete a rental, at no extra cost to you."
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
                <Link to="/terms" className="text-foreground hover:underline">View terms</Link>
              </>
            ) : (
              <>
                <strong className="text-foreground">Important:</strong> All bookings, payments, refunds, and changes 
                are handled directly by our travel partners. ZIVO is a search and comparison platform for hotels and car rentals.{' '}
                <Link to="/partner-disclosure" className="text-foreground hover:underline">Learn more</Link>
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}