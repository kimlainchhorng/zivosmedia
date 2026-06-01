import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  Clock, 
  Star, 
  TrendingUp, 
  Bookmark, 
  ChevronRight, 
  Sparkles, 
  Crown, 
  Gift, 
  Zap, 
  MapPin, 
  ArrowRight, 
  Check, 
  Award,
  Flame,
  Shield,
  Sun,
  CloudSun,
  Moon,
  UtensilsCrossed
} from "lucide-react";
import { Card, CardContent } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";

// Recently Viewed Item
interface RecentItem {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  emoji?: string;
  timestamp?: Date;
  type: "restaurant" | "hotel" | "flight" | "car" | "ride";
}

interface RecentlyViewedProps {
  items: RecentItem[];
  onItemClick?: (item: RecentItem) => void;
  maxItems?: number;
}

const typeConfig = {
  restaurant: { 
    color: "text-eats", 
    bg: "bg-gradient-to-br from-eats/25 to-eats/5",
    border: "border-eats/30",
    glow: "shadow-eats/20"
  },
  hotel: {
    color: "text-warning",
    bg: "bg-gradient-to-br from-warning/25 to-warning/5",
    border: "border-warning/30",
    glow: "shadow-warning/20"
  },
  flight: {
    color: "text-primary",
    bg: "bg-gradient-to-br from-primary/25 to-primary/5",
    border: "border-primary/30",
    glow: "shadow-primary/20"
  },
  car: { 
    color: "text-primary", 
    bg: "bg-gradient-to-br from-primary/25 to-primary/5",
    border: "border-primary/30",
    glow: "shadow-primary/20"
  },
  ride: { 
    color: "text-rides", 
    bg: "bg-gradient-to-br from-rides/25 to-rides/5",
    border: "border-rides/30",
    glow: "shadow-rides/20"
  },
};

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
  items,
  onItemClick,
  maxItems = 6,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 flex items-center justify-center"
          >
            <Clock className="w-5 h-5 text-muted-foreground" />
          </motion.div>
          <div>
            <h4 className="font-bold">Recently Viewed</h4>
            <p className="text-xs text-muted-foreground">Pick up where you left off</p>
          </div>
        </div>
        {items.length > maxItems && (
          <Button variant="ghost" size="sm" className="text-xs gap-1 hover:text-primary">
            See all
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {items.slice(0, maxItems).map((item, index) => {
          const config = typeConfig[item.type];
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
              whileHover={{ y: -4, scale: 1.02 }}
              onClick={() => onItemClick?.(item)}
              className={cn(
                "flex-shrink-0 w-36 p-4 rounded-2xl border bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm transition-all text-left group",
                "hover:shadow-xl",
                config.border,
                `hover:${config.glow}`
              )}
            >
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 shadow-lg",
                  config.bg
                )}
              >
                <MapPin className="w-6 h-6 text-primary/70" />
              </motion.div>
              <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// Favorites List
interface FavoriteItem {
  id: string;
  title: string;
  subtitle?: string;
  rating?: number;
  image?: string;
  emoji?: string;
  type: "restaurant" | "hotel" | "flight" | "car" | "location";
}

interface FavoritesListProps {
  items: FavoriteItem[];
  onItemClick?: (item: FavoriteItem) => void;
  onRemove?: (id: string) => void;
  emptyMessage?: string;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({
  items,
  onItemClick,
  onRemove,
  emptyMessage = "No favorites yet",
}) => {
  if (items.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12 rounded-3xl bg-gradient-to-br from-muted/30 to-muted/10 border border-white/10"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center mx-auto mb-4"
        >
          <Heart className="w-8 h-8 text-destructive opacity-50" />
        </motion.div>
        <p className="text-sm text-muted-foreground font-medium">{emptyMessage}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Start exploring to add favorites</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, type: "spring" }}
          whileHover={{ x: 4 }}
          className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-card/80 to-card/50 border border-white/10 hover:border-white/20 transition-all group"
        >
          <button type="button"
            onClick={() => onItemClick?.(item)}
            className="flex items-center gap-4 flex-1 min-w-0 text-left"
          >
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center text-2xl shrink-0 shadow-lg"
            >
              <Heart className="w-6 h-6 text-destructive/70" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate group-hover:text-primary transition-colors">
                {item.title}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                {item.subtitle && <span className="truncate">{item.subtitle}</span>}
                {item.rating && (
                  <span className="flex items-center gap-1 bg-warning/10 px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 fill-warning text-warning" />
                    <span className="text-xs font-semibold text-warning">{item.rating}</span>
                  </span>
                )}
              </div>
            </div>
          </button>
          {onRemove && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onRemove(item.id)}
              className="p-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Heart className="w-4 h-4 fill-destructive text-destructive" />
            </motion.button>
          )}
        </motion.div>
      ))}
    </div>
  );
};

