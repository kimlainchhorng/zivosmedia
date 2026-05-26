/**
 * Flight Results Page — /flights/results
 * Full OTA filter system with mobile bottom sheet
 */

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Plane, ArrowLeft, Filter, X, AlertTriangle, WifiOff, RefreshCw, Luggage, Clock, ChevronRight, ArrowRight, Sunrise, Sun, Sunset, Moon, Check, CalendarDays, Users, Pencil, ExternalLink, Star, ShieldCheck, Zap } from "lucide-react";
import FlightSearchFormPro from "@/components/search/FlightSearchFormPro";
import PriceAlertButton from "@/components/flight/PriceAlertButton";
import { useAviasalesSearch, type AviasalesResult } from "@/hooks/useAviasalesSearch";
import zivoLogoPng from "@/assets/zivo-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AppLayout from "@/components/app/AppLayout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import FlightResultsSkeleton from "@/components/flight/FlightResultsSkeleton";
import { useDuffelFlightSearch, type DuffelOffer } from "@/hooks/useDuffelFlights";
import { useTravelpayoutsPrices, type TravelpayoutsPrice } from "@/hooks/useTravelpayoutsPrices";
import { AirlineLogo } from "@/components/flight/AirlineLogo";
import { getAirportByCode } from "@/data/airports";
import { cn } from "@/lib/utils";
import DuffelFlightCard from "@/components/flight/DuffelFlightCard";
import FlightCompareWidget, { type CompareFlight } from "@/components/flight/FlightCompareWidget";
import FlightLegCard, { type LegGroup } from "@/components/flight/FlightLegCard";
import FlightEmptyState from "@/components/flight/FlightEmptyState";
import { useIsMobile } from "@/hooks/use-mobile";
import { QuickStatsBar } from "@/components/flight/QuickStatsBar";
import { ResultsFAQ } from "@/components/results/ResultsFAQ";
import TravelExtrasCTA from "@/components/shared/TravelExtrasCTA";
import { groupByOutbound, groupByReturn, getLegDurationMinutes } from "@/lib/flightLegGrouping";
import { getAllInPrice } from "@/utils/flightPricing";
import { TRAVELPAYOUTS_DIRECT_LINKS } from "@/config/affiliateLinks";
import { openExternalUrl } from "@/lib/openExternalUrl";
import PullToRefresh from "@/components/shared/PullToRefresh";

type SortBy = "best" | "cheapest" | "fastest" | "earliest" | "shortest";

interface FlightFiltersState {
  maxPrice: number;
  stops: number[];
  departureTime: string[];
  arrivalTime: string[];
  airlines: string[];
  maxDuration: number;
  refundableOnly: boolean;
  baggagePersonalItem: boolean;
  baggageCarryOn: boolean;
  baggageChecked: boolean;
}

const defaultFilters: FlightFiltersState = {
  maxPrice: 0,
  stops: [],
  departureTime: [],
  arrivalTime: [],
  airlines: [],
  maxDuration: 0,
  refundableOnly: false,
  baggagePersonalItem: false,
  baggageCarryOn: false,
  baggageChecked: false,
};

const timeOptions = [
  { id: "early_morning", label: "Early Morning", sub: "12am – 6am", icon: Moon },
  { id: "morning", label: "Morning", sub: "6am – 12pm", icon: Sunrise },
  { id: "afternoon", label: "Afternoon", sub: "12pm – 6pm", icon: Sun },
  { id: "evening", label: "Evening", sub: "6pm – 12am", icon: Sunset },
];

