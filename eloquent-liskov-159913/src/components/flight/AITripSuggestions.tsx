import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Sparkles,
  Plane,
  MapPin,
  Calendar,
  Users,
  Heart,
  ThumbsDown,
  RefreshCw,
  Sun,
  Mountain,
  Palmtree,
  Building2,
  Camera,
  Utensils,
  Music,
  Clock,
  ChevronRight,
  Zap,
  Snowflake,
  Umbrella,
  Leaf,
  Waves,
  TreeDeciduous,
  Baby,
  Dog,
  Accessibility,
  Wifi,
  History,
  Flame,
  TrendingUp,
  Compass,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAITripSuggestions, type AIDestination } from "@/hooks/useAITripSuggestions";

interface AITripSuggestionsProps {
  userPreferences?: {
    budget?: 'budget' | 'mid' | 'luxury';
    climate?: 'tropical' | 'temperate' | 'cold';
    activities?: string[];
  };
  origin?: string;
  onSelectDestination?: (airportCode: string, city: string) => void;
  className?: string;
}

const FALLBACK_DESTINATIONS: AIDestination[] = [
  {
    id: '1',
    city: 'Lisbon',
    country: 'Portugal',
    airportCode: 'LIS',
    price: 650,
    rating: 4.8,
    tags: ['Culture', 'Food', 'History'],
    weather: '22°C Sunny',
    bestFor: ['Solo travelers', 'Couples'],
    matchScore: 95,
    flightTime: '7h 30m',
    description: 'A vibrant city with rich history, amazing food, and stunning coastal views.',
  },
  {
    id: '2',
    city: 'Kyoto',
    country: 'Japan',
    airportCode: 'KIX',
    price: 1200,
    rating: 4.9,
    tags: ['Culture', 'Nature', 'Temples'],
    weather: '18°C Clear',
    bestFor: ['Photography', 'History buffs'],
    matchScore: 92,
    flightTime: '14h 15m',
    description: 'Ancient temples, serene gardens, and traditional Japanese culture.',
  },
  {
    id: '3',
    city: 'Cartagena',
    country: 'Colombia',
    airportCode: 'CTG',
    price: 580,
    rating: 4.7,
    tags: ['Beach', 'Nightlife', 'History'],
    weather: '30°C Tropical',
    bestFor: ['Adventure', 'Party'],
    matchScore: 88,
    flightTime: '5h 45m',
    description: 'Colorful colonial streets, Caribbean beaches, and vibrant nightlife.',
  },
  {
    id: '4',
    city: 'Cape Town',
    country: 'South Africa',
    airportCode: 'CPT',
    price: 890,
    rating: 4.8,
    tags: ['Nature', 'Adventure', 'Wine'],
    weather: '25°C Sunny',
    bestFor: ['Outdoor lovers', 'Foodies'],
    matchScore: 85,
    flightTime: '16h 30m',
    description: 'Stunning Table Mountain, world-class wineries, and diverse wildlife.',
  },
];

const PREFERENCE_TAGS = [
  { id: 'beach', label: 'Beach', icon: Waves },
  { id: 'city', label: 'City', icon: Building2 },
  { id: 'nature', label: 'Nature', icon: TreeDeciduous },
  { id: 'culture', label: 'Culture', icon: Camera },
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'nightlife', label: 'Nightlife', icon: Music },
  { id: 'adventure', label: 'Adventure', icon: Compass },
  { id: 'relaxation', label: 'Relaxation', icon: Palmtree },
];

const CLIMATE_OPTIONS = [
  { id: 'tropical', label: 'Tropical', icon: Sun, temp: '25-35°C' },
  { id: 'temperate', label: 'Temperate', icon: Leaf, temp: '15-25°C' },
  { id: 'cold', label: 'Cold', icon: Snowflake, temp: '-5-15°C' },
];

const TRAVEL_STYLE = [
  { id: 'family', label: 'Family', icon: Baby },
  { id: 'pet-friendly', label: 'Pet Friendly', icon: Dog },
  { id: 'accessible', label: 'Accessible', icon: Accessibility },
  { id: 'digital-nomad', label: 'Digital Nomad', icon: Wifi },
];