// Personalized Greeting Component
interface PersonalizedGreetingProps {
  name: string;
  memberSince?: string;
  tier?: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  stats?: {
    trips?: number;
    points?: number;
    savings?: number;
  };
  className?: string;
  streak?: number;
}

const tierConfig = {
  bronze: {
    gradient: "from-warning via-warning to-warning",
    glow: "shadow-warning/30",
    icon: Award,
    label: "Bronze",
    textColor: "text-warning"
  },
  silver: {
    gradient: "from-muted-foreground/60 via-muted-foreground/80 to-muted-foreground",
    glow: "shadow-muted-foreground/30",
    icon: Award,
    label: "Silver",
    textColor: "text-muted-foreground"
  },
  gold: {
    gradient: "from-warning via-warning to-warning",
    glow: "shadow-warning/40",
    icon: Crown,
    label: "Gold",
    textColor: "text-warning"
  },
  platinum: {
    gradient: "from-muted to-muted",
    glow: "shadow-foreground/40",
    icon: Crown,
    label: "Platinum",
    textColor: "text-ig-gradient"
  },
  diamond: {
    gradient: "from-muted to-muted",
    glow: "shadow-foreground/50",
    icon: Sparkles,
    label: "Diamond",
    textColor: "text-ig-gradient"
  },
};

export const PersonalizedGreeting: React.FC<PersonalizedGreetingProps> = ({
  name,
  memberSince,
  tier = "bronze",
  stats,
  className,
  streak,
}) => {
  const config = tierConfig[tier];
  const TierIcon = config.icon;
  
  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const GreetingIcon = () => {
    const hour = new Date().getHours();
    if (hour < 12) return <Sun className="w-5 h-5 text-warning" />;
    if (hour < 18) return <CloudSun className="w-5 h-5 text-foreground" />;
    return <Moon className="w-5 h-5 text-foreground" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={cn(
        "relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-card/95 to-card border border-white/10 shadow-xl",
        className
      )}
    >
      {/* Background decorations */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10 pointer-events-none", config.gradient)} />
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-white/5 to-transparent rounded-tr-full" />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm text-muted-foreground font-medium">{getTimeOfDayGreeting()}</p>
            <GreetingIcon />
          </div>
          <motion.h1 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold"
          >
            {name}
          </motion.h1>
          {memberSince && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Member since {memberSince}
            </p>
          )}
        </div>
        
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          <Badge className={cn(
            "bg-gradient-to-r text-primary-foreground border-0 px-4 py-2 text-sm font-bold shadow-xl",
            config.gradient,
            config.glow
          )}>
            <TierIcon className="w-4 h-4 mr-1.5" />
            {config.label}
          </Badge>
        </motion.div>
      </div>

      {/* Streak indicator */}
      {streak && streak > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-gradient-to-r from-warning/15 to-warning/5 border border-warning/20"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning/30 to-warning/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-sm font-bold text-warning">{streak} day streak!</p>
            <p className="text-xs text-muted-foreground">Keep it up!</p>
          </div>
        </motion.div>
      )}

      {stats && (
        <div className="flex gap-4 mt-5 pt-5 border-t border-white/10">
          {stats.trips !== undefined && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -2 }}
              className="flex-1 p-3 rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20"
            >
              <p className="text-3xl font-bold">{stats.trips}</p>
              <p className="text-xs text-muted-foreground font-medium">Trips</p>
            </motion.div>
          )}
          {stats.points !== undefined && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ y: -2 }}
              className="flex-1 p-3 rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20"
            >
              <p className="text-3xl font-bold">{stats.points.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-medium">Points</p>
            </motion.div>
          )}
          {stats.savings !== undefined && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ y: -2 }}
              className="flex-1 p-3 rounded-2xl bg-gradient-to-br from-success/20 to-success/5"
            >
              <p className="text-3xl font-bold text-success">${stats.savings}</p>
              <p className="text-xs text-muted-foreground font-medium">Saved</p>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
};

