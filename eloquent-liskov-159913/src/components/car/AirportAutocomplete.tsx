/**
 * Airport/Location Autocomplete for Car Rental
 * Uses IATA codes for URL-safe routing
 */

import { useState, useEffect, useRef } from "react";
import { MapPin, Plane, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { airports, type Airport } from "@/data/airports";
import { cn } from "@/lib/utils";

interface AirportAutocompleteProps {
  value: string;
  onChange: (airport: Airport | null, displayValue: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

// Get popular airports for quick selection
function getPopularAirports(limit: number = 8): Airport[] {
  return airports
    .filter(a => a.popularity >= 8)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

// Search airports by name, city, code, or country
function searchAirports(query: string, limit: number = 10): Airport[] {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  const matches = airports.filter(airport => 
    airport.code.toLowerCase().includes(normalizedQuery) ||
    airport.name.toLowerCase().includes(normalizedQuery) ||
    airport.city.toLowerCase().includes(normalizedQuery) ||
    airport.country.toLowerCase().includes(normalizedQuery)
  );
  
  // Sort by relevance (exact code match first, then by popularity)
  matches.sort((a, b) => {
    const aCodeMatch = a.code.toLowerCase() === normalizedQuery;
    const bCodeMatch = b.code.toLowerCase() === normalizedQuery;
    
    if (aCodeMatch && !bCodeMatch) return -1;
    if (!aCodeMatch && bCodeMatch) return 1;
    
    const aStartsWithQuery = a.city.toLowerCase().startsWith(normalizedQuery);
    const bStartsWithQuery = b.city.toLowerCase().startsWith(normalizedQuery);
    
    if (aStartsWithQuery && !bStartsWithQuery) return -1;
    if (!aStartsWithQuery && bStartsWithQuery) return 1;
    
    return b.popularity - a.popularity;
  });
  
  return matches.slice(0, limit);
}

// Get airport by code
export function getAirportByCode(code: string): Airport | undefined {
  return airports.find(a => a.code.toUpperCase() === code.toUpperCase());
}

export default function AirportAutocomplete({
  value,
  onChange,
  placeholder = "Airport or city",
  className,
  inputClassName,
}: AirportAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Airport[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update input when value changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (newValue.length >= 2) {
      const results = searchAirports(newValue, 8);
      setSuggestions(results);
      setIsOpen(true);
      setHighlightedIndex(-1);
    } else if (newValue.length === 0) {
      // Show popular airports when empty
      setSuggestions(getPopularAirports(6));
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
    
    // Clear selected airport when typing
    onChange(null, newValue);
  };

  const handleFocus = () => {
    if (inputValue.length >= 2) {
      const results = searchAirports(inputValue, 8);
      setSuggestions(results);
    } else {
      // Show popular airports when focused with empty input
      setSuggestions(getPopularAirports(6));
    }
    setIsOpen(true);
  };

  const handleSelectAirport = (airport: Airport) => {
    const displayValue = `${airport.city} (${airport.code})`;
    setInputValue(displayValue);
    onChange(airport, displayValue);
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
          handleSelectAirport(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleClear = () => {
    setInputValue("");
    onChange(null, "");
    setSuggestions(getPopularAirports(6));
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "pl-11 pr-10 h-14 text-base rounded-xl border-border/50 focus:border-violet-500",
            inputClassName
          )}
          autoComplete="off"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="py-2">
            {inputValue.length < 2 && (
              <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium">
                Popular airports
              </div>
            )}
            {suggestions.map((airport, index) => (
              <button type="button"
                key={airport.code}
                onClick={() => handleSelectAirport(airport)}
                className={cn(
                  "w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-accent transition-colors",
                  highlightedIndex === index && "bg-accent"
                )}
              >
                <Plane className="w-4 h-4 text-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {airport.code}
                    </span>
                    <p className="font-medium truncate">{airport.city}</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {airport.name}, {airport.country}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results message */}
      {isOpen && inputValue.length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-lg p-4 text-center">
          <Plane className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No airports found</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