const SEASON_INFO: Record<string, { best: string; avoid: string; icon: typeof Sun }> = {
  'Portugal': { best: 'Apr-Oct', avoid: 'Dec-Feb', icon: Sun },
  'Japan': { best: 'Mar-May, Sep-Nov', avoid: 'Jun-Aug', icon: Leaf },
  'Colombia': { best: 'Dec-Mar', avoid: 'Apr-May', icon: Umbrella },
  'South Africa': { best: 'Sep-Apr', avoid: 'Jun-Aug', icon: Sun },
  'Thailand': { best: 'Nov-Feb', avoid: 'Apr-Oct', icon: Umbrella },
  'Italy': { best: 'Apr-Jun, Sep-Oct', avoid: 'Jul-Aug', icon: Sun },
};

const DESTINATION_IMAGES: Record<string, string> = {
  'Lisbon': 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&h=250&fit=crop',
  'Kyoto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=250&fit=crop',
  'Cartagena': 'https://images.unsplash.com/photo-1583531352515-8884af319dc1?w=400&h=250&fit=crop',
  'Cape Town': 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&h=250&fit=crop',
  'Tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=250&fit=crop',
  'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=250&fit=crop',
  'Bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=250&fit=crop',
  'Barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=250&fit=crop',
};

const getCountryCode = (country: string): string => {
  const codeMap: Record<string, string> = {
    'Portugal': 'PT', 'Japan': 'JP', 'Colombia': 'CO', 'South Africa': 'ZA',
    'Indonesia': 'ID', 'Thailand': 'TH', 'Italy': 'IT', 'France': 'FR',
    'Spain': 'ES', 'Greece': 'GR', 'Mexico': 'MX', 'Brazil': 'BR',
    'Australia': 'AU', 'New Zealand': 'NZ', 'United Kingdom': 'GB',
    'Germany': 'DE', 'Netherlands': 'NL', 'Switzerland': 'CH',
    'United States': 'US', 'Canada': 'CA', 'Morocco': 'MA',
    'Egypt': 'EG', 'Kenya': 'KE', 'India': 'IN', 'Vietnam': 'VN',
  };
  return codeMap[country] || 'INT';
};