// Promotional Banner Component
interface PromoBannerProps {
  title: string;
  description: string;
  code?: string;
  discount?: string;
  expiresAt?: string;
  variant?: "default" | "urgent" | "special" | "referral";
  onClaim?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const promoVariants = {
  default: {
    bg: "from-primary/20 via-primary/10 to-primary/20",
    accent: "from-primary to-primary",
    icon: Gift,
    glow: "shadow-primary/20",
  },
  urgent: {
    bg: "from-destructive/20 via-destructive/10 to-destructive/20",
    accent: "from-destructive to-destructive",
    icon: Zap,
    glow: "shadow-destructive/20",
  },
  special: {
    bg: "from-muted via-muted to-muted",
    accent: "from-primary to-primary",
    icon: Sparkles,
    glow: "shadow-foreground/20",
  },
  referral: {
    bg: "from-success/20 via-success/10 to-success/20",
    accent: "from-success to-success",
    icon: Heart,
    glow: "shadow-success/20",
  },
};

export const PromoBanner: React.FC<PromoBannerProps> = ({
  title,
  description,
  code,
  discount,
  expiresAt,
  variant = "default",
  onClaim,
  onDismiss,
  className,
}) => {
  const config = promoVariants[variant];
  const PromoIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card className={cn(
        "overflow-hidden border-0 relative shadow-xl",
        config.glow,
        className
      )}>
        <div className={`absolute inset-0 bg-gradient-to-r ${config.bg}`} />
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full" />
        
        <CardContent className="p-5 relative">
          <div className="flex items-start gap-4">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className={`p-4 rounded-2xl bg-gradient-to-br ${config.accent} shadow-xl`}
            >
              <PromoIcon className="w-7 h-7 text-primary-foreground" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                </div>
                {discount && (
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <Badge className={`bg-gradient-to-r ${config.accent} text-primary-foreground border-0 text-xl font-bold px-4 py-2 shadow-lg`}>
                      {discount}
                    </Badge>
                  </motion.div>
                )}
              </div>
              
              <div className="flex items-center gap-3 mt-4">
                {code && (
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/60 border-2 border-dashed border-white/20"
                  >
                    <code className="text-sm font-mono font-bold">{code}</code>
                  </motion.div>
                )}
                {expiresAt && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl">
                    <Clock className="w-3.5 h-3.5" />
                    Expires {expiresAt}
                  </div>
                )}
              </div>

