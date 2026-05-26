/**
 * AI Smart Deals v2 — Real-Time Duffel-Powered Deal Finder
 * Live airline data, real-time freshness, flight details, and AI insights
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Plane from "lucide-react/dist/esm/icons/plane";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Zap from "lucide-react/dist/esm/icons/zap";
import TrendingDown from "lucide-react/dist/esm/icons/trending-down";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Palmtree from "lucide-react/dist/esm/icons/palmtree";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import Mountain from "lucide-react/dist/esm/icons/mountain";
import Landmark from "lucide-react/dist/esm/icons/landmark";
import Music from "lucide-react/dist/esm/icons/music";
import Users from "lucide-react/dist/esm/icons/users";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Lightbulb from "lucide-react/dist/esm/icons/lightbulb";
import Clock from "lucide-react/dist/esm/icons/clock";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Brain from "lucide-react/dist/esm/icons/brain";
import Luggage from "lucide-react/dist/esm/icons/luggage";
import Radio from "lucide-react/dist/esm/icons/radio";
import Shield from "lucide-react/dist/esm/icons/shield";
import Timer from "lucide-react/dist/esm/icons/timer";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAISmartDeals, type SmartDeal } from "@/hooks/useAISmartDeals";
import { destinationPhotos } from "@/config/photos";

const categoryIcons: Record<string, typeof Palmtree> = {
  beach: Palmtree, city: Building2, adventure: Mountain,
  culture: Landmark, nightlife: Music, family: Users,
};

const categoryLabels: Record<string, string> = {
  all: "All Deals", beach: "Beach", city: "City",
  adventure: "Adventure", culture: "Culture", nightlife: "Nightlife", family: "Family",
};

/** Animated circular deal score ring */
const DealScoreRing = ({ score }: { score: number }) => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? "hsl(var(--primary))" : score >= 65 ? "hsl(45 93% 47%)" : "hsl(var(--muted-foreground))";

  return (
    <div className="relative w-[42px] h-[42px] shrink-0">
      <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="hsl(var(--border) / 0.2)" strokeWidth="3" />
        <motion.circle
          cx="20" cy="20" r={radius} fill="none"
          stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="text-[10px] font-black leading-none"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          {score}
        </motion.span>
      </div>
    </div>
  );
};

/** Live status pulse */
const LivePulse = () => (
  <span className="flex items-center gap-1">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
    <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider">Live</span>
  </span>
);

/** Freshness indicator */
const FreshnessTag = ({ generatedAt }: { generatedAt: string }) => {
  const mins = Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000);
  const label = mins < 1 ? "Just now" : mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
  return (
    <span className="text-[8px] text-muted-foreground/60 flex items-center gap-0.5">
      <Timer className="w-2 h-2" /> {label}
    </span>
  );
};

