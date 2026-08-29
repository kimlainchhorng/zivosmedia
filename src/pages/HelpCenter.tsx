import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Search, Mail, Car, UtensilsCrossed, Plane, Hotel, Key, ChevronRight, HelpCircle, FileText, Shield, CreditCard, Star, AlertTriangle, User, ChevronLeft, Sparkles, Send, CheckCircle2, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";
import { cn } from "@/lib/utils";
import { useGoBack } from "@/hooks/useGoBack";
import { toast } from "sonner";

const HelpCenter = () => {
  const navigate = useNavigate();
  const goBack = useGoBack("/");
  const { user } = useAuth();
  const isTravelHost = typeof window !== "undefined" && isZivoTravelHost(window.location.hostname);
  const hashTargetClassName = cn("scroll-mt-[calc(var(--zivo-safe-top-sticky)_+_4.25rem)]", !isTravelHost && "lg:scroll-mt-[95px]");
  const [activeTab, setActiveTab] = useState("faq");
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [submittedTicketNumber, setSubmittedTicketNumber] = useState<string | null>(null);

  // Controlled ticket form state
  const [ticketCategory, setTicketCategory] = useState<string>("");
  const [ticketPriority, setTicketPriority] = useState<string>("normal");
  const [ticketSubject, setTicketSubject] = useState<string>("");
  const [ticketDescription, setTicketDescription] = useState<string>("");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const resetTicketForm = () => {
    setTicketCategory("");
    setTicketPriority("normal");
    setTicketSubject("");
    setTicketDescription("");
    setTicketSubmitted(false);
    setSubmittedTicketNumber(null);
  };

  const categories = [
    {
      icon: Car,
      label: "Rides",
      color: "from-primary to-teal-400",
      href: "#rides"
    },
    {
      icon: UtensilsCrossed,
      label: "Food",
      color: "from-eats to-orange-500",
      href: "#eats"
    },
    {
      icon: Key,
      label: "Rental",
      color: "from-violet-500 to-purple-500",
      href: "#travel"
    },
    {
      icon: Plane,
      label: "Flights",
      color: "from-sky-500 to-blue-500",
      href: "#travel"
    },
    {
      icon: Hotel,
      label: "Hotels",
      color: "from-amber-500 to-orange-500",
      href: "#travel"
    },
    {
      icon: User,
      label: "Account",
      color: "from-pink-500 to-rose-500",
      href: "#account"
    }
  ];

  const popularArticles = [
    {
      title: "How to request a refund",
      category: "Billing",
      href: "/legal/refunds"
    },
    {
      title: "My driver cancelled - what do I do?",
      category: "Rides",
      href: "#rides"
    },
    {
      title: "Track my food delivery in real-time",
      category: "Food",
      href: "#eats"
    },
    {
      title: "Change or cancel my hotel booking",
      category: "Travel",
      href: "#travel"
    },
    {
      title: "Add or update payment methods",
      category: "Account",
      href: "/payment-methods"
    },
    { title: "Report a safety issue", category: "Safety", href: "/safety" }
  ];

  const ridesFAQ = [
    {
      q: "How are ride fares calculated?",
      a: "Fares are calculated based on: Base fare + (per-mile rate × distance) + (per-minute rate × time) + any applicable surge pricing. You'll see an estimated fare before confirming your ride. Final charges may differ due to route changes, traffic, or wait time."
    },
    {
      q: "Why was I charged a cancellation fee?",
      a: "Cancellation terms can depend on the service, location, and trip status. Review the fee shown before you confirm a cancellation. If a charge looks wrong, open the trip from History and contact support."
    },
    {
      q: "How do I report a lost item?",
      a: "Open History, select the relevant trip, and use its help or lost-item option when available. If you cannot see that option, create a support ticket and include the trip details."
    }
  ];

  const eatsFAQ = [
    {
      q: "My order is missing items, what do I do?",
      a: "Open the order from your history and use its help option to report the missing items. Include clear details and photos when requested. Any available resolution will be shown with the request."
    },
    {
      q: "How long does delivery take?",
      a: "Delivery time depends on preparation, distance, traffic, and courier availability. Use the estimate and live status shown on your active order; those are more accurate than a general wait-time promise."
    }
  ];

  const accountFAQ = [
    {
      q: "How do I reset my password?",
      a: "Tap 'Forgot Password' on the login screen and enter your email. If the reset message does not arrive, check spam before requesting another link."
    },
    {
      q: "How do I update my payment method?",
      a: "Open Account, then Payment Methods. The page shows the payment options currently available for your account and service."
    }
  ];

  const travelFAQ = [
    {
      q: "How do I book a flight, hotel, or car rental?",
      a: "ZIVO helps you search and compare prices from trusted travel partners. When you find an option you like, click 'View Deal' or 'Book' to be redirected to our partner's website to complete your booking."
    },
    {
      q: "Does ZIVO process payments for travel bookings?",
      a: "No. ZIVO is a search and comparison platform. All bookings, payments, refunds, and changes are handled directly by our travel partners. We do not collect or store any payment information."
    },
    {
      q: "How do I change or cancel a travel booking?",
      a: "Since bookings are completed with our travel partners, you'll need to contact them directly for any changes, cancellations, or refunds. Check your booking confirmation email for partner contact details."
    },
    {
      q: "Are prices on ZIVO accurate?",
      a: "Prices shown are indicative and sourced from our partners in real-time. Final pricing is confirmed on the partner's website. Prices may change based on availability and demand."
    }
  ];

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchesSearch = (question: string, answer: string) => !normalizedSearch || `${question} ${answer}`.toLowerCase().includes(normalizedSearch);
  const filteredPopularArticles = popularArticles.filter((article) => !normalizedSearch || `${article.title} ${article.category}`.toLowerCase().includes(normalizedSearch));
  const filteredRidesFAQ = ridesFAQ.filter((item) => matchesSearch(item.q, item.a));
  const filteredEatsFAQ = eatsFAQ.filter((item) => matchesSearch(item.q, item.a));
  const filteredAccountFAQ = accountFAQ.filter((item) => matchesSearch(item.q, item.a));
  const filteredTravelFAQ = travelFAQ.filter((item) => matchesSearch(item.q, item.a));
  const searchResultCount = filteredPopularArticles.length + filteredRidesFAQ.length + filteredEatsFAQ.length + filteredAccountFAQ.length + filteredTravelFAQ.length;

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Sign in to submit and track a support ticket");
      return;
    }
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      toast.error("Please fill in subject and description");
      return;
    }
    if (!ticketCategory) {
      toast.error("Please select a category");
      return;
    }
    setSubmittingTicket(true);
    try {
      const message = `[${ticketPriority.toUpperCase()} priority]\n\n${ticketDescription.trim()}`;
      const { data, error } = await supabase.functions.invoke("support-ticket-submit", {
        body: {
          subject: ticketSubject.trim(),
          message,
          email: user.email ?? null,
          source: `help_center:${ticketCategory}:${ticketPriority}`,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null
        }
      });
      if (error) throw error;
      setSubmittedTicketNumber(data?.ticket_number ?? null);
      setTicketSubmitted(true);
      toast.success("Support ticket submitted");
    } catch (err: any) {
      toast.error(err?.message || "Could not submit ticket. Please try again.");
    } finally {
      setSubmittingTicket(false);
    }
  };

  return (
    <div className={cn("min-h-screen bg-background relative overflow-x-clip safe-area-bottom", !isTravelHost && "lg:pt-[83px]")}>
      <SEOHead title="Help Center – ZIVO" description="Get help with rides, food delivery, car rentals, flights, hotels, account settings, and safety. Browse FAQs, contact support, or submit tickets." />
      {/* Background effects - simplified for mobile */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/8 via-transparent to-transparent opacity-40" />
      <div className="absolute top-1/4 right-0 w-[200px] h-[200px] bg-gradient-to-bl from-primary/15 to-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[180px] h-[180px] rounded-full blur-3xl bg-secondary" />

      {/* Header - Mobile optimized */}
      <header className={cn("sticky top-0 safe-area-top z-50 bg-card/80 backdrop-blur-xl border-b border-white/10 px-3 py-2.5", !isTravelHost && "lg:relative lg:top-auto")}>
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9 rounded-xl hover:bg-white/10 active:scale-95 transition-transform" aria-label="Go back">
            <ChevronLeft className="h-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center shadow-sm">
              <HelpCircle className="h-4 w-4 text-background" />
            </div>
            <div>
              <h1 className="font-display font-bold text-base">Help Center</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">How can we help?</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-5xl mx-auto relative z-10">
        {/* FAQ discovery - Mobile optimized */}
        {activeTab === "faq" && (
          <>
            <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="search" aria-label="Search help articles" placeholder="Search for help..." className="pl-11 h-12 text-sm rounded-xl bg-card/80 border-white/10 shadow-lg focus:border-primary/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              {normalizedSearch && (
                <p className="mt-2 px-1 text-xs text-muted-foreground" role="status" aria-live="polite">
                  {searchResultCount} {searchResultCount === 1 ? "result" : "results"} for “{searchQuery.trim()}”
                </p>
              )}
            </div>

            {/* Quick Categories */}
            {!normalizedSearch && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {categories.map((cat) => (
                  <a key={cat.label} href={cat.href} className="flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-card/90 to-card border border-border/50 shadow-xl hover:shadow-2xl hover:border-primary/30 transition-all touch-manipulation active:scale-95">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-2 shadow-lg`}>
                      <cat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold">{cat.label}</span>
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {/* Main Content Tabs */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Tabs value={activeTab} className="mb-8" onValueChange={(value) => {
            setActiveTab(value);
            if (value !== "faq") setSearchQuery("");
          }}>
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 sm:p-1.5 rounded-xl h-auto">
              <TabsTrigger value="faq" className="rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-foreground data-[state=active]:text-background font-semibold touch-manipulation">
                FAQ
              </TabsTrigger>
              <TabsTrigger value="contact" className="rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-foreground data-[state=active]:text-background font-semibold touch-manipulation">
                Contact Us
              </TabsTrigger>
              <TabsTrigger value="ticket" className="rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-foreground data-[state=active]:text-background font-semibold touch-manipulation">
                Ticket
              </TabsTrigger>
            </TabsList>

            {/* FAQ Tab */}
            <TabsContent value="faq" className="mt-5 sm:mt-6 space-y-6 sm:space-y-8">
              {/* Popular Articles */}
              {filteredPopularArticles.length > 0 && (
                <Card className="border border-border/50 bg-card shadow-lg overflow-hidden">
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 fill-amber-500" />
                      Start here
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-1 sm:gap-2">
                      {filteredPopularArticles.map((article) => {
                        const content = (
                          <>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm sm:text-base group-hover:text-foreground transition-colors truncate">{article.title}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">{article.category}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 ml-2" />
                          </>
                        );
                        const className = "flex items-center justify-between min-h-14 p-3 sm:p-4 rounded-xl hover:bg-muted/50 transition-colors text-left group touch-manipulation active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

                        return article.href.startsWith("#") ? (
                          <a key={article.title} href={article.href} className={className}>
                            {content}
                          </a>
                        ) : (
                          <Link key={article.title} to={article.href} className={className}>
                            {content}
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rides FAQ */}
              {filteredRidesFAQ.length > 0 && (
                <div id="rides" className={hashTargetClassName}>
                  <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center shadow-lg shadow-primary/30">
                      <Car className="h-5 w-5 text-primary-foreground" />
                    </div>
                    ZIVO Rides
                  </h3>
                  <Accordion type="single" collapsible className="space-y-2">
                    {filteredRidesFAQ.map((item, i) => (
                      <AccordionItem key={i} value={`rides-${i}`} className="border border-border/50 rounded-2xl px-5 bg-gradient-to-br from-card/90 to-card shadow-lg hover:border-primary/30 hover:shadow-xl transition-all duration-200">
                        <AccordionTrigger className="hover:no-underline text-left font-semibold py-5">{item.q}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-5">{item.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}

              {/* Eats FAQ */}
              {filteredEatsFAQ.length > 0 && (
                <div id="eats" className={hashTargetClassName}>
                  <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-eats to-orange-500 flex items-center justify-center shadow-lg shadow-eats/30">
                      <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
                    </div>
                    ZIVO Eats
                  </h3>
                  <Accordion type="single" collapsible className="space-y-2">
                    {filteredEatsFAQ.map((item, i) => (
                      <AccordionItem key={i} value={`eats-${i}`} className="border border-border/50 rounded-2xl px-5 bg-gradient-to-br from-card/90 to-card shadow-lg hover:border-primary/30 hover:shadow-xl transition-all duration-200">
                        <AccordionTrigger className="hover:no-underline text-left font-semibold py-5">{item.q}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-5">{item.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}

              {/* Account FAQ */}
              {filteredAccountFAQ.length > 0 && (
                <div id="account" className={hashTargetClassName}>
                  <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-pink-500/15">
                      <User className="h-5 w-5 text-pink-600" />
                    </div>
                    Account & Billing
                  </h3>
                  <Accordion type="single" collapsible className="space-y-2">
                    {filteredAccountFAQ.map((item, i) => (
                      <AccordionItem key={i} value={`account-${i}`} className="border border-border/50 rounded-2xl px-5 bg-gradient-to-br from-card/90 to-card shadow-lg hover:border-primary/30 hover:shadow-xl transition-all duration-200">
                        <AccordionTrigger className="hover:no-underline text-left font-semibold py-5">{item.q}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-5">{item.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}

              {/* Travel FAQ */}
              {filteredTravelFAQ.length > 0 && (
                <div id="travel" className={hashTargetClassName}>
                  <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-500/15">
                      <Plane className="h-5 w-5 text-sky-600" />
                    </div>
                    Flights, Hotels & Car Rentals
                  </h3>
                  <Accordion type="single" collapsible className="space-y-2">
                    {filteredTravelFAQ.map((item, i) => (
                      <AccordionItem key={i} value={`travel-${i}`} className="border border-border/50 rounded-2xl px-5 bg-gradient-to-br from-card/90 to-card shadow-lg hover:border-border hover:shadow-xl transition-all duration-200">
                        <AccordionTrigger className="hover:no-underline text-left font-semibold py-5">{item.q}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-5">{item.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {/* Partner Disclaimer */}
                  <div className="mt-4 p-4 rounded-xl bg-secondary border border-border">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Important:</strong> All bookings, payments, refunds, and changes are handled directly by our travel partners. ZIVO is a search and comparison platform and does not collect or process any payment information.
                    </p>
                  </div>
                </div>
              )}

              {normalizedSearch && searchResultCount === 0 && (
                <Card className="border border-border/50 bg-card shadow-sm">
                  <CardContent className="p-6 text-center">
                    <HelpCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="font-semibold text-foreground">No matching help found</p>
                    <p className="mt-1 text-sm text-muted-foreground">Try a shorter search or open the Contact Us tab.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="mt-5 sm:mt-6">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {[
                  {
                    icon: FileText,
                    title: "Support tickets",
                    desc: "Create or track a request",
                    badge: "In app",
                    gradient: "from-slate-700 to-black",
                    action: "Open tickets",
                    href: "/support/tickets"
                  },
                  {
                    icon: Mail,
                    title: "Email",
                    desc: "Send a detailed support request",
                    badge: "support@zivosmedia.com",
                    gradient: "from-violet-500 to-purple-600",
                    action: "Send email",
                    href: "mailto:support@zivosmedia.com?subject=ZIVO%20support%20request"
                  },
                  {
                    icon: Shield,
                    title: "Safety",
                    desc: "Get safety guidance and reporting help",
                    badge: "Safety center",
                    gradient: "from-amber-500 to-orange-600",
                    action: "Open safety",
                    href: "/safety"
                  }
                ].map((contact, index) => (
                  <Card key={contact.title} className="border border-border/50 bg-card shadow-lg transition-shadow hover:shadow-xl">
                    <CardContent className="p-4 sm:p-6 text-center">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${contact.gradient} flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg`}>
                        <contact.icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                      </div>
                      <h3 className="font-bold text-base sm:text-lg mb-1 sm:mb-2">{contact.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{contact.desc}</p>
                      <Badge variant="outline" className="mb-3 sm:mb-4 font-semibold text-xs">
                        {contact.badge}
                      </Badge>
                      <Button asChild className="w-full rounded-xl font-semibold touch-manipulation active:scale-[0.98]" variant={index === 0 ? "default" : "outline"}>
                        {contact.href.startsWith("mailto:") ? <a href={contact.href}>{contact.action}</a> : <Link to={contact.href}>{contact.action}</Link>}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Safety guidance */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "200ms" }}>
                <Card className="border-0 bg-gradient-to-br from-destructive/10 to-red-500/5 shadow-xl overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-destructive to-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-destructive/30">
                        <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-destructive mb-1 sm:mb-2">Emergency & Safety</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">For immediate concerns during a trip, use the safety controls shown in that trip. For life-threatening emergencies, contact your local emergency services.</p>
                        <Button asChild variant="outline" className="rounded-xl font-semibold">
                          <Link to="/safety">Open safety guidance</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Ticket Tab */}
            <TabsContent value="ticket" className="mt-6">
              <Card className="border-0 bg-gradient-to-br from-card/90 to-card shadow-xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl">Submit a Support Ticket</CardTitle>
                  <CardDescription>Can't find an answer? Send a request you can track from your account.</CardDescription>
                </CardHeader>
                <CardContent>
                  {!user ? (
                    <div className="py-8 text-center sm:py-10">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <FileText className="h-7 w-7 text-foreground" />
                      </div>
                      <h3 className="text-xl font-bold">Sign in to contact support</h3>
                      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Signing in keeps the request connected to your account and lets you track replies.</p>
                      <Button asChild className="mt-5 rounded-xl font-semibold">
                        <Link to="/login?redirect=%2Fhelp-center">Sign in</Link>
                      </Button>
                    </div>
                  ) : ticketSubmitted ? (
                    <div className="text-center py-8 sm:py-10 animate-in fade-in zoom-in-95 duration-200">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xl shadow-emerald-500/30">
                        <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground" />
                      </div>
                      <h3 className="font-bold text-xl sm:text-2xl mb-2">Ticket Submitted!</h3>
                      <p className="text-sm sm:text-base text-muted-foreground mb-2">Your request was received. Track replies from Support tickets.</p>
                      {submittedTicketNumber && <p className="text-[11px] text-muted-foreground/70 mb-4 sm:mb-6 font-mono">Reference: {submittedTicketNumber}</p>}
                      <div className="flex flex-col justify-center gap-2 sm:flex-row">
                        <Button asChild className="rounded-xl font-semibold">
                          <Link to="/support/tickets">View tickets</Link>
                        </Button>
                        <Button variant="outline" onClick={resetTicketForm} className="rounded-xl font-semibold touch-manipulation active:scale-95">
                          Submit another
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleTicketSubmit} className="space-y-4 sm:space-y-5">
                      <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="category" className="font-semibold text-sm">
                            Category
                          </Label>
                          <Select required value={ticketCategory} onValueChange={setTicketCategory}>
                            <SelectTrigger id="category" className="h-11 sm:h-12 rounded-xl">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rides">Rides</SelectItem>
                              <SelectItem value="eats">Food Delivery</SelectItem>
                              <SelectItem value="rental">Car Rental</SelectItem>
                              <SelectItem value="flights">Flights</SelectItem>
                              <SelectItem value="hotels">Hotels</SelectItem>
                              <SelectItem value="account">Account & Billing</SelectItem>
                              <SelectItem value="safety">Safety Issue</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="priority" className="font-semibold text-sm">
                            Priority
                          </Label>
                          <Select value={ticketPriority} onValueChange={setTicketPriority}>
                            <SelectTrigger id="priority" className="h-11 sm:h-12 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject" className="font-semibold text-sm">
                          Subject
                        </Label>
                        <Input id="subject" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} placeholder="Brief description of your issue" required maxLength={200} className="h-11 sm:h-12 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description" className="font-semibold text-sm">
                          Description
                        </Label>
                        <Textarea id="description" value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} placeholder="Please provide as much detail as possible..." required maxLength={5000} className="min-h-[120px] sm:min-h-[150px] rounded-xl resize-none" />
                      </div>
                      <Button type="submit" disabled={submittingTicket} className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold rounded-xl shadow-lg gap-2 touch-manipulation active:scale-[0.98]">
                        {submittingTicket ? (
                          <>
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                            Submitting…
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                            Submit Ticket
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Self-service support */}
          {activeTab === "faq" && !normalizedSearch && (
            <div className="space-y-8 mt-10">
            {/* Quick Troubleshooter */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-foreground" /> Quick Troubleshooter
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  {
                    issue: "Can't log in",
                    steps: ["Clear browser cache", "Try password reset", "Check email spam folder", "Try incognito mode"],
                    icon: Key
                  },
                  {
                    issue: "Payment failed",
                    steps: ["Check card expiry date", "Ensure sufficient funds", "Try a different card", "Contact your bank"],
                    icon: CreditCard
                  },
                  {
                    issue: "Order not received",
                    steps: ["Check delivery status", "Verify address", "Contact driver/restaurant", "Request refund if needed"],
                    icon: Package
                  },
                  {
                    issue: "App crashing",
                    steps: ["Update to latest version", "Clear app cache", "Restart your device", "Reinstall if needed"],
                    icon: AlertTriangle
                  }
                ].map((t) => (
                  <Card key={t.issue} className="border-border/40">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <t.icon className="w-4 h-4 text-primary" />
                        <p className="text-xs font-bold text-foreground">{t.issue}</p>
                      </div>
                      <div className="space-y-1.5">
                        {t.steps.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</span>
                            {s}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Safety Tips */}
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-5">
                <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" /> Safety & Security Tips
                </p>
                <div className="space-y-2">
                  {["Never share your password or OTP with anyone — ZIVO will never ask for it", "Enable two-factor authentication for extra account security", "Verify driver identity and license plate before entering a ride", "Report suspicious emails claiming to be from ZIVO to security@zivosmedia.com"].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      {tip}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default HelpCenter;