export const AITripSuggestions = ({
  origin = "New York",
  onSelectDestination,
  className
}: AITripSuggestionsProps) => {
  const { destinations: aiDestinations, isLoading, fetchSuggestions } = useAITripSuggestions();
  const [displayDestinations, setDisplayDestinations] = useState<AIDestination[]>(FALLBACK_DESTINATIONS);
  const [selectedTags, setSelectedTags] = useState<string[]>(['culture', 'food']);
  const [selectedClimate, setSelectedClimate] = useState<string>('temperate');
  const [selectedStyle, setSelectedStyle] = useState<string[]>([]);
  const [budget, setBudget] = useState<'budget' | 'mid' | 'luxury'>('mid');
  const [maxPrice, setMaxPrice] = useState([1500]);
  const [tripLength, setTripLength] = useState([7]);
  const [travelers, setTravelers] = useState(2);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set());
  const [hasLoadedAI, setHasLoadedAI] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hoveredDest, setHoveredDest] = useState<string | null>(null);

  useEffect(() => {
    if (aiDestinations.length > 0) {
      setDisplayDestinations(aiDestinations);
      setHasLoadedAI(true);
    }
  }, [aiDestinations]);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const toggleStyle = (styleId: string) => {
    setSelectedStyle(prev =>
      prev.includes(styleId) ? prev.filter(s => s !== styleId) : [...prev, styleId]
    );
  };

  const refreshSuggestions = async () => {
    const likedCities = displayDestinations
      .filter(d => likedIds.has(d.id))
      .map(d => d.city);
    const dislikedCities = displayDestinations
      .filter(d => dislikedIds.has(d.id))
      .map(d => d.city);

    await fetchSuggestions({
      budget,
      activities: [...selectedTags, selectedClimate, ...selectedStyle],
      travelers,
      origin,
      likedDestinations: likedCities,
      dislikedDestinations: dislikedCities,
    });
  };

  const likeDestination = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setDislikedIds(p => { const n = new Set(p); n.delete(id); return n; });
      }
      return next;
    });
  };

  const dislikeDestination = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDislikedIds(prev => new Set(prev).add(id));
    setLikedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    toast.info("We'll improve your suggestions based on this feedback");
  };

  const handleSelectDestination = (dest: AIDestination) => {
    if (onSelectDestination) {
      onSelectDestination(dest.airportCode, dest.city);
    }
  };

  const seasonInfo = (country: string) => SEASON_INFO[country] || { best: 'Year-round', avoid: 'None', icon: Sun };

  return (
    <Card className={cn("overflow-hidden border-border/50 bg-card/50 backdrop-blur", className)}>
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center relative bg-secondary">
              <Sparkles className="w-5 h-5 text-foreground" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-foreground animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                AI Trip Suggestions
                <Badge className="bg-secondary text-foreground border-border">
                  <Zap className="w-3 h-3 mr-1" />
                  Gemini
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Personalized destinations powered by AI
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshSuggestions}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            {isLoading ? "Thinking..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* Activity Preferences */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Compass className="w-4 h-4 text-foreground" />
            What experiences are you looking for?
          </label>
          <div className="flex flex-wrap gap-2">
            {PREFERENCE_TAGS.map(tag => (
              <button type="button"
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                  selectedTags.includes(tag.id)
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-muted/30 border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                <tag.icon className="w-4 h-4" />
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Climate Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Preferred Climate</label>
          <div className="grid grid-cols-3 gap-2">
            {CLIMATE_OPTIONS.map(opt => (
              <button type="button"
                key={opt.id}
                onClick={() => setSelectedClimate(opt.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                  selectedClimate === opt.id
                    ? "bg-violet-500/20 border-violet-500/40 text-violet-400"
                    : "bg-muted/30 border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                <opt.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs opacity-60">{opt.temp}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Budget, Travelers & Trip Length */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Budget</label>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
              {[
                { value: 'budget', label: '$' },
                { value: 'mid', label: '$$' },
                { value: 'luxury', label: '$$$' },
              ].map(option => (
                <button type="button"
                  key={option.value}
                  onClick={() => setBudget(option.value as any)}
                  className={cn(
                    "flex-1 py-2 rounded-md text-sm font-medium transition-all",
                    budget === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Travelers</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
              <Users className="w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                min={1}
                max={10}
                value={travelers}
                onChange={(e) => setTravelers(Number(e.target.value))}
                className="w-12 h-6 p-1 text-center bg-transparent border-0"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Days</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{tripLength[0]}</span>
            </div>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <button type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
        >
          <History className="w-4 h-4" />
          {showAdvanced ? 'Hide' : 'Show'} advanced filters
          <ChevronRight className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-90")} />
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-4"
            >
              {/* Max Price Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max flight price</span>
                  <span className="font-medium">${maxPrice[0]}</span>
                </div>
                <Slider
                  value={maxPrice}
                  onValueChange={setMaxPrice}
                  min={200}
                  max={5000}
                  step={100}
                  className="w-full"
                />
              </div>

              {/* Trip Length Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trip length</span>
                  <span className="font-medium">{tripLength[0]} days</span>
                </div>
                <Slider
                  value={tripLength}
                  onValueChange={setTripLength}
                  min={2}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Travel Style */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Travel Style</label>
                <div className="flex flex-wrap gap-2">
                  {TRAVEL_STYLE.map(style => (
                    <button type="button"
                      key={style.id}
                      onClick={() => toggleStyle(style.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm",
                        selectedStyle.includes(style.id)
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          : "bg-muted/30 border-border/50 text-muted-foreground hover:border-border"
                      )}
                    >
                      <style.icon className="w-4 h-4" />
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Destination Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              Top picks for you
              {hasLoadedAI && (
                <Badge className="bg-secondary text-foreground text-[10px]">
                  <Zap className="w-2.5 h-2.5 mr-0.5" />
                  AI Generated
                </Badge>
              )}
            </label>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              From {origin}
            </span>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border/50 p-4 animate-pulse">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-24 h-24 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))
            ) : (
              displayDestinations
                .filter(d => !dislikedIds.has(d.id))
                .map((dest, i) => {
                  const season = seasonInfo(dest.country);
                  const destImage = DESTINATION_IMAGES[dest.city];
                  const isHovered = hoveredDest === dest.id;
                  
                  return (
                    <motion.div
                      key={dest.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onMouseEnter={() => setHoveredDest(dest.id)}
                      onMouseLeave={() => setHoveredDest(null)}
                      onClick={() => handleSelectDestination(dest)}
                      className={cn(
                        "relative rounded-xl border overflow-hidden transition-all cursor-pointer group",
                        likedIds.has(dest.id)
                          ? "border-pink-500/40 bg-pink-500/5 ring-2 ring-pink-500/20"
                          : "border-border/50 hover:border-primary/50 bg-card/30"
                      )}
                    >
                      {/* Match Score Badge */}
                      <div className="absolute top-3 right-3 z-10">
                        <Badge className="bg-foreground text-primary-foreground font-bold shadow-lg">
                          {dest.matchScore}% match
                        </Badge>
                      </div>

                      <div className="flex">
                        {/* Image */}
                        <div className="w-32 h-36 shrink-0 relative overflow-hidden">
                          {destImage ? (
                            <motion.img
                              src={destImage}
                              alt={dest.city}
                              className="w-full h-full object-cover"
                              animate={{ scale: isHovered ? 1.1 : 1 }}
                              transition={{ duration: 0.3 }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-secondary">
                              <span className="text-5xl font-bold text-muted-foreground/30">{getCountryCode(dest.country)}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <div className="absolute bottom-2 left-2 text-primary-foreground text-sm font-bold">
                            {dest.airportCode}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-lg flex items-center gap-2">
                                {dest.city}
                                <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{getCountryCode(dest.country)}</span>
                              </h4>
                              <p className="text-sm text-muted-foreground">{dest.country}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-primary">${dest.price}</p>
                              <p className="text-xs text-muted-foreground">per person</p>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {dest.tags.slice(0, 4).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Stats Row */}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Sun className="w-3.5 h-3.5" />
                              {dest.weather}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" />
                              {dest.flightTime}
                            </span>
                            <span className="flex items-center gap-1 text-amber-400">
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <span>{dest.rating}</span>
                            </span>
                          </div>

                          {/* Best Season */}
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <season.icon className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-muted-foreground">Best:</span>
                            <span className="text-emerald-400">{season.best}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col justify-center gap-2 p-3 border-l border-border/30">
                          <Button
                            variant={likedIds.has(dest.id) ? "default" : "ghost"}
                            size="icon"
                            aria-label="Like destination"
                            className={cn(
                              "h-9 w-9 transition-transform hover:scale-110",
                              likedIds.has(dest.id) && "bg-pink-500 hover:bg-pink-600"
                            )}
                            onClick={(e) => likeDestination(e, dest.id)}
                          >
                            <Heart className={cn("w-4 h-4", likedIds.has(dest.id) && "fill-current")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Dislike destination"
                            className="h-9 w-9 hover:bg-red-500/20 hover:text-red-400"
                            onClick={(e) => dislikeDestination(e, dest.id)}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            aria-label="View details"
                            className="h-9 w-9 group-hover:text-primary"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
            )}
          </div>
        </div>

        {/* Trending Destinations */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/30">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-orange-400">Trending Now</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Tokyo · JP', 'Bali · ID', 'Barcelona · ES', 'Marrakech · MA'].map(dest => (
              <Badge 
                key={dest} 
                variant="outline" 
                className="cursor-pointer hover:bg-orange-500/20 border-orange-500/30 text-orange-300 transition-colors"
              >
                {dest}
              </Badge>
            ))}
          </div>
        </div>

        {/* AI Learning Note */}
        <div className="p-3 rounded-xl bg-secondary border border-border">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-foreground" />
            <div className="text-sm">
              <span className="text-foreground">AI learns from your preferences.</span>
              <span className="text-muted-foreground ml-1">Like or dislike destinations to improve suggestions.</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AITripSuggestions;
