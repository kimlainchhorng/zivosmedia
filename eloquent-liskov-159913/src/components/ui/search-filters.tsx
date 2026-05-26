import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  SlidersHorizontal, 
  Sparkles, 
  History, 
  TrendingUp,
  Mic,
  Camera,
  Check
} from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Badge } from "./badge";

// Enhanced Search Bar with Suggestions
interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  recentSearches?: string[];
  trendingSearches?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  leftIcon?: React.ReactNode;
  color?: "rides" | "eats" | "sky" | "amber" | "primary";
  className?: string;
  size?: "sm" | "md" | "lg";
  showVoice?: boolean;
  showCamera?: boolean;
}

const colorConfig = {
  rides: {
    ring: "focus-within:ring-rides/40 focus-within:border-rides/50",
    icon: "text-rides",
    gradient: "from-rides to-green-400",
    bg: "bg-rides/10"
  },
  eats: {
    ring: "focus-within:ring-eats/40 focus-within:border-eats/50",
    icon: "text-eats",
    gradient: "from-eats to-orange-400",
    bg: "bg-eats/10"
  },
  sky: {
    ring: "focus-within:ring-sky-400/40 focus-within:border-sky-400/50",
    icon: "text-sky-400",
    gradient: "from-muted to-muted",
    bg: "bg-sky-500/10"
  },
  amber: {
    ring: "focus-within:ring-amber-400/40 focus-within:border-amber-400/50",
    icon: "text-amber-400",
    gradient: "from-amber-500 to-orange-400",
    bg: "bg-amber-500/10"
  },
  primary: {
    ring: "focus-within:ring-primary/40 focus-within:border-primary/50",
    icon: "text-primary",
    gradient: "from-primary to-teal-400",
    bg: "bg-primary/10"
  },
};

const sizeConfig = {
  sm: {
    container: "h-10",
    input: "text-sm",
    icon: "w-4 h-4",
    padding: "px-3"
  },
  md: {
    container: "h-12",
    input: "text-base",
    icon: "w-5 h-5",
    padding: "px-4"
  },
  lg: {
    container: "h-14",
    input: "text-lg",
    icon: "w-6 h-6",
    padding: "px-5"
  }
};

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search...",
  value,
  onChange,
  suggestions = [],
  recentSearches = [],
  trendingSearches = [],
  onSuggestionClick,
  leftIcon,
  color = "primary",
  className,
  size = "md",
  showVoice = false,
  showCamera = false,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const colors = colorConfig[color];
  const sizes = sizeConfig[size];
  
  const showDropdown = isFocused && (
    (value.length > 0 && suggestions.length > 0) || 
    (value.length === 0 && (recentSearches.length > 0 || trendingSearches.length > 0))
  );

  return (
    <div className={cn("relative", className)}>
      <motion.div 
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl transition-all duration-200",
          "focus-within:ring-2 focus-within:bg-card",
          colors.ring,
          sizes.container,
          sizes.padding
        )}
        whileFocus={{ scale: 1.01 }}
      >
        <motion.div
          animate={isFocused ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          {leftIcon || <Search className={cn(sizes.icon, colors.icon)} />}
        </motion.div>
        
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className={cn(
            "border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0",
            sizes.input,
            sizes.container
          )}
        />
        
        <div className="flex items-center gap-1">
          {showVoice && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/50" aria-label="Voice search">
              <Mic className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
          
          {showCamera && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/50" aria-label="Camera search">
              <Camera className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
          
          <AnimatePresence>
            {value && (
              <motion.button
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                onClick={() => onChange("")}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card/98 backdrop-blur-xl rounded-2xl border border-border/50 overflow-hidden z-50 shadow-2xl shadow-black/20"
          >
            {/* Search suggestions */}
            {value.length > 0 && suggestions.length > 0 && (
              <div className="p-2">
                {suggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => onSuggestionClick?.(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 rounded-xl transition-colors flex items-center gap-3 group"
                  >
                    <Search className={cn("w-4 h-4 text-muted-foreground group-hover:scale-110 transition-transform", colors.icon)} />
                    <span className="text-sm font-medium">{suggestion}</span>
                  </motion.button>
                ))}
              </div>
            )}
            
            {/* Recent searches */}
            {value.length === 0 && recentSearches.length > 0 && (
              <div className="p-3 border-b border-border/50">
                <div className="flex items-center gap-2 px-2 mb-2">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent</span>
                </div>
                <div className="space-y-1">
                  {recentSearches.slice(0, 3).map((search, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => onSuggestionClick?.(search)}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 rounded-xl transition-colors flex items-center gap-3 text-sm"
                    >
                      <History className="w-3.5 h-3.5 text-muted-foreground" />
                      {search}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Trending searches */}
            {value.length === 0 && trendingSearches.length > 0 && (
              <div className="p-3">
                <div className="flex items-center gap-2 px-2 mb-2">
                  <TrendingUp className={cn("w-4 h-4", colors.icon)} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trending</span>
                </div>
                <div className="flex flex-wrap gap-2 px-2">
                  {trendingSearches.slice(0, 5).map((search, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => onSuggestionClick?.(search)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105",
                        colors.bg,
                        colors.icon
                      )}
                    >
                      {search}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Filter Chip - Enhanced
interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  count?: number;
  icon?: React.ReactNode;
  color?: "rides" | "eats" | "sky" | "amber" | "default";
  removable?: boolean;
  onRemove?: () => void;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  active = false,
  onClick,
  count,
  icon,
  color = "default",
  removable = false,
  onRemove,
}) => {
  const activeColors = {
    rides: "bg-gradient-to-r from-rides to-green-400 text-primary-foreground shadow-lg shadow-rides/30",
    eats: "bg-gradient-to-r from-eats to-orange-400 text-primary-foreground shadow-lg shadow-eats/30",
    sky: "bg-gradient-to-r from-sky-500 to-blue-500 text-primary-foreground shadow-lg shadow-sky-500/30",
    amber: "bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground shadow-lg shadow-amber-500/30",
    default: "bg-gradient-to-r from-primary to-teal-400 text-primary-foreground shadow-lg shadow-primary/30",
  };

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap",
        active 
          ? activeColors[color] 
          : "bg-card/80 border border-border/50 hover:border-border hover:bg-card text-foreground"
      )}
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.97 }}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn(
          "px-2 py-0.5 text-xs rounded-full font-bold",
          active ? "bg-white/20" : "bg-muted"
        )}>
          {count}
        </span>
      )}
      {active && removable && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-1 p-0.5 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-3 h-3" />
        </motion.span>
      )}
    </motion.button>
  );
};

