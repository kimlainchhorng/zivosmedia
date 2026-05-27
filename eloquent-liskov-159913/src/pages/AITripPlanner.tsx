/**
 * AI Trip Planner - Full AI-powered trip planning wizard
 */

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAITripSuggestions, type AIDestination } from "@/hooks/useAITripSuggestions";
import { useCreateTrip, useCreateTripItem } from "@/hooks/useTripItineraries";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar";
import Users from "lucide-react/dist/esm/icons/users";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import Plane from "lucide-react/dist/esm/icons/plane";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import Compass from "lucide-react/dist/esm/icons/compass";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import Check from "lucide-react/dist/esm/icons/check";
import Sun from "lucide-react/dist/esm/icons/sun";
import Cloud from "lucide-react/dist/esm/icons/cloud";
import Umbrella from "lucide-react/dist/esm/icons/umbrella";
import Star from "lucide-react/dist/esm/icons/star";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const interestOptions = [
  { id: "beach", label: "Beach & Relaxation", icon: Sun },
  { id: "culture", label: "Culture & History", icon: Building2 },
  { id: "adventure", label: "Adventure", icon: Compass },
  { id: "food", label: "Food & Dining", icon: Sparkles },
  { id: "nightlife", label: "Nightlife", icon: Sparkles },
  { id: "nature", label: "Nature & Wildlife", icon: Compass },
  { id: "shopping", label: "Shopping", icon: Sparkles },
  { id: "romantic", label: "Romantic", icon: Sparkles },
];

const budgetLevels = [
  { value: "budget", label: "Budget", description: "Under $100/day" },
  { value: "mid", label: "Mid-Range", description: "$100-250/day" },
  { value: "luxury", label: "Luxury", description: "$250+/day" },
];

// Using AIDestination from useAITripSuggestions hook

