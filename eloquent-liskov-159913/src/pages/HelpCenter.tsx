import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { ArrowLeft, Search, MessageCircle, Phone, Mail, Car, UtensilsCrossed, Plane, Hotel, Key, ChevronRight, HelpCircle, FileText, Shield, CreditCard, Star, AlertTriangle, User, ChevronLeft, Sparkles, Send, CheckCircle2, Package, Headphones, Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import packageJson from "../../package.json";

const HelpCenter = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [submittedRefId, setSubmittedRefId] = useState<string | null>(null);

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
    setSubmittedRefId(null);
  };

  const categories = [
    { icon: Car, label: "Rides", color: "from-primary to-teal-400", href: "#rides" },
    { icon: UtensilsCrossed, label: "Food", color: "from-eats to-orange-500", href: "#eats" },
    { icon: Key, label: "Rental", color: "from-violet-500 to-purple-500", href: "#rental" },
    { icon: Plane, label: "Flights", color: "from-sky-500 to-blue-500", href: "#flights" },
    { icon: Hotel, label: "Hotels", color: "from-amber-500 to-orange-500", href: "#hotels" },
    { icon: User, label: "Account", color: "from-pink-500 to-rose-500", href: "#account" },
  ];

  const popularArticles = [
    { title: "How to request a refund", category: "Billing", views: "12.5K" },
    { title: "My driver cancelled - what do I do?", category: "Rides", views: "8.2K" },
    { title: "Track my food delivery in real-time", category: "Eats", views: "7.8K" },
    { title: "Change or cancel my hotel booking", category: "Hotels", views: "6.4K" },
    { title: "Add or update payment methods", category: "Account", views: "5.9K" },
    { title: "Report a safety issue", category: "Safety", views: "5.1K" },
  ];

  const ridesFAQ = [
    {
      q: "How are ride fares calculated?",
      a: "Fares are calculated based on: Base fare + (per-mile rate × distance) + (per-minute rate × time) + any applicable surge pricing. You'll see an estimated fare before confirming your ride. Final charges may differ due to route changes, traffic, or wait time."
    },
    {
      q: "Why was I charged a cancellation fee?",
      a: "Cancellation fees apply when you cancel after a driver has been assigned and is on their way. This compensates drivers for their time and effort. Fees typically range from $3-10 depending on how long the driver waited."
    },
    {
      q: "How do I report a lost item?",
      a: "Go to your Trip History, select the trip, and tap 'Report Lost Item'. We'll connect you with the driver. A $15 return fee may apply. Items should be picked up within 48 hours."
    },
  ];

  const eatsFAQ = [
    {
      q: "My order is missing items, what do I do?",
      a: "Go to Order History, select the order, and tap 'Missing Items'. Select which items were missing. You'll receive a refund or credit within 24 hours. Photo evidence helps speed up the process."
    },
    {
      q: "How long does delivery take?",
      a: "Delivery time depends on restaurant prep time, distance, and driver availability. You'll see an estimated time when ordering. Average delivery is 30-45 minutes. Track in real-time once a driver picks up your order."
    },
  ];

  const accountFAQ = [
    {
      q: "How do I reset my password?",
      a: "Tap 'Forgot Password' on the login screen. Enter your email, and we'll send a reset link valid for 1 hour. If you don't receive it, check spam or try requesting again after 5 minutes."
    },
    {
      q: "How do I update my payment method?",
      a: "Go to Account → Payment Methods → Add New. You can add credit/debit cards or digital wallets (Apple Pay, Google Pay). To remove a card, swipe left and confirm deletion."
    },
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
    },
  ];

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const { data, error } = await supabase
        .from("feedback_submissions")
        .insert({
          category: ticketCategory,
          subject: ticketSubject.trim(),
          message,
          user_id: user?.id ?? null,
          app_version: packageJson.version,
          device_info: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
          status: "open",
        })
        .select("id")
        .single();
      if (error) throw error;
      setSubmittedRefId(data?.id ?? null);
      setTicketSubmitted(true);
      toast.success("Ticket submitted — we'll be in touch.");
    } catch (err: any) {
      toast.error(err?.message || "Could not submit ticket. Please try again.");
    } finally {
      setSubmittingTicket(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden safe-area-top safe-area-bottom">
      <SEOHead
        title="Help Center – ZIVO"
        description="Get help with rides, food delivery, car rentals, flights, hotels, account settings, and safety. Browse FAQs, contact support, or submit tickets."
      />
      {/* Background effects - simplified for mobile */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/8 via-transparent to-transparent opacity-40" />
      <div className="absolute top-1/4 right-0 w-[200px] h-[200px] bg-gradient-to-bl from-primary/15 to-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[180px] h-[180px] rounded-full blur-3xl bg-secondary" />

      {/* Header - Mobile optimized */}
      <header className="sticky top-0 safe-area-top z-50 bg-card/80 backdrop-blur-xl border-b border-white/10 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl hover:bg-white/10 active:scale-95 transition-transform" aria-label="Go back">
            <ChevronLeft className="h-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center shadow-md shadow-primary/30">
              <HelpCircle className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-base">Help Center</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">How can we help?</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-5xl mx-auto relative z-10">
        {/* Search - Mobile optimized */}
        <div className="relative mb-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            className="pl-11 h-12 text-sm rounded-xl bg-card/80 border-white/10 shadow-lg focus:border-primary/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Quick Categories */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {categories.map((cat) => (
            <a
              key={cat.label}
              href={cat.href}
              className="flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-card/90 to-card border border-border/50 shadow-xl hover:shadow-2xl hover:border-primary/30 transition-all touch-manipulation active:scale-95"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-2 shadow-lg`}>
                <cat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <span className="text-xs sm:text-sm font-semibold">{cat.label}</span>
            </a>
          ))}
        </div>

        {/* Main Content Tabs */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Tabs defaultValue="faq" className="mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 sm:p-1.5 rounded-xl h-auto">
              <TabsTrigger value="faq" className="rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-teal-400 data-[state=active]:text-primary-foreground font-semibold touch-manipulation">
                FAQ
              </TabsTrigger>
              <TabsTrigger value="contact" className="rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-teal-400 data-[state=active]:text-primary-foreground font-semibold touch-manipulation">
                Contact Us
              </TabsTrigger>
              <TabsTrigger value="ticket" className="rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-teal-400 data-[state=active]:text-primary-foreground font-semibold touch-manipulation">
                Ticket
              </TabsTrigger>
            </TabsList>

            {/* FAQ Tab */}
            <TabsContent value="faq" className="mt-5 sm:mt-6 space-y-6 sm:space-y-8">
              {/* Popular Articles */}
              <Card className="border-0 bg-gradient-to-br from-card/90 to-card shadow-xl overflow-hidden">
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 fill-amber-500" />
                    Popular Articles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-1 sm:gap-2">
                    {popularArticles.map((article, i) => (
                      <button type="button"
                        key={i}
                        className="flex items-center justify-between p-3 sm:p-4 rounded-xl hover:bg-muted/50 transition-colors text-left group touch-manipulation active:scale-[0.98]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors truncate">{article.title}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{article.category} • {article.views} views</p>
                        </div>
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Rides FAQ */}
              <div id="rides">
                <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center shadow-lg shadow-primary/30">
                    <Car className="h-5 w-5 text-primary-foreground" />
                  </div>
                  ZIVO Rides
                </h3>
                <Accordion type="single" collapsible className="space-y-2">
                  {ridesFAQ.map((item, i) => (
                    <AccordionItem key={i} value={`rides-${i}`} className="border border-border/50 rounded-2xl px-5 bg-gradient-to-br from-card/90 to-card shadow-lg hover:border-primary/30 hover:shadow-xl transition-all duration-200">
                      <AccordionTrigger className="hover:no-underline text-left font-semibold py-5">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-5">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {/* Eats FAQ */}
              <div id="eats">
                <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-eats to-orange-500 flex items-center justify-center shadow-lg shadow-eats/30">
                    <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
                  </div>
                  ZIVO Eats
                </h3>
                <Accordion type="single" collapsible className="space-y-2">
                  {eatsFAQ.map((item, i) => (
                    <AccordionItem key={i} value={`eats-${i}`} className="border border-border/50 rounded-2xl px-5 bg-gradient-to-br from-card/90 to-card shadow-lg hover:border-primary/30 hover:shadow-xl transition-all duration-200">
                      <AccordionTrigger className="hover:no-underline text-left font-semibold py-5">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-5">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {/* Account FAQ */}
              <div id="account">
                <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-secondary">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                  Account & Billing
                </h3>
                <Accordion type="single" collapsible className="space-y-2">
                  {accountFAQ.map((item, i) => (
                    <AccordionItem key={i} value={`account-${i}`} className="border border-border/50 rounded-2xl px-5 bg-gradient-to-br from-card/90 to-card shadow-lg hover:border-primary/30 hover:shadow-xl transition-all duration-200">
                      <AccordionTrigger className="hover:no-underline text-left font-semibold py-5">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-5">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {/* Travel FAQ */}
              <div id="flights">
                <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-secondary">
                    <Plane className="h-5 w-5 text-primary-foreground" />
                  </div>
                  Flights, Hotels & Car Rentals
                </h3>
                <Accordion type="single" collapsible className="space-y-2">
                  {travelFAQ.map((item, i) => (
                    <AccordionItem key={i} value={`travel-${i}`} className="border border-border/50 rounded-2xl px-5 bg-gradient-to-br from-card/90 to-card shadow-lg hover:border-border hover:shadow-xl transition-all duration-200">
                      <AccordionTrigger className="hover:no-underline text-left font-semibold py-5">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-5">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                
                {/* Partner Disclaimer */}
                <div className="mt-4 p-4 rounded-xl bg-secondary border border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Important:</strong> All bookings, payments, refunds, and changes are handled directly by our travel partners. 
                    ZIVO is a search and comparison platform and does not collect or process any payment information.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="mt-5 sm:mt-6">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {[
                  { icon: MessageCircle, title: "Live Chat", desc: "Chat with a support agent", badge: "24/7", gradient: "from-primary to-teal-400", action: "Start Chat" },
                  { icon: Phone, title: "Phone", desc: "Speak with our team", badge: "1-800-ZIVO", gradient: "from-muted to-muted", action: "Call Now" },
                  { icon: Mail, title: "Email", desc: "Response within 24h", badge: "support@zivo.com", gradient: "from-muted to-muted", action: "Send Email" },
                ].map((contact, index) => (
                  <Card key={contact.title} className="border-0 bg-gradient-to-br from-card/90 to-card shadow-xl hover:shadow-2xl transition-all">
                    <CardContent className="p-4 sm:p-6 text-center">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${contact.gradient} flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg`}>
                        <contact.icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                      </div>
                      <h3 className="font-bold text-base sm:text-lg mb-1 sm:mb-2">{contact.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{contact.desc}</p>
                      <Badge variant="outline" className="mb-3 sm:mb-4 font-semibold text-xs">{contact.badge}</Badge>
                      <Button className={`w-full rounded-xl font-semibold touch-manipulation active:scale-[0.98] ${index === 0 ? "bg-gradient-to-r from-primary to-teal-400 text-primary-foreground" : ""}`} variant={index === 0 ? "default" : "outline"}>
                        {contact.action}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Safety Hotline */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
                <Card className="border-0 bg-gradient-to-br from-destructive/10 to-red-500/5 shadow-xl overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-destructive to-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-destructive/30">
                        <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-destructive mb-1 sm:mb-2">Emergency & Safety</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                          For immediate safety concerns during a trip, use the in-app emergency button. 
                          For life-threatening emergencies, call 911.
                        </p>
                        <p className="font-bold text-base sm:text-lg">Safety Hotline: 1-800-ZIVO-SOS</p>
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
                  <CardDescription>
                    Can't find an answer? Submit a ticket and we'll get back to you within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ticketSubmitted ? (
                    <div className="text-center py-8 sm:py-10 animate-in fade-in zoom-in-95 duration-200">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xl shadow-emerald-500/30">
                        <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground" />
                      </div>
                      <h3 className="font-bold text-xl sm:text-2xl mb-2">Ticket Submitted!</h3>
                      <p className="text-sm sm:text-base text-muted-foreground mb-2">
                        Our team typically responds within 24 hours. {user?.email ? `We'll reply to ${user.email}.` : "Sign in to track responses."}
                      </p>
                      {submittedRefId && (
                        <p className="text-[11px] text-muted-foreground/70 mb-4 sm:mb-6 font-mono">
                          Reference: {submittedRefId.slice(0, 8).toUpperCase()}
                        </p>
                      )}
                      <Button onClick={resetTicketForm} className="rounded-xl font-semibold touch-manipulation active:scale-95">
                        Submit Another Ticket
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleTicketSubmit} className="space-y-4 sm:space-y-5">
                      <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="category" className="font-semibold text-sm">Category</Label>
                          <Select required value={ticketCategory} onValueChange={setTicketCategory}>
                            <SelectTrigger className="h-11 sm:h-12 rounded-xl">
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
                          <Label htmlFor="priority" className="font-semibold text-sm">Priority</Label>
                          <Select value={ticketPriority} onValueChange={setTicketPriority}>
                            <SelectTrigger className="h-11 sm:h-12 rounded-xl">
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
                        <Label htmlFor="subject" className="font-semibold text-sm">Subject</Label>
                        <Input id="subject" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} placeholder="Brief description of your issue" required maxLength={200} className="h-11 sm:h-12 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description" className="font-semibold text-sm">Description</Label>
                        <Textarea
                          id="description"
                          value={ticketDescription}
                          onChange={(e) => setTicketDescription(e.target.value)}
                          placeholder="Please provide as much detail as possible..."
                          required
                          maxLength={5000}
                          className="min-h-[120px] sm:min-h-[150px] rounded-xl resize-none"
                        />
                      </div>
                      <Button type="submit" disabled={submittingTicket} className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-teal-400 text-primary-foreground shadow-lg shadow-primary/30 gap-2 touch-manipulation active:scale-[0.98]">
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

          {/* === WAVE 8: Smart Support Intelligence === */}
          <div className="space-y-8 mt-10">
            {/* Live Support Status */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <Headphones className="w-5 h-5 text-primary" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Support Team Online</p>
                    <p className="text-[10px] text-muted-foreground">Average response: &lt;5 minutes</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Chat", time: "~2 min", status: "bg-emerald-500" },
                    { label: "Email", time: "~4 hrs", status: "bg-amber-500" },
                    { label: "Phone", time: "~8 min", status: "bg-emerald-500" },
                  ].map(c => (
                    <div key={c.label} className="p-2 rounded-xl bg-card/60 border border-border/30">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${c.status}`} />
                        <p className="text-[10px] font-bold text-foreground">{c.label}</p>
                      </div>
                      <p className="text-[9px] text-muted-foreground">{c.time} wait</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Troubleshooter */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-foreground" /> Quick Troubleshooter
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { issue: "Can't log in", steps: ["Clear browser cache", "Try password reset", "Check email spam folder", "Try incognito mode"], icon: Key },
                  { issue: "Payment failed", steps: ["Check card expiry date", "Ensure sufficient funds", "Try a different card", "Contact your bank"], icon: CreditCard },
                  { issue: "Order not received", steps: ["Check delivery status", "Verify address", "Contact driver/restaurant", "Request refund if needed"], icon: Package },
                  { issue: "App crashing", steps: ["Update to latest version", "Clear app cache", "Restart your device", "Reinstall if needed"], icon: AlertTriangle },
                ].map(t => (
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

            {/* Support Stats */}
            <Card className="border-border/40">
              <CardContent className="p-5">
                <p className="text-sm font-bold text-foreground mb-3">Support by the Numbers</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { stat: "98%", label: "Satisfaction", sub: "Last 30 days" },
                    { stat: "<5min", label: "Avg Response", sub: "Chat support" },
                    { stat: "24/7", label: "Availability", sub: "All channels" },
                    { stat: "92%", label: "First Contact", sub: "Resolution rate" },
                  ].map(s => (
                    <div key={s.label} className="text-center p-2 rounded-xl bg-muted/30">
                      <p className="text-lg font-bold text-primary">{s.stat}</p>
                      <p className="text-[10px] font-bold text-foreground">{s.label}</p>
                      <p className="text-[8px] text-muted-foreground">{s.sub}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Community Questions */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-foreground" /> Trending Questions
              </h2>
              <div className="space-y-2">
                {[
                  { q: "How do I add TSA PreCheck to my booking?", answers: 12, votes: 45 },
                  { q: "Can I split payment between two cards?", answers: 8, votes: 38 },
                  { q: "How do ZIVO Points expire?", answers: 15, votes: 67 },
                  { q: "What's the refund policy for hotels?", answers: 6, votes: 29 },
                ].map(cq => (
                  <Card key={cq.q} className="border-border/40 hover:border-primary/20 transition-all cursor-pointer">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="text-center min-w-[40px]">
                        <p className="text-xs font-bold text-primary">{cq.votes}</p>
                        <p className="text-[8px] text-muted-foreground">votes</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">{cq.q}</p>
                      </div>
                      <Badge className="bg-muted/50 text-muted-foreground border-0 text-[8px]">{cq.answers} answers</Badge>
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
                  {[
                    "Never share your password or OTP with anyone — ZIVO will never ask for it",
                    "Enable two-factor authentication for extra account security",
                    "Verify driver identity and license plate before entering a ride",
                    "Report suspicious emails claiming to be from ZIVO to security@hizivo.com",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      {tip}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HelpCenter;