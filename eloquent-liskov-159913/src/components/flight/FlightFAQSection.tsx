import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FlightFAQSectionProps {
  className?: string;
}

export default function FlightFAQSection({ className }: FlightFAQSectionProps) {
  const faqs = [
    {
      question: "Do I book on ZIVO or another site?",
      answer: "You book and pay directly on ZIVO. Your entire booking is processed securely on our platform."
    },
    {
      question: "Who issues my ticket?",
      answer: "Tickets are issued by licensed airline ticketing partners under airline rules. ZIVO operates as a sub-agent of these licensed providers."
    },
    {
      question: "Are prices final?",
      answer: "Yes. Prices shown are final before payment. All taxes and fees are included. There are no hidden charges."
    },
    {
      question: "Who do I contact for support?",
      answer: "Contact ZIVO support at support@hizivo.com for booking changes, cancellations, or any questions. We handle all support requests according to airline fare rules."
    },
    {
      question: "How do I get my e-ticket?",
      answer: "After payment, your e-ticket is issued instantly and sent to the email address provided for each passenger. You'll typically receive it within minutes."
    },
    {
      question: "Can I change or cancel my booking?",
      answer: "Changes and cancellations are subject to airline fare rules. Contact ZIVO support to request modifications. Fees may apply based on the airline's policy."
    },
  ];

  return (
    <section className={cn("py-10 sm:py-16", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12">
          <Badge className="mb-4 px-4 py-2 bg-primary/10 text-primary border-primary/20">
            <HelpCircle className="w-4 h-4 mr-2" />
            Help Center
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Flight Search FAQs
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Common questions about finding and booking flights with ZIVO
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-border/30">
                    <AccordionTrigger className="text-left hover:no-underline py-4 text-sm sm:text-base">
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

          <div className="mt-8 text-center">
            <p className="text-muted-foreground mb-4">Have more questions?</p>
            <Button variant="outline" className="touch-manipulation active:scale-[0.98]">
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