// Filter Panel - Enhanced
interface FilterOption {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  description?: string;
}

interface FilterPanelProps {
  title?: string;
  filters: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  color?: "rides" | "eats" | "sky" | "amber" | "default";
  multiSelect?: boolean;
  layout?: "horizontal" | "grid";
  showDescription?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  title,
  filters,
  selected,
  onChange,
  color = "default",
  multiSelect = true,
  layout = "horizontal",
  showDescription = false,
}) => {
  const handleClick = (id: string) => {
    if (multiSelect) {
      if (selected.includes(id)) {
        onChange(selected.filter((s) => s !== id));
      } else {
        onChange([...selected, id]);
      }
    } else {
      onChange(selected.includes(id) ? [] : [id]);
    }
  };

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-bold text-foreground">{title}</h4>
          </div>
          {selected.length > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => onChange([])}
              className="text-xs text-primary hover:underline font-medium"
            >
              Clear all
            </motion.button>
          )}
        </div>
      )}
      
      <div className={cn(
        layout === "grid" 
          ? "grid grid-cols-2 sm:grid-cols-3 gap-2" 
          : "flex flex-wrap gap-2"
      )}>
        {filters.map((filter, index) => {
          const isSelected = selected.includes(filter.id);
          
          if (showDescription) {
            return (
              <motion.button
                key={filter.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleClick(filter.id)}
                className={cn(
                  "p-4 rounded-2xl text-left transition-all border",
                  isSelected
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-border/50 bg-card/50 hover:bg-card"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {filter.icon}
                    <span className="font-semibold text-sm">{filter.label}</span>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </motion.div>
                  )}
                </div>
                {filter.description && (
                  <p className="text-xs text-muted-foreground">{filter.description}</p>
                )}
              </motion.button>
            );
          }
          
          return (
            <FilterChip
              key={filter.id}
              label={filter.label}
              active={isSelected}
              onClick={() => handleClick(filter.id)}
              count={filter.count}
              icon={filter.icon}
              color={isSelected ? color : "default"}
              removable={isSelected}
              onRemove={() => handleClick(filter.id)}
            />
          );
        })}
      </div>
    </div>
  );
};

// Sort Dropdown - Enhanced
interface SortOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface SortDropdownProps {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  color?: "rides" | "eats" | "sky" | "amber" | "primary";
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  options,
  value,
  onChange,
  label = "Sort by",
  color = "primary",
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedOption = options.find((o) => o.id === value);
  const colors = colorConfig[color];

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card transition-all",
          isOpen && "ring-2 ring-primary/30"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <SlidersHorizontal className={cn("w-4 h-4", colors.icon)} />
        <span className="text-sm font-semibold">
          {label}: <span className="text-muted-foreground font-normal">{selectedOption?.label}</span>
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute top-full right-0 mt-2 min-w-[200px] bg-card/98 backdrop-blur-xl rounded-2xl border border-border/50 overflow-hidden z-50 shadow-2xl shadow-black/20"
            >
              {options.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 transition-colors flex items-center justify-between",
                    option.id === value && "bg-primary/10 text-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {option.icon}
                    {option.label}
                  </div>
                  {option.id === value && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Active Filters Display - Enhanced
interface ActiveFiltersProps {
  filters: { id: string; label: string; color?: string }[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  filters,
  onRemove,
  onClearAll,
}) => {
  if (filters.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-2xl"
    >
      <div className="flex items-center gap-2 mr-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Active:</span>
      </div>
      
      {filters.map((filter, index) => (
        <motion.div
          key={filter.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ delay: index * 0.03 }}
        >
          <Badge
            variant="secondary"
            className="flex items-center gap-1.5 pr-1.5 pl-3 py-1.5 rounded-xl bg-primary/10 text-primary border-primary/20 font-medium"
          >
            {filter.label}
            <button type="button"
              onClick={() => onRemove(filter.id)}
              className="ml-1 p-1 rounded-full hover:bg-primary/20 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        </motion.div>
      ))}
      
      <motion.button
        onClick={onClearAll}
        className="text-xs text-muted-foreground hover:text-primary font-medium ml-2 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Clear all
      </motion.button>
    </motion.div>
  );
};

// Search Results Header
interface SearchResultsHeaderProps {
  query?: string;
  resultCount: number;
  isLoading?: boolean;
}

export const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({
  query,
  resultCount,
  isLoading = false,
}) => {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2">
        {isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Search className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        ) : (
          <Search className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground">
          {isLoading ? (
            "Searching..."
          ) : query ? (
            <>
              <span className="font-semibold text-foreground">{resultCount}</span> results for "
              <span className="font-medium text-primary">{query}</span>"
            </>
          ) : (
            <>
              <span className="font-semibold text-foreground">{resultCount}</span> results
            </>
          )}
        </span>
      </div>
    </div>
  );
};
