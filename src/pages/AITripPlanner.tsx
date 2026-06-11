import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAITripSuggestions, type AIDestination } from "@/hooks/useAITripSuggestions";
import { useCreateTrip, useCreateTripItem } from "@/hooks/useTripItineraries";
import { cn } from "@/lib/utils";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import {
  destBali,
  destDubai,
  destParis,
  destSantorini,
  destTokyo,
  flightDestinations,
  heroRoadTrip,
  lifestyleTravelers,
} from "@/assets";
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
import Star from "lucide-react/dist/esm/icons/star";
import Bot from "lucide-react/dist/esm/icons/bot";
import Globe2 from "lucide-react/dist/esm/icons/globe-2";
import Route from "lucide-react/dist/esm/icons/route";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import Heart from "lucide-react/dist/esm/icons/heart";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Clock from "lucide-react/dist/esm/icons/clock";
import Luggage from "lucide-react/dist/esm/icons/luggage";
import Search from "lucide-react/dist/esm/icons/search";
import SlidersHorizontal from "lucide-react/dist/esm/icons/sliders-horizontal";

type PlannerStep = 1 | 2 | 3 | 4 | 5;
type IconComponent = ComponentType<{ className?: string }>;

const stepLabels = [
  { step: 1, label: "Destination" },
  { step: 2, label: "Dates" },
  { step: 3, label: "Style" },
  { step: 4, label: "Review" },
] as const;

const interestOptions: { id: string; label: string; icon: IconComponent }[] = [
  { id: "culture", label: "Culture", icon: Building2 },
  { id: "nature", label: "Nature", icon: Sun },
  { id: "adventure", label: "Adventure", icon: Compass },
  { id: "food", label: "Food", icon: Sparkles },
  { id: "relaxation", label: "Relaxation", icon: Heart },
  { id: "city", label: "City life", icon: Globe2 },
];

const budgetLevels = [
  { value: "budget", label: "Budget", description: "Lean, smart value" },
  { value: "mid", label: "Mid-range", description: "Comfort + flexibility" },
  { value: "luxury", label: "Luxury", description: "Premium stays" },
] as const;

const quickDestinations = [
  { label: "Bali", country: "Indonesia", image: destBali },
  { label: "Tokyo", country: "Japan", image: destTokyo },
  { label: "Paris", country: "France", image: destParis },
  { label: "Santorini", country: "Greece", image: destSantorini },
  { label: "Dubai", country: "UAE", image: destDubai },
];

const curatedDestinations: AIDestination[] = [
  {
    id: "curated-bali",
    city: "Bali",
    country: "Indonesia",
    airportCode: "DPS",
    price: 1249,
    rating: 4.8,
    tags: ["Beaches", "Culture", "Nature"],
    weather: "28 C clear",
    bestFor: ["Couples", "Creators"],
    matchScore: 95,
    flightTime: "20h 10m",
    description: "Temple mornings, rice terraces, surf breaks, and relaxed resort stays in one itinerary.",
  },
  {
    id: "curated-tokyo",
    city: "Tokyo",
    country: "Japan",
    airportCode: "NRT",
    price: 1399,
    rating: 4.9,
    tags: ["Food", "City life", "Culture"],
    weather: "18 C mild",
    bestFor: ["Food lovers", "Explorers"],
    matchScore: 92,
    flightTime: "14h 15m",
    description: "A polished blend of neighborhood food walks, rail-friendly day trips, and iconic skyline nights.",
  },
  {
    id: "curated-santorini",
    city: "Santorini",
    country: "Greece",
    airportCode: "JTR",
    price: 1799,
    rating: 4.7,
    tags: ["Romance", "Scenery", "Relaxation"],
    weather: "24 C sunny",
    bestFor: ["Couples", "Slow travel"],
    matchScore: 90,
    flightTime: "13h 40m",
    description: "Cliffside stays, caldera sunsets, easy island pacing, and a soft landing for first-time Greece trips.",
  },
];

const destinationImages: Record<string, string> = {
  Bali: destBali,
  Tokyo: destTokyo,
  Paris: destParis,
  Santorini: destSantorini,
  Dubai: destDubai,
};

const formatDate = (date: Date | undefined, fallback: string) => (
  date ? format(date, "MMM d, yyyy") : fallback
);

const budgetLabel = (budget: string) =>
  budgetLevels.find((level) => level.value === budget)?.label ?? "Mid-range";