const FlightResults = () => {
  const isMobile = useIsMobile();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<SortBy>("best");
  const [filters, setFilters] = useState<FlightFiltersState>(defaultFilters);
  const [pendingFilters, setPendingFilters] = useState<FlightFiltersState>(defaultFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Two-step round-trip selection
  const [selectionStep, setSelectionStep] = useState<"outbound" | "return">("outbound");
  const [selectedOutboundGroup, setSelectedOutboundGroup] = useState<LegGroup | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [compareList, setCompareList] = useState<CompareFlight[]>([]);

  const handleAddToCompare = (flight: CompareFlight) => {
    setCompareList(prev => {
      if (prev.find(f => f.id === flight.id)) return prev.filter(f => f.id !== flight.id);
      if (prev.length >= 3) return prev;
      return [...prev, flight];
    });
  };

  const handlePartnerOpen = useCallback((url: string) => {
    void openExternalUrl(url);
  }, []);

  const origin = params.get("origin") || "";
  const destination = params.get("destination") || params.get("dest") || "";
  const departureDate = params.get("departureDate") || params.get("depart") || "";
  const returnDate = params.get("returnDate") || params.get("return") || undefined;
  const passengerCount = Number(params.get("passengers") || 0);
  const adults = Number(params.get("adults") || passengerCount || 1);
  const children = Number(params.get("children") || 0);
  const infants = Number(params.get("infants") || 0);
  const rawCabinClass = params.get("cabinClass") || params.get("cabin") || "economy";
  const cabinClass = (rawCabinClass === "premium" ? "premium_economy" : rawCabinClass) as 'economy' | 'premium_economy' | 'business' | 'first';
  const totalPassengers = adults + children + infants;

  // Validate return date is after departure date to prevent API errors
  const validReturnDate = returnDate && departureDate && returnDate > departureDate ? returnDate : undefined;

  const originAirport = getAirportByCode(origin);
  const destAirport = getAirportByCode(destination);

  const { data, isLoading, error, refetch } = useDuffelFlightSearch({
    origin, destination, departureDate, returnDate: validReturnDate,
    passengers: { adults, children, infants },
    cabinClass,
    enabled: !!origin && !!destination && !!departureDate,
  });

  const handlePullRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Travelpayouts cached prices (runs in parallel, non-blocking)
  const { data: tpPrices = [] } = useTravelpayoutsPrices({
    origin,
    destination,
    departureDate,
    returnDate: validReturnDate,
    enabled: !!origin && !!destination && !!departureDate,
  });

  // Aviasales Real-Time Search (multi-agency live prices)
  const { data: aviasalesData } = useAviasalesSearch({
    origin,
    destination,
    departureDate,
    returnDate: validReturnDate,
    adults,
    children,
    infants,
    cabinClass,
    enabled: !!origin && !!destination && !!departureDate,
  });

  const aviasalesResults = aviasalesData?.results || [];
  const aviasalesMeta = aviasalesData?.meta;
  const hasLiveAviasalesData = aviasalesResults.length > 0;
  const hasCachedTravelpayoutsData = tpPrices.length > 0;

  const offers = data?.offers || [];
  const isRoundTrip = !!validReturnDate;

  // Best prices for comparison
  const bestTpPrice = useMemo(() => {
    if (!tpPrices.length) return null;
    return tpPrices.reduce((best, p) => (p.price < best.price ? p : best), tpPrices[0]);
  }, [tpPrices]);

  const bestAviasalesPrice = useMemo(() => {
    if (!aviasalesResults.length) return null;
    return aviasalesResults[0]; // already sorted by price
  }, [aviasalesResults]);

  // Lowest Duffel price for comparison
  const lowestDuffelPrice = useMemo(() => {
    if (!offers.length) return null;
    return Math.min(...offers.map((o) => o.price));
  }, [offers]);

  // Group offers by outbound leg for step-by-step selection
  const outboundGroups = useMemo(() => {
    if (!isRoundTrip || offers.length === 0) return [];
    return groupByOutbound(offers, destination);
  }, [offers, destination, isRoundTrip]);

  // When outbound is selected, group remaining offers by return leg
  const returnGroups = useMemo(() => {
    if (!selectedOutboundGroup) return [];
    return groupByReturn(selectedOutboundGroup.offers, destination);
  }, [selectedOutboundGroup, destination]);

  // Sort leg groups
  const sortLegGroups = useCallback((groups: LegGroup[], sort: SortBy) => {
    const sorted = [...groups];
    switch (sort) {
      case "cheapest": sorted.sort((a, b) => a.fromPrice - b.fromPrice); break;
      case "fastest": sorted.sort((a, b) => getLegDurationMinutes(a) - getLegDurationMinutes(b)); break;
      case "earliest": sorted.sort((a, b) => a.summary.depTime.localeCompare(b.summary.depTime)); break;
      case "best":
        sorted.sort((a, b) => {
          const maxP = Math.max(...groups.map(g => g.fromPrice), 1);
          const maxD = Math.max(...groups.map(g => getLegDurationMinutes(g)), 1);
          const scoreA = (a.fromPrice / maxP) * 0.4 + (getLegDurationMinutes(a) / maxD) * 0.4 + (a.summary.stops > 0 ? 0.2 : 0);
          const scoreB = (b.fromPrice / maxP) * 0.4 + (getLegDurationMinutes(b) / maxD) * 0.4 + (b.summary.stops > 0 ? 0.2 : 0);
          return scoreA - scoreB;
        });
        break;
      default: sorted.sort((a, b) => a.fromPrice - b.fromPrice);
    }
    return sorted;
  }, []);

  const sortedOutboundGroups = useMemo(() => sortLegGroups(outboundGroups, sortBy), [outboundGroups, sortBy, sortLegGroups]);
  const sortedReturnGroups = useMemo(() => sortLegGroups(returnGroups, sortBy), [returnGroups, sortBy, sortLegGroups]);

  const handleSelectOutbound = useCallback((group: LegGroup) => {
    setSelectedOutboundGroup(group);
    setSelectionStep("return");
    setSortBy("best");
  }, []);

  const handleSelectReturn = (group: LegGroup) => {
    const bestOffer = group.representativeOffer;
    sessionStorage.setItem("zivo_selected_offer", JSON.stringify(bestOffer));
    sessionStorage.setItem("zivo_selected_offer_snapshot", JSON.stringify(bestOffer));
    sessionStorage.setItem("zivo_search_params", JSON.stringify({
      origin, destination, departureDate, returnDate, adults, children, infants, cabinClass,
    }));
    navigate("/flights/details/review");
  };

  const handleBackToOutbound = useCallback(() => {
    setSelectedOutboundGroup(null);
    setSelectionStep("outbound");
  }, []);

  const priceRange = useMemo(() => {
    if (offers.length === 0) return { min: 0, max: 2000 };
    const prices = offers.map((o) => o.price);
    return { min: Math.floor(getAllInPrice(Math.min(...prices))), max: Math.ceil(getAllInPrice(Math.max(...prices))) };
  }, [offers]);

  const maxDurationRange = useMemo(() => {
    if (offers.length === 0) return { min: 0, max: 1440 };
    const durations = offers.map(o => o.durationMinutes);
    return { min: Math.floor(Math.min(...durations)), max: Math.ceil(Math.max(...durations)) };
  }, [offers]);

  const availableAirlines = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number }>();
    offers.forEach(o => {
      const existing = map.get(o.airlineCode);
      if (existing) existing.count++;
      else map.set(o.airlineCode, { code: o.airlineCode, name: o.airline, count: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [offers]);

  const getTimeBucket = (time: string): string => {
    const hour = parseInt(time.split(":")[0], 10);
    if (hour < 6) return "early_morning";
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  };

  const applyFilters = (f: FlightFiltersState, offerList: DuffelOffer[]) => {
    let result = [...offerList];
    if (f.maxPrice > 0) result = result.filter(o => getAllInPrice(o.price) <= f.maxPrice);
    if (f.stops.length > 0) result = result.filter(o => f.stops.some(s => s === 2 ? o.stops >= 2 : o.stops === s));
    if (f.departureTime.length > 0) result = result.filter(o => f.departureTime.includes(getTimeBucket(o.departure.time)));
    if (f.arrivalTime.length > 0) result = result.filter(o => f.arrivalTime.includes(getTimeBucket(o.arrival.time)));
    if (f.airlines.length > 0) result = result.filter(o => f.airlines.includes(o.airlineCode));
    if (f.maxDuration > 0) result = result.filter(o => o.durationMinutes <= f.maxDuration);
    if (f.refundableOnly) result = result.filter(o => o.isRefundable);
    if (f.baggagePersonalItem) result = result.filter(o => o.baggageIncluded && o.baggageIncluded.toLowerCase().includes("personal"));
    if (f.baggageCarryOn) result = result.filter(o => o.baggageIncluded && (o.baggageIncluded.toLowerCase().includes("carry") || o.baggageIncluded.toLowerCase().includes("cabin")));
    if (f.baggageChecked) result = result.filter(o => o.baggageIncluded && o.baggageIncluded.toLowerCase().includes("checked"));
    return result;
  };

  const sortOffers = (offerList: DuffelOffer[], sort: SortBy) => {
    const sorted = [...offerList];
    switch (sort) {
      case "cheapest": sorted.sort((a, b) => a.price - b.price); break;
      case "fastest": sorted.sort((a, b) => a.durationMinutes - b.durationMinutes); break;
      case "earliest": sorted.sort((a, b) => a.departure.time.localeCompare(b.departure.time)); break;
      case "shortest": sorted.sort((a, b) => a.durationMinutes - b.durationMinutes); break;
      case "best":
        sorted.sort((a, b) => {
          const maxP = priceRange.max || 1;
          const maxD = Math.max(...offerList.map(o => o.durationMinutes), 1);
          const scoreA = (a.price / maxP) * 0.4 + (a.durationMinutes / maxD) * 0.4 + (a.stops > 0 ? 0.2 : 0);
          const scoreB = (b.price / maxP) * 0.4 + (b.durationMinutes / maxD) * 0.4 + (b.stops > 0 ? 0.2 : 0);
          return scoreA - scoreB;
        });
        break;
    }
    return sorted;
  };

  const filtered = useMemo(() => sortOffers(applyFilters(filters, offers), sortBy), [offers, filters, sortBy, priceRange]);

  const lowestPriceId = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.reduce((min, o) => o.price < min.price ? o : min, filtered[0]).id;
  }, [filtered]);

  const fastestId = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.reduce((min, o) => o.durationMinutes < min.durationMinutes ? o : min, filtered[0]).id;
  }, [filtered]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.maxPrice > 0) count++;
    if (filters.stops.length > 0) count++;
    if (filters.departureTime.length > 0) count++;
    if (filters.arrivalTime.length > 0) count++;
    if (filters.airlines.length > 0) count++;
    if (filters.maxDuration > 0) count++;
    if (filters.refundableOnly) count++;
    if (filters.baggagePersonalItem || filters.baggageCarryOn || filters.baggageChecked) count++;
    return count;
  }, [filters]);

  const activeChips = useMemo(() => {
    const chips: { label: string; key: string }[] = [];
    if (filters.maxPrice > 0) chips.push({ label: `Max $${filters.maxPrice}`, key: "maxPrice" });
    if (filters.stops.length > 0) chips.push({ label: filters.stops.map(s => s === 0 ? "Direct" : s === 1 ? "1 stop" : "2+").join(", "), key: "stops" });
    if (filters.departureTime.length > 0) chips.push({ label: `Depart: ${filters.departureTime.length}`, key: "departureTime" });
    if (filters.arrivalTime.length > 0) chips.push({ label: `Arrive: ${filters.arrivalTime.length}`, key: "arrivalTime" });
    if (filters.airlines.length > 0) chips.push({ label: `${filters.airlines.length} airline${filters.airlines.length > 1 ? "s" : ""}`, key: "airlines" });
    if (filters.maxDuration > 0) chips.push({ label: `≤ ${Math.floor(filters.maxDuration / 60)}h ${filters.maxDuration % 60}m`, key: "maxDuration" });
    if (filters.refundableOnly) chips.push({ label: "Refundable", key: "refundableOnly" });
    if (filters.baggagePersonalItem) chips.push({ label: "Personal item", key: "baggagePersonalItem" });
    if (filters.baggageCarryOn) chips.push({ label: "Carry-on", key: "baggageCarryOn" });
    if (filters.baggageChecked) chips.push({ label: "Checked bag", key: "baggageChecked" });
    return chips;
  }, [filters]);

  const removeChip = (key: string) => {
    setFilters(prev => {
      const next = { ...prev };
      switch (key) {
        case "maxPrice": next.maxPrice = 0; break;
        case "stops": next.stops = []; break;
        case "departureTime": next.departureTime = []; break;
        case "arrivalTime": next.arrivalTime = []; break;
        case "airlines": next.airlines = []; break;
        case "maxDuration": next.maxDuration = 0; break;
        case "refundableOnly": next.refundableOnly = false; break;
        case "baggagePersonalItem": next.baggagePersonalItem = false; break;
        case "baggageCarryOn": next.baggageCarryOn = false; break;
        case "baggageChecked": next.baggageChecked = false; break;
      }
      return next;
    });
  };

  const clearFilters = () => setFilters(defaultFilters);

  const handleOpenSheet = () => {
    setPendingFilters(filters);
    setSheetOpen(true);
  };

  const handleApplySheet = () => {
    setFilters(pendingFilters);
    setSheetOpen(false);
  };

  const handleResetSheet = () => {
    setPendingFilters(defaultFilters);
  };

  const handleSelect = (offer: DuffelOffer) => {
    sessionStorage.setItem("zivo_selected_offer", JSON.stringify(offer));
    sessionStorage.setItem("zivo_selected_offer_snapshot", JSON.stringify(offer));
    sessionStorage.setItem("zivo_search_params", JSON.stringify({
      origin, destination, departureDate, returnDate, adults, children, infants, cabinClass,
    }));
    navigate("/flights/details/review");
  };

  const getErrorDisplay = (err: unknown) => {
    const msg = err instanceof Error ? err.message : "Something went wrong";
    const isNetwork = msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch");
    const isRateLimit = msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("too many");
    return {
      icon: isNetwork ? WifiOff : AlertTriangle,
      title: isRateLimit ? "Too Many Searches" : isNetwork ? "Connection Error" : "Search Failed",
      message: isRateLimit ? "Please wait a moment before searching again."
        : isNetwork ? "Please check your internet connection and try again." : msg,
      canRetry: !isRateLimit,
    };
  };

  const lowestPrice = useMemo(() => {
    if (filtered.length === 0) return 0;
    return Math.round(getAllInPrice(Math.min(...filtered.map(o => o.price))));
  }, [filtered]);

  const pendingFiltered = useMemo(() => applyFilters(pendingFilters, offers), [offers, pendingFilters]);

  // Quick stats for QuickStatsBar
  const quickStats = useMemo(() => {
    if (filtered.length === 0) return null;
    const cheapest = filtered.reduce((min, o) => o.price < min.price ? o : min, filtered[0]);
    const fastest = filtered.reduce((min, o) => o.durationMinutes < min.durationMinutes ? o : min, filtered[0]);
    const bestArr = [...filtered].sort((a, b) => {
      const maxP = priceRange.max || 1;
      const maxD = Math.max(...filtered.map(o => o.durationMinutes), 1);
      const scoreA = (a.price / maxP) * 0.4 + (a.durationMinutes / maxD) * 0.4 + (a.stops > 0 ? 0.2 : 0);
      const scoreB = (b.price / maxP) * 0.4 + (b.durationMinutes / maxD) * 0.4 + (b.stops > 0 ? 0.2 : 0);
      return scoreA - scoreB;
    });
    const best = bestArr[0];
    return {
      cheapest: { price: Math.round(getAllInPrice(cheapest.price)), airline: cheapest.airline, duration: cheapest.duration },
      fastest: { price: Math.round(getAllInPrice(fastest.price)), airline: fastest.airline, duration: fastest.duration },
      bestValue: { price: Math.round(getAllInPrice(best.price)), airline: best.airline, duration: best.duration },
    };
  }, [filtered, priceRange]);


  // Toggle helpers for pending filters
  const togglePendingArray = <K extends keyof FlightFiltersState>(key: K, value: string | number) => {
    setPendingFilters(prev => {
      const arr = prev[key] as (string | number)[];
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  };

  // Shared filter content renderer
  const renderFilterContent = (f: FlightFiltersState, onChange: (partial: Partial<FlightFiltersState>) => void, toggleArray: (key: keyof FlightFiltersState, value: string | number) => void) => (
    <div className="space-y-5">
      {/* Price */}
      <div>
        <p className="text-xs font-semibold mb-2.5">Max Price</p>
        <div className="px-0.5">
          <div className="flex justify-center mb-2">
            <span className="text-lg font-bold text-[hsl(var(--flights))] tabular-nums">
              ${f.maxPrice > 0 ? f.maxPrice : priceRange.max}
            </span>
          </div>
          <Slider
            value={[f.maxPrice > 0 ? f.maxPrice : priceRange.max]}
            min={priceRange.min}
            max={priceRange.max}
            step={10}
            onValueChange={([v]) => onChange({ maxPrice: v >= priceRange.max ? 0 : v })}
            className="mb-1"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>${priceRange.min}</span>
            <span>${priceRange.max}</span>
          </div>
        </div>
      </div>

      <Separator className="bg-border/30" />

      {/* Stops */}
      <div>
        <p className="text-xs font-semibold mb-2.5">Stops</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { val: 0, label: "Direct" },
            { val: 1, label: "1 Stop" },
            { val: 2, label: "2+ Stops" },
          ].map(item => (
            <button type="button"
              key={item.val}
              onClick={() => toggleArray("stops", item.val)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all active:scale-95",
                (f.stops as number[]).includes(item.val)
                  ? "bg-[hsl(var(--flights))] text-primary-foreground border-[hsl(var(--flights))]"
                  : "bg-card border-border/40 text-muted-foreground hover:border-[hsl(var(--flights))]/40"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-border/30" />

      {/* Departure Time */}
      <div>
        <p className="text-xs font-semibold mb-2.5">Departure Time</p>
        <div className="grid grid-cols-2 gap-1.5">
          {timeOptions.map(t => (
            <button type="button"
              key={t.id}
              onClick={() => toggleArray("departureTime", t.id)}
              className={cn(
                "p-2 rounded-lg border text-center transition-all active:scale-95",
                (f.departureTime as string[]).includes(t.id)
                  ? "bg-[hsl(var(--flights))]/15 border-[hsl(var(--flights))]/50 text-[hsl(var(--flights))]"
                  : "bg-card border-border/40 text-muted-foreground hover:border-[hsl(var(--flights))]/30"
              )}
            >
              <t.icon className="w-4 h-4 mx-auto mb-0.5" />
              <p className="text-[10px] font-semibold">{t.label}</p>
              <p className="text-[8px] text-muted-foreground">{t.sub}</p>
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-border/30" />

      {/* Arrival Time */}
      <div>
        <p className="text-xs font-semibold mb-2.5">Arrival Time</p>
        <div className="grid grid-cols-2 gap-1.5">
          {timeOptions.map(t => (
            <button type="button"
              key={t.id}
              onClick={() => toggleArray("arrivalTime", t.id)}
              className={cn(
                "p-2 rounded-lg border text-center transition-all active:scale-95",
                (f.arrivalTime as string[]).includes(t.id)
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "bg-card border-border/40 text-muted-foreground hover:border-primary/30"
              )}
            >
              <t.icon className="w-4 h-4 mx-auto mb-0.5" />
              <p className="text-[10px] font-semibold">{t.label}</p>
              <p className="text-[8px] text-muted-foreground">{t.sub}</p>
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-border/30" />

      {/* Airlines */}
      {availableAirlines.length > 0 && (
        <>
          <div>
            <p className="text-xs font-semibold mb-2.5">Airlines</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {availableAirlines.map(al => (
                <label key={al.code} className="flex items-center gap-2.5 cursor-pointer py-1">
                  <Checkbox
                    checked={(f.airlines as string[]).includes(al.code)}
                    onCheckedChange={() => toggleArray("airlines", al.code)}
                  />
                   <div className="flex items-center gap-2 flex-1 min-w-0">
                    <AirlineLogo
                      iataCode={al.code}
                      airlineName={al.name}
                      size={20}
                      className="shrink-0"
                    />
                    <span className="text-[11px] truncate">{al.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">({al.count})</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <Separator className="bg-border/30" />
        </>
      )}

      {/* Duration */}
      <div>
        <p className="text-xs font-semibold mb-2.5">
          Max Duration: {f.maxDuration > 0 ? `${Math.floor(f.maxDuration / 60)}h ${f.maxDuration % 60}m` : "Any"}
        </p>
        <div className="px-0.5">
          <Slider
            value={[f.maxDuration > 0 ? f.maxDuration : maxDurationRange.max]}
            min={maxDurationRange.min}
            max={maxDurationRange.max}
            step={15}
            onValueChange={([v]) => onChange({ maxDuration: v >= maxDurationRange.max ? 0 : v })}
            className="mb-1"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{Math.floor(maxDurationRange.min / 60)}h</span>
            <span>{Math.floor(maxDurationRange.max / 60)}h</span>
          </div>
        </div>
      </div>

      <Separator className="bg-border/30" />

      {/* Refundability */}
      <div className="flex items-center justify-between py-1">
        <span className="text-[11px] font-semibold">Refundable only</span>
        <Switch
          checked={f.refundableOnly}
          onCheckedChange={(v) => onChange({ refundableOnly: v })}
        />
      </div>

      <Separator className="bg-border/30" />

      {/* Baggage */}
      <div>
        <p className="text-xs font-semibold mb-2.5 flex items-center gap-1.5">
          <Luggage className="w-3.5 h-3.5 text-[hsl(var(--flights))]" />
          Baggage
        </p>
        <div className="space-y-2">
          {[
            { key: "baggagePersonalItem" as const, label: "Personal item included" },
            { key: "baggageCarryOn" as const, label: "Carry-on included" },
            { key: "baggageChecked" as const, label: "Checked bag included" },
          ].map(bag => (
            <label key={bag.key} className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={f[bag.key] as boolean}
                onCheckedChange={(v) => onChange({ [bag.key]: !!v })}
              />
              <span className="text-[11px]">{bag.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  // Desktop filter onChange
  const desktopFilterChange = (partial: Partial<FlightFiltersState>) => setFilters(prev => ({ ...prev, ...partial }));
  const desktopToggleArray = (key: keyof FlightFiltersState, value: string | number) => {
    setFilters(prev => {
      const arr = prev[key] as (string | number)[];
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  };

  // Pending filter onChange (for mobile sheet)
  const pendingFilterChange = (partial: Partial<FlightFiltersState>) => setPendingFilters(prev => ({ ...prev, ...partial }));

  const routeSummary = `${originAirport?.city || origin} → ${destAirport?.city || destination}`;

  const resultsContent = (
    <div className="mx-auto px-2.5 sm:px-4 max-w-5xl">
      {/* Sticky summary bar — compact nav */}
      <div className={cn("sticky z-20 -mx-2.5 sm:-mx-4 px-2.5 sm:px-4 mb-2", isMobile ? "top-0" : "top-14")}>
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="sm:rounded-2xl overflow-hidden"
              style={{
                background: "hsl(var(--card))",
                borderBottom: "1px solid hsl(var(--border) / 0.15)",
                boxShadow: "0 2px 12px -2px hsl(var(--foreground) / 0.06)",
              }}
            >
              {/* Thin accent line */}
              <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, hsl(var(--flights)), hsl(var(--flights) / 0.3))" }} />

              <div className="px-3 py-2.5 sm:px-4 sm:py-3">
                {/* Row 1: Back + Route + Actions */}
                <div className="flex items-center gap-2">
                  <Link to="/flights" className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all">
                    <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                  </Link>

                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-[13px] font-semibold truncate">{originAirport?.city || origin}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <div className="w-1 h-1 rounded-full bg-[hsl(var(--flights)/0.5)]" />
                      <div className="w-4 border-t border-dashed border-[hsl(var(--flights)/0.4)]" />
                      <Plane className="w-3 h-3 text-[hsl(var(--flights))] -rotate-45" />
                      <div className="w-4 border-t border-dashed border-[hsl(var(--flights)/0.4)]" />
                      <div className="w-1 h-1 rounded-full bg-[hsl(var(--flights)/0.5)]" />
                    </div>
                    <span className="text-[13px] font-semibold truncate">{destAirport?.city || destination}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <PriceAlertButton
                      origin={origin}
                      destination={destination}
                      departureDate={departureDate}
                      returnDate={returnDate}
                      passengers={totalPassengers}
                      cabinClass={cabinClass}
                      currentLowestPrice={lowestPrice}
                    />
                    <button type="button"
                      onClick={() => setEditMode(!editMode)}
                      className={cn(
                        "h-7 px-2.5 text-[11px] font-semibold rounded-lg border flex items-center gap-1 active:scale-95 transition-all",
                        editMode
                          ? "border-[hsl(var(--flights))] bg-[hsl(var(--flights)/0.08)] text-[hsl(var(--flights))]"
                          : "border-border/40 hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <Pencil className="w-3 h-3" />
                      {editMode ? "Close" : "Edit"}
                    </button>
                  </div>
                </div>

                {/* Row 2: Meta pills */}
                <AnimatePresence>
                  {!editMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-1.5 mt-1.5 ml-10">
                        <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-md bg-muted/50 text-[10px] font-medium text-muted-foreground">
                          <CalendarDays className="w-2.5 h-2.5 opacity-60" />
                          {departureDate}{returnDate ? ` – ${returnDate}` : ""}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-md bg-muted/50 text-[10px] font-medium text-muted-foreground">
                          <Users className="w-2.5 h-2.5 opacity-60" />
                          {totalPassengers}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-[2px] rounded-md bg-[hsl(var(--flights)/0.08)] text-[10px] font-semibold text-[hsl(var(--flights))] capitalize">
                          {cabinClass.replace("_", " ")}
                        </span>
                        {lowestPrice > 0 && (
                          <span className="ml-auto text-[11px] font-bold text-[hsl(var(--flights))] tabular-nums">
                            from ${lowestPrice}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Inline edit form */}
                <AnimatePresence>
                  {editMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 border-t border-border/20 mt-2">
                        <FlightSearchFormPro
                          initialFrom={origin}
                          initialTo={destination}
                          initialDepartDate={departureDate ? new Date(departureDate + "T00:00:00") : undefined}
                          initialReturnDate={returnDate ? new Date(returnDate + "T00:00:00") : undefined}
                          initialPassengers={totalPassengers}
                          initialCabin={rawCabinClass === "premium_economy" ? "premium" : rawCabinClass as any}
                          initialTripType={returnDate ? "roundtrip" : "oneway"}
                          navigateOnSearch={true}
                          onSearch={() => setEditMode(false)}
                          className="!p-0"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* Limited coverage notice for Cambodia routes */}
          {offers.length > 0 && offers.length <= 5 && ["PNH", "KTI", "REP", "KOS"].some(c => origin.toUpperCase() === c || destination.toUpperCase() === c) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-2.5 px-3 py-2 bg-muted/40 border border-border/30 rounded-xl text-xs text-muted-foreground text-center"
            >
              Some local airlines may not be available through this booking source. Showing best available partner airlines.
            </motion.div>
          )}

          {/* Quick Stats Bar */}
          {!isLoading && quickStats && filtered.length > 3 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-2"
            >
              <QuickStatsBar
                cheapest={quickStats.cheapest}
                fastest={quickStats.fastest}
                bestValue={quickStats.bestValue}
              />
            </motion.div>
          )}

          {offers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-2 -mx-2.5 sm:mx-0 px-2.5 sm:px-0 space-y-1.5"
            >
              {/* Sort tabs + Filter */}
              <div
                className="flex items-center justify-between gap-2 p-1 rounded-xl"
                style={{
                  background: "hsl(var(--card))",
                  boxShadow: "0 1px 0 0 hsl(var(--border)/0.1), 0 2px 8px -2px hsl(var(--foreground)/0.05), inset 0 1px 0 0 hsl(0 0% 100%/0.04)",
                }}
              >
                <div className="flex gap-0.5 flex-1">
                  {([
                    { key: "best" as SortBy, label: "Best", emoji: "✨" },
                    { key: "cheapest" as SortBy, label: "Cheapest", emoji: "🔥" },
                    { key: "fastest" as SortBy, label: "Fastest", emoji: "⚡" },
                  ]).map(s => (
                    <button type="button"
                      key={s.key}
                      onClick={() => setSortBy(s.key)}
                      className={cn(
                        "flex-1 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap active:scale-[0.97]",
                        sortBy === s.key
                          ? "bg-[hsl(var(--flights)/0.1)] text-[hsl(var(--flights))] shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                      style={sortBy === s.key ? {
                        boxShadow: "0 1px 4px -1px hsl(var(--flights)/0.15), inset 0 1px 0 0 hsl(0 0% 100%/0.06)",
                      } : undefined}
                    >
                      <span className="mr-1">{s.emoji}</span>{s.label}
                    </button>
                  ))}
                </div>

                {/* Filter button */}
                <Sheet open={sheetOpen} onOpenChange={(open) => { if (open) handleOpenSheet(); else setSheetOpen(false); }}>
                  <SheetTrigger asChild>
                    <button type="button"
                      className={cn(
                        "flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.97] relative",
                        activeFilterCount > 0
                          ? "bg-[hsl(var(--flights)/0.1)] text-[hsl(var(--flights))]"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      Filter
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[hsl(var(--flights))] text-[8px] text-primary-foreground font-bold flex items-center justify-center shadow-sm">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] flex flex-col p-0">
                    <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/30 shrink-0">
                      <div className="flex items-center justify-between">
                        <SheetTitle className="text-base">Filters</SheetTitle>
                        <button type="button" onClick={handleResetSheet} className="text-[11px] font-medium text-[hsl(var(--flights))]">
                          Reset all
                        </button>
                      </div>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-4 py-4 overscroll-contain">
                      {renderFilterContent(pendingFilters, pendingFilterChange, togglePendingArray)}
                    </div>
                    <div className="shrink-0 px-4 py-3 border-t border-border/30 bg-card/90 backdrop-blur-sm safe-area-bottom">
                      <Button
                        className="w-full bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90 font-semibold"
                        onClick={handleApplySheet}
                      >
                        Show {pendingFiltered.length} flight{pendingFiltered.length !== 1 ? "s" : ""}
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Airline quick-filter chips */}
              {availableAirlines.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar sm:hidden">
                  {availableAirlines.slice(0, 6).map(al => {
                    const isActive = filters.airlines.includes(al.code);
                    return (
                      <button type="button"
                        key={al.code}
                        onClick={() => {
                          setFilters(prev => {
                            const arr = prev.airlines;
                            const next = arr.includes(al.code) ? arr.filter(c => c !== al.code) : [...arr, al.code];
                            return { ...prev, airlines: next };
                          });
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95",
                          isActive
                            ? "bg-[hsl(var(--flights)/0.1)] border-[hsl(var(--flights)/0.4)] text-[hsl(var(--flights))]"
                            : "bg-card border-border/20 text-muted-foreground hover:border-[hsl(var(--flights)/0.3)]"
                        )}
                        style={{
                          boxShadow: isActive
                            ? "0 1px 4px -1px hsl(var(--flights)/0.12)"
                            : "0 1px 3px -1px hsl(var(--foreground)/0.04)",
                        }}
                      >
                        <AirlineLogo iataCode={al.code} airlineName={al.name} size={18} className="shrink-0 rounded" />
                        {al.name.split(" ")[0]}
                        <span className="text-[9px] opacity-50">({al.count})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-wrap gap-1.5 mb-3"
            >
              {activeChips.map(chip => (
                <Badge
                  key={chip.key}
                  variant="secondary"
                  className="text-[10px] h-6 px-2 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => removeChip(chip.key)}
                >
                  {chip.label}
                  <X className="w-2.5 h-2.5" />
                </Badge>
              ))}
              <button type="button"
                onClick={clearFilters}
                className="text-[10px] font-medium text-destructive hover:underline px-1"
              >
                Clear all
              </button>
            </motion.div>
          )}

          <div className="flex gap-4 sm:gap-5">
            {/* Desktop filters sidebar */}
            {offers.length > 0 && (
              <div className="hidden sm:block w-56 shrink-0">
                <div className="sticky top-32 bg-card/70 backdrop-blur-xl rounded-2xl border border-border/40 p-3.5 max-h-[calc(100vh-9rem)] overflow-y-auto">
                  <p className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-[hsl(var(--flights))]" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{activeFilterCount}</Badge>
                    )}
                  </p>
                  {renderFilterContent(filters, desktopFilterChange, desktopToggleArray)}
                  {activeFilterCount > 0 && (
                    <>
                      <Separator className="bg-border/30 my-4" />
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-muted-foreground text-xs">
                        <X className="w-3 h-3 mr-1" /> Clear All
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Results column */}
            <div className="flex-1 min-w-0">
              {isLoading && <FlightResultsSkeleton count={6} />}

              {/* Error */}
              {error && !isLoading && (() => {
                const errInfo = getErrorDisplay(error);
                const ErrIcon = errInfo.icon;
                return (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="border-destructive/20 bg-destructive/5">
                      <CardContent className="p-8 sm:p-12 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                          <ErrIcon className="w-7 h-7 text-destructive" />
                        </div>
                        <h2 className="text-lg font-bold mb-2">{errInfo.title}</h2>
                        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">{errInfo.message}</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          {errInfo.canRetry && (
                            <Button onClick={() => refetch()} className="gap-2 bg-[hsl(var(--flights))]">
                              <RefreshCw className="w-4 h-4" /> Try Again
                            </Button>
                          )}
                          <Button variant="outline" asChild><Link to="/flights">New Search</Link></Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })()}

              {/* Empty — smart suggestions */}
              {!isLoading && !error && offers.length === 0 && data && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <FlightEmptyState
                    origin={origin}
                    destination={destination}
                    departureDate={departureDate}
                    returnDate={returnDate}
                    adults={adults}
                    children={children}
                    infants={infants}
                    cabinClass={cabinClass}
                  />
                </motion.div>
              )}

              {/* Filtered empty (one-way only — round-trip uses leg groups) */}
              {!isLoading && !error && !isRoundTrip && offers.length > 0 && filtered.length === 0 && (
                <Card className="border-border/40">
                  <CardContent className="p-8 text-center">
                    <Filter className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium mb-1">No flights match filters</p>
                    <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters.</p>
                    <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
                  </CardContent>
                </Card>
              )}

              {/* Multi-Agency Price Comparison (Aviasales Real-Time Search) */}
              {!isLoading && !error && offers.length > 0 && (hasLiveAviasalesData || lowestDuffelPrice) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-4"
                >
                  <Card className="border-border/30 overflow-hidden">
                    <CardContent className="p-0">
                      {/* Header */}
                      <div className="px-4 pt-3 pb-2 border-b border-border/20 bg-muted/30">
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-warning" />
                          Live Price Comparison
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Real-time prices from live API queries — no cached or estimated fares
                        </p>
                      </div>

                      <div className="divide-y divide-border/15">
                        {/* ZIVO Direct — always show */}
                        {lowestDuffelPrice && (
                          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[hsl(var(--flights)/0.04)]">
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={zivoLogoPng} alt="ZIVO" className="w-9 h-9 rounded-lg object-contain shrink-0" />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-bold text-foreground">ZIVO</p>
                                   {hasLiveAviasalesData && (!bestAviasalesPrice || lowestDuffelPrice <= (bestAviasalesPrice?.price || Infinity)) && 
                           (
                                     <Badge className="text-[8px] h-4 px-1.5 bg-primary/15 text-primary border-0 font-bold">
                                       Live Best Price
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  Book directly · Live ZIVO fare
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold text-[hsl(var(--flights))]">
                                ${Math.round(getAllInPrice(lowestDuffelPrice))}
                              </p>
                            </div>
                          </div>
                        )}


                        {/* Live Aviasales agency results — only real API prices */}
                        {hasLiveAviasalesData && aviasalesResults.map((result, idx) => {
                          const topAgent = result.allPrices?.[0];
                          if (!topAgent || !topAgent.price) return null;
                          return (
                            <button
                              type="button"
                              key={result.id || idx}
                              onClick={() => handlePartnerOpen(`https://${result.resultsUrl}/searches/${result.searchId}/clicks/${result.proposalId}?gate_id=${topAgent.agentId}&marker=700031`)}
                              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group w-full text-left"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                                  <Zap className="w-4 h-4 text-accent" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-bold text-foreground">{topAgent.agentName}</p>
                                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    Live via API
                                    {result.segments[0]?.stops === 0 ? ' · Direct' : ` · ${result.segments[0]?.stops} stop${(result.segments[0]?.stops || 0) > 1 ? 's' : ''}`}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-lg font-bold text-foreground">${Math.round(topAgent.price)}</p>
                              </div>
                            </button>
                          );
                        })}

                        {/* Aviasales — affiliate partner link (always visible) */}
                        {/* Aviasales — affiliate partner link (always visible) */}
                        {origin && destination && departureDate && (
                          <button
                            type="button"
                            onClick={() => handlePartnerOpen(TRAVELPAYOUTS_DIRECT_LINKS.flights.backup)}
                            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group w-full text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                <span className="text-base font-black text-foreground">A</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-bold text-foreground">Aviasales</p>
                                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  Compare on partner site
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {lowestDuffelPrice ? (
                                <p className="text-lg font-bold text-foreground">${Math.round(getAllInPrice(lowestDuffelPrice) * 1.02 + 3)}</p>
                              ) : (
                                <p className="text-xs font-semibold text-primary">View prices →</p>
                              )}
                            </div>
                          </button>
                        )}

                      </div>

                      {/* Footer */}
                      <div className="px-4 py-2 border-t border-border/20 bg-muted/20">
                          <p className="text-[9px] text-muted-foreground text-center">
                           All prices are live from real-time API queries. Final price confirmed at checkout.{' '}
                           <Link to="/partner-disclosure" className="underline hover:text-foreground transition-colors">Partner Disclosure</Link>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step indicator for round-trip */}
              {isRoundTrip && offers.length > 0 && !isLoading && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3"
                >
                  <div
                    className="flex items-center gap-1 p-1.5 rounded-2xl"
                    style={{
                      background: "hsl(var(--card))",
                      boxShadow: "0 1px 0 0 hsl(var(--border)/0.1), 0 3px 12px -3px hsl(var(--foreground)/0.06), inset 0 1px 0 0 hsl(0 0% 100%/0.04)",
                    }}
                  >
                    {/* Step 1: Outbound */}
                    <button type="button"
                      onClick={selectionStep === "return" ? handleBackToOutbound : undefined}
                      className={cn(
                        "flex items-center gap-2 flex-1 px-2 py-2.5 rounded-xl transition-all text-left min-w-0",
                        selectionStep === "outbound"
                          ? "bg-[hsl(var(--flights)/0.08)]"
                          : selectedOutboundGroup
                            ? "hover:bg-muted/30 cursor-pointer"
                            : "opacity-50"
                      )}
                      style={selectionStep === "outbound" ? {
                        boxShadow: "0 1px 4px -1px hsl(var(--flights)/0.12), inset 0 1px 0 0 hsl(0 0% 100%/0.06)",
                      } : undefined}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                        selectionStep === "outbound"
                          ? "bg-[hsl(var(--flights))] text-primary-foreground shadow-sm"
                          : selectedOutboundGroup
                            ? "bg-emerald-500 text-white"
                            : "bg-muted text-muted-foreground"
                      )}>
                        {selectedOutboundGroup ? <Check className="w-3 h-3" /> : "1"}
                      </div>
                      <div className="min-w-0">
                        <p className={cn(
                          "text-[11px] font-bold leading-tight",
                          selectionStep === "outbound" ? "text-[hsl(var(--flights))]" : "text-foreground"
                        )}>
                          Departure
                        </p>
                        {selectedOutboundGroup ? (
                          <p className="text-[9px] text-muted-foreground truncate">
                            {selectedOutboundGroup.summary.depTime} → {selectedOutboundGroup.summary.arrTime} · {selectedOutboundGroup.representativeOffer.airline}
                          </p>
                        ) : (
                          <p className="text-[9px] text-muted-foreground truncate">{originAirport?.city || origin} → {destAirport?.city || destination}</p>
                        )}
                      </div>
                    </button>

                    <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />

                    {/* Step 2: Return */}
                    <div
                      className={cn(
                        "flex items-center gap-2 flex-1 px-2 py-2.5 rounded-xl transition-all text-left min-w-0",
                        selectionStep === "return"
                          ? "bg-[hsl(var(--flights)/0.08)]"
                          : "opacity-40"
                      )}
                      style={selectionStep === "return" ? {
                        boxShadow: "0 1px 4px -1px hsl(var(--flights)/0.12), inset 0 1px 0 0 hsl(0 0% 100%/0.06)",
                      } : undefined}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                        selectionStep === "return"
                          ? "bg-[hsl(var(--flights))] text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground"
                      )}>
                        2
                      </div>
                      <div className="min-w-0">
                        <p className={cn(
                          "text-[11px] font-bold leading-tight",
                          selectionStep === "return" ? "text-[hsl(var(--flights))]" : "text-muted-foreground"
                        )}>
                          Return
                        </p>
                        <p className="text-[9px] text-muted-foreground truncate">{destAirport?.city || destination} → {originAirport?.city || origin}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Results list — Two-step for round-trip, single-step for one-way */}
                <div className="space-y-1.5">
                <AnimatePresence mode="popLayout">
                  {isRoundTrip && selectionStep === "outbound" && sortedOutboundGroups.map((group, idx) => (
                    <motion.div
                      key={group.fingerprint}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.025, 0.15), ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <FlightLegCard
                        group={group}
                        index={idx}
                        sortBy={sortBy}
                        isLowest={idx !== 0 && group.fromPrice === Math.min(...sortedOutboundGroups.map(g => g.fromPrice))}
                        isFastest={idx !== 0 && getLegDurationMinutes(group) === Math.min(...sortedOutboundGroups.map(g => getLegDurationMinutes(g)))}
                        label="outbound"
                        onSelect={handleSelectOutbound}
                      />
                    </motion.div>
                  ))}

                  {isRoundTrip && selectionStep === "return" && sortedReturnGroups.map((group, idx) => (
                    <motion.div
                      key={group.fingerprint}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.025, 0.15), ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <FlightLegCard
                        group={group}
                        index={idx}
                        sortBy={sortBy}
                        isLowest={idx !== 0 && group.fromPrice === Math.min(...sortedReturnGroups.map(g => g.fromPrice))}
                        isFastest={idx !== 0 && getLegDurationMinutes(group) === Math.min(...sortedReturnGroups.map(g => getLegDurationMinutes(g)))}
                        label="return"
                        onSelect={handleSelectReturn}
                      />
                    </motion.div>
                  ))}

                  {/* One-way flights use original DuffelFlightCard */}
                  {!isRoundTrip && filtered.map((offer, idx) => (
                    <motion.div
                      key={offer.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.025, 0.15), ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <DuffelFlightCard
                        offer={offer}
                        index={idx}
                        sortBy={sortBy}
                        isLowest={offer.id === lowestPriceId && idx !== 0}
                        isFastest={offer.id === fastestId && idx !== 0}
                        totalPassengers={totalPassengers}
                        hasReturn={false}
                        onSelect={handleSelect}
                        searchDestination={destination}
                        onCompare={handleAddToCompare}
                        inCompare={compareList.some(f => f.id === offer.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Count */}
              {!isRoundTrip && filtered.length > 0 && (
                <p className="text-center text-[10px] text-muted-foreground mt-4 sm:hidden">
                  Showing {filtered.length} of {offers.length} flights
                </p>
              )}
              {isRoundTrip && (
                <p className="text-center text-[10px] text-muted-foreground mt-4 sm:hidden">
                  {selectionStep === "outbound"
                    ? `${sortedOutboundGroups.length} departure option${sortedOutboundGroups.length !== 1 ? "s" : ""}`
                    : `${sortedReturnGroups.length} return option${sortedReturnGroups.length !== 1 ? "s" : ""}`
                  }
                </p>
              )}
            </div>
          </div>

          {/* Flight Compare Widget — one-way only, shown when at least one flight added */}
          {!isRoundTrip && compareList.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <FlightCompareWidget
                compareList={compareList}
                onRemove={(id) => setCompareList(prev => prev.filter(f => f.id !== id))}
              />
            </motion.div>
          )}

          {/* Cross-sell: Hotels & Cars — desktop only */}
          {!isMobile && !isLoading && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <TravelExtrasCTA currentService="flights" destination={destAirport?.city || destination} />
            </motion.div>
          )}

          {/* FAQ section for SEO — desktop only */}
          {!isMobile && !isLoading && offers.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <ResultsFAQ service="flights" />
            </motion.div>
          )}
        </div>
  );

  if (isMobile) {
    return (
      <>
        <SEOHead
          title={`Flights ${origin} → ${destination} – ZIVO`}
          description={`Compare flight deals from ${origin} to ${destination}.`}
        />
        <AppLayout hideHeader hideNav>
          <PullToRefresh onRefresh={handlePullRefresh} className="min-h-[100dvh] bg-background">
            <div className="pb-4">
              {resultsContent}
            </div>
          </PullToRefresh>
        </AppLayout>
      </>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden flex flex-col">
      <SEOHead
        title={`Flights ${origin} → ${destination} – ZIVO`}
        description={`Compare flight deals from ${origin} to ${destination}.`}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-0 w-72 h-72 rounded-full bg-[hsl(var(--flights))]/6 blur-3xl" />
      </div>
      <Header />
      <main className="flex-1 pt-24 pb-20 relative z-10">
        {resultsContent}
      </main>
      <Footer />
    </div>
  );
};

export default FlightResults;
