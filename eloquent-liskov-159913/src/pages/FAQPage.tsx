import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Plane, Building2, Car, UtensilsCrossed, Truck, User, Shield, Mail } from "lucide-react";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import FAQSchema from "@/components/shared/FAQSchema";
import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";

const faqSections = [
  {
    title: "General",
    icon: HelpCircle,
    faqs: [
      {
        question: "What is ZIVO??",
        answer: "ZIVO is an online platform that helps you search and compare travel options like flights, hotels, and car rentals, and discover mobility services such as rides, food delivery, and moving."
      },
      {
        question: "Does ZIVO sell flights, hotels, or car rentals?",
        answer: "No. ZIVO is not the merchant of record. We help you find options and then connect you to licensed third-party providers who complete your booking."
      }
    ]
  },
  {
    title: "Flights / Hotels / Car Rentals",
    icon: Plane,
    faqs: [
      {
        question: "Who completes my booking?",
        answer: "Your booking is completed directly with our licensed travel partner. They process payment, issue tickets or confirmations, and handle changes, cancellations, and refunds."
      },
      {
        question: "Why am I redirected to another website to book?",
        answer: "For security and compliance reasons, bookings are completed on our partner's secure checkout. This ensures your payment and reservation are handled by the licensed provider."
      },
      {
        question: "Does ZIVO charge extra fees?",
        answer: "ZIVO does not add hidden fees. Final prices, taxes, and fees are shown by the travel partner during checkout."
      },
      {
        question: "Can prices change after I click an offer?",
        answer: "Yes. Prices and availability may change before checkout. The final price is confirmed on the partner's website."
      },
      {
        question: "Who do I contact to change or cancel my booking?",
        answer: "Please contact the travel partner listed in your confirmation email. They handle all booking changes, cancellations, and refunds."
      }
    ]
  },
  {
    title: "Rides / Eats / Move",
    icon: Car,
    faqs: [
      {
        question: "How do ZIVO Rides, Eats, and Delivery work?",
        answer: "ZIVO Rides lets you request a ride anywhere, anytime with upfront pricing. ZIVO Eats lets you order food delivery from local restaurants. Both are available directly on hizovo.com."
      },
      {
        question: "Can I book rides or food directly on ZIVO??",
        answer: "Yes! You can book rides at hizovo.com/rides and order food at hizovo.com/eats. Payments for rides and deliveries are handled by our driver partners."
      }
    ]
  },
  {
    title: "Account & Privacy",
    icon: User,
    faqs: [
      {
        question: "Do I need an account to search?",
        answer: "No account is required to search. We may ask for your email if you choose to continue to booking or receive updates."
      },
      {
        question: "Is my information safe?",
        answer: "Yes. We only share necessary information with booking partners and only with your consent. We do not sell personal data."
      }
    ]
  },
  {
    title: "Legal & Support",
    icon: Shield,
    faqs: [
      {
        question: "Is ZIVO a travel agency?",
        answer: "No. ZIVO is a travel search and referral platform. We do not act as an airline, hotel, rental company, or travel agency."
      },
      {
        question: "What does \"not the merchant of record\" mean?",
        answer: "It means ZIVO does not process payments or issue tickets. The travel partner you book with is responsible for your reservation."
      },
      {
        question: "How can I contact ZIVO??",
        answer: "For website or technical issues, contact us at support@hizivo.com. For booking issues, please contact your travel partner directly."
      }
    ]
  }
];

// Flatten all FAQs for schema
const allFaqs = faqSections.flatMap(section => section.faqs);

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="FAQ – Frequently Asked Questions | ZIVO" description="Find answers to common questions about using ZIVO for travel search, flights, hotels, car rentals, and bookings." canonical="https://hizivo.com/faq" />
      <FAQSchema faqs={allFaqs} pageType="general" />
      
      <NavBar />
      
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-12">
            <Badge className="mb-4 px-4 py-2 bg-primary/10 text-primary border-primary/20">
              <HelpCircle className="w-4 h-4 mr-2" />
              Help Center
            </Badge>
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Find answers to common questions about using ZIVO for travel search and bookings.
            </p>
          </motion.div>

          {/* FAQ Sections */}
          <div className="max-w-4xl mx-auto space-y-8">
            {faqSections.map((section, sectionIndex) => (
              <Card key={sectionIndex} className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-primary/20 hover:shadow-md transition-all duration-200">
                <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <section.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="font-display text-xl font-semibold">{section.title}</h2>
                  </div>
                </div>
                <CardContent className="p-0">
                  <Accordion type="single" collapsible className="w-full">
                    {section.faqs.map((faq, faqIndex) => (
                      <AccordionItem 
                        key={faqIndex} 
                        value={`section-${sectionIndex}-item-${faqIndex}`} 
                        className="border-border/30 last:border-b-0"
                      >
                        <AccordionTrigger className="text-left hover:no-underline px-6 py-4 text-base">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground px-6 pb-4">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="max-w-4xl mx-auto mt-12">
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/50 hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                      Important Disclaimer
                    </h3>
                    <p className="text-amber-700 dark:text-amber-300 text-sm">
                      ZIVO is not the merchant of record. Travel bookings are fulfilled by licensed third-party providers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact CTA */}
          <div className="max-w-4xl mx-auto mt-8 text-center">
            <p className="text-muted-foreground mb-4">Still have questions?</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/contact" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.3)] transition-all"
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </Link>
              <Link 
                to="/partner-disclosure" 
                className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-xl font-medium hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
              >
                <Shield className="w-4 h-4" />
                Partner Disclosure
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
