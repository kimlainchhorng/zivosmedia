/**
 * GroceryDeliveryBar - "Deliver to" address picker for grocery pages
 * Uses Google Maps Places autocomplete via edge functions
 * Geocodes addresses to store lat/lng for nearby store detection
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Home, Briefcase, Plus, ChevronDown, Check, X, Navigation, Loader2, LocateFixed, Search } from "lucide-react";
import { useDeliveryAddress, type DeliveryAddress } from "@/hooks/useDeliveryAddress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AddressSuggestion {
  display: string;
  mainText: string;
  placeId: string;
}

const LABEL_ICONS: Record<DeliveryAddress["label"], React.ElementType> = {
  Home,
  Work: Briefcase,
  Other: MapPin,
};

const LABEL_COLORS: Record<DeliveryAddress["label"], string> = {
  Home: "text-primary",
  Work: "text-amber-500",
  Other: "text-muted-foreground",
};

/** Callback for when address changes (with coordinates) */
interface GroceryDeliveryBarProps {
  onAddressChange?: (address: DeliveryAddress | null) => void;
}

export default function GroceryDeliveryBar({ onAddressChange }: GroceryDeliveryBarProps = {}) {
  const { addresses, selectedAddress, addAddress, updateAddress, selectAddress, removeAddress } = useDeliveryAddress();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState<DeliveryAddress["label"]>("Home");
  const [newAddress, setNewAddress] = useState("");
  const [newApt, setNewApt] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Notify parent when selected address changes
  useEffect(() => {
    onAddressChange?.(selectedAddress);
  }, [selectedAddress, onAddressChange]);

  /** Geocode an address to get lat/lng */
  const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      // Use autocomplete + place details as forward geocode
      const { data } = await supabase.functions.invoke("maps-autocomplete", {
        body: { input: address },
      });
      const firstSuggestion = data?.suggestions?.[0];
      if (!firstSuggestion?.place_id) return null;

      const { data: details } = await supabase.functions.invoke("maps-place-details", {
        body: { place_id: firstSuggestion.place_id },
      });
      if (details?.lat && details?.lng) {
        return { lat: details.lat, lng: details.lng };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  /** Autocomplete address search via Google Maps */
  const searchAddress = useCallback((query: string) => {
    setNewAddress(query);
    setPendingCoords(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke("maps-autocomplete", {
          body: { input: query.trim() },
        });
        if (error) throw error;
        const mapped: AddressSuggestion[] = (data?.suggestions || []).map((s: any) => ({
          display: s.description || "",
          mainText: s.main_text || s.description?.split(",")[0] || "",
          placeId: s.place_id || "",
        }));
        setSuggestions(mapped);
        setShowSuggestions(mapped.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  const selectSuggestion = useCallback(async (s: AddressSuggestion) => {
    setNewAddress(s.display);
    setSuggestions([]);
    setShowSuggestions(false);

    // Get coordinates from place details
    try {
      const { data: details } = await supabase.functions.invoke("maps-place-details", {
        body: { place_id: s.placeId },
      });
      if (details?.lat && details?.lng) {
        setPendingCoords({ lat: details.lat, lng: details.lng });
      }
    } catch {
      // Coordinates optional, proceed without
    }
  }, []);

  // Cleanup debounce
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  /** Auto-detect address via GPS + Google Maps reverse geocode */
  const autoDetectAddress = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const { data, error } = await supabase.functions.invoke("maps-reverse-geocode", {
            body: { lat: latitude, lng: longitude },
          });
          if (error) throw error;
          const address = data?.address || data?.formatted_address || data?.results?.[0]?.formatted_address;
          if (address) {
            setNewAddress(address);
            setPendingCoords({ lat: latitude, lng: longitude });
            toast.success("Address detected");
          } else {
            toast.error("Could not determine address");
          }
        } catch {
          toast.error("Failed to detect address");
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied");
        } else {
          toast.error("Could not get your location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleAdd = async () => {
    if (!newAddress.trim()) return;

    // If we don't have coordinates yet, try to geocode
    let coords = pendingCoords;
    if (!coords) {
      coords = await geocodeAddress(newAddress.trim());
    }

    addAddress({
      label: newLabel,
      address: newAddress.trim(),
      apt: newApt.trim() || undefined,
      isDefault: addresses.length === 0,
      lat: coords?.lat,
      lng: coords?.lng,
    });
    setNewAddress("");
    setNewApt("");
    setPendingCoords(null);
    setIsAdding(false);
  };

  // Also geocode existing addresses that don't have coordinates
  useEffect(() => {
    if (!selectedAddress || (selectedAddress.lat && selectedAddress.lng)) return;

    const backfillCoords = async () => {
      const coords = await geocodeAddress(selectedAddress.address);
      if (coords) {
        updateAddress(selectedAddress.id, { lat: coords.lat, lng: coords.lng });
      }
    };
    backfillCoords();
  }, [selectedAddress?.id]);

  return (
    <div className="relative">
      {/* Compact bar */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-2 bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <div className="p-1 rounded-lg bg-primary/10">
          <Navigation className="h-3 w-3 text-primary" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Deliver to</p>
          {selectedAddress ? (
            <div className="flex items-center gap-1.5">
              {(() => {
                const Icon = LABEL_ICONS[selectedAddress.label] ?? MapPin;
                const color = LABEL_COLORS[selectedAddress.label] ?? "text-muted-foreground";
                return <Icon className={`h-3 w-3 ${color}`} />;
              })()}
              <p className="text-[12px] font-bold text-foreground truncate">
                {selectedAddress.label}
                <span className="font-normal text-muted-foreground ml-1.5">
                  {selectedAddress.address}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-[12px] font-semibold text-muted-foreground">Add delivery address</p>
          )}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
        </motion.div>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/20 bg-background/95 backdrop-blur-xl"
          >
            <div className="px-4 py-3 space-y-2">
              {/* Existing addresses */}
              {addresses.map((addr) => {
                const Icon = LABEL_ICONS[addr.label] ?? MapPin;
                const labelColor = LABEL_COLORS[addr.label] ?? "text-muted-foreground";
                const isSelected = selectedAddress?.id === addr.id;
                return (
                  <motion.div
                    key={addr.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer group ${
                      isSelected
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/20 hover:border-border/40 hover:bg-muted/20"
                    }`}
                    onClick={() => { selectAddress(addr.id); setIsOpen(false); }}
                  >
                    <div className={`p-2 rounded-xl ${isSelected ? "bg-primary/15" : "bg-muted/30"}`}>
                      <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : labelColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-foreground">{addr.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{addr.address}</p>
                      {addr.apt && <p className="text-[10px] text-muted-foreground/60">Apt {addr.apt}</p>}
                    </div>
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Check className="h-4 w-4 text-primary" />
                      </motion.div>
                    )}
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); removeAddress(addr.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/10 transition-all"
                    >
                      <X className="h-3 w-3 text-destructive/60" />
                    </button>
                  </motion.div>
                );
              })}

              {/* Quick-add presets if empty */}
              {addresses.length === 0 && !isAdding && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground text-center py-1">No saved addresses yet</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["Home", "Work"] as const).map((label) => {
                      const Icon = LABEL_ICONS[label];
                      return (
                        <motion.button
                          key={label}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setNewLabel(label); setIsAdding(true); }}
                          className="flex items-center gap-2 p-3 rounded-2xl border border-dashed border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all"
                        >
                          <Icon className={`h-4 w-4 ${LABEL_COLORS[label]}`} />
                          <span className="text-[12px] font-semibold text-foreground">Add {label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add new address button */}
              {!isAdding && addresses.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-2xl border border-dashed border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-semibold text-primary">Add new address</span>
                </motion.button>
              )}

              {/* Add form */}
              <AnimatePresence>
                {isAdding && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2.5 overflow-hidden"
                  >
                    {/* Label selector */}
                    <div className="flex gap-1.5">
                      {(["Home", "Work", "Other"] as const).map((label) => {
                        const Icon = LABEL_ICONS[label];
                        return (
                          <button type="button"
                            key={label}
                            onClick={() => setNewLabel(label)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                              newLabel === label
                                ? "bg-primary/15 text-primary border border-primary/20"
                                : "bg-muted/20 text-muted-foreground border border-border/20 hover:bg-muted/40"
                            }`}
                          >
                            <Icon className="h-3 w-3" />
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Auto-detect location */}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={autoDetectAddress}
                      disabled={isLocating}
                      className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all disabled:opacity-60"
                    >
                      {isLocating ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      ) : (
                        <LocateFixed className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-[11px] font-semibold text-primary">
                        {isLocating ? "Detecting location…" : "Use my current location"}
                      </span>
                    </motion.button>

                    {/* Address input with autocomplete */}
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                        <Input
                          value={newAddress}
                          onChange={(e) => searchAddress(e.target.value)}
                          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                          placeholder="Search street address…"
                          className="h-10 rounded-xl text-[12px] bg-muted/10 border-border/20 pl-9 pr-8"
                          autoFocus
                        />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary animate-spin" />
                        )}
                      </div>

                      {/* Suggestions dropdown */}
                      <AnimatePresence>
                        {showSuggestions && suggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute left-0 right-0 top-full mt-1 z-50 bg-background border border-border/30 rounded-xl shadow-xl overflow-hidden max-h-[200px] overflow-y-auto"
                          >
                            {suggestions.map((s, i) => (
                              <button type="button"
                                key={i}
                                onClick={() => selectSuggestion(s)}
                                className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left border-b border-border/10 last:border-0"
                              >
                                <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-semibold text-foreground truncate">
                                    {s.mainText}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {s.display}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <Input
                      value={newApt}
                      onChange={(e) => setNewApt(e.target.value)}
                      placeholder="Apt, suite, unit (optional)"
                      className="h-9 rounded-xl text-[12px] bg-muted/10 border-border/20"
                    />

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setIsAdding(false); setNewAddress(""); setNewApt(""); setPendingCoords(null); }}
                        className="flex-1 rounded-xl text-[11px] h-9"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAdd}
                        disabled={!newAddress.trim()}
                        className="flex-1 rounded-xl text-[11px] h-9 font-bold shadow-md shadow-primary/20"
                      >
                        Save Address
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
