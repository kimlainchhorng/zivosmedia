import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, MapPin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import FAQSchema from "@/components/shared/FAQSchema";
import type { FAQItem } from "@/components/shared/FAQSchema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/**
 * Destination content sections for SEO pages
 */

interface DestinationIntroProps {
  text: string;
}

export function DestinationIntro({ text }: DestinationIntroProps) {
  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-body-lg text-muted-foreground leading-relaxed">
            {text}
          </p>
        </div>
      </div>
    </section>
  );
}

interface TravelTipsProps {
  tips: string[];
  serviceType: 'flights' | 'hotels' | 'cars';
}

export function TravelTips({ tips, serviceType }: TravelTipsProps) {
  const colorClass = {
    flights: 'text-flights',
    hotels: 'text-hotels',
    cars: 'text-cars'
  }[serviceType];

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Lightbulb className={cn("w-5 h-5", colorClass)} />
            <h2 className="text-xl font-bold">Travel Tips</h2>
          </div>
          <ul className="space-y-3">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground",
                  serviceType === 'flights' && "bg-flights",
                  serviceType === 'hotels' && "bg-hotels",
                  serviceType === 'cars' && "bg-cars"
                )}>
                  {index + 1}
                </span>
                <span className="text-muted-foreground">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

interface RelatedDestinationsProps {
  destinations: { name: string; slug: string }[];
  serviceType: 'flights' | 'hotels' | 'cars';
  isRoute?: boolean; // For flight routes
}

export function RelatedDestinations({ 
  destinations, 
  serviceType,
  isRoute = false 
}: RelatedDestinationsProps) {
  const getLink = (dest: { name: string; slug: string }) => {
    if (serviceType === 'flights') {
      return isRoute ? `/flights/from-${dest.slug}` : `/flights/to-${dest.slug}`;
    }
    if (serviceType === 'hotels') {
      return `/hotels/${dest.slug}`;
    }
    return `/rent-car/${dest.slug}`;
  };

  const colorClass = {
    flights: 'hover:border-flights/50 hover:text-flights',
    hotels: 'hover:border-hotels/50 hover:text-hotels',
    cars: 'hover:border-cars/50 hover:text-cars'
  }[serviceType];

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">
            {serviceType === 'flights' && "Related Routes"}
            {serviceType === 'hotels' && "Explore More Cities"}
            {serviceType === 'cars' && "Popular Rental Locations"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {destinations.map((dest) => (
            <Link
              key={dest.slug}
              to={getLink(dest)}
              className={cn(
                "px-4 py-2 rounded-full border border-border bg-card/50",
                "flex items-center gap-2 transition-all",
                colorClass
              )}
            >
              <span>{dest.name}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

interface DestinationFAQProps {
  faqs: FAQItem[];
  serviceType: 'flights' | 'hotels' | 'cars';
}

export function DestinationFAQ({ faqs, serviceType }: DestinationFAQProps) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <FAQSchema faqs={faqs} pageType={serviceType} />
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="border rounded-xl px-4 bg-card/50"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

interface AffiliateDisclaimerProps {
  serviceType: 'flights' | 'hotels' | 'cars';
}

export function AffiliateDisclaimer({ serviceType }: AffiliateDisclaimerProps) {
  const serviceText = {
    flights: "flights",
    hotels: "hotel rooms",
    cars: "cars"
  }[serviceType];

  return (
    <section className="py-8 border-t border-border/50">
      <div className="container mx-auto px-4 text-center">
        <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
          ZIVO may earn a commission when you book through our partner links at no extra cost to you.
          ZIVO does not sell {serviceText} directly. All bookings are completed on partner websites.
          Prices are indicative and subject to change.
        </p>
      </div>
    </section>
  );
}