              {onClaim && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4"
                >
                  <Button 
                    className={`bg-gradient-to-r ${config.accent} hover:opacity-90 shadow-xl h-12 px-6 rounded-xl font-bold`}
                    onClick={onClaim}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Claim Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Recommendation Card
interface RecommendationProps {
  title: string;
  subtitle?: string;
  image?: string;
  emoji?: string;
  reason?: string;
  rating?: number;
  price?: string;
  onClick?: () => void;
  color?: "rides" | "eats" | "sky" | "amber" | "primary";
  badge?: string;
}

const recommendationColors = {
  rides: {
    gradient: "from-rides/25 to-rides/5",
    border: "border-rides/30",
    text: "text-rides",
    glow: "hover:shadow-rides/20",
  },
  eats: {
    gradient: "from-eats/25 to-eats/5",
    border: "border-eats/30",
    text: "text-eats",
    glow: "hover:shadow-eats/20",
  },
  sky: {
    gradient: "from-muted to-muted",
    border: "border-primary/30",
    text: "text-primary",
    glow: "hover:shadow-primary/20",
  },
  amber: {
    gradient: "from-warning/25 to-warning/5",
    border: "border-warning/30",
    text: "text-warning",
    glow: "hover:shadow-warning/20",
  },
  primary: {
    gradient: "from-primary/25 to-primary/5",
    border: "border-primary/30",
    text: "text-primary",
    glow: "hover:shadow-primary/20",
  },
};

export const RecommendationCard: React.FC<RecommendationProps> = ({
  title,
  subtitle,
  emoji,
  reason,
  rating,
  price,
  onClick,
  color = "primary",
  badge,
}) => {
  const config = recommendationColors[color];

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative w-full p-5 rounded-3xl bg-gradient-to-br border text-left group overflow-hidden shadow-xl transition-all",
        config.gradient,
        config.border,
        config.glow,
        "hover:shadow-2xl"
      )}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Sparkle accent */}
      <motion.div 
        className="absolute top-4 right-4"
        animate={{ rotate: [0, 15, -15, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Sparkles className={cn("w-5 h-5", config.text)} />
      </motion.div>

      {badge && (
        <motion.span 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 left-4 px-3 py-1 text-xs font-bold bg-gradient-to-r from-eats to-warning text-primary-foreground rounded-full shadow-lg"
        >
          {badge}
        </motion.span>
      )}

      <div className="flex items-start gap-4 mt-4">
        <motion.div 
          whileHover={{ scale: 1.15, rotate: 10 }}
          className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-4xl shrink-0 shadow-lg"
        >
          <Sparkles className="w-8 h-8 text-primary/70" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
          {reason && (
            <p className={cn("text-xs mt-2 flex items-center gap-1.5 font-medium", config.text)}>
              <TrendingUp className="w-3.5 h-3.5" />
              {reason}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10">
        <div className="flex items-center gap-4">
          {rating && (
            <span className="flex items-center gap-1.5 text-sm bg-warning/15 px-3 py-1.5 rounded-xl">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span className="font-bold">{rating}</span>
            </span>
          )}
          {price && (
            <span className="text-base font-bold">{price}</span>
          )}
        </div>
        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </motion.div>
      </div>
    </motion.button>
  );
};

// Quick Repeat Order
interface QuickRepeatProps {
  orders: {
    id: string;
    title: string;
    items?: string[];
    price: string;
    emoji?: string;
    lastOrdered?: string;
  }[];
  onReorder?: (id: string) => void;
}

export const QuickRepeatOrders: React.FC<QuickRepeatProps> = ({
  orders,
  onReorder,
}) => {
  if (orders.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <motion.div 
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          className="w-10 h-10 rounded-2xl bg-gradient-to-br from-eats/20 to-eats/5 flex items-center justify-center"
        >
          <Bookmark className="w-5 h-5 text-eats" />
        </motion.div>
        <div>
          <h4 className="font-bold">Order Again</h4>
          <p className="text-xs text-muted-foreground">Your favorites, one tap away</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {orders.map((order, index) => (
          <motion.button
            key={order.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, type: "spring" }}
            whileHover={{ y: -3, scale: 1.01 }}
            onClick={() => onReorder?.(order.id)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-card/80 to-card/50 border border-white/10 hover:border-eats/40 hover:shadow-xl hover:shadow-eats/10 transition-all text-left group"
          >
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-eats/20 to-eats/5 flex items-center justify-center text-2xl shrink-0 shadow-lg"
            >
              <UtensilsCrossed className="w-6 h-6 text-eats/70" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate group-hover:text-eats transition-colors">
                {order.title}
              </p>
              {order.items && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {order.items.join(", ")}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-bold text-eats bg-eats/10 px-2.5 py-1 rounded-xl">{order.price}</span>
                {order.lastOrdered && (
                  <span className="text-xs text-muted-foreground">• {order.lastOrdered}</span>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// Saved Preferences
interface SavedPreference {
  id: string;
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface SavedPreferencesProps {
  preferences: SavedPreference[];
  onEdit?: (id: string) => void;
}

export const SavedPreferences: React.FC<SavedPreferencesProps> = ({
  preferences,
  onEdit,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {preferences.map((pref, index) => (
        <motion.button
          key={pref.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ y: -3, scale: 1.02 }}
          onClick={() => onEdit?.(pref.id)}
          className="p-4 rounded-2xl bg-gradient-to-br from-card/80 to-card/50 border border-white/10 hover:border-primary/30 transition-all text-left group shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
              {pref.icon || <MapPin className="w-4 h-4" />}
            </div>
            <span className="text-xs text-muted-foreground font-medium">{pref.label}</span>
          </div>
          <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">
            {pref.value}
          </p>
        </motion.button>
      ))}
    </div>
  );
};

// Feature Tour Tooltip
interface FeatureTourProps {
  title: string;
  description: string;
  step: number;
  totalSteps: number;
  onNext?: () => void;
  onSkip?: () => void;
  onComplete?: () => void;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export const FeatureTour: React.FC<FeatureTourProps> = ({
  title,
  description,
  step,
  totalSteps,
  onNext,
  onSkip,
  onComplete,
  position = "bottom",
  className,
}) => {
  const isLast = step === totalSteps;

  const positionClasses = {
    top: "bottom-full mb-3",
    bottom: "top-full mt-3",
    left: "right-full mr-3",
    right: "left-full ml-3",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={cn(
        "absolute z-50 w-80 p-5 rounded-3xl bg-gradient-to-br from-card/98 to-card border border-white/10 shadow-2xl backdrop-blur-xl",
        positionClasses[position],
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full pointer-events-none" />
      
      <div className="flex items-start gap-4 mb-4 relative">
        <motion.div 
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg"
        >
          <span className="text-lg font-bold text-primary">{step}</span>
        </motion.div>
        <div className="flex-1">
          <h4 className="font-bold text-lg">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between relative">
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-200",
                i < step ? "bg-primary shadow-lg shadow-primary/30" : "bg-muted"
              )}
            />
          ))}
        </div>
        
        <div className="flex gap-2">
          {onSkip && !isLast && (
            <Button variant="ghost" size="sm" className="rounded-xl" onClick={onSkip}>
              Skip
            </Button>
          )}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              size="sm" 
              onClick={isLast ? onComplete : onNext}
              className="bg-gradient-to-r from-primary to-primary rounded-xl shadow-lg shadow-primary/30 font-bold px-4"
            >
              {isLast ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  Done
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default PersonalizedGreeting;
