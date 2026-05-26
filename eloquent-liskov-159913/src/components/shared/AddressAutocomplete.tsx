/**
 * AddressAutocomplete Component
 * 
 * Reusable address input with Google Maps Places autocomplete
 * Falls back gracefully when API is unavailable
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Place {
  address: string;
  lat: number;
  lng: number;
}

interface Suggestion {
  description: string;
  place_id: string;
  main_text: string;
  canonical_place_id?: string;
}

interface AddressAutocompleteProps {
  placeholder?: string;
  value?: string;
  onSelect: (place: Place) => void;
  onClear?: () => void;
  onFocus?: () => void;
  proximity?: { lat: number; lng: number };
  disabled?: boolean;
  className?: string;
  country?: string;
}

export function AddressAutocomplete({
  placeholder = "Enter address",
  value = "",
  onSelect,
  onClear,
  onFocus,
  proximity,
  disabled = false,
  className,
  country,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("maps-autocomplete", {
        body: { input, proximity, country },
      });

      if (fnError) throw fnError;

      if (data?.ok && data.suggestions) {
        setSuggestions(data.suggestions);
        setIsOpen(data.suggestions.length > 0);
        setSelectedIndex(-1);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (err) {
      console.error("[AddressAutocomplete] Error:", err);
      setError("Failed to fetch suggestions");
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [proximity, country]);

  // Reset stale suggestions when country filter changes
  useEffect(() => {
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    setError(null);
  }, [country]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setInputValue(suggestion.description);
    setIsOpen(false);
    setSuggestions([]);
    setIsLoading(true);
    setError(null);

    try {
      // Use canonical_place_id for synthetic entries (::pickup, ::dropoff, ::terminal)
      const rawPlaceId = suggestion.place_id;
      const selectedPlaceId = suggestion.canonical_place_id || rawPlaceId.replace(/::[a-z0-9-]+$/i, "");
      const { data, error: fnError } = await supabase.functions.invoke("maps-place-details", {
        body: { place_id: selectedPlaceId },
      });

      if (!fnError && data?.ok && data.lat != null && data.lng != null) {
        if (import.meta.env.DEV) console.log("[AddressAutocomplete] Place details success:", data.address, data.lat, data.lng);
        onSelect({
          address: data.address || suggestion.description,
          lat: data.lat,
          lng: data.lng,
        });
        return;
      }

      console.warn("[AddressAutocomplete] Place details failed, trying geocode fallback:", fnError || data?.error);

      // Fallback: Use Geocoding API via maps-geocode edge function
      const { data: geoData, error: geoError } = await supabase.functions.invoke("maps-geocode", {
        body: { address: suggestion.description },
      });

      if (!geoError && geoData?.ok && geoData.lat != null && geoData.lng != null) {
        if (import.meta.env.DEV) console.log("[AddressAutocomplete] Geocode fallback success:", geoData.lat, geoData.lng);
        onSelect({
          address: suggestion.description,
          lat: geoData.lat,
          lng: geoData.lng,
        });
        return;
      }

      console.error("[AddressAutocomplete] Both place details and geocode failed");
      setError("Could not get coordinates for this address");
      // Still pass the address so UI isn't stuck
      onSelect({
        address: suggestion.description,
        lat: 0,
        lng: 0,
      });
    } catch (err) {
      console.error("[AddressAutocomplete] Selection error:", err);
      setError("Failed to get location details");
      onSelect({
        address: suggestion.description,
        lat: 0,
        lng: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSuggestions([]);
    setIsOpen(false);
    setError(null);
    onClear?.();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { suggestions.length > 0 && setIsOpen(true); onFocus?.(); }}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {inputValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-80 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button type="button"
              key={suggestion.place_id}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent"
              )}
            >
              <span className="font-medium">{suggestion.main_text}</span>
              <span className="text-muted-foreground ml-1 text-xs">
                {suggestion.description.replace(suggestion.main_text + ", ", "")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;
