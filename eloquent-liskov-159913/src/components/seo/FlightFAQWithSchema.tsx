import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How does ZIVO find flight prices?",
    answer: "ZIVO connects directly to airline ticketing systems to display real-time availability and final prices."
  },
  {
    question: "Does ZIVO sell tickets directly?",
    answer: "Yes. You book and pay directly on ZIVO. Tickets are issued by licensed ticketing partners under airline rules."
  },
  {
    question: "How do price alerts work?",
    answer: "Set an alert for any route and we'll monitor prices 24/7. When prices drop or a great deal appears, we'll send you an instant notification via email or push notification so you never miss a bargain."
  },
  {
    question: "Why do prices change so frequently?",
    answer: "Airlines use dynamic pricing based on demand, time until departure, competition, and other factors. Prices can change multiple times per day. That's why we recommend booking quickly when you find a good deal."
  },
  {
    question: "What does 'flexible dates' mean?",
    answer: "Our flexible dates feature shows you prices for days before and after your selected dates. This helps you find the cheapest days to fly, which can often save you hundreds of dollars."
  },
  {
    question: "Are there hidden fees?",
    answer: "No. Prices shown on ZIVO are final and confirmed before payment. Airline extras (bags, seats) are shown separately."
  },
  {
    question: "Does ZIVO charge booking fees?",
    answer: "No, ZIVO does not charge any booking fees on flights."
  },
  {
    question: "Can I trust the prices shown?",
    answer: "Yes. Prices shown on ZIVO are final and confirmed before payment."
  },
];

export default function FlightFAQWithSchema() {
  // Inject FAQ Schema for SEO
  useEffect(() => {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };

    // Find or create script element
    let scriptTag = document.querySelector('script[data-schema="faq"]');
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.setAttribute("type", "application/ld+json");
      scriptTag.setAttribute("data-schema", "faq");
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(faqSchema);

    return () => {
      scriptTag?.remove();
    };
  }, []);

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <Badge className="mb-4 px-4 py-2 bg-primary/10 text-primary border-primary/20">
            <HelpCircle className="w-4 h-4 mr-2" />
            Frequently Asked Questions
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
            Flight Search FAQs
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Common questions about finding and booking flights with ZIVO
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`item-${index}`} 
                    className="border-border/30"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-4 text-sm sm:text-base font-medium">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