/** Featured hero card */
const FeaturedDealCard = ({ deal }: { deal: SmartDeal }) => {
  const navigate = useNavigate();
  const destPhoto = destinationPhotos[deal.destinationKey as keyof typeof destinationPhotos];
  const formattedDate = new Date(deal.departureDate).toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });

  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/flights/results?origin=${deal.originCode}&destination=${deal.destinationCode}&departureDate=${deal.departureDate}&adults=1&cabinClass=economy`)}
      className="w-full rounded-3xl overflow-hidden relative touch-manipulation text-left group h-[220px]"
    >
      <img
        src={destPhoto?.src || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600"}
        alt={deal.destination}
	        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
	        loading="lazy"
	        decoding="async"
	      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {deal.savingsPercent > 5 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="bg-foreground rounded-full px-2.5 py-1"
            >
              <span className="text-[10px] font-bold text-background flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> {deal.savingsPercent}% OFF
              </span>
            </motion.div>
          )}
          <div className="bg-white/15 backdrop-blur-md rounded-full px-2 py-0.5">
            <span className="text-[9px] font-semibold text-white/90 flex items-center gap-1">
              <Brain className="w-2.5 h-2.5" /> AI Pick
            </span>
          </div>
          {deal.offersCount > 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-full px-2 py-0.5">
              <span className="text-[8px] font-medium text-white/70 flex items-center gap-0.5">
                <Radio className="w-2 h-2" /> {deal.offersCount} fares
              </span>
            </div>
          )}
        </div>
        <DealScoreRing score={deal.dealScore} />
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-end justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-white font-black text-lg leading-tight">{deal.destination}</div>
            
            {/* Flight details row */}
            <div className="text-white/70 text-[10px] mt-1 flex items-center gap-1.5 flex-wrap">
              {deal.airlineLogo ? (
	                <img src={deal.airlineLogo} alt={deal.airline} className="w-4 h-4 rounded-sm bg-white/20 object-contain" loading="lazy" decoding="async" />
              ) : null}
              <span className="font-semibold text-white/90">{deal.airline}</span>
              {deal.flightNumber && <span className="text-white/50">{deal.flightNumber}</span>}
              <span className="text-white/30">·</span>
              <span>{deal.stops === 0 ? "Nonstop" : `${deal.stops} stop`}</span>
              <span className="text-white/30">·</span>
              <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{deal.duration}</span>
            </div>

            {/* Time + route */}
            <div className="text-white/60 text-[10px] mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-2.5 h-2.5" />
              <span>{deal.originCode} → {deal.destinationCode}</span>
              {deal.departureTime && (
                <>
                  <span className="text-white/30">·</span>
                  <span>{deal.departureTime}</span>
                  {deal.arrivalTime && <span>– {deal.arrivalTime}</span>}
                </>
              )}
            </div>

            {/* AI insight + baggage/cabin tags */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-2.5 py-1 inline-flex items-center gap-1 max-w-[200px]">
                <Sparkles className="w-2.5 h-2.5 text-primary shrink-0" />
                <span className="text-[9px] text-white/90 truncate">{deal.aiDescription}</span>
              </div>
              {deal.baggageIncluded && (
                <div className="bg-emerald-500/20 backdrop-blur-sm rounded-lg px-1.5 py-0.5 flex items-center gap-0.5">
                  <Luggage className="w-2 h-2 text-emerald-400" />
                  <span className="text-[7px] text-emerald-300 font-semibold">Bag incl.</span>
                </div>
              )}
              <div className="bg-white/8 backdrop-blur-sm rounded-lg px-1.5 py-0.5 flex items-center gap-0.5">
                <Shield className="w-2 h-2 text-white/50" />
                <span className="text-[7px] text-white/50">{deal.cabin}</span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-black text-white leading-none drop-shadow-lg">
              ${Math.round(deal.price)}
            </div>
            <div className="text-[9px] text-white/60 mt-0.5">one way</div>
            <div className="text-[9px] text-white/50 flex items-center gap-0.5 justify-end mt-0.5">
              <Calendar className="w-2.5 h-2.5" /> {formattedDate}
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
};

/** Compact deal card with real-time flight data */
const SmartDealCard = ({ deal, index }: { deal: SmartDeal; index: number }) => {
  const navigate = useNavigate();
  const destPhoto = destinationPhotos[deal.destinationKey as keyof typeof destinationPhotos];
  const formattedDate = new Date(deal.departureDate).toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
  const CategoryIcon = categoryIcons[deal.category] || Plane;

  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ delay: index * 0.06 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/flights/results?origin=${deal.originCode}&destination=${deal.destinationCode}&departureDate=${deal.departureDate}&adults=1&cabinClass=economy`)}
      className="w-full flex rounded-2xl overflow-hidden bg-card border border-border/20 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 touch-manipulation text-left group"
    >
      {/* Image */}
      <div className="relative w-[100px] shrink-0 overflow-hidden">
        <img
          src={destPhoto?.src || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=300"}
          alt={deal.destination}
	          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
	          loading="lazy"
	          decoding="async"
	        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
        {deal.savingsPercent > 5 && (
          <div className="absolute top-1.5 left-1.5 bg-emerald-500/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 shadow-sm">
            <span className="text-[7px] font-bold text-white flex items-center gap-0.5">
              <TrendingDown className="w-2 h-2" /> {deal.savingsPercent}%
            </span>
          </div>
        )}
        <div className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <CategoryIcon className="w-2.5 h-2.5 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-2.5 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {deal.airlineLogo && (
	                <img src={deal.airlineLogo} alt={deal.airline} className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" loading="lazy" decoding="async" />
              )}
              <span className="text-xs font-bold text-foreground truncate">{deal.destination}</span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[7px] font-bold shrink-0 border-0 px-1.5 py-0",
                deal.dealScore >= 80 ? "bg-primary/10 text-primary"
                  : deal.dealScore >= 60 ? "bg-amber-500/10 text-amber-600"
                  : "bg-muted/50 text-muted-foreground"
              )}
            >
              <Zap className="w-2 h-2 mr-0.5" /> {deal.dealTag}
            </Badge>
          </div>

          {/* Airline + route info */}
          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
            <span className="font-medium">{deal.airline}</span>
            {deal.flightNumber && <span className="text-muted-foreground/50">{deal.flightNumber}</span>}
            <span className="text-border">·</span>
            <span>{deal.originCode} → {deal.destinationCode}</span>
            <span className="text-border">·</span>
            <span>{deal.stops === 0 ? "Nonstop" : `${deal.stops} stop`}</span>
          </div>

          {/* Time + duration */}
          <div className="text-[9px] text-muted-foreground/70 mt-0.5 flex items-center gap-1.5">
            <Clock className="w-2.5 h-2.5 shrink-0" />
            <span>{deal.duration}</span>
            {deal.departureTime && (
              <>
                <span className="text-border">·</span>
                <span>{deal.departureTime}{deal.arrivalTime ? ` – ${deal.arrivalTime}` : ""}</span>
              </>
            )}
          </div>

          {/* AI Description */}
          <div className="text-[9px] text-primary/80 mt-1 flex items-start gap-1">
            <Sparkles className="w-2.5 h-2.5 shrink-0 mt-0.5" />
            <span className="line-clamp-1">{deal.aiDescription}</span>
          </div>
        </div>

        <div className="flex items-end justify-between mt-1.5">
          <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground/60 flex-wrap">
            <span className="flex items-center gap-0.5">
              <Calendar className="w-2.5 h-2.5" /> {formattedDate}
            </span>
            {deal.baggageIncluded && (
              <span className="flex items-center gap-0.5 text-emerald-600">
                <Luggage className="w-2 h-2" /> Bag
              </span>
            )}
            {deal.offersCount > 1 && (
              <span className="text-muted-foreground/40">{deal.offersCount} fares</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <DealScoreRing score={deal.dealScore} />
            <div className="text-right">
              <div className="text-sm font-black text-foreground leading-none">${Math.round(deal.price)}</div>
              <div className="text-[7px] text-muted-foreground">one way</div>
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
};

/** AI Tip Banner */
const AITipBanner = ({ deal }: { deal: SmartDeal }) => {
  if (!deal.aiTip) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="flex items-center gap-2.5 bg-card border border-border rounded-lg px-3.5 py-2.5"
    >
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Lightbulb className="w-3.5 h-3.5 text-foreground" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <div className="text-[9px] font-bold text-ig-gradient uppercase tracking-wider">AI Travel Tip</div>
        <div className="text-[11px] text-foreground/80 leading-snug">{deal.aiTip}</div>
      </div>
    </motion.div>
  );
};