const AITripPlanner = () => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { destinations: suggestions, isLoading, fetchSuggestions } = useAITripSuggestions();
  const createTrip = useCreateTrip();
  const createItem = useCreateTripItem();
  const [savingId, setSavingId] = useState<string | null>(null);

  // Honor share-card / deep-link query params on mount: ?destination= &depart= &return= &travelers=
  // (matches ZivoCardPicker's trip composer).
  const initialTrip = useMemo(() => {
    const parseDate = (raw: string | null): Date | undefined => {
      if (!raw) return undefined;
      const d = new Date(raw + "T00:00:00");
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const t = parseInt(searchParams.get("travelers") || "", 10);
    return {
      destination: searchParams.get("destination") || "",
      depart: parseDate(searchParams.get("depart")),
      back: parseDate(searchParams.get("return")),
      travelers: Number.isFinite(t) && t > 0 ? t : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Form state
  const [destination, setDestination] = useState(initialTrip.destination);
  const [departDate, setDepartDate] = useState<Date | undefined>(initialTrip.depart);
  const [returnDate, setReturnDate] = useState<Date | undefined>(initialTrip.back);
  const [travelers, setTravelers] = useState(initialTrip.travelers ?? 2);
  const [budget, setBudget] = useState<string>("mid");
  const [interests, setInterests] = useState<string[]>([]);

  const totalSteps = 4;

  const toggleInterest = (id: string) => {
    setInterests(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGenerateSuggestions = async () => {
    const result = await fetchSuggestions({
      budget: budget as 'budget' | 'mid' | 'luxury',
      activities: interests,
      travelers,
      origin: destination || "New York",
    });
    if (result) {
      setStep(5);
    }
  };

  const handleSaveAsTrip = async (dest: AIDestination) => {
    setSavingId(dest.id);
    try {
      const trip = await createTrip.mutateAsync({
        title: `Trip to ${dest.city}`,
        destination: `${dest.city}, ${dest.country}`,
        start_date: departDate?.toISOString().split('T')[0] || null,
        end_date: returnDate?.toISOString().split('T')[0] || null,
        total_estimated_cost_cents: dest.price * 100,
      });
      // Add a flight item
      await createItem.mutateAsync({
        itinerary_id: trip.id,
        item_type: "flight",
        title: `Flight to ${dest.city} (${dest.airportCode})`,
        location: dest.city,
        estimated_cost_cents: dest.price * 100,
        sort_order: 0,
      });
      toast.success("Trip saved! Redirecting...");
      navigate(`/trip/${trip.id}`);
    } catch {
      toast.error("Failed to save trip");
    } finally {
      setSavingId(null);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Where do you want to go?</h2>
              <p className="text-muted-foreground">Enter a destination or leave blank for "Anywhere"</p>
            </div>
            
            <div className="relative max-w-md mx-auto">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Paris, Tokyo, Anywhere..."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="pl-12 h-14 text-lg rounded-xl"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {["Anywhere", "Europe", "Asia", "Caribbean"].map((quick) => (
                <Button
                  key={quick}
                  variant={destination === quick ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDestination(quick)}
                  className="rounded-full"
                >
                  {quick}
                </Button>
              ))}
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">When are you traveling?</h2>
              <p className="text-muted-foreground">Select your travel dates or approximate range</p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-14 justify-start gap-3 rounded-xl">
                    <CalendarIcon className="w-5 h-5" />
                    {departDate ? format(departDate, "MMM d, yyyy") : "Departure date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={departDate}
                    onSelect={setDepartDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-14 justify-start gap-3 rounded-xl">
                    <CalendarIcon className="w-5 h-5" />
                    {returnDate ? format(returnDate, "MMM d, yyyy") : "Return date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={returnDate}
                    onSelect={setReturnDate}
                    disabled={(date) => date < (departDate || new Date())}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="max-w-md mx-auto">
              <label className="text-sm text-muted-foreground mb-2 block text-center">
                Number of travelers
              </label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Fewer travelers"
                  onClick={() => setTravelers(Math.max(1, travelers - 1))}
                  className="rounded-full"
                >
                  -
                </Button>
                <div className="flex items-center gap-2 min-w-[100px] justify-center">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{travelers}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="More travelers"
                  onClick={() => setTravelers(Math.min(10, travelers + 1))}
                  className="rounded-full"
                >
                  +
                </Button>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">What's your budget?</h2>
              <p className="text-muted-foreground">This helps us find the best options for you</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              {budgetLevels.map((level) => (
                <Button
                  key={level.value}
                  variant={budget === level.value ? "default" : "outline"}
                  onClick={() => setBudget(level.value)}
                  className={cn(
                    "h-auto py-4 flex flex-col gap-1 rounded-xl",
                    budget === level.value && "ring-2 ring-primary"
                  )}
                >
                  <span className="font-semibold">{level.label}</span>
                  <span className="text-xs opacity-70">{level.description}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">What do you enjoy?</h2>
              <p className="text-muted-foreground">Select your interests to personalize recommendations</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {interestOptions.map((interest) => (
                <Button
                  key={interest.id}
                  variant={interests.includes(interest.id) ? "default" : "outline"}
                  onClick={() => toggleInterest(interest.id)}
                  className={cn(
                    "h-auto py-4 flex flex-col gap-2 rounded-xl transition-all",
                    interests.includes(interest.id) && "ring-2 ring-primary scale-105"
                  )}
                >
                  <interest.icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{interest.label}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Your AI Trip Suggestions</h2>
              <p className="text-muted-foreground">
                Personalized destinations based on your preferences
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:border-primary/50 transition-all group">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold">{suggestion.city}</h3>
                          <p className="text-sm text-muted-foreground">{suggestion.country}</p>
                        </div>
                        <Badge className="bg-secondary text-foreground">
                          {suggestion.matchScore}% Match
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        {suggestion.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {suggestion.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-foreground" />
                          <span>From ${suggestion.price}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4 text-amber-500" />
                          <span>{suggestion.weather}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-foreground" />
                          <span>{suggestion.rating} rating</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-500" />
                          <span>{suggestion.flightTime} flight</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button className="flex-1 gap-2" onClick={() => handleSaveAsTrip(suggestion)} disabled={savingId === suggestion.id}>
                          {savingId === suggestion.id ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                          ) : (
                            <><Bookmark className="w-4 h-4" /> Save as Trip</>
                          )}
                        </Button>
                        <Button aria-label="Search flights" variant="outline" size="icon" onClick={() => navigate(`/flights?to=${suggestion.airportCode}`)}>
                          <Plane className="w-4 h-4" />
                        </Button>
                        <Button aria-label="Share" variant="outline" size="icon">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            
            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto">
              AI suggestions are estimates based on current data. Actual prices may vary. 
              Book directly with partners for confirmed pricing.
            </p>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="AI Trip Planner – ZIVO | Plan Your Perfect Trip"
        description="Use ZIVO's AI to discover personalized travel destinations, plan itineraries, and book everything in one place."
        canonical="/ai-trip-planner"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "ZIVO AI Trip Planner",
          "description": "AI-powered travel planning",
          "applicationCategory": "TravelApplication"
        }}
      />
      <NavBar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border mb-6 bg-secondary">
              <Sparkles className="w-4 h-4 text-foreground" />
              <span className="text-sm font-medium text-foreground">AI-Powered Planning</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Plan Your Perfect Trip
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tell us your preferences and our AI will create personalized destination 
              recommendations with flights, hotels, and travel tips.
            </p>
          </div>

          {/* Progress Bar */}
          {step < 5 && (
            <div className="max-w-2xl mx-auto mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round((step / totalSteps) * 100)}% complete
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-secondary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Content Card */}
          <Card className="max-w-3xl mx-auto border-border">
            <CardContent className="p-8">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-secondary">
                    <Loader2 className="w-8 h-8 text-foreground animate-spin" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">AI is thinking...</h3>
                  <p className="text-muted-foreground">
                    Analyzing your preferences and finding the best destinations
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {renderStep()}
                </AnimatePresence>
              )}

              {/* Navigation */}
              {!isLoading && step < 5 && (
                <div className="flex justify-between mt-8 pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setStep(Math.max(1, step - 1))}
                    disabled={step === 1}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                  
                  {step < totalSteps ? (
                    <Button
                      onClick={() => setStep(step + 1)}
                      className="gap-2 bg-secondary"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleGenerateSuggestions}
                      className="gap-2 bg-secondary"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Suggestions
                    </Button>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="flex justify-center mt-8 pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="gap-2"
                  >
                    <Compass className="w-4 h-4" />
                    Start New Search
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* === WAVE 7: AI Trip Planning Intelligence === */}
          <div className="max-w-3xl mx-auto mt-12 space-y-8">
            {/* Travel Personality */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-foreground" /> Your Travel Personality</h2>
              <Card className="border-border bg-secondary">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-2">🌍</div>
                  <p className="text-lg font-bold text-foreground">The Explorer</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">You love discovering new cultures and off-the-beaten-path destinations. You prefer authentic local experiences over tourist hotspots.</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {["Culture","Adventure","Foodie","Budget-savvy"].map(t => (
                      <Badge key={t} className="bg-secondary text-foreground border-0 text-[9px]">{t}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Visa Requirements */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-foreground" /> Visa Quick Check</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { country: "Japan", flag: "🇯🇵", status: "Visa-free", duration: "90 days", color: "text-emerald-500" },
                  { country: "Thailand", flag: "🇹🇭", status: "Visa on arrival", duration: "30 days", color: "text-amber-500" },
                  { country: "Brazil", flag: "🇧🇷", status: "E-Visa required", duration: "90 days", color: "text-sky-500" },
                  { country: "India", flag: "🇮🇳", status: "E-Visa required", duration: "60 days", color: "text-sky-500" },
                ].map(v => (
                  <Card key={v.country} className="border-border/40">
                    <CardContent className="p-3 flex items-center gap-3">
                      <span className="text-xl">{v.flag}</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-foreground">{v.country}</p>
                        <p className="text-[10px] text-muted-foreground">Stay: {v.duration}</p>
                      </div>
                      <Badge className={cn("border-0 text-[8px]", v.color === "text-emerald-500" ? "bg-emerald-500/10 text-emerald-500" : v.color === "text-amber-500" ? "bg-amber-500/10 text-amber-500" : "bg-sky-500/10 text-sky-500")}>{v.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground mt-2">* For US passport holders. Verify with embassy before travel.</p>
            </div>

            {/* Trip Cost Breakdown */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> Average Trip Costs</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { dest: "Paris, France", daily: "$150-250", flight: "$450", hotel: "$120/nt", total: "$1,800", level: "Mid-Range" },
                  { dest: "Bangkok, Thailand", daily: "$40-80", flight: "$650", hotel: "$35/nt", total: "$1,200", level: "Budget" },
                  { dest: "Tokyo, Japan", daily: "$100-200", flight: "$800", hotel: "$90/nt", total: "$2,100", level: "Mid-Range" },
                ].map(c => (
                  <Card key={c.dest} className="border-border/40">
                    <CardContent className="p-4">
                      <p className="text-xs font-bold text-foreground mb-2">{c.dest}</p>
                      <div className="space-y-1 text-[10px] text-muted-foreground">
                        <div className="flex justify-between"><span>Daily budget</span><span className="font-bold text-foreground">{c.daily}</span></div>
                        <div className="flex justify-between"><span>Round-trip flight</span><span>{c.flight}</span></div>
                        <div className="flex justify-between"><span>Hotel avg</span><span>{c.hotel}</span></div>
                        <div className="border-t border-border/30 pt-1 mt-1 flex justify-between font-bold text-foreground"><span>7-day total</span><span className="text-primary">{c.total}</span></div>
                      </div>
                      <Badge className="mt-2 bg-muted/50 text-foreground border-0 text-[8px]">{c.level}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Travel Tips by Season */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Sun className="w-5 h-5 text-amber-500" /> Seasonal Travel Tips</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { season: "Spring (Mar-May)", tip: "Cherry blossoms in Japan, shoulder season in Europe. Book 6 weeks ahead for best prices.", emoji: "🌸" },
                  { season: "Summer (Jun-Aug)", tip: "Peak prices everywhere. Consider Southeast Asia (low season = fewer crowds + lower prices).", emoji: "☀️" },
                  { season: "Fall (Sep-Nov)", tip: "Best value for Europe. Fewer crowds, warm weather, harvest festivals.", emoji: "🍂" },
                  { season: "Winter (Dec-Feb)", tip: "Tropical escapes are hot deals. Ski resorts book 3+ months ahead.", emoji: "❄️" },
                ].map(s => (
                  <Card key={s.season} className="border-border/40">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{s.emoji}</span>
                        <p className="text-xs font-bold text-foreground">{s.season}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{s.tip}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Packing Suggestions by Destination Type */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Bookmark className="w-5 h-5 text-primary" /> Smart Packing by Trip Type</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { type: "Beach Vacation", must: ["Reef-safe sunscreen","Quick-dry towel","Waterproof phone case","Flip flops"], emoji: "🏖️" },
                  { type: "City Break", must: ["Comfortable walking shoes","Portable charger","Crossbody bag","Rain jacket"], emoji: "🏙️" },
                  { type: "Adventure Trip", must: ["First aid kit","Headlamp","Moisture-wicking layers","Water purifier"], emoji: "🏔️" },
                ].map(p => (
                  <Card key={p.type} className="border-border/40">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span>{p.emoji}</span>
                        <p className="text-xs font-bold text-foreground">{p.type}</p>
                      </div>
                      <div className="space-y-1">
                        {p.must.map(item => (
                          <div key={item} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AITripPlanner;
