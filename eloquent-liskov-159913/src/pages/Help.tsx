/**
 * Help Center Page
 * ZIVO Help Center with Support and Company sections
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { FAQStructuredData } from "@/components/seo/StructuredData";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  HelpCircle, 
  Search,
  MessageCircle,
  Mail,
  Plane,
  Monitor,
  Building2,
  Workflow,
  Users,
  FileText,
  ChevronRight,
  Shield,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Support links
const supportLinks = [
  {
    icon: HelpCircle,
    title: "Help Center",
    description: "FAQs & guides",
    href: "#faqs",
    color: "text-sky-500",
    bgColor: "bg-sky-500/10",
  },
  {
    icon: MessageCircle,
    title: "Contact Us",
    description: "Customer support",
    href: "/contact",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Plane,
    title: "Travel Bookings",
    description: "Partner booking help",
    href: "/support/travel-bookings",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    icon: Monitor,
    title: "Site Issues",
    description: "Technical support",
    href: "/support/site-issues",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

// Company links
const companyLinks = [
  {
    icon: Building2,
    title: "About ZIVO",
    description: "Our story & mission",
    href: "/about",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Workflow,
    title: "How It Works",
    description: "Search, compare, book",
    href: "/how-it-works",
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
  },
  {
    icon: Users,
    title: "Partners",
    description: "Travel providers",
    href: "/partners",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
  {
    icon: FileText,
    title: "Legal & Policies",
    description: "Terms & privacy",
    href: "/terms",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
];

// Common FAQs
const faqs = [
  {
    q: "What is ZIVO?",
    a: "ZIVO is a travel search and comparison platform. We help you find and compare flights, hotels, and car rentals from multiple travel partners in one place."
  },
  {
    q: "How do I book a flight/hotel/car?",
    a: "Search for your travel options on ZIVO, then click 'View Deal' or 'Book' to continue to our travel partner's website where you'll complete your booking and payment."
  },
  {
    q: "Who do I contact for booking changes or cancellations?",
    a: "Booking changes, cancellations, and refunds are handled by the travel partner who processed your booking. Check your confirmation email for their contact details."
  },
  {
    q: "Is my payment secure?",
    a: "Yes. All payments are processed directly by our licensed travel partners using industry-standard encryption. ZIVO does not process payments or store credit card information."
  },
  {
    q: "Why was I redirected to another site?",
    a: "ZIVO is a search platform, not a booking agent. We connect you with trusted travel partners who fulfill your booking. This ensures you get the best service from licensed providers."
  },
  {
    q: "What if the site isn't working properly?",
    a: "Try clearing your browser cache, disabling extensions, or using a different browser. For persistent issues, contact us at support@hizivo.com with details about the problem."
  },
];

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqs.filter(faq => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      faq.q.toLowerCase().includes(query) || 
      faq.a.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Help Center – ZIVO"
        description="Get help with flights, hotels, car rentals, and technical issues. Find answers to common questions about booking travel on ZIVO."
        canonical="https://hizivo.com/help"
      />
      <FAQStructuredData faqs={faqs.map(f => ({ question: f.q, answer: f.a }))} />
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
              <HelpCircle className="w-3 h-3 mr-1" />
              ZIVO Help Center
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              How can we help?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions or get in touch with our team.
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-xl mx-auto mb-12">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg rounded-2xl"
            />
          </div>

          {/* Support Section */}
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Badge variant="outline" className="text-xs">Support</Badge>
              <h2 className="font-semibold text-lg">Get Help</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {supportLinks.map((link) => {
                const Icon = link.icon;
                const isAnchor = link.href.startsWith("#");
                const Component = isAnchor ? "a" : Link;
                const props = isAnchor ? { href: link.href } : { to: link.href };
                
                return (
                  <Component key={link.title} {...props as any}>
                    <Card className="hover:border-primary/50 hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer h-full group">
                      <CardContent className="p-5">
                        <div className={`w-11 h-11 rounded-xl ${link.bgColor} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                          <Icon className={`w-5 h-5 ${link.color}`} />
                        </div>
                        <p className="font-semibold mb-0.5">{link.title}</p>
                        <p className="text-sm text-muted-foreground">{link.description}</p>
                      </CardContent>
                    </Card>
                  </Component>
                );
              })}
            </div>
          </section>

          {/* Company Section */}
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Badge variant="outline" className="text-xs">Company</Badge>
              <h2 className="font-semibold text-lg">About ZIVO</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {companyLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.title} to={link.href}>
                    <Card className="hover:border-primary/50 hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer h-full group">
                      <CardContent className="p-5">
                        <div className={`w-11 h-11 rounded-xl ${link.bgColor} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                          <Icon className={`w-5 h-5 ${link.color}`} />
                        </div>
                        <p className="font-semibold mb-0.5">{link.title}</p>
                        <p className="text-sm text-muted-foreground">{link.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* FAQs Section */}
          <section id="faqs" className="mb-12 scroll-mt-24">
            <div className="flex items-center gap-2 mb-6">
              <Badge variant="outline" className="text-xs">FAQs</Badge>
              <h2 className="font-semibold text-lg">Common Questions</h2>
            </div>
            <Card>
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  {filteredFaqs.map((faq, idx) => (
                    <AccordionItem key={idx} value={`faq-${idx}`} className="border-border/50">
                      <AccordionTrigger className="text-left hover:no-underline py-4">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {filteredFaqs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No matching questions found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Quick Help Topics */}
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Badge variant="outline" className="text-xs">Topics</Badge>
              <h2 className="font-semibold text-lg">Popular Help Topics</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { topic: "How to search for flights", link: "/flights" },
                { topic: "Understanding price estimates", link: "/how-it-works" },
                { topic: "Booking with travel partners", link: "/partner-disclosure" },
                { topic: "Payment and billing questions", link: "/support/travel-bookings" },
                { topic: "Managing your account", link: "/account" },
                { topic: "ZIVO+ membership benefits", link: "/membership" },
                { topic: "Referral program details", link: "/referral" },
                { topic: "Privacy and data settings", link: "/account/privacy" },
              ].map((item) => (
                <Link key={item.topic} to={item.link} className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all duration-200 group">
                  <span className="text-sm font-medium">{item.topic}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </section>

          {/* Emergency Contact */}
          <section className="mb-12">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6 text-center">
                <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-2">Need urgent help?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  For safety concerns or urgent booking issues, reach us immediately.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild>
                    <a href="mailto:support@hizivo.com" className="gap-2">
                      <Mail className="w-4 h-4" />
                      support@hizivo.com
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Partner Disclosure */}
          <div className="p-6 rounded-2xl bg-muted/50 border border-border/50 mb-8 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-2">Important Notice</p>
                <p className="text-muted-foreground text-sm">
                  ZIVO is a travel search and comparison platform. We help you find and compare options 
                  from trusted travel partners. All bookings, payments, and fulfillment are handled by 
                  our licensed travel partners. For booking changes, cancellations, or refunds, please 
                  contact the travel partner directly using the information in your confirmation email.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground border-t border-border/50 pt-8">
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <span className="text-border">•</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span className="text-border">•</span>
            <Link to="/partner-disclosure" className="hover:text-foreground transition-colors">
              Partner Disclosure
            </Link>
          </div>

          {/* Contact CTA */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground mb-4">Still need help?</p>
            <Button asChild>
              <Link to="/contact" className="gap-2">
                <Mail className="w-4 h-4" />
                Contact Support
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
