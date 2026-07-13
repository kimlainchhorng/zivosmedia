/**
 * Universal Location Autocomplete Component
 * 
 * Supports:
 * - Airports (IATA codes) for Flights & Cars
 * - Cities (slugs) for Hotels
 * 
 * Key feature: Stores structured value (code/slug) separately from display label
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Plane, X, Search, TrendingUp, Globe, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// Generic location type that works for airports and cities
export interface LocationOption {
  value: string;       // IATA code or city slug (stored in URL)
  label: string;       // Display name (shown to user)
  secondary?: string;  // Additional info (airport name, country)
  country?: string;
  region?: string;
  popularity?: number;
  type?: 'airport' | 'city';
}

interface LocationAutocompleteProps {
  value: string;                                    // Current value (IATA code or slug)
  displayValue?: string;                            // Current display value
  onChange: (option: LocationOption | null) => void; // Callback with full option
  onDisplayChange?: (display: string) => void;      // Callback for display text changes
  options: LocationOption[];                        // All available options
  searchFn: (query: string, limit?: number) => LocationOption[];  // Search function
  popularFn?: (limit?: number) => LocationOption[]; // Get popular options
  placeholder?: string;
  label?: string;
  icon?: 'plane' | 'hotel' | 'pin';
  accentColor?: string;
  className?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function LocationAutocomplete({
  value,
  displayValue = "",
  onChange,
  onDisplayChange,
  options,
  searchFn,
  popularFn,
  placeholder = "Search location...",
  label,
  icon = 'pin',
  accentColor = "sky",
  className,
  error,
  required,
  disabled,
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(displayValue);
  const [suggestions, setSuggestions] = useState<LocationOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Color variants based on service
  const colorMap: Record<string, { icon: string; badge: string; hover: string; border: string }> = {
    sky: {
      icon: "text-sky-500",
      badge: "text-sky-400 border-sky-500/50 bg-sky-500/10",
      hover: "hover:bg-sky-500/10",
      border: "focus:border-sky-500",
    },
    amber: {
      icon: "text-amber-500",
      badge: "text-amber-400 border-amber-500/50 bg-amber-500/10",
      hover: "hover:bg-amber-500/10",
      border: "focus:border-amber-500",
    },
    violet: {
      icon: "text-violet-500",
      badge: "text-violet-400 border-violet-500/50 bg-violet-500/10",
      hover: "hover:bg-violet-500/10",
      border: "focus:border-violet-500",
    },
  };

  const colors = colorMap[accentColor] || colorMap.sky;

  // Sync with external display value
  useEffect(() => {
    setInputValue(displayValue);
  }, [displayValue]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  const performSearch = useCallback((query: string) => {
    if (query.length >= 2) {
      const results = searchFn(query, 8);
      setSuggestions(results);
    } else if (query.length === 0 && popularFn) {
      setSuggestions(popularFn(6));
    } else {
      setSuggestions([]);
    }
  }, [searchFn, popularFn]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onDisplayChange?.(newValue);
    performSearch(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
    
    // Clear selection when typing
    if (value) {
      onChange(null);
    }
  };

  const handleFocus = () => {
    if (inputValue.length >= 2) {
      performSearch(inputValue);
    } else if (popularFn) {
      setSuggestions(popularFn(6));
    }
    setIsOpen(true);
  };

  const handleSelect = (option: LocationOption) => {
    setInputValue(option.label);
    onDisplayChange?.(option.label);
    onChange(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleClear = () => {
    setInputValue("");
    onDisplayChange?.("");
    onChange(null);
    if (popularFn) {
      setSuggestions(popularFn(6));
    }
    inputRef.current?.focus();
    setIsOpen(true);
  };

  const IconComponent = icon === 'plane' ? Plane : icon === 'hotel' ? Building2 : MapPin;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      
      <div className="relative group">
        <div className={cn(
          "absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all duration-200",
          `bg-${accentColor}-500/10 group-focus-within:bg-${accentColor}-500/20`
        )}>
          <IconComponent className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", colors.icon)} />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-11 sm:pl-12 pr-10 h-11 sm:h-12 text-sm sm:text-base rounded-xl border-border/50",
            colors.border,
            error && "border-destructive focus:border-destructive",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          autoComplete="off"
        />
        
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
          {error}
        </p>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className={cn(
          "absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-xl overflow-hidden",
          isMobile ? "max-h-[60vh]" : "max-h-80"
        )}>
          {/* Header */}
          <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
            {inputValue.length >= 2 ? (
              <>
                <Globe className={cn("w-3.5 h-3.5", colors.icon)} />
                <span className="text-xs font-medium">Results</span>
              </>
            ) : (
              <>
                <TrendingUp className={cn("w-3.5 h-3.5", colors.icon)} />
                <span className="text-xs font-medium">Popular</span>
              </>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-64">
            {suggestions.map((option, index) => (
              <button type="button"
                key={`${option.value}-${index}`}
                onClick={() => handleSelect(option)}
                className={cn(
                  "w-full px-3 py-2.5 sm:py-3 flex items-center gap-3 text-left transition-colors border-b border-border/30 last:border-0",
                  colors.hover,
                  highlightedIndex === index && "bg-accent"
                )}
              >
                <div className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0",
                  `bg-${accentColor}-500/15`
                )}>
                  <IconComponent className={cn("w-4 h-4", colors.icon)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{option.label}</span>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 font-mono font-bold uppercase", colors.badge)}>
                      {option.value}
                    </Badge>
                  </div>
                  {option.secondary && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {option.secondary}
                    </p>
                  )}
                  {option.country && !option.secondary?.includes(option.country) && (
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {option.country}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-2 bg-muted/30 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center">
              {icon === 'plane' ? 'Search by city, airport, or code' : 'Search by city or destination'}
            </p>
          </div>
        </div>
      )}

      {/* No results */}
      {isOpen && inputValue.length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-lg p-6 text-center">
          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No results found</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