const AITripPlanner = () => {
  const [step, setStep] = useState<PlannerStep>(1);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { destinations: suggestions, isLoading, fetchSuggestions } = useAITripSuggestions();
  const createTrip = useCreateTrip();
  const createItem = useCreateTripItem();
  const [savingId, setSavingId] = useState<string | null>(null);

  const initialTrip = useMemo(() => {
    const parseDate = (raw: string | null): Date | undefined => {
      if (!raw) return undefined;
      const date = new Date(`${raw}T00:00:00`);
      return Number.isNaN(date.getTime()) ? undefined : date;
    };
    const travelerCount = parseInt(searchParams.get("travelers") || "", 10);
    return {
      destination: searchParams.get("destination") || "",
      depart: parseDate(searchParams.get("depart")),
      back: parseDate(searchParams.get("return")),
      travelers: Number.isFinite(travelerCount) && travelerCount > 0 ? travelerCount : null,
    };
    // Query params should seed the planner only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [destination, setDestination] = useState(initialTrip.destination);
  const [departDate, setDepartDate] = useState<Date | undefined>(initialTrip.depart);
  const [returnDate, setReturnDate] = useState<Date | undefined>(initialTrip.back);
  const [travelers, setTravelers] = useState(initialTrip.travelers ?? 2);
  const [budget, setBudget] = useState<"budget" | "mid" | "luxury">("mid");
  const [interests, setInterests] = useState<string[]>(["culture", "nature", "adventure"]);

  const displayDestinations = suggestions.length > 0 ? suggestions : curatedDestinations;
  const progress = step === 5 ? 100 : Math.round((step / 4) * 100);
  const tripDays = departDate && returnDate
    ? Math.max(1, Math.ceil((returnDate.getTime() - departDate.getTime()) / 86_400_000))
    : null;

  const toggleInterest = (id: string) => {
    setInterests((current) =>
      current.includes(id) ? current.filter((interest) => interest !== id) : [...current, id],
    );
  };

  const handleGenerateSuggestions = async () => {
    const result = await fetchSuggestions({
      budget,
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
        start_date: departDate?.toISOString().split("T")[0] || null,
        end_date: returnDate?.toISOString().split("T")[0] || null,
        total_estimated_cost_cents: dest.price * 100,
      });

      await createItem.mutateAsync({
        itinerary_id: trip.id,
        item_type: "flight",
        title: `Flight to ${dest.city} (${dest.airportCode})`,
        location: dest.city,
        estimated_cost_cents: dest.price * 100,
        sort_order: 0,
      });
      navigate(`/trip/${trip.id}`);
    } finally {
      setSavingId(null);
    }
  };

  const buildFlightLaunchUrl = (airportCode: string) => {
    const params = new URLSearchParams({ to: airportCode, source: "ai-trip-planner" });
    if (departDate) params.set("start", format(departDate, "yyyy-MM-dd"));
    if (returnDate) params.set("end", format(returnDate, "yyyy-MM-dd"));
    params.set("travelers", String(travelers));
    return `/flights?${params.toString()}`;
  };

  const goNext = () => setStep((current) => (current >= 4 ? 4 : ((current + 1) as PlannerStep)));
  const goBack = () => setStep((current) => (current <= 1 ? 1 : ((current - 1) as PlannerStep)));

  const renderPlannerStep = () => {
    switch (step) {
      case 1:
        return (
          <PlannerStepPanel
            title="Where do you want to go?"
            description="Enter a destination or leave it open for a wider discovery pass."
          >
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder='Try "Bali", "Japan", "Santorini"...'
                className="h-14 rounded-lg border-slate-200 bg-white pl-12 pr-4 text-base text-slate-950 shadow-sm"
              />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Popular destinations</p>
              <div className="flex flex-wrap gap-2">
                {quickDestinations.map((quick) => (
                  <button
                    type="button"
                    key={quick.label}
                    onClick={() => setDestination(quick.label)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white",
                      destination === quick.label ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white/80",
                    )}
                  >
                    <img src={quick.image} alt="" className="h-9 w-9 rounded-md object-cover" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-950">{quick.label}</span>
                      <span className="block text-xs text-slate-500">{quick.country}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </PlannerStepPanel>
        );
      case 2:
        return (
          <PlannerStepPanel
            title="When are you moving?"
            description="Set the dates and party size so the plan fits your real trip shape."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <DatePickerButton
                label="Departure"
                date={departDate}
                onSelect={setDepartDate}
                disabled={(date) => date < new Date(new Date().toDateString())}
              />
              <DatePickerButton
                label="Return"
                date={returnDate}
                onSelect={setReturnDate}
                disabled={(date) => date < (departDate || new Date(new Date().toDateString()))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_1.1fr]">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Travelers</p>
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Fewer travelers"
                    onClick={() => setTravelers(Math.max(1, travelers - 1))}
                    className="rounded-lg"
                  >
                    -
                  </Button>
                  <div className="flex items-center gap-2 text-lg font-bold text-slate-950">
                    <Users className="h-5 w-5 text-teal-600" />
                    {travelers}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="More travelers"
                    onClick={() => setTravelers(Math.min(10, travelers + 1))}
                    className="rounded-lg"
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Trip window</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{tripDays ? `${tripDays} days` : "Flexible"}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {departDate || returnDate
                    ? `${formatDate(departDate, "Open")} - ${formatDate(returnDate, "Open")}`
                    : "The planner can start with flexible dates."}
                </p>
              </div>
            </div>
          </PlannerStepPanel>
        );
      case 3:
        return (
          <PlannerStepPanel
            title="Match the travel style"
            description="Choose the pace, comfort level, and experiences that should shape the recommendation set."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {budgetLevels.map((level) => (
                <button
                  type="button"
                  key={level.value}
                  onClick={() => setBudget(level.value)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300",
                    budget === level.value ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white",
                  )}
                >
                  <DollarSign className="mb-3 h-5 w-5 text-teal-600" />
                  <span className="block text-sm font-black text-slate-950">{level.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{level.description}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {interestOptions.map((interest) => (
                <button
                  type="button"
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition",
                    interests.includes(interest.id)
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-teal-300",
                  )}
                >
                  <interest.icon className="h-4 w-4" />
                  {interest.label}
                </button>
              ))}
            </div>
          </PlannerStepPanel>
        );
      case 4:
        return (
          <PlannerStepPanel
            title="Review the request"
            description="ZIVO AI will route the request through the configured provider bridge and return structured destination matches."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryTile icon={MapPin} label="Destination" value={destination || "Open search"} />
              <SummaryTile icon={CalendarIcon} label="Dates" value={tripDays ? `${tripDays} days` : "Flexible"} />
              <SummaryTile icon={Users} label="Travelers" value={`${travelers} traveler${travelers === 1 ? "" : "s"}`} />
              <SummaryTile icon={DollarSign} label="Budget" value={budgetLabel(budget)} />
            </div>
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <ShieldCheck className="h-5 w-5 text-teal-700" />
                Ready to build
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Your request will use the unified AI bridge. DeepSeek powers live travel generation now; Claude can join when Anthropic API access is configured.
              </p>
            </div>
          </PlannerStepPanel>
        );
      case 5:
        return (
          <PlannerStepPanel
            title="Your destination set is ready"
            description="Review the matches below, save a trip, or jump into flights with the airport code already filled."
          >
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <Check className="mr-2 inline h-4 w-4" />
              Recommendations refreshed from your current preferences.
            </div>
          </PlannerStepPanel>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f6fbff] text-slate-950">
      <SEOHead
        title="AI Trip Planner - ZIVO | Plan Your Perfect Trip"
        description="Use ZIVO's AI trip planner to discover personalized destinations, compare trip styles, and save your next itinerary."
        canonical="/ai-trip-planner"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "ZIVO AI Trip Planner",
          description: "AI-powered travel planning",
          applicationCategory: "TravelApplication",
        }}
      />
      <NavBar />

      <main className="pt-20">
        <section className="relative overflow-hidden border-b border-slate-200 bg-sky-50">
          <img
            src={heroRoadTrip}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/45" />
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />

          <div className="container relative mx-auto grid min-h-[calc(100vh-5rem)] gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-14">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-white/80 px-4 py-2 text-sm font-bold text-teal-900 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4 text-teal-600" />
                ZIVO AI Trip Planner
              </div>
              <h1 className="mt-6 max-w-xl text-5xl font-black leading-[0.95] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                Plan Your Perfect <span className="text-teal-600">Trip</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Tell ZIVO how you like to travel. The planner turns your dates, budget, and style into destination matches you can save or launch into booking.
              </p>

              <div className="mt-7 grid gap-3 rounded-lg border border-white/70 bg-white/85 p-4 shadow-xl shadow-sky-900/10 backdrop-blur sm:grid-cols-3">
                <ProviderStatus icon={Bot} label="ZIVO AI" value="Auto route" tone="teal" />
                <ProviderStatus icon={Plane} label="DeepSeek" value="Live travel" tone="blue" />
                <ProviderStatus icon={Sparkles} label="Claude API" value="Optional" tone="coral" />
              </div>

              <div className="mt-4 grid gap-3 rounded-lg border border-white/70 bg-white/80 p-3 shadow-lg shadow-sky-900/10 backdrop-blur sm:grid-cols-4">
                <TripStat icon={Route} label="Trip type" value={interests[0] ? interestOptions.find((item) => item.id === interests[0])?.label || "Leisure" : "Leisure"} />
                <TripStat icon={Users} label="Travelers" value={`${travelers} ${travelers === 1 ? "adult" : "adults"}`} />
                <TripStat icon={DollarSign} label="Budget" value={budgetLabel(budget)} />
                <TripStat icon={Clock} label="Duration" value={tripDays ? `${tripDays} days` : "Flexible"} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28, rotateX: 5 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-2xl shadow-sky-950/15 backdrop-blur lg:p-6"
            >
              <PlannerStepNav step={step} />
              <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
                {isLoading ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-teal-50">
                      <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
                    </div>
                    <h2 className="mt-5 text-2xl font-black text-slate-950">Building your trip set</h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                      The planner is matching your request against destination signals, budget rhythm, and booking intent.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.22 }}
                    >
                      {renderPlannerStep()}
                    </motion.div>
                  </AnimatePresence>
                )}

                {!isLoading && (
                  <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goBack}
                      disabled={step === 1}
                      className="gap-2 rounded-lg"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      {step === 5 ? (
                        <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2 rounded-lg">
                          <Search className="h-4 w-4" />
                          New search
                        </Button>
                      ) : step < 4 ? (
                        <Button type="button" onClick={goNext} className="gap-2 rounded-lg bg-slate-950 text-white hover:bg-slate-800">
                          Continue
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleGenerateSuggestions}
                          className="gap-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700"
                        >
                          <Sparkles className="h-4 w-4" />
                          Build my trip
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full rounded-full bg-teal-600"
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="container mx-auto grid gap-5 px-4 py-8 lg:grid-cols-[1fr_1fr]">
            <InsightPanel
              icon={Heart}
              title="Your travel personality"
              description="Your current profile favors culture, outdoor rhythm, and practical comfort."
              image={lifestyleTravelers}
            >
              <div className="flex flex-wrap gap-2">
                {interestOptions.map((interest) => (
                  <button
                    type="button"
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition",
                      interests.includes(interest.id)
                        ? "border-teal-500 bg-teal-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-teal-300",
                    )}
                  >
                    <interest.icon className="h-4 w-4" />
                    {interest.label}
                  </button>
                ))}
              </div>
            </InsightPanel>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                    <SlidersHorizontal className="h-5 w-5 text-teal-600" />
                    AI workflow and orchestration
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Requests go through the Worker bridge, then route to the configured provider for the job.
                  </p>
                </div>
                <Badge className="rounded-lg bg-white text-slate-700">/api/ai/chat</Badge>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <WorkflowNode icon={Sparkles} title="Claude API" status="Optional" />
                <WorkflowNode icon={Bot} title="ZIVO AI" status="Auto" />
                <WorkflowNode icon={Plane} title="DeepSeek" status="Live" />
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Claude Pro is personal chat access. The live app uses DeepSeek now and can add Anthropic API billing later.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#f6fbff] py-10">
          <div className="container mx-auto px-4">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-teal-700">
                  <Sparkles className="h-4 w-4" />
                  AI recommended destinations
                </div>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Top matches for this planner</h2>
              </div>
              <Button type="button" variant="outline" className="gap-2 rounded-lg" onClick={() => setStep(4)}>
                Tune request
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {displayDestinations.slice(0, 3).map((destinationOption, index) => (
                <DestinationCard
                  key={destinationOption.id}
                  destination={destinationOption}
                  index={index}
                  image={destinationImages[destinationOption.city] || flightDestinations}
                  saving={savingId === destinationOption.id}
                  onSave={() => handleSaveAsTrip(destinationOption)}
                  onStart={() => navigate(buildFlightLaunchUrl(destinationOption.airportCode))}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

function PlannerStepPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[330px] space-y-5">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function PlannerStepNav({ step }: { step: PlannerStep }) {
  const activeStep = Math.min(step, 4);
  return (
    <div className="grid grid-cols-4 gap-2">
      {stepLabels.map((item) => (
        <div key={item.step} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-black",
              item.step === activeStep
                ? "border-teal-600 bg-teal-600 text-white"
                : item.step < activeStep
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-500",
            )}
          >
            {item.step < activeStep ? <Check className="h-4 w-4" /> : item.step}
          </div>
          <span className={cn("hidden text-xs font-bold sm:block", item.step === activeStep ? "text-teal-700" : "text-slate-500")}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function DatePickerButton({
  label,
  date,
  onSelect,
  disabled,
}: {
  label: string;
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  disabled: (date: Date) => boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-14 justify-start gap-3 rounded-lg border-slate-200 bg-white text-left text-slate-700"
        >
          <CalendarIcon className="h-5 w-5 text-teal-600" />
          <span>
            <span className="block text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">{label}</span>
            <span className="block text-sm font-bold text-slate-950">{formatDate(date, "Choose date")}</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={onSelect} disabled={disabled} />
      </PopoverContent>
    </Popover>
  );
}

function SummaryTile({ icon: Icon, label, value }: { icon: IconComponent; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <Icon className="h-5 w-5 text-teal-600" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-base font-black text-slate-950">{value}</p>
    </div>
  );
}

function ProviderStatus({ icon: Icon, label, value, tone }: { icon: IconComponent; label: string; value: string; tone: "teal" | "blue" | "coral" }) {
  const tones = {
    teal: "bg-teal-50 text-teal-700",
    blue: "bg-sky-50 text-sky-700",
    coral: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="flex items-center gap-3 border-slate-200 sm:border-r sm:last:border-r-0">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="text-sm font-black text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function TripStat({ icon: Icon, label, value }: { icon: IconComponent; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="text-sm font-black text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function InsightPanel({
  icon: Icon,
  title,
  description,
  image,
  children,
}: {
  icon: IconComponent;
  title: string;
  description: string;
  image: string;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-teal-100 bg-teal-50 p-5">
      <img src={image} alt="" className="absolute right-0 top-0 h-full w-1/3 object-cover opacity-20" />
      <div className="relative">
        <div className="flex items-center gap-2 text-sm font-black text-slate-950">
          <Icon className="h-5 w-5 text-teal-700" />
          {title}
        </div>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function WorkflowNode({ icon: Icon, title, status }: { icon: IconComponent; title: string; status: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <Icon className="h-6 w-6 text-teal-600" />
      <p className="mt-3 text-sm font-black text-slate-950">{title}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{status}</p>
    </div>
  );
}

function DestinationCard({
  destination,
  image,
  index,
  saving,
  onSave,
  onStart,
}: {
  destination: AIDestination;
  image: string;
  index: number;
  saving: boolean;
  onSave: () => void;
  onStart: () => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: index * 0.08 }}
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-900/10"
    >
      <div className="relative h-48 overflow-hidden">
        <img src={image} alt="" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
        <Badge className="absolute left-4 top-4 rounded-lg bg-emerald-600 text-white shadow-lg">
          {destination.matchScore}% match
        </Badge>
        <button
          type="button"
          aria-label={`Favorite ${destination.city}`}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:text-rose-600"
        >
          <Heart className="h-5 w-5" />
        </button>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-950">{destination.city}, {destination.country}</h3>
            <p className="mt-1 text-sm text-slate-500">{destination.airportCode} airport</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400">From</p>
            <p className="text-xl font-black text-teal-700">${Math.round(destination.price).toLocaleString()}</p>
          </div>
        </div>
        <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-600">{destination.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {destination.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="rounded-lg border-slate-200 bg-slate-50 text-slate-600">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <MiniMetric icon={Plane} value={destination.flightTime} />
          <MiniMetric icon={Star} value={`${destination.rating} rating`} />
          <MiniMetric icon={Sun} value={destination.weather} />
          <MiniMetric icon={Luggage} value={destination.bestFor[0] || "Flexible"} />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] border-t border-slate-200">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex min-h-12 items-center justify-center gap-2 border-r border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
          Save
        </button>
        <button
          type="button"
          onClick={onStart}
          className="flex min-h-12 items-center justify-center gap-2 border-r border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Start
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Share ${destination.city}`}
          className="flex min-h-12 w-12 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </motion.article>
  );
}

function MiniMetric({ icon: Icon, value }: { icon: IconComponent; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-600">
      <Icon className="h-4 w-4 text-teal-600" />
      <span className="truncate font-semibold">{value}</span>
    </div>
  );
}

export default AITripPlanner;
