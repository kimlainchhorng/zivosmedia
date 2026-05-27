/**
 * Unified Results Filters Hook
 * Manages filter state with URL synchronization, debouncing, and UTM preservation
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { FilterChip } from "@/components/results/ActiveFiltersChips";

// Tracking params to preserve during filter updates
const TRACKING_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "creator", "subid"];

// ============= Flight Filters =============
export interface FlightFilters {
  maxPrice: number;
  stops: number[];
  airlines: string[];
  departureTime: string[];
  arrivalTime: string[];
  maxDuration: number;
  cabinClass: string[];
  baggageIncluded: boolean;
}

export const defaultFlightFilters: FlightFilters = {
  maxPrice: 5000,
  stops: [],
  airlines: [],
  departureTime: [],
  arrivalTime: [],
  maxDuration: 24,
  cabinClass: [],
  baggageIncluded: false,
};

// ============= Hotel Filters =============
export interface HotelFiltersState {
  priceRange: [number, number];
  starRating: number[];
  guestRating: number | null;
  amenities: string[];
  propertyType: string[];
  distance: number | null;
}

export const defaultHotelFilters: HotelFiltersState = {
  priceRange: [0, 1000],
  starRating: [],
  guestRating: null,
  amenities: [],
  propertyType: [],
  distance: null,
};

// ============= Car Filters =============
export interface CarFiltersState {
  maxPrice: number;
  categories: string[];
  seats: number | null;
  bags: number | null;
  transmission: string[];
  suppliers: string[];
  fuelType: string[];
  freeCancellation: boolean;
}

export const defaultCarFilters: CarFiltersState = {
  maxPrice: 500,
  categories: [],
  seats: null,
  bags: null,
  transmission: [],
  suppliers: [],
  fuelType: [],
  freeCancellation: false,
};

// ============= Eats Filters =============
export interface EatsFiltersState {
  cuisines: string[];
  priceRanges: string[];
  minRating: number | null;
  maxDeliveryTime: number | null;
  maxDistance: number | null;
  freeDelivery: boolean;
  hasPromos: boolean;
  dietPreferences: string[];
}

export const defaultEatsFilters: EatsFiltersState = {
  cuisines: [],
  priceRanges: [],
  minRating: null,
  maxDeliveryTime: null,
  maxDistance: null,
  freeDelivery: false,
  hasPromos: false,
  dietPreferences: [],
};

// ============= Ride Filters =============
export interface RideFiltersState {
  vehicleTypes: string[];
  maxEta: number | null;
  maxPrice: number;
  wheelchairAccessible: boolean;
  scheduledOnly: boolean;
}

export const defaultRideFilters: RideFiltersState = {
  vehicleTypes: [],
  maxEta: null,
  maxPrice: 200,
  wheelchairAccessible: false,
  scheduledOnly: false,
};

// ============= Delivery Filters =============
export interface DeliveryFiltersState {
  serviceTypes: string[];
  maxEta: number | null;
  maxPrice: number;
  packageSizes: string[];
}

export const defaultDeliveryFilters: DeliveryFiltersState = {
  serviceTypes: [],
  maxEta: null,
  maxPrice: 200,
  packageSizes: [],
};

// ============= Generic Hook =============
interface UseResultsFiltersOptions<T> {
  defaultFilters: T;
  service: "flights" | "hotels" | "cars" | "eats" | "rides" | "delivery";
  filtersToUrl: (filters: T) => Record<string, string>;
  urlToFilters: (params: URLSearchParams) => Partial<T>;
  filtersToChips: (filters: T) => FilterChip[];
  debounceMs?: number;
}

export function useResultsFilters<T>({
  defaultFilters,
  service,
  filtersToUrl,
  urlToFilters,
  filtersToChips,
  debounceMs = 300,
}: UseResultsFiltersOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<T>(() => {
    const urlFilters = urlToFilters(searchParams);
    return { ...defaultFilters, ...urlFilters };
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Convert filters to chips for display
  const chips = useMemo(() => filtersToChips(filters), [filters, filtersToChips]);

  // Count active filters
  const activeCount = chips.length;

  // Check if any filters are active
  const hasActiveFilters = activeCount > 0;

  // Update URL with debounce
  const syncToUrl = useCallback(
    (newFilters: T) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      setIsUpdating(true);

      debounceRef.current = setTimeout(() => {
        const filterParams = filtersToUrl(newFilters);
        const newParams = new URLSearchParams(searchParams);

        // Clear existing filter params (but keep tracking & search params)
        const filterKeys = Object.keys(filtersToUrl(defaultFilters));
        filterKeys.forEach((key) => newParams.delete(key));

        // Add new filter params
        Object.entries(filterParams).forEach(([key, value]) => {
          if (value) {
            newParams.set(key, value);
          }
        });

        setSearchParams(newParams, { replace: true });
        setIsUpdating(false);
      }, debounceMs);
    },
    [searchParams, setSearchParams, filtersToUrl, defaultFilters, debounceMs]
  );

  // Update filters and sync to URL
  const updateFilters = useCallback(
    (newFilters: Partial<T>) => {
      setFilters((prev) => {
        const updated = { ...prev, ...newFilters };
        syncToUrl(updated);
        return updated;
      });
    },
    [syncToUrl]
  );

  // Remove a specific filter by chip ID
  const removeFilter = useCallback(
    (chipId: string) => {
      // Parse chip ID to determine which filter to remove
      const [category, ...valueParts] = chipId.split(":");
      const value = valueParts.join(":");

      setFilters((prev) => {
        const updated = { ...prev };

        switch (service) {
          case "flights": {
            const f = updated as unknown as FlightFilters;
            if (category === "price") f.maxPrice = 5000;
            if (category === "stops") f.stops = f.stops.filter((s) => String(s) !== value);
            if (category === "airline") f.airlines = f.airlines.filter((a) => a !== value);
            if (category === "time") f.departureTime = f.departureTime.filter((t) => t !== value);
            if (category === "arrival") f.arrivalTime = f.arrivalTime.filter((t) => t !== value);
            if (category === "duration") f.maxDuration = 24;
            if (category === "cabin") f.cabinClass = f.cabinClass.filter((c) => c !== value);
            if (category === "baggage") f.baggageIncluded = false;
            break;
          }
          case "hotels": {
            const f = updated as unknown as HotelFiltersState;
            if (category === "price") f.priceRange = [0, 1000];
            if (category === "stars") f.starRating = f.starRating.filter((s) => String(s) !== value);
            if (category === "rating") f.guestRating = null;
            if (category === "amenity") f.amenities = f.amenities.filter((a) => a !== value);
            if (category === "type") f.propertyType = f.propertyType.filter((t) => t !== value);
            if (category === "distance") f.distance = null;
            break;
          }
          case "cars": {
            const f = updated as unknown as CarFiltersState;
            if (category === "price") f.maxPrice = 500;
            if (category === "category") f.categories = f.categories.filter((c) => c !== value);
            if (category === "seats") f.seats = null;
            if (category === "bags") f.bags = null;
            if (category === "transmission") f.transmission = f.transmission.filter((t) => t !== value);
            if (category === "supplier") f.suppliers = f.suppliers.filter((s) => s !== value);
            if (category === "fuel") f.fuelType = f.fuelType.filter((ft) => ft !== value);
            if (category === "cancellation") f.freeCancellation = false;
            break;
          }
          case "eats": {
            const f = updated as unknown as EatsFiltersState;
            if (category === "cuisine") f.cuisines = f.cuisines.filter((c) => c !== value);
            if (category === "price") f.priceRanges = f.priceRanges.filter((p) => p !== value);
            if (category === "rating") f.minRating = null;
            if (category === "time") f.maxDeliveryTime = null;
            if (category === "distance") f.maxDistance = null;
            if (category === "delivery") f.freeDelivery = false;
            if (category === "promo") f.hasPromos = false;
            if (category === "diet") f.dietPreferences = f.dietPreferences.filter((d) => d !== value);
            break;
          }
          case "rides": {
            const f = updated as unknown as RideFiltersState;
            if (category === "vehicle") f.vehicleTypes = f.vehicleTypes.filter((v) => v !== value);
            if (category === "eta") f.maxEta = null;
            if (category === "price") f.maxPrice = 200;
            if (category === "accessible") f.wheelchairAccessible = false;
            if (category === "scheduled") f.scheduledOnly = false;
            break;
          }
          case "delivery": {
            const f = updated as unknown as DeliveryFiltersState;
            if (category === "service") f.serviceTypes = f.serviceTypes.filter((s) => s !== value);
            if (category === "eta") f.maxEta = null;
            if (category === "price") f.maxPrice = 200;
            if (category === "size") f.packageSizes = f.packageSizes.filter((p) => p !== value);
            break;
          }
        }

        syncToUrl(updated);
        return updated;
      });
    },
    [service, syncToUrl]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    syncToUrl(defaultFilters);
  }, [defaultFilters, syncToUrl]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    filters,
    setFilters: updateFilters,
    chips,
    activeCount,
    hasActiveFilters,
    removeFilter,
    clearFilters,
    isUpdating,
  };
}

// ============= Flight Filters Hook =============
export function useFlightFilters() {
  return useResultsFilters<FlightFilters>({
    defaultFilters: defaultFlightFilters,
    service: "flights",
    filtersToUrl: (filters) => ({
      price_max: filters.maxPrice < 5000 ? String(filters.maxPrice) : "",
      stops: filters.stops.length > 0 ? filters.stops.join(",") : "",
      airline: filters.airlines.length > 0 ? filters.airlines.join(",") : "",
      time: filters.departureTime.length > 0 ? filters.departureTime.join(",") : "",
      arrival: filters.arrivalTime.length > 0 ? filters.arrivalTime.join(",") : "",
      duration: filters.maxDuration < 24 ? String(filters.maxDuration) : "",
      cabin: filters.cabinClass.length > 0 ? filters.cabinClass.join(",") : "",
      baggage: filters.baggageIncluded ? "1" : "",
    }),
    urlToFilters: (params) => ({
      maxPrice: parseInt(params.get("price_max") || "5000", 10),
      stops: params.get("stops")?.split(",").map(Number).filter((n) => !isNaN(n)) || [],
      airlines: params.get("airline")?.split(",").filter(Boolean) || [],
      departureTime: params.get("time")?.split(",").filter(Boolean) || [],
      arrivalTime: params.get("arrival")?.split(",").filter(Boolean) || [],
      maxDuration: parseInt(params.get("duration") || "24", 10),
      cabinClass: params.get("cabin")?.split(",").filter(Boolean) || [],
      baggageIncluded: params.get("baggage") === "1",
    }),
    filtersToChips: (filters) => {
      const chips: FilterChip[] = [];

      if (filters.maxPrice < 5000) {
        chips.push({ id: "price:max", label: `$${filters.maxPrice}`, category: "Max Price" });
      }

      filters.stops.forEach((stop) => {
        const label = stop === 0 ? "Nonstop" : stop === 1 ? "1 Stop" : "2+ Stops";
        chips.push({ id: `stops:${stop}`, label, category: "Stops" });
      });

      filters.airlines.forEach((code) => {
        chips.push({ id: `airline:${code}`, label: code, category: "Airline" });
      });

      filters.departureTime.forEach((time) => {
        const labels: Record<string, string> = {
          morning: "Morning",
          afternoon: "Afternoon",
          evening: "Evening",
          night: "Night",
        };
        chips.push({ id: `time:${time}`, label: labels[time] || time, category: "Depart" });
      });

      filters.arrivalTime.forEach((time) => {
        const labels: Record<string, string> = {
          morning: "Morning",
          afternoon: "Afternoon",
          evening: "Evening",
          night: "Night",
        };
        chips.push({ id: `arrival:${time}`, label: labels[time] || time, category: "Arrive" });
      });

      if (filters.maxDuration < 24) {
        chips.push({ id: "duration:max", label: `${filters.maxDuration}h max`, category: "Duration" });
      }

      filters.cabinClass.forEach((cabin) => {
        const labels: Record<string, string> = {
          economy: "Economy",
          premium_economy: "Premium Econ",
          business: "Business",
          first: "First",
        };
        chips.push({ id: `cabin:${cabin}`, label: labels[cabin] || cabin, category: "Cabin" });
      });

      if (filters.baggageIncluded) {
        chips.push({ id: "baggage:included", label: "Checked bag", category: "Baggage" });
      }

      return chips;
    },
  });
}

// ============= Hotel Filters Hook =============
export function useHotelFilters() {
  return useResultsFilters<HotelFiltersState>({
    defaultFilters: defaultHotelFilters,
    service: "hotels",
    filtersToUrl: (filters) => ({
      price_min: filters.priceRange[0] > 0 ? String(filters.priceRange[0]) : "",
      price_max: filters.priceRange[1] < 1000 ? String(filters.priceRange[1]) : "",
      stars: filters.starRating.length > 0 ? filters.starRating.join(",") : "",
      rating: filters.guestRating ? String(filters.guestRating) : "",
      amenities: filters.amenities.length > 0 ? filters.amenities.join(",") : "",
      type: filters.propertyType.length > 0 ? filters.propertyType.join(",") : "",
      distance: filters.distance ? String(filters.distance) : "",
    }),
    urlToFilters: (params) => ({
      priceRange: [
        parseInt(params.get("price_min") || "0", 10),
        parseInt(params.get("price_max") || "1000", 10),
      ] as [number, number],
      starRating: params.get("stars")?.split(",").map(Number).filter((n) => !isNaN(n)) || [],
      guestRating: parseInt(params.get("rating") || "", 10) || null,
      amenities: params.get("amenities")?.split(",").filter(Boolean) || [],
      propertyType: params.get("type")?.split(",").filter(Boolean) || [],
      distance: parseInt(params.get("distance") || "", 10) || null,
    }),
    filtersToChips: (filters) => {
      const chips: FilterChip[] = [];

      if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) {
        chips.push({
          id: "price:range",
          label: `$${filters.priceRange[0]}-$${filters.priceRange[1]}`,
          category: "Price",
        });
      }

      filters.starRating.forEach((star) => {
        chips.push({ id: `stars:${star}`, label: `${star}★`, category: "Stars" });
      });

      if (filters.guestRating) {
        chips.push({ id: `rating:${filters.guestRating}`, label: `${filters.guestRating}+`, category: "Rating" });
      }

      filters.amenities.forEach((amenity) => {
        const labels: Record<string, string> = {
          wifi: "WiFi",
          parking: "Parking",
          pool: "Pool",
          breakfast: "Breakfast",
        };
        chips.push({ id: `amenity:${amenity}`, label: labels[amenity] || amenity, category: "Amenity" });
      });

      filters.propertyType.forEach((type) => {
        chips.push({ id: `type:${type}`, label: type.charAt(0).toUpperCase() + type.slice(1), category: "Type" });
      });

      if (filters.distance) {
        chips.push({ id: `distance:${filters.distance}`, label: `${filters.distance}km`, category: "Distance" });
      }

      return chips;
    },
  });
}

// ============= Car Filters Hook =============
export function useCarFilters() {
  return useResultsFilters<CarFiltersState>({
    defaultFilters: defaultCarFilters,
    service: "cars",
    filtersToUrl: (filters) => ({
      price_max: filters.maxPrice < 500 ? String(filters.maxPrice) : "",
      category: filters.categories.length > 0 ? filters.categories.join(",") : "",
      seats: filters.seats ? String(filters.seats) : "",
      bags: filters.bags ? String(filters.bags) : "",
      transmission: filters.transmission.length > 0 ? filters.transmission.join(",") : "",
      supplier: filters.suppliers.length > 0 ? filters.suppliers.join(",") : "",
      fuel: filters.fuelType.length > 0 ? filters.fuelType.join(",") : "",
      free_cancel: filters.freeCancellation ? "1" : "",
    }),
    urlToFilters: (params) => ({
      maxPrice: parseInt(params.get("price_max") || "500", 10),
      categories: params.get("category")?.split(",").filter(Boolean) || [],
      seats: parseInt(params.get("seats") || "", 10) || null,
      bags: parseInt(params.get("bags") || "", 10) || null,
      transmission: params.get("transmission")?.split(",").filter(Boolean) || [],
      suppliers: params.get("supplier")?.split(",").filter(Boolean) || [],
      fuelType: params.get("fuel")?.split(",").filter(Boolean) || [],
      freeCancellation: params.get("free_cancel") === "1",
    }),
    filtersToChips: (filters) => {
      const chips: FilterChip[] = [];

      if (filters.maxPrice < 500) {
        chips.push({ id: "price:max", label: `$${filters.maxPrice}/day`, category: "Max Price" });
      }

      filters.categories.forEach((cat) => {
        chips.push({ id: `category:${cat}`, label: cat, category: "Type" });
      });

      if (filters.seats) {
        chips.push({ id: `seats:${filters.seats}`, label: `${filters.seats}+ seats`, category: "Seats" });
      }

      if (filters.bags) {
        chips.push({ id: `bags:${filters.bags}`, label: `${filters.bags}+ bags`, category: "Bags" });
      }

      filters.transmission.forEach((trans) => {
        chips.push({ id: `transmission:${trans}`, label: trans, category: "Trans" });
      });

      filters.suppliers.forEach((supplier) => {
        chips.push({ id: `supplier:${supplier}`, label: supplier, category: "Supplier" });
      });

      filters.fuelType.forEach((fuel) => {
        chips.push({ id: `fuel:${fuel}`, label: fuel, category: "Fuel" });
      });

      if (filters.freeCancellation) {
        chips.push({ id: "cancellation:free", label: "Free Cancel", category: "Cancel" });
      }

      return chips;
    },
  });
}

// ============= Eats Filters Hook =============
export function useEatsFilters() {
  return useResultsFilters<EatsFiltersState>({
    defaultFilters: defaultEatsFilters,
    service: "eats",
    filtersToUrl: (filters) => ({
      cuisine: filters.cuisines.length > 0 ? filters.cuisines.join(",") : "",
      price: filters.priceRanges.length > 0 ? filters.priceRanges.join(",") : "",
      rating: filters.minRating ? String(filters.minRating) : "",
      time: filters.maxDeliveryTime ? String(filters.maxDeliveryTime) : "",
      distance: filters.maxDistance ? String(filters.maxDistance) : "",
      free_delivery: filters.freeDelivery ? "1" : "",
      promos: filters.hasPromos ? "1" : "",
      diet: filters.dietPreferences.length > 0 ? filters.dietPreferences.join(",") : "",
    }),
    urlToFilters: (params) => ({
      cuisines: params.get("cuisine")?.split(",").filter(Boolean) || [],
      priceRanges: params.get("price")?.split(",").filter(Boolean) || [],
      minRating: parseFloat(params.get("rating") || "") || null,
      maxDeliveryTime: parseInt(params.get("time") || "", 10) || null,
      maxDistance: parseInt(params.get("distance") || "", 10) || null,
      freeDelivery: params.get("free_delivery") === "1",
      hasPromos: params.get("promos") === "1",
      dietPreferences: params.get("diet")?.split(",").filter(Boolean) || [],
    }),
    filtersToChips: (filters) => {
      const chips: FilterChip[] = [];
      filters.cuisines.forEach((c) => chips.push({ id: `cuisine:${c}`, label: c.charAt(0).toUpperCase() + c.slice(1), category: "Cuisine" }));
      filters.priceRanges.forEach((p) => chips.push({ id: `price:${p}`, label: p, category: "Price" }));
      if (filters.minRating) chips.push({ id: `rating:${filters.minRating}`, label: `${filters.minRating}+`, category: "Rating" });
      if (filters.maxDeliveryTime) chips.push({ id: `time:${filters.maxDeliveryTime}`, label: `${filters.maxDeliveryTime} min`, category: "ETA" });
      if (filters.maxDistance) chips.push({ id: `distance:${filters.maxDistance}`, label: `${filters.maxDistance} mi`, category: "Distance" });
      if (filters.freeDelivery) chips.push({ id: "delivery:free", label: "Free Delivery", category: "Offer" });
      if (filters.hasPromos) chips.push({ id: "promo:active", label: "Promos", category: "Offer" });
      filters.dietPreferences.forEach((d) => chips.push({ id: `diet:${d}`, label: d.replace("_", " "), category: "Diet" }));
      return chips;
    },
  });
}

// ============= Ride Filters Hook =============
export function useRideFilters() {
  return useResultsFilters<RideFiltersState>({
    defaultFilters: defaultRideFilters,
    service: "rides",
    filtersToUrl: (filters) => ({
      vehicle: filters.vehicleTypes.length > 0 ? filters.vehicleTypes.join(",") : "",
      eta: filters.maxEta ? String(filters.maxEta) : "",
      price_max: filters.maxPrice < 200 ? String(filters.maxPrice) : "",
      accessible: filters.wheelchairAccessible ? "1" : "",
      scheduled: filters.scheduledOnly ? "1" : "",
    }),
    urlToFilters: (params) => ({
      vehicleTypes: params.get("vehicle")?.split(",").filter(Boolean) || [],
      maxEta: parseInt(params.get("eta") || "", 10) || null,
      maxPrice: parseInt(params.get("price_max") || "200", 10),
      wheelchairAccessible: params.get("accessible") === "1",
      scheduledOnly: params.get("scheduled") === "1",
    }),
    filtersToChips: (filters) => {
      const chips: FilterChip[] = [];
      filters.vehicleTypes.forEach((v) => chips.push({ id: `vehicle:${v}`, label: v.charAt(0).toUpperCase() + v.slice(1), category: "Vehicle" }));
      if (filters.maxEta) chips.push({ id: `eta:${filters.maxEta}`, label: `${filters.maxEta} min`, category: "ETA" });
      if (filters.maxPrice < 200) chips.push({ id: "price:max", label: `$${filters.maxPrice}`, category: "Max Price" });
      if (filters.wheelchairAccessible) chips.push({ id: "accessible:yes", label: "Accessible", category: "Access" });
      if (filters.scheduledOnly) chips.push({ id: "scheduled:yes", label: "Scheduled", category: "Type" });
      return chips;
    },
  });
}

// ============= Delivery Filters Hook =============
export function useDeliveryFilters() {
  return useResultsFilters<DeliveryFiltersState>({
    defaultFilters: defaultDeliveryFilters,
    service: "delivery",
    filtersToUrl: (filters) => ({
      service_type: filters.serviceTypes.length > 0 ? filters.serviceTypes.join(",") : "",
      eta: filters.maxEta ? String(filters.maxEta) : "",
      price_max: filters.maxPrice < 200 ? String(filters.maxPrice) : "",
      size: filters.packageSizes.length > 0 ? filters.packageSizes.join(",") : "",
    }),
    urlToFilters: (params) => ({
      serviceTypes: params.get("service_type")?.split(",").filter(Boolean) || [],
      maxEta: parseInt(params.get("eta") || "", 10) || null,
      maxPrice: parseInt(params.get("price_max") || "200", 10),
      packageSizes: params.get("size")?.split(",").filter(Boolean) || [],
    }),
    filtersToChips: (filters) => {
      const chips: FilterChip[] = [];
      filters.serviceTypes.forEach((s) => chips.push({ id: `service:${s}`, label: s.charAt(0).toUpperCase() + s.slice(1), category: "Service" }));
      if (filters.maxEta) chips.push({ id: `eta:${filters.maxEta}`, label: `${filters.maxEta} min`, category: "ETA" });
      if (filters.maxPrice < 200) chips.push({ id: "price:max", label: `$${filters.maxPrice}`, category: "Max Price" });
      filters.packageSizes.forEach((p) => chips.push({ id: `size:${p}`, label: p.charAt(0).toUpperCase() + p.slice(1), category: "Size" }));
      return chips;
    },
  });
}
