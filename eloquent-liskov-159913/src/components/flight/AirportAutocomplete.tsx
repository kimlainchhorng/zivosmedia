import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plane, 
  MapPin, 
  Clock, 
  Star, 
  TrendingUp,
  History,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { searchAirports, getPopularAirports, formatAirportDisplay, type Airport } from "@/data/airports";

interface AirportAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  recentSearches?: string[];
  excludeCode?: string;
}

const AirportAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "City or airport",
  label,
  recentSearches = [],
  excludeCode
}: AirportAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Airport[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search airports when query changes
  useEffect(() => {
    if (query.length >= 2) {
      const searchResults = searchAirports(query)
        .filter(a => a.code !== excludeCode)
        .slice(0, 8);
      setResults(searchResults);
    } else {
      // Show popular airports when no query
      const popular = getPopularAirports(8).filter(a => a.code !== excludeCode);
      setResults(popular);
    }
  }, [query, excludeCode]);

  const handleSelect = (airport: Airport) => {
    const displayValue = formatAirportDisplay(airport);
    setQuery(displayValue);
    onChange(displayValue);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setIsOpen(true);
  };

  const getRegionIcon = (region: string) => {
    const colors: Record<string, string> = {
      'North America': 'text-sky-400',
      'Europe': 'text-indigo-400',
      'Asia': 'text-amber-400',
      'Middle East': 'text-orange-400',
      'Oceania': 'text-cyan-400',
      'Africa': 'text-emerald-400',
      'South America': 'text-green-400'
    };
    const color = colors[region] || 'text-muted-foreground';
    return <Globe className={cn("w-3.5 h-3.5", color)} />;
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 block font-medium">{label}</label>
      )}
      <div className="relative">
        <div className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-secondary flex items-center justify-center">
          <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-foreground" />
        </div>
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="h-10 sm:h-11 pl-10 sm:pl-12 text-sm bg-muted/50 rounded-xl"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-card rounded-2xl border border-border/60 shadow-lg shadow-black/8 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Recent searches */}
          {recentSearches.length > 0 && query.length < 2 && (
            <div className="p-3 border-b border-border/40">
              <p className="text-[11px] font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <History className="w-3 h-3" />
                Recent
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.slice(0, 3).map((search, i) => (
                  <button type="button"
                    key={i}
                    onClick={() => {
                      setQuery(search);
                      onChange(search);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/60 hover:bg-secondary text-xs font-medium rounded-lg transition-all touch-manipulation active:scale-95"
                  >
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-foreground">{search}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section header */}
          <div className="px-3 py-2 border-b border-border/30">
            <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              {query.length >= 2 ? (
                <>
                  <Globe className="w-3 h-3" />
                  Results
                </>
              ) : (
                <>
                  <Star className="w-3 h-3" />
                  Popular
                </>
              )}
            </p>
          </div>

          {/* Results list */}
          <div className="max-h-[280px] sm:max-h-[320px] overflow-y-auto">
            {results.length > 0 ? (
              results.map((airport) => (
                <button type="button"
                  key={airport.code}
                  onClick={() => handleSelect(airport)}
                  className="w-full px-3 py-3 flex items-center gap-3 hover:bg-secondary transition-colors text-left group border-b border-border/20 last:border-0 touch-manipulation active:scale-[0.99]"
                >
                  {/* Plane icon */}
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-secondary transition-colors">
                    <Plane className="w-4 h-4 text-foreground -rotate-45" />
                  </div>

                  {/* Airport info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{airport.city} ({airport.code})</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-[18px] font-mono font-bold text-foreground border-border bg-secondary rounded-md">
                        {airport.code}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {airport.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {airport.country}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-8 text-center">
                <Globe className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">No airports found</p>
                <p className="text-xs text-muted-foreground mt-0.5">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-2 border-t border-border/30 bg-muted/30">
            <p className="text-[10px] text-muted-foreground text-center">
              Search by city, airport, or code
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AirportAutocomplete;