const AISmartDeals = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { data: response, isLoading, isFetching } = useAISmartDeals(
    activeCategory === "all" ? undefined : activeCategory
  );

  const deals = response?.deals || [];
  const generatedAt = response?.generatedAt || "";
  const totalDealsFound = response?.totalDealsFound || 0;

  const categories = Object.entries(categoryLabels);
  const featuredDeal = deals[0];
  const remainingDeals = deals.slice(1, 5);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-8 h-8 rounded-full bg-ig-gradient flex items-center justify-center shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-white" />
          </motion.div>
          <span>AI Smart Deals</span>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Badge className="text-[8px] font-bold bg-ig-gradient text-white border-0 px-2 py-0.5">
              <Brain className="w-2.5 h-2.5 mr-0.5" /> POWERED
            </Badge>
          </motion.div>
        </h2>
        <button type="button"
          onClick={() => navigate("/flights")}
          className="text-xs text-primary font-bold touch-manipulation active:scale-95 min-w-[44px] min-h-[32px] flex items-center gap-0.5 hover:gap-1.5 transition-all"
        >
          See All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Live status bar */}
      <div className="flex items-center gap-3 mb-3">
        <LivePulse />
        {generatedAt && <FreshnessTag generatedAt={generatedAt} />}
        {totalDealsFound > 0 && (
          <span className="text-[8px] text-muted-foreground/50 flex items-center gap-0.5">
            <Plane className="w-2 h-2" /> {totalDealsFound} routes scanned
          </span>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-5 px-5" style={{ WebkitOverflowScrolling: "touch" }}>
        {categories.map(([key, label]) => {
          const Icon = categoryIcons[key] || Sparkles;
          const isActive = activeCategory === key;
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.93 }}
              onClick={() => setActiveCategory(key)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[11px] font-semibold transition-all border min-h-[36px]",
                isActive
                  ? "bg-ig-gradient text-white border-transparent shadow-lg shadow-rose-500/25"
                  : "bg-card text-muted-foreground border-border/30 hover:bg-muted/50 hover:border-border/60"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </motion.button>
          );
        })}
      </div>

      {/* Deals Content */}
      {isLoading && deals.length === 0 ? (
        <div className="space-y-3">
          <div className="h-[220px] rounded-3xl bg-muted/30 animate-pulse" />
          <div className="h-12 rounded-2xl bg-muted/20 animate-pulse" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[100px] rounded-2xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : deals.length > 0 ? (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: isFetching ? 0.6 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3 relative"
          >
            {featuredDeal && <FeaturedDealCard deal={featuredDeal} />}
            {featuredDeal && <AITipBanner deal={featuredDeal} />}
            {remainingDeals.map((deal, i) => (
              <SmartDealCard key={deal.id} deal={deal} index={i} />
            ))}
            {deals.length > 5 && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/flights")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-primary/20 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors touch-manipulation"
              >
                <Sparkles className="w-3.5 h-3.5" />
                View {deals.length - 5} more AI deals
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="text-center py-8">
          <p className="text-xs text-muted-foreground">No deals available right now</p>
        </div>
      )}
    </div>
  );
};

export default AISmartDeals;
