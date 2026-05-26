/**
 * RideBookingHome — Complete ride booking flow
 * Flow: home → search → route-preview → ride-options → confirm-ride → searching → driver-assigned → driver-en-route → trip-in-progress → trip-complete
 */
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import type { PanInfo } from "framer-motion";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Navigation from "lucide-react/dist/esm/icons/navigation";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Home from "lucide-react/dist/esm/icons/home";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import Car from "lucide-react/dist/esm/icons/car";
import Crown from "lucide-react/dist/esm/icons/crown";
import Users from "lucide-react/dist/esm/icons/users";
import Zap from "lucide-react/dist/esm/icons/zap";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import History from "lucide-react/dist/esm/icons/history";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import Clock from "lucide-react/dist/esm/icons/clock";
import CreditCard from "lucide-react/dist/esm/icons/credit-card";
import User from "lucide-react/dist/esm/icons/user";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import Map from "lucide-react/dist/esm/icons/map";
import Star from "lucide-react/dist/esm/icons/star";
import Phone from "lucide-react/dist/esm/icons/phone";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import Shield from "lucide-react/dist/esm/icons/shield";
import Banknote from "lucide-react/dist/esm/icons/banknote";
import Smartphone from "lucide-react/dist/esm/icons/smartphone";
import Wallet from "lucide-react/dist/esm/icons/wallet";
import X from "lucide-react/dist/esm/icons/x";
import Baby from "lucide-react/dist/esm/icons/baby";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Route from "lucide-react/dist/esm/icons/route";
import Timer from "lucide-react/dist/esm/icons/timer";
import Bell from "lucide-react/dist/esm/icons/bell";
import Package from "lucide-react/dist/esm/icons/package";
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import TrendingDown from "lucide-react/dist/esm/icons/trending-down";
import Gem from "lucide-react/dist/esm/icons/gem";
import PawPrint from "lucide-react/dist/esm/icons/paw-print";
import Accessibility from "lucide-react/dist/esm/icons/accessibility";
import Plus from "lucide-react/dist/esm/icons/plus";
import ShoppingCart from "lucide-react/dist/esm/icons/shopping-cart";
import Fuel from "lucide-react/dist/esm/icons/fuel";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Store from "lucide-react/dist/esm/icons/store";
import Pill from "lucide-react/dist/esm/icons/pill";
import Globe from "lucide-react/dist/esm/icons/globe";
import Bike from "lucide-react/dist/esm/icons/bike";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import RideMap from "@/components/maps/RideMap";
import ScrollWheelPicker from "./ScrollWheelPicker";
import DateScrollWheelPicker from "./DateScrollWheelPicker";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useSavedLocations } from "@/hooks/useSavedLocations";
import { forwardGeocode, reverseGeocode } from "@/services/mapsApi";
import RidePaymentSection, { type CambodiaPaymentMethod, type RideAuthorizedPayment } from "@/components/rides/RidePaymentSection";
import type { AbaKhqrPaymentReceipt } from "@/components/rides/AbaPaymentModal";
import CancelRideModal from "@/components/rides/CancelRideModal";
import { Input } from "@/components/ui/input";
import { CountryPhoneInput } from "@/components/auth/CountryPhoneInput";
import Tag from "lucide-react/dist/esm/icons/tag";
import Percent from "lucide-react/dist/esm/icons/percent";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import PlaceLogo from "@/components/rides/PlaceLogo";
import { subscribeToPooledPostgresChanges } from "@/services/chatRealtimePool";
import { useCityPricing } from "@/hooks/useCityPricing";
import { useDriverLocation } from "@/hooks/useDriverLocation";
import { useCustomerLocationBroadcast } from "@/hooks/useCustomerLocationBroadcast";
import { useI18n } from "@/hooks/useI18n";
import { useCountry } from "@/hooks/useCountry";
import { useUpcomingFlightArrival, buildFlightPickupJobData, isAirportAddress } from "@/hooks/useFlightArrivalPickup";
import { usePaymentLocationRestriction } from "@/hooks/usePaymentLocationRestriction";

/* ─── Types ─── */
interface PlaceData {
  address: string;
  lat: number;
  lng: number;
}

interface RouteData {
  distance_miles: number;
  duration_minutes: number;
  duration_in_traffic_minutes?: number | null;
  polyline: string | null;
  traffic_level?: string;
  traffic_segments?: { startPolylinePointIndex: number; endPolylinePointIndex: number; speed: string }[] | null;
}

/** Detect if user is in Cambodia based on pickup address or coordinates */
function isInCambodia(address?: string, lat?: number): boolean {
  if (address && /cambodia|កម្ពុជា|phnom\s*penh|siem\s*reap|battambang|sihanoukville/i.test(address)) return true;
  // Cambodia lat range: ~9.5 to ~14.7
  if (lat && lat >= 9.5 && lat <= 14.7) return true;
  return false;
}

/** Format distance: km for Cambodia, mi for others */
function formatDist(miles: number, useKm: boolean): string {
  if (useKm) return `${(miles * 1.60934).toFixed(1)} km`;
  return `${miles} mi`;
}

/** Format per-unit label */
function distUnit(useKm: boolean): string {
  return useKm ? "km" : "mi";
}

/** Convert per-mile rate to per-km for display */
function perDistRate(perMile: number, useKm: boolean): number {
  return useKm ? perMile / 1.60934 : perMile;
}

/** USD → KHR exchange rate */
const USD_TO_KHR = 4062.5;
const US_DEFAULT_CENTER = { lat: 40.7128, lng: -73.9857 };
const CAMBODIA_DEFAULT_CENTER = { lat: 11.5564, lng: 104.9282 };

/** Format price in KHR */
function toKHR(usd: number): string {
  return `${Math.round(usd * USD_TO_KHR).toLocaleString()} ៛`;
}

/** Dual price display: KHR primary, USD secondary for Cambodia */
function dualPrice(usd: number, showKhr: boolean): string {
  if (!showKhr) return `$${usd.toFixed(2)}`;
  return `${toKHR(usd)} ($${usd.toFixed(2)})`;
}

function ridePaymentLabel(method: string, isCambodia: boolean): string {
  if (!isCambodia) return "Card on file";
  if (method === "aba") return "Bakong KHQR";
  if (method === "cash") return "Cash";
  if (method === "card") return "Card";
  return "Payment confirmed";
}

/** Distance value for display */
function distValue(miles: number, useKm: boolean): number {
  return useKm ? Number((miles * 1.60934).toFixed(1)) : miles;
}

type ViewStep =
  | "home"
  | "search"
  | "route-preview"
  | "rider-info"
  | "ride-options"
  | "confirm-ride"
  | "searching"
  | "driver-assigned"
  | "driver-en-route"
  | "trip-in-progress"
  | "trip-complete"
  | "aba-waiting"
  // legacy aliases kept for backward compatibility
  | "vehicle"
  | "pickup-confirm"
  | "matching"
  | "tracking"
  | "complete";


/* ─── Data ─── */
/* Saved places & recent destinations now loaded from Supabase */
const ICON_MAP: Record<string, React.ElementType> = {
  home: Home,
  work: Building2,
  pin: MapPin,
};

// Default vehicle options (used as fallback when DB pricing not loaded)
const DEFAULT_VEHICLE_OPTIONS = [
  // Popular
  { id: "economy", category: "popular", name: "ZIVO Economy", desc: "Affordable everyday rides", etaMin: 4, pricePerMile: 1.50, basePrice: 3.50, perMinute: 0.35, bookingFee: 2.50, minimumFare: 7.00, capacity: 3, icon: Car, carSeat: false, surgeMultiplier: 1.0 },
  { id: "moto", category: "popular", name: "ZIVO Moto", desc: "Fast motorcycle rides", etaMin: 3, pricePerMile: 0.80, basePrice: 1.50, perMinute: 0.15, bookingFee: 0.13, minimumFare: 0.25, capacity: 1, icon: Bike, carSeat: false, surgeMultiplier: 1.0 },
  { id: "share", category: "popular", name: "ZIVO Share", desc: "Share a ride, save money", etaMin: 6, pricePerMile: 1.00, basePrice: 2.00, perMinute: 0.20, bookingFee: 1.50, minimumFare: 4.00, capacity: 2, icon: Users, carSeat: false, surgeMultiplier: 1.0 },
  { id: "comfort", category: "popular", name: "ZIVO Comfort", desc: "Top-rated drivers, extra legroom", etaMin: 5, pricePerMile: 2.50, basePrice: 5.00, perMinute: 0.50, bookingFee: 3.00, minimumFare: 10.00, capacity: 3, icon: Sparkles, carSeat: false, surgeMultiplier: 1.0 },
  { id: "ev", category: "popular", name: "ZIVO EV", desc: "Electric, zero-emission rides", etaMin: 5, pricePerMile: 2.00, basePrice: 4.00, perMinute: 0.40, bookingFee: 2.50, minimumFare: 8.00, capacity: 3, icon: Zap, carSeat: false, surgeMultiplier: 1.0 },
  { id: "xl", category: "popular", name: "ZIVO XL", desc: "Extra space for groups", etaMin: 5, pricePerMile: 2.75, basePrice: 5.50, perMinute: 0.55, bookingFee: 3.00, minimumFare: 11.00, capacity: 5, icon: Car, carSeat: false, surgeMultiplier: 1.0 },
  // Premium
  { id: "black-lane", category: "premium", name: "ZIVO BLACK Lane", desc: "Executive black sedan service", etaMin: 6, pricePerMile: 4.50, basePrice: 9.00, perMinute: 0.90, bookingFee: 3.50, minimumFare: 18.00, capacity: 4, icon: Crown, carSeat: false, surgeMultiplier: 1.0 },
  { id: "black-xl", category: "premium", name: "ZIVO BLACK XL", desc: "Premium black SUV for groups", etaMin: 7, pricePerMile: 5.50, basePrice: 11.00, perMinute: 1.10, bookingFee: 4.00, minimumFare: 22.00, capacity: 6, icon: Crown, carSeat: false, surgeMultiplier: 1.0 },
  { id: "luxury-xl", category: "premium", name: "ZIVO Luxury XL", desc: "Luxury spacious SUV experience", etaMin: 8, pricePerMile: 5.50, basePrice: 10.50, perMinute: 1.10, bookingFee: 4.50, minimumFare: 25.00, capacity: 6, icon: Crown, carSeat: false, surgeMultiplier: 1.0 },
  // Accessible
  { id: "pet", category: "accessible", name: "ZIVO Pet", desc: "Pet-friendly rides", etaMin: 6, pricePerMile: 2.25, basePrice: 4.50, perMinute: 0.45, bookingFee: 3.00, minimumFare: 9.00, capacity: 3, icon: PawPrint, carSeat: false, surgeMultiplier: 1.0 },
  { id: "wheelchair", category: "accessible", name: "ZIVO Wheel Chair", desc: "Wheelchair accessible vehicle", etaMin: 8, pricePerMile: 1.80, basePrice: 4.00, perMinute: 0.35, bookingFee: 2.50, minimumFare: 8.00, capacity: 3, icon: Accessibility, carSeat: false, surgeMultiplier: 1.0 },
];

// rideTabs and homeServices built inside component for translation

/* ─── Price calculator ─── */
function calcPrice(vehicle: typeof DEFAULT_VEHICLE_OPTIONS[0], distanceMiles: number, durationMinutes = 0, surge = 1.0): number {
  const raw = (vehicle.basePrice + vehicle.pricePerMile * distanceMiles + vehicle.perMinute * durationMinutes) * surge * vehicle.surgeMultiplier;
  const withFee = raw + vehicle.bookingFee;
  const total = Math.max(withFee, vehicle.minimumFare);
  return Math.round(total * 100) / 100;
}

/* ─── Driver info interface ─── */
interface AssignedDriver {
  id: string;
  name: string;
  initials: string;
  rating: number;
  trips: number;
  vehicle: string;
  plate: string;
  phone: string;
  etaMin: number;
  lat: number | null;
  lng: number | null;
}

const EMPTY_DRIVER: AssignedDriver = {
  id: "",
  name: "Finding driver...",
  initials: "...",
  rating: 0,
  trips: 0,
  vehicle: "",
  plate: "",
  phone: "",
  etaMin: 0,
  lat: null,
  lng: null,
};

/* ─── Map Section Wrapper ─── */
function MapSection({
  pickupCoords,
  dropoffCoords,
  stopCoords = [],
  driverCoords,
  driverNavigationTarget,
  userLocation,
  routePolyline,
  trafficSegments,
  nearbyDrivers,
  onLocateUser,
  onCenterChanged,
  showUserLocationDot = true,
  compact = false,
  panToCoords,
  suppressAutoViewport = false,
  mapInteractive = true,
  onMapReadyExtra,
  children,
}: {
  pickupCoords?: { lat: number; lng: number } | null;
  dropoffCoords?: { lat: number; lng: number } | null;
  stopCoords?: { lat: number; lng: number }[];
  driverCoords?: { lat: number; lng: number } | null;
  driverNavigationTarget?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  routePolyline?: string | null;
  trafficSegments?: { startPolylinePointIndex: number; endPolylinePointIndex: number; speed: string }[] | null;
  nearbyDrivers?: { lat: number; lng: number }[];
  onLocateUser?: () => void;
  onCenterChanged?: (center: { lat: number; lng: number }) => void;
  showUserLocationDot?: boolean;
  compact?: boolean;
  panToCoords?: { lat: number; lng: number } | null;
  suppressAutoViewport?: boolean;
  mapInteractive?: boolean;
  onMapReadyExtra?: (map: google.maps.Map) => void;
  children?: React.ReactNode;
}) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const locateRequestedRef = useRef(false);

  // When userLocation updates after a locate request, pan the map
  useEffect(() => {
    if (locateRequestedRef.current && mapRef.current && userLocation) {
      mapRef.current.panTo(userLocation);
      mapRef.current.setZoom(15);
      locateRequestedRef.current = false;
    }
  }, [userLocation]);

  // Pan to requested coordinates (e.g. after destination autocomplete selection)
  useEffect(() => {
    if (panToCoords && mapRef.current) {
      mapRef.current.panTo(panToCoords);
      mapRef.current.setZoom(15);
    }
  }, [panToCoords?.lat, panToCoords?.lng]);

  const handleLocateClick = () => {
    locateRequestedRef.current = true;
    if (mapRef.current && userLocation) {
      mapRef.current.panTo(userLocation);
      mapRef.current.setZoom(15);
    }
    onLocateUser?.();
  };

  return (
    <div className={cn(
      "relative w-full overflow-hidden",
      compact ? "absolute inset-0" : "flex-[3] min-h-[200px] max-h-[65vh]"
    )}>
      <div className="absolute inset-0">
        <RideMap
          pickupCoords={pickupCoords || null}
          dropoffCoords={dropoffCoords || null}
          stopCoords={stopCoords}
          driverCoords={driverCoords || null}
          driverNavigationTarget={driverNavigationTarget || null}
          userLocation={userLocation || null}
          nearbyDrivers={nearbyDrivers}
          showUserLocationDot={showUserLocationDot}
          routePolyline={routePolyline || null}
          trafficSegments={trafficSegments}
          onMapReady={(map) => { mapRef.current = map; onMapReadyExtra?.(map); }}
          onCenterChanged={onCenterChanged}
          suppressAutoViewport={suppressAutoViewport}
          mapInteractive={mapInteractive}
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <button type="button"
        onClick={handleLocateClick}
        className="absolute right-3 top-14 z-20 w-10 h-10 rounded-full bg-card shadow-lg shadow-black/10 flex items-center justify-center border border-border/30 backdrop-blur-sm"
        aria-label="Center on my location"
      >
        <Navigation className="w-4 h-4" style={{ color: '#00C853' }} />
      </button>
      {children}
    </div>
  );
}

/* ─── Vehicle Row (for ride-options) ─── */
function VehicleRow({
  vehicle,
  selected,
  onSelect,
  price,
  originalPrice,
  surgeActive,
  useKm = false,
}: {
  vehicle: (typeof DEFAULT_VEHICLE_OPTIONS)[0];
  selected: boolean;
  onSelect: () => void;
  price: number;
  originalPrice?: number;
  surgeActive?: boolean;
  useKm?: boolean;
}) {
  const etaDate = new Date(Date.now() + vehicle.etaMin * 60000);
  const etaHour = etaDate.getHours();
  const etaMin = etaDate.getMinutes();
  const etaAmPm = etaHour >= 12 ? "pm" : "am";
  const etaHour12 = etaHour % 12 || 12;
  const etaStr = `${etaHour12}:${String(etaMin).padStart(2, "0")}${etaAmPm}`;
  const isDiscount = vehicle.surgeMultiplier < 1.0;

  return (
    <button type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3.5 text-left transition-all border-b border-border/10 last:border-0",
        selected
          ? "bg-green-500/8 border-l-4 border-l-green-500"
          : "hover:bg-muted/10 border-l-4 border-l-transparent"
      )}
    >
      <div className="w-[72px] shrink-0 flex items-center justify-center">
        <img
	          src={getVehicleImage(vehicle.id, useKm)}
	          alt={getVehicleName(vehicle.id, vehicle.name, useKm)}
	          className="w-[72px] h-[44px] object-contain"
	          loading="lazy"
	          decoding="async"
	        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-foreground">{getVehicleName(vehicle.id, vehicle.name, useKm)}</span>
          {vehicle.id === "economy" && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary text-foreground dark:text-foreground text-[10px] font-bold">
              <TrendingDown className="w-3 h-3" />
              LOW
            </span>
          )}
          {vehicle.id === "share" && (
            <span className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold",
              useKm
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}>
              {useKm ? <Zap className="w-3 h-3" /> : <Users className="w-3 h-3" />}
              {useKm ? "EV" : "SAVE"}
            </span>
          )}
          {vehicle.id === "comfort" && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary text-foreground dark:text-foreground text-[10px] font-bold">
              <Sparkles className="w-3 h-3" />
              TOP
            </span>
          )}
          {vehicle.id === "ev" && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
              <Zap className="w-3 h-3" />
              EV
            </span>
          )}
          {vehicle.id === "xl" && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold">
              <Users className="w-3 h-3" />
              5+
            </span>
          )}
          {vehicle.id === "black-lane" && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold">
              <Crown className="w-3 h-3" />
              VIP
            </span>
          )}
          {vehicle.id === "black-xl" && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
              <Shield className="w-3 h-3" />
              PREMIUM
            </span>
          )}
          {vehicle.id === "luxury-xl" && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary text-foreground dark:text-foreground text-[10px] font-bold">
              <Gem className="w-3 h-3" />
              ELITE
            </span>
          )}
          {vehicle.id === "pet" && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary text-foreground dark:text-foreground text-[10px] font-bold">
              <PawPrint className="w-3 h-3" />
              PET
            </span>
          )}
          {vehicle.id === "wheelchair" && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
              <Accessibility className="w-3 h-3" />
              WAV
            </span>
          )}
          {vehicle.carSeat && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary text-foreground text-[10px] font-bold">
              <Baby className="w-3 h-3" />
              Car seat
            </span>
          )}
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="text-xs">{getVehicleCapacity(vehicle.id, vehicle.capacity, useKm)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-muted-foreground">{etaStr} · {getVehicleDesc(vehicle.id, vehicle.desc, useKm)}</span>
        </div>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
        {surgeActive && originalPrice && (
          <span className="line-through text-muted-foreground text-xs">{useKm ? dualPrice(originalPrice, true) : `$${originalPrice.toFixed(2)}`}</span>
        )}
        {isDiscount ? (
          <span className="text-sm font-bold text-green-600">🟢 {useKm ? dualPrice(price, true) : `$${price.toFixed(2)}`}</span>
        ) : (
          <span className="text-sm font-bold text-foreground">{useKm ? dualPrice(price, true) : `$${price.toFixed(2)}`}</span>
        )}
        {selected && (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mt-0.5" aria-label="Selected">
            <CheckCircle className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          </div>
        )}
      </div>
    </button>
  );
}

/* ─── Vehicle image map ─── */
const VEHICLE_IMAGES: Record<string, string> = {
  "economy":   "/vehicles/economy-car-v2.png",
  "share":     "/vehicles/share-car-v2.png",
  "comfort":   "/vehicles/comfort-car-v2.png",
  "ev":        "/vehicles/ev-car-v2.png",
  "xl":        "/vehicles/xl-car-v2.png",
  "black-lane": "/vehicles/black-lane-car-v2.png",
  "black-xl":  "/vehicles/black-xl-car-v2.png",
  "luxury-xl": "/vehicles/luxury-car-v2.png",
  "pet":       "/vehicles/pet-car-v2.png",
  "wheelchair": "/vehicles/wheelchair-car-v2.png",
  "moto":      "/vehicles/zivo-moto-v2.png",
};

/* Cambodia-specific overrides */
const CAMBODIA_VEHICLE_IMAGES: Record<string, string> = {
  "economy": "/vehicles/zivo-tuktuk.png",
  "share": "/vehicles/zivo-ev-tuktuk.png",
  "moto": "/vehicles/zivo-moto-v2.png",
};
const CAMBODIA_VEHICLE_NAMES: Record<string, string> = {
  "economy": "ZIVO Tuk Tuk",
  "share": "ZIVO EV Tuk Tuk",
  "moto": "ZIVO Moto",
};
const CAMBODIA_VEHICLE_DESCS: Record<string, string> = {
  "economy": "ការធ្វើដំណើរប្រចាំថ្ងៃតម្លៃសមរម្យ",
  "share": "អគ្គិសនី សូន្យការបំភាយ",
  "comfort": "អ្នកបើកបរល្អបំផុត កន្លែងដាក់ជើងទូលាយ",
  "ev": "អគ្គិសនី សូន្យការបំភាយ",
  "xl": "កន្លែងបន្ថែមសម្រាប់ក្រុម",
  "moto": "ម៉ូតូរហ័សនិងសន្សំសំចៃ",
};
const CAMBODIA_VEHICLE_CAPACITY: Record<string, number> = {
  "economy": 3,
  "share": 3,
  "moto": 1,
};
const CAMBODIA_BOOKING_FEE = 0.13;
const CAMBODIA_PER_KM_KHR = 1550; // KHR per km
const CAMBODIA_PER_MIN_KHR = 50;  // KHR per minute
const KHR_RATE = 4062.5;
const CAMBODIA_PER_MILE_USD = (CAMBODIA_PER_KM_KHR / KHR_RATE) * 1.60934; // convert per-km KHR → per-mile USD
const CAMBODIA_PER_MIN_USD = CAMBODIA_PER_MIN_KHR / KHR_RATE;
const CAMBODIA_EV_TUKTUK_PER_KM_KHR = 1250;
const CAMBODIA_EV_TUKTUK_PER_MILE_USD = (CAMBODIA_EV_TUKTUK_PER_KM_KHR / KHR_RATE) * 1.60934;

/** Get vehicle image based on region */
function getVehicleImage(vehicleId: string, useKm: boolean): string {
  if (useKm && CAMBODIA_VEHICLE_IMAGES[vehicleId]) {
    return CAMBODIA_VEHICLE_IMAGES[vehicleId];
  }
  return VEHICLE_IMAGES[vehicleId] ?? "/vehicles/economy-car.svg";
}

/** Get vehicle display name based on region */
function getVehicleName(vehicleId: string, originalName: string, useKm: boolean): string {
  if (useKm && CAMBODIA_VEHICLE_NAMES[vehicleId]) {
    return CAMBODIA_VEHICLE_NAMES[vehicleId];
  }
  return originalName;
}

/** Get vehicle description based on region */
function getVehicleDesc(vehicleId: string, originalDesc: string, useKm: boolean): string {
  if (useKm && CAMBODIA_VEHICLE_DESCS[vehicleId]) {
    return CAMBODIA_VEHICLE_DESCS[vehicleId];
  }
  return originalDesc;
}

/** Get vehicle capacity based on region */
function getVehicleCapacity(vehicleId: string, originalCapacity: number, useKm: boolean): number {
  if (useKm && CAMBODIA_VEHICLE_CAPACITY[vehicleId]) {
    return CAMBODIA_VEHICLE_CAPACITY[vehicleId];
  }
  return originalCapacity;
}

const etaTime = (minutesFromNow: number) =>
  new Date(Date.now() + minutesFromNow * 60000)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();

/* ─── Stripe Payment Form (inside Elements provider) ─── */
function StripePaymentForm({ onSuccess, isSubmitting, price, vehicleName }: {
  onSuccess: () => void;
  isSubmitting: boolean;
  price: number;
  vehicleName: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMsg(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // fallback — we handle inline
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMsg(error.message || "Payment failed");
      setProcessing(false);
    } else {
      // Payment authorized successfully
      setProcessing(false);
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      {errorMsg && (
        <p className="text-sm text-destructive text-center">{errorMsg}</p>
      )}
      <Button
        type="submit"
        className="w-full h-14 rounded-2xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg gap-2"
        disabled={!stripe || processing || isSubmitting}
      >
        <Shield className="w-5 h-5" />
        {processing ? "Authorizing..." : `Authorize ${dualPrice(price, false)} · ${vehicleName}`}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        Your card will be pre-authorized. Final charge applied after ride completion.
      </p>
    </form>
  );
}

/* ─── Main Component ─── */
export default function RideBookingHome({ initialSchedule = false, initialDestinationAddress, initialDestLat, initialDestLng }: { initialSchedule?: boolean; initialDestinationAddress?: string; initialDestLat?: number; initialDestLng?: number } = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();
  const { getCurrentLocation, isGettingLocation } = useCurrentLocation();
  const [locationPermission, setLocationPermission] = useState<"prompt" | "granted" | "denied" | "checking">("checking");
  const { data: savedLocations = [] } = useSavedLocations(user?.id);
  const { currentLanguage, changeLanguage, t } = useI18n();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const { isCambodia: isCambodiaCountry } = useCountry();
  const { cashAllowed } = usePaymentLocationRestriction();
  const { data: upcomingFlight } = useUpcomingFlightArrival();

  const LANGS = [
    { code: "en", label: "English", flag: "🇺🇸", cc: "US", flagImg: "/flags/us.svg" },
    { code: "km", label: "ខ្មែរ", flag: "🇰🇭", cc: "KH", flagImg: "/flags/kh.svg" },
    { code: "zh", label: "中文", flag: "🇨🇳", cc: "CN", flagImg: "/flags/cn.svg" },
    { code: "ko", label: "한국어", flag: "🇰🇷", cc: "KR", flagImg: "/flags/kr.svg" },
    { code: "ja", label: "日本語", flag: "🇯🇵", cc: "JP", flagImg: "/flags/jp.svg" },
    { code: "vi", label: "Tiếng Việt", flag: "🇻🇳", cc: "VN", flagImg: "/flags/vn.svg" },
    { code: "th", label: "ไทย", flag: "🇹🇭", cc: "TH", flagImg: "/flags/th.svg" },
    { code: "es", label: "Español", flag: "🇪🇸", cc: "ES", flagImg: "/flags/es.svg" },
    { code: "fr", label: "Français", flag: "🇫🇷", cc: "FR", flagImg: "/flags/fr.svg" },
    { code: "de", label: "Deutsch", flag: "🇩🇪", cc: "DE", flagImg: "/flags/de.svg" },
    { code: "it", label: "Italiano", flag: "🇮🇹", cc: "IT", flagImg: "/flags/it.svg" },
    { code: "pt", label: "Português", flag: "🇵🇹", cc: "PT", flagImg: "/flags/pt.svg" },
    { code: "nl", label: "Nederlands", flag: "🇳🇱", cc: "NL", flagImg: "/flags/nl.svg" },
    { code: "pl", label: "Polski", flag: "🇵🇱", cc: "PL", flagImg: "/flags/pl.svg" },
    { code: "no", label: "Norsk", flag: "🇳🇴", cc: "NO", flagImg: "/flags/no.svg" },
    { code: "ru", label: "Русский", flag: "🇷🇺", cc: "RU", flagImg: "/flags/ru.svg" },
    { code: "tr", label: "Türkçe", flag: "🇹🇷", cc: "TR", flagImg: "/flags/tr.svg" },
  ];
  const fallbackPickupCenter = isCambodiaCountry ? CAMBODIA_DEFAULT_CENTER : US_DEFAULT_CENTER;

  // Recent ride destinations from Supabase
  const [recentDestinations, setRecentDestinations] = useState<{ id: string; address: string; lat: number; lng: number; time: string }[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("ride_requests")
      .select("id, dropoff_address, dropoff_lat, dropoff_lng, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRecentDestinations(
            data
              .filter((r: any) => r.dropoff_address && Number.isFinite(Number(r.dropoff_lat)) && Number.isFinite(Number(r.dropoff_lng)))
              .map((r: any) => ({
                id: r.id,
                address: r.dropoff_address,
                lat: Number(r.dropoff_lat),
                lng: Number(r.dropoff_lng),
                time: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              }))
          );
        }
      });
  }, [user?.id]);

  // Auto-set destination from initialDestinationAddress (e.g. from store profile)
  const initialDestAppliedRef = useRef(false);
  useEffect(() => {
    if (!initialDestinationAddress || initialDestAppliedRef.current) return;
    initialDestAppliedRef.current = true;
    
    // If we have exact coordinates from the store, use them directly
    // and auto-advance to confirm drop-off state
    if (initialDestLat && initialDestLng) {
      setDestination({ address: initialDestinationAddress, lat: initialDestLat, lng: initialDestLng });
      setDestinationDisplay(initialDestinationAddress);
      setMapPanTarget({ lat: initialDestLat, lng: initialDestLng });
      setPickupConfirmed(true);
      setViewStep("ride-options");
      setPinPlacementMode(null);
      return;
    }

    (async () => {
      try {
        const { forwardGeocode } = await import("@/services/mapsApi");
        const coords = await forwardGeocode(initialDestinationAddress);
        if (coords) {
          setDestination({ address: initialDestinationAddress, lat: coords.lat, lng: coords.lng });
          setDestinationDisplay(initialDestinationAddress);
          setMapPanTarget(coords);
        } else {
          setDestinationDisplay(initialDestinationAddress);
        }
      } catch {
        setDestinationDisplay(initialDestinationAddress);
      }
    })();
  }, [initialDestinationAddress, initialDestLat, initialDestLng]);

  // Map saved locations to display format
  const savedPlaces = useMemo(() =>
    savedLocations.map((loc) => ({
      id: loc.id,
      name: loc.label,
      address: loc.address,
      lat: loc.lat,
      lng: loc.lng,
      icon: ICON_MAP[loc.icon] || MapPin,
    })),
    [savedLocations]
  );
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [viewStep, setViewStep] = useState<ViewStep>("search");
  const [pickup, setPickup] = useState<PlaceData | null>(null);
  const [destination, setDestination] = useState<PlaceData | null>(null);

  const nearbyCenter = pickup ?? userLocation;
  const [pickupDisplay, setPickupDisplay] = useState("");
  const [destinationDisplay, setDestinationDisplay] = useState("");
  const [mapPanTarget, setMapPanTarget] = useState<{ lat: number; lng: number } | null>(null);

  // Extract city from pickup address for pricing lookup
  const pickupCity = useMemo(() => {
    const addr = pickup?.address?.toLowerCase();
    if (addr) {
      if (addr.includes("new orleans")) return "New Orleans";
      if (addr.includes("baton rouge")) return "Baton Rouge";
      if (addr.includes("phnom penh")) return "Phnom Penh";
      if (addr.includes("siem reap")) return "Siem Reap";
      if (addr.includes("sihanoukville")) return "Sihanoukville";
      if (addr.includes("battambang")) return "Battambang";
      if (addr.includes("cambodia") || addr.includes("កម្ពុជា")) return "Phnom Penh";
    }

    // On fresh open/reopen, pickup address may not be resolved yet.
    // Keep Cambodia users on Cambodia pricing instead of falling back to US defaults.
    if (isCambodiaCountry) return "Phnom Penh";

    return undefined; // falls back to "default" pricing
  }, [pickup?.address, isCambodiaCountry]);

  // Fetch admin-configured pricing from city_pricing table
  const { data: cityPricingMap } = useCityPricing(pickupCity);

  // Nearby places with DB-aware economy pricing
  const { categories: nearbyCategories, loading: nearbyLoading } = useNearbyPlaces(nearbyCenter?.lat ?? null, nearbyCenter?.lng ?? null, cityPricingMap?.["economy"]);

  // Merge DB pricing into vehicle options (admin rates override defaults)
  const vehicleOptions = useMemo(() => {
    const useKm = isCambodiaCountry;
    const hasDbPricing = cityPricingMap && Object.keys(cityPricingMap).length > 0;
    let options = DEFAULT_VEHICLE_OPTIONS;

    if (hasDbPricing) {
      // Use admin-configured DB pricing (source of truth)
      options = DEFAULT_VEHICLE_OPTIONS.map((v) => {
        const dbPricing = cityPricingMap[v.id];
        if (!dbPricing) return v;
        return {
          ...v,
          basePrice: dbPricing.base_fare ?? v.basePrice,
          pricePerMile: dbPricing.per_mile ?? v.pricePerMile,
          perMinute: dbPricing.per_minute ?? v.perMinute,
          bookingFee: dbPricing.booking_fee ?? v.bookingFee,
          minimumFare: dbPricing.minimum_fare ?? v.minimumFare,
          cardFeePct: dbPricing.card_fee_pct ?? 0,
        };
      });
    } else if (useKm) {
      // Fallback: hardcoded Cambodia defaults (only when no DB pricing)
      options = options.map((v) => ({
        ...v,
        basePrice: 0,
        bookingFee: CAMBODIA_BOOKING_FEE,
        pricePerMile: v.id === "share" ? CAMBODIA_EV_TUKTUK_PER_MILE_USD : CAMBODIA_PER_MILE_USD,
        perMinute: CAMBODIA_PER_MIN_USD,
        minimumFare: 0.25,
        surgeMultiplier: 1.0,
      }));
    }
    // Filter: moto only available in Cambodia
    if (!useKm) {
      options = options.filter((v) => v.id !== "moto");
    } else {
      // Cambodia: put moto at the top of the list
      const CAMBODIA_ORDER = ["moto", "economy", "share", "comfort", "ev", "xl", "pet", "wheelchair", "black-lane", "black-xl", "luxury-xl"];
      options = [...options].sort((a, b) => {
        const ai = CAMBODIA_ORDER.indexOf(a.id);
        const bi = CAMBODIA_ORDER.indexOf(b.id);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
    }
    return options;
  }, [cityPricingMap, currentLanguage]);
  const [stops, setStops] = useState<{ id: string; place: PlaceData | null; display: string }[]>([]);
  const stopsRef = useRef(stops);
  stopsRef.current = stops;
  const [selectedVehicle, setSelectedVehicle] = useState("economy");
  const hasAutoSelectedDefaultVehicleRef = useRef(false);
  const [rideRequestId, setRideRequestId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [nearbyDriverCount, setNearbyDriverCount] = useState(0);
  const [searchPhase, setSearchPhase] = useState<"dispatching" | "expanding" | "waiting_response" | "retrying">("dispatching");
  const [searchElapsed, setSearchElapsed] = useState(0);
  const searchStartRef = useRef<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; description: string } | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [selectedCambodiaPayment, setSelectedCambodiaPayment] = useState<CambodiaPaymentMethod>("cash");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [searchSheetY, setSearchSheetY] = useState(-20); // -20 = full, 0 = half, positive = peek
  const searchDragControls = useDragControls();
  const [isReversingGeocode, setIsReversingGeocode] = useState(false);
  const reverseGeocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseGeocodeRequestSeqRef = useRef(0);
  const pickupManuallySet = useRef(false); // true when user selects pickup via autocomplete
  const [pickupConfirmed, setPickupConfirmed] = useState(false); // reactive state for GPS confirm UI
  const mapCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastGeocodedCoordsRef = useRef<string | null>(null); // dedup key to prevent repeat geocoding
  const userHasDraggedHomeMapRef = useRef(false); // tracks if user actually dragged the map in "home" step
  const userHasDraggedPinRef = useRef(false); // tracks if user actually dragged the map during pin placement
  // Pin placement mode: when active, the center pin is used for placing destination or stop
  const [pinPlacementMode, setPinPlacementMode] = useState<"pickup" | "destination" | "stop" | null>(null);
  const [placingStopId, setPlacingStopId] = useState<string | null>(null);

  // New state for enhanced flow
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.0);
  const [rideCategory, setRideCategory] = useState<"popular" | "premium" | "accessible">("popular");
  const [rating, setRating] = useState(0);
  const [tip, setTip] = useState<number | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<AssignedDriver>(EMPTY_DRIVER);

  // Schedule state
  const [showSchedule, setShowSchedule] = useState(initialSchedule);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(new Date());
  const [scheduleHour, setScheduleHour] = useState(() => {
    const h = new Date().getHours();
    return h < 23 ? h + 1 : 0;
  });
  const [scheduleMinute, setScheduleMinute] = useState(0);

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Pick up other state
  const [showPickupOther, setShowPickupOther] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [otherPhone, setOtherPhone] = useState("");

  // Rider info state (pre-filled from profile)
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [pickupNote, setPickupNote] = useState("");

  // Viewport height for dynamic sheet sizing
  const [viewportHeight, setViewportHeight] = useState(800);
  useEffect(() => {
    const updateHeight = () => setViewportHeight(window.innerHeight);
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Lock page scroll for full-screen ride experience
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, []);

  // Layout height constants
  const HEADER_HEIGHT = 56;
  const TABS_HEIGHT = 52;
  const HEADER_TABS_HEIGHT = HEADER_HEIGHT + TABS_HEIGHT;
  const BOTTOM_NAV_HEIGHT = 64;
  const SAFE_BOTTOM = "var(--zivo-safe-bottom,0px)";

  // Route data
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  useEffect(() => {
    if (!vehicleOptions.length) return;

    const selectedStillExists = vehicleOptions.some((vehicle) => vehicle.id === selectedVehicle);
    if (!selectedStillExists) {
      setSelectedVehicle(vehicleOptions[0].id);
      return;
    }

    if (
      !hasAutoSelectedDefaultVehicleRef.current &&
      isCambodiaCountry &&
      selectedVehicle === "economy" &&
      vehicleOptions.some((vehicle) => vehicle.id === "moto")
    ) {
      hasAutoSelectedDefaultVehicleRef.current = true;
      setSelectedVehicle("moto");
      return;
    }

    hasAutoSelectedDefaultVehicleRef.current = true;
  }, [vehicleOptions, isCambodiaCountry, selectedVehicle]);

  const COLLAPSED_SHEET_HEIGHT = 330 + stops.length * 56 + (routeData ? 48 : 0);
  const EXPANDED_SHEET_HEIGHT = Math.min(viewportHeight * 0.62, 560); // kept for future use
  const SEARCH_SHEET_EXPANDED_Y = -20;
  const SEARCH_SHEET_COLLAPSED_Y = Math.min(Math.max(viewportHeight * 0.30, 140), 260);

  useEffect(() => {
    if (viewStep === "search" && !pinPlacementMode) {
      setSearchSheetY(SEARCH_SHEET_EXPANDED_Y);
    }
  }, [viewStep, pinPlacementMode]);

  const handleSearchSheetDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Snap based on velocity first, then position
    if (info.velocity.y > 300) {
      setSearchSheetY(SEARCH_SHEET_COLLAPSED_Y);
    } else if (info.velocity.y < -300) {
      setSearchSheetY(SEARCH_SHEET_EXPANDED_Y);
    } else if (info.offset.y > 40) {
      setSearchSheetY(SEARCH_SHEET_COLLAPSED_Y);
    } else if (info.offset.y < -40) {
      setSearchSheetY(SEARCH_SHEET_EXPANDED_Y);
    } else {
      // Snap to nearest
      const mid = (SEARCH_SHEET_EXPANDED_Y + SEARCH_SHEET_COLLAPSED_Y) / 2;
      setSearchSheetY(searchSheetY > mid ? SEARCH_SHEET_COLLAPSED_Y : SEARCH_SHEET_EXPANDED_Y);
    }
  }, [searchSheetY, SEARCH_SHEET_COLLAPSED_Y, SEARCH_SHEET_EXPANDED_Y]);

  // Driver tracking - real-time from Supabase
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [driverEta, setDriverEta] = useState(0);
  const trackingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [realNearbyDrivers, setRealNearbyDrivers] = useState<{ lat: number; lng: number }[]>([]);

  // Subscribe to real-time driver location
  const { location: liveDriverLocation } = useDriverLocation(
    (viewStep === "driver-assigned" || viewStep === "driver-en-route" || viewStep === "trip-in-progress") ? assignedDriver.id || null : null
  );

  // Broadcast customer's live GPS to driver during active ride
  const isRideLive = ["searching", "driver-assigned", "driver-en-route", "trip-in-progress"].includes(viewStep);
  useCustomerLocationBroadcast({
    tripId: isRideLive ? activeJobId : null,
    enabled: isRideLive && Boolean(activeJobId),
  });

  // Sync live driver location to driverCoords
  useEffect(() => {
    if (liveDriverLocation) {
      setDriverCoords({ lat: liveDriverLocation.lat, lng: liveDriverLocation.lng });
      // Calculate live ETA based on distance
      const target = viewStep === "trip-in-progress" ? destination : pickup;
      if (target) {
        const dist = haversineKm(liveDriverLocation.lat, liveDriverLocation.lng, target.lat, target.lng);
        const speedKmh = liveDriverLocation.speed && liveDriverLocation.speed > 0 ? liveDriverLocation.speed * 3.6 : 30;
        setDriverEta(Math.max(1, Math.round((dist / speedKmh) * 60)));
      }
    }
  }, [liveDriverLocation, viewStep, pickup, destination]);

  // Check GPS permission on mount
  useEffect(() => {
    if (isCambodiaCountry) {
      setLocationPermission("granted");
      return;
    }
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        if (result.state === "granted") setLocationPermission("granted");
        else if (result.state === "denied") setLocationPermission("denied");
        else setLocationPermission("prompt");
        result.onchange = () => {
          if (result.state === "granted") setLocationPermission("granted");
          else if (result.state === "denied") setLocationPermission("denied");
        };
      }).catch(() => setLocationPermission("prompt"));
    } else {
      // Fallback: try getting location directly
      setLocationPermission("prompt");
    }
  }, [isCambodiaCountry]);


  // Request GPS when user allows
  const handleAllowLocation = useCallback(() => {
    setLocationPermission("checking");
    getCurrentLocation()
      .then((loc) => {
        setUserLocation({ lat: loc.lat, lng: loc.lng });
        setLocationPermission("granted");
      })
      .catch(() => {
        setLocationPermission("denied");
        setUserLocation(US_DEFAULT_CENTER);
        toast.error("Location access denied. You can set pickup manually.");
      });
  }, [getCurrentLocation]);

  // Keep map region aligned to selected language mode + auto-set pickup from GPS
  const hasInitializedRegion = useRef(false);
  useEffect(() => {
    let cancelled = false;

    if (isCambodiaCountry) {
      // Only clear locations on FIRST mount, not on every re-render
      if (!hasInitializedRegion.current) {
        hasInitializedRegion.current = true;
        setUserLocation(CAMBODIA_DEFAULT_CENTER);
      }
      return () => { cancelled = true; };
    }

    // Only auto-fetch if permission already granted
    if (locationPermission === "granted") {
      getCurrentLocation()
        .then((loc) => {
          if (!cancelled) {
            setUserLocation({ lat: loc.lat, lng: loc.lng });
          }
        })
        .catch(() => {
          if (!cancelled) setUserLocation(US_DEFAULT_CENTER);
        });
    }

    return () => { cancelled = true; };
  }, [isCambodiaCountry, getCurrentLocation, locationPermission]);

  // Fetch real nearby drivers and poll every 10s
  useEffect(() => {
    const center = pickup || userLocation;
    if (!center) return;

    const fetchNearby = async () => {
      if (import.meta.env.DEV) console.log("[NearbyDrivers] Searching around:", center.lat, center.lng, "radius: 15000m");
      
      // Also check raw drivers_status for debugging
      const { data: rawStatus } = await supabase
        .from("drivers_status")
        .select("driver_id, lat, lng, is_online, is_busy, driver_state")
        .eq("is_online", true)
        .limit(10);
      if (import.meta.env.DEV) console.log("[NearbyDrivers] Raw online drivers_status:", rawStatus);

      const { data, error } = await supabase.rpc("get_nearby_drivers", {
        p_lat: center.lat,
        p_lng: center.lng,
        p_radius_m: 15000,
        p_limit: 20,
      });
      if (error) {
        console.error("[NearbyDrivers] RPC error:", error);
        return;
      }
      if (import.meta.env.DEV) console.log("[NearbyDrivers] RPC returned:", data?.length, "drivers", data);
      if (data) {
        setRealNearbyDrivers(data.map((d: any) => ({ lat: d.lat, lng: d.lng })));
      }
    };

    fetchNearby();
    const interval = setInterval(fetchNearby, 10000);
    return () => clearInterval(interval);
  }, [pickup?.lat, pickup?.lng, userLocation?.lat, userLocation?.lng]);

  // Auto-advance: searching → driver-assigned — dispatch via jobs + job_offers system
  useEffect(() => {
    if (viewStep !== "searching") return;
    let cancelled = false;
    let jobId: string | null = null;
    let unsubscribeJobUpdates: (() => void) | null = null;

    // Reset search phase & elapsed timer
    setSearchPhase("dispatching");
    setSearchElapsed(0);
    searchStartRef.current = Date.now();
    const elapsedTimer = setInterval(() => {
      setSearchElapsed(Math.floor((Date.now() - searchStartRef.current) / 1000));
    }, 1000);

    const dispatchRide = async () => {
      if (!pickup || !destination || !user) return;

      // 1. Create a job row for the dispatch system
      // Check if this is an airport pickup linked to a flight booking
      const flightData = buildFlightPickupJobData(upcomingFlight, pickup.address);

      const { data: jobData, error: jobError } = await supabase.from("jobs").insert({
        customer_id: user.id,
        job_type: "ride" as any,
        status: "requested" as any,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: destination.address,
        dropoff_lat: destination.lat,
        dropoff_lng: destination.lng,
        estimated_miles: routeData?.distance_miles ?? null,
        estimated_minutes: routeData?.duration_minutes ?? null,
        price_total: currentPrice ?? null,
        pricing_total_estimate: currentPrice ?? null,
        requested_at: new Date().toISOString(),
        notes: rideRequestId ? `ride_request:${rideRequestId}` : null,
        ...flightData,
      } as any).select("id").single();

      if (jobError || !jobData) {
        console.error("[Dispatch] Job creation error:", jobError);
        if (!cancelled) {
          toast.error("Failed to create ride request. Please try again.");
        }
        return;
      }

      jobId = jobData.id;
      setActiveJobId(jobId);
      if (import.meta.env.DEV) console.log("[Dispatch] Job created:", jobId);

      // 2. Subscribe to job updates (driver acceptance)
      unsubscribeJobUpdates = subscribeToPooledPostgresChanges(
        {
          poolKey: `job-assignment:${jobId}`,
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${jobId}`,
        },
        async (payload) => {
          const updatedJob = payload.new as any;
          if (cancelled) return;

          if (
            updatedJob.assigned_driver_id &&
            !["canceled", "cancelled", "completed"].includes(updatedJob.status)
          ) {
            // Driver accepted! Fetch driver details
            const { data: driverRow } = await supabase
              .from("drivers")
              .select("id, full_name, rating, total_trips, vehicle_model, vehicle_color, vehicle_plate, phone, current_lat, current_lng")
              .or(`id.eq.${updatedJob.assigned_driver_id},user_id.eq.${updatedJob.assigned_driver_id}`)
              .maybeSingle();

            if (driverRow && !cancelled) {
              const firstName = driverRow.full_name?.split(" ")[0] || "Driver";
              const lastInitial = driverRow.full_name?.split(" ")[1]?.[0] || "";
              const initials = `${firstName[0]}${lastInitial}`.toUpperCase();
              const vehicleDesc = [driverRow.vehicle_color, driverRow.vehicle_model].filter(Boolean).join(" ");

              let eta = 5;
              if (driverRow.current_lat && driverRow.current_lng && pickup) {
                const distKm = haversineKm(driverRow.current_lat, driverRow.current_lng, pickup.lat, pickup.lng);
                eta = Math.max(1, Math.round(distKm / 0.5));
              }

              const driverData: AssignedDriver = {
                id: driverRow.id,
                name: `${firstName} ${lastInitial}.`,
                initials,
                rating: driverRow.rating ?? 0,
                trips: driverRow.total_trips ?? 0,
                vehicle: vehicleDesc || "Vehicle",
                plate: driverRow.vehicle_plate || "",
                phone: driverRow.phone || "",
                etaMin: eta,
                lat: driverRow.current_lat ?? pickup.lat,
                lng: driverRow.current_lng ?? pickup.lng,
              };

              // Link driver to ride_request too
              if (rideRequestId) {
                await supabase.from("ride_requests").update({
                  status: "driver_assigned",
                  assigned_driver_id: driverRow.id,
                } as any).eq("id", rideRequestId);
              }

              setAssignedDriver(driverData);
              setDriverEta(driverData.etaMin);
              if (driverData.lat && driverData.lng) {
                setDriverCoords({ lat: driverData.lat, lng: driverData.lng });
              }
              setViewStep("driver-assigned");
              toast("Driver Found! 🚗", { description: `${driverData.name} is on the way. Arriving in ~${driverData.etaMin} min.` });
            }
          }
        }
      );

      // 3. Call dispatch-start edge function to find and notify a driver
      if (!cancelled) setSearchPhase("waiting_response");
      const { error: dispatchError } = await supabase.functions.invoke("dispatch-start", {
        body: { job_id: jobId, offer_ttl_seconds: 30, radius_meters: 15000 },
      });

      if (dispatchError) {
        console.error("[Dispatch] dispatch-start error:", dispatchError);
      }

      // 4. Retry dispatch every 15s if no driver assigned yet
      const retryInterval = setInterval(async () => {
        if (cancelled || !jobId) {
          clearInterval(retryInterval);
          return;
        }
        // Check if already assigned
        const { data: currentJob } = await supabase
          .from("jobs")
          .select("assigned_driver_id, status")
          .eq("id", jobId)
          .maybeSingle();

        if (currentJob?.assigned_driver_id) {
          clearInterval(retryInterval);
          return;
        }

        if (currentJob && ["canceled", "completed"].includes(currentJob.status)) {
          clearInterval(retryInterval);
          return;
        }

        // Retry dispatch with expanded radius
        if (!cancelled) setSearchPhase("expanding");
        if (import.meta.env.DEV) console.log("[Dispatch] Retrying dispatch for job:", jobId);
        await supabase.functions.invoke("dispatch-start", {
          body: { job_id: jobId, offer_ttl_seconds: 30, radius_meters: 25000 },
        });
        if (!cancelled) setSearchPhase("retrying");
      }, 15000);

      // Timeout after 90s
      setTimeout(() => {
        if (!cancelled && viewStep === "searching") {
          clearInterval(retryInterval);
          toast.error("No drivers found. Please try again later.");
        }
      }, 90000);

      // Store interval for cleanup
      (window as any).__dispatchRetryInterval = retryInterval;
    };

    dispatchRide();

    return () => {
      cancelled = true;
      clearInterval(elapsedTimer);
      if (unsubscribeJobUpdates) unsubscribeJobUpdates();
      if ((window as any).__dispatchRetryInterval) {
        clearInterval((window as any).__dispatchRetryInterval);
      }
    };
  }, [viewStep, rideRequestId, pickup, destination, user]);

  // Auto-advance: driver-assigned → driver-en-route after 5s
  useEffect(() => {
    if (viewStep !== "driver-assigned") return;
    setDriverEta(assignedDriver.etaMin);
    const t = setTimeout(() => {
      setViewStep("driver-en-route");
      toast("Driver En Route 🚗", { description: "Your driver is heading to your pickup location." });
    }, 5000);
    return () => clearTimeout(t);
  }, [viewStep, assignedDriver.etaMin]);

  // Driver en-route: monitor real location, detect arrival at pickup
  useEffect(() => {
    if (viewStep !== "driver-en-route") return;
    if (!pickup || !liveDriverLocation) return;

    const dist = haversineKm(liveDriverLocation.lat, liveDriverLocation.lng, pickup.lat, pickup.lng);
    // Driver arrived at pickup (within 100m)
    if (dist < 0.1) {
      toast("Driver Arrived! 📍", { description: "Your driver has arrived at the pickup point." });
      setViewStep("trip-in-progress");
      if (rideRequestId) {
        supabase.from("ride_requests").update({ status: "in_progress" }).eq("id", rideRequestId);
      }
    }
  }, [viewStep, pickup, liveDriverLocation, rideRequestId]);

  // Trip in-progress: monitor real location, detect arrival at destination
  useEffect(() => {
    if (viewStep !== "trip-in-progress") return;
    if (!destination || !liveDriverLocation) return;

    const dist = haversineKm(liveDriverLocation.lat, liveDriverLocation.lng, destination.lat, destination.lng);
    // Driver arrived at destination (within 150m)
    if (dist < 0.15) {
      toast.success("Trip Complete! 🎉", { description: "You've arrived at your destination. Rate your ride!" });
      setViewStep("trip-complete");
      if (rideRequestId) {
        supabase.functions.invoke("complete-ride-request", {
          body: { ride_request_id: rideRequestId },
        }).then(({ data, error }) => {
          if (error || (data as any)?.error) {
            console.error("[RideBooking] complete ride failed:", error || (data as any)?.error);
            return;
          }
          if ((data as any)?.manual_driver_payout_required) {
            console.info("[RideBooking] Bakong driver payout pending", data);
          }
        });
      }
    }
  }, [viewStep, destination, liveDriverLocation, rideRequestId]);

  const handleLocateUser = useCallback(() => {
    if (isCambodiaCountry) {
      // In Cambodia mode, use GPS but fall back to Phnom Penh
      getCurrentLocation()
        .then((loc) => {
          // Only use GPS if actually in Cambodia region
          if (loc.lat >= 9.5 && loc.lat <= 14.7) {
            setUserLocation({ lat: loc.lat, lng: loc.lng });
          } else {
            setUserLocation(CAMBODIA_DEFAULT_CENTER);
          }
        })
        .catch(() => setUserLocation(CAMBODIA_DEFAULT_CENTER));
      return;
    }
    getCurrentLocation()
      .then((loc) => setUserLocation({ lat: loc.lat, lng: loc.lng }))
      .catch(() => toast.error("Could not get your location"));
  }, [currentLanguage, getCurrentLocation]);

  const resolvePickupAddress = useCallback((coords: { lat: number; lng: number }) => {
    reverseGeocode(coords.lat, coords.lng)
      .then((addr) => {
        setPickup((prev) => {
          if (!prev) return prev;
          const sameCoords = Math.abs(prev.lat - coords.lat) < 0.00001 && Math.abs(prev.lng - coords.lng) < 0.00001;
          return sameCoords ? { ...prev, address: addr } : prev;
        });
        setPickupDisplay(addr);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pickup) return;
    const currentLocationLabel = t("ride.current_location");
    if (pickup.address !== currentLocationLabel && pickup.address !== "Current Location") return;
    resolvePickupAddress({ lat: pickup.lat, lng: pickup.lng });
  }, [pickup?.address, pickup?.lat, pickup?.lng, resolvePickupAddress, t]);

  /** When user drags map, keep the center pin as the source of truth */
  const handleMapCenterChanged = useCallback((center: { lat: number; lng: number }) => {
    mapCenterRef.current = center;

    // Dedup: skip if coords haven't meaningfully changed (~50m threshold)
    const coordKey = `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`;
    if (lastGeocodedCoordsRef.current === coordKey) return;

    if (viewStep === "home") {
      // In home step, only update destination if user has actually dragged the map
      // Skip programmatic pans and initial idle events
      if (!userHasDraggedHomeMapRef.current) return;
      if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
      const requestSeq = ++reverseGeocodeRequestSeqRef.current;
      reverseGeocodeTimerRef.current = setTimeout(async () => {
        const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`;
        if (lastGeocodedCoordsRef.current === key) return;
        lastGeocodedCoordsRef.current = key;
        setIsReversingGeocode(true);
        try {
          const address = await reverseGeocode(center.lat, center.lng);
          if (reverseGeocodeRequestSeqRef.current !== requestSeq) return;
          setDestination({ address, lat: center.lat, lng: center.lng });
          setDestinationDisplay(address);
        } catch {
          if (reverseGeocodeRequestSeqRef.current !== requestSeq) return;
          const fallback = `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`;
          setDestination({ address: fallback, lat: center.lat, lng: center.lng });
          setDestinationDisplay(fallback);
        } finally {
          if (reverseGeocodeRequestSeqRef.current === requestSeq) {
            setIsReversingGeocode(false);
          }
        }
      }, 600);
      return;
    }

    if (viewStep !== "search") return;

    // Stop pin placement mode — update the stop being placed
    if (pinPlacementMode === "stop" && placingStopId) {
      if (!userHasDraggedPinRef.current) return;
      if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
      const requestSeq = ++reverseGeocodeRequestSeqRef.current;
      reverseGeocodeTimerRef.current = setTimeout(async () => {
        const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`;
        if (lastGeocodedCoordsRef.current === key) return;
        lastGeocodedCoordsRef.current = key;
        setIsReversingGeocode(true);
        try {
          const address = await reverseGeocode(center.lat, center.lng);
          if (reverseGeocodeRequestSeqRef.current !== requestSeq) return;
          setStops(prev => prev.map(s => s.id === placingStopId ? { ...s, place: { address, lat: center.lat, lng: center.lng }, display: address } : s));
        } catch {
          if (reverseGeocodeRequestSeqRef.current !== requestSeq) return;
          const fallback = `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`;
          setStops(prev => prev.map(s => s.id === placingStopId ? { ...s, place: { address: fallback, lat: center.lat, lng: center.lng }, display: fallback } : s));
        } finally {
          if (reverseGeocodeRequestSeqRef.current === requestSeq) {
            setIsReversingGeocode(false);
          }
        }
      }, 600);
      return;
    }

    // In pin placement mode for pickup, dragging updates the pickup
    if (pinPlacementMode === "pickup") {
      if (!userHasDraggedPinRef.current) return;
      if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
      const requestSeq = ++reverseGeocodeRequestSeqRef.current;

      setPickup(prev => ({
        address: prev?.address || `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`,
        lat: center.lat,
        lng: center.lng,
      }));

      reverseGeocodeTimerRef.current = setTimeout(async () => {
        const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`;
        if (lastGeocodedCoordsRef.current === key) return;
        lastGeocodedCoordsRef.current = key;
        setIsReversingGeocode(true);
        try {
          const address = await reverseGeocode(center.lat, center.lng);
          if (reverseGeocodeRequestSeqRef.current !== requestSeq) return;
          setPickup({ address, lat: center.lat, lng: center.lng });
          setPickupDisplay(address);
        } catch {
          if (reverseGeocodeRequestSeqRef.current !== requestSeq) return;
          const fallback = `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`;
          setPickup({ address: fallback, lat: center.lat, lng: center.lng });
          setPickupDisplay(fallback);
        } finally {
          if (reverseGeocodeRequestSeqRef.current === requestSeq) {
            setIsReversingGeocode(false);
          }
        }
      }, 350);
      return;
    }

    // In pin placement mode for destination, dragging updates the destination
    if (pinPlacementMode === "destination") {
      if (!userHasDraggedPinRef.current) return;
      if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
      const requestSeq = ++reverseGeocodeRequestSeqRef.current;

      // Immediately update coordinates so the confirm button is enabled and UI feels responsive
      setDestination(prev => ({
        address: prev?.address || `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`,
        lat: center.lat,
        lng: center.lng,
      }));

      reverseGeocodeTimerRef.current = setTimeout(async () => {
        const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`;
        if (lastGeocodedCoordsRef.current === key) return;
        lastGeocodedCoordsRef.current = key;
        setIsReversingGeocode(true);
        try {
          const address = await reverseGeocode(center.lat, center.lng);
          if (reverseGeocodeRequestSeqRef.current !== requestSeq) return;
          setDestination({ address, lat: center.lat, lng: center.lng });
          setDestinationDisplay(address);
        } catch {
          if (reverseGeocodeRequestSeqRef.current !== requestSeq) return;
          const fallback = `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`;
          setDestination({ address: fallback, lat: center.lat, lng: center.lng });
          setDestinationDisplay(fallback);
        } finally {
          if (reverseGeocodeRequestSeqRef.current === requestSeq) {
            setIsReversingGeocode(false);
          }
        }
      }, 350);
      return;
    }

    // No pin placement mode active in search view:
    // still allow pickup dragging until pickup is confirmed.
    if (!pinPlacementMode && pickupConfirmed) return;

    // Pickup not yet confirmed — dragging map updates pickup
    setPickupConfirmed(false);
    if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
    const requestSeq = ++reverseGeocodeRequestSeqRef.current;
    reverseGeocodeTimerRef.current = setTimeout(async () => {
      if (pickupManuallySet.current || pickupConfirmed) return;

      const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`;
      if (lastGeocodedCoordsRef.current === key) return;
      lastGeocodedCoordsRef.current = key;

      setIsReversingGeocode(true);
      try {
        if (pickupManuallySet.current || pickupConfirmed) return;
        const address = await reverseGeocode(center.lat, center.lng);
        if (reverseGeocodeRequestSeqRef.current !== requestSeq || pickupManuallySet.current || pickupConfirmed) return;
        setPickup({ address, lat: center.lat, lng: center.lng });
        setPickupDisplay(address);
      } catch {
        if (reverseGeocodeRequestSeqRef.current !== requestSeq || pickupManuallySet.current || pickupConfirmed) return;
        const fallbackAddress = `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`;
        setPickup({ address: fallbackAddress, lat: center.lat, lng: center.lng });
        setPickupDisplay(fallbackAddress);
      } finally {
        if (reverseGeocodeRequestSeqRef.current === requestSeq) {
          setIsReversingGeocode(false);
        }
      }
    }, 600);
  }, [viewStep, pickupConfirmed, pinPlacementMode, placingStopId]);

  const handleConfirmPickupFromPin = useCallback(async () => {
    const coords = mapCenterRef.current ?? pickup ?? userLocation ?? fallbackPickupCenter;
    const fallbackAddress = pickupDisplay || pickup?.address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;

    pickupManuallySet.current = true;
    setPickupConfirmed(true);
    if (reverseGeocodeTimerRef.current) {
      clearTimeout(reverseGeocodeTimerRef.current);
      reverseGeocodeTimerRef.current = null;
    }

    setPickup({ address: fallbackAddress, lat: coords.lat, lng: coords.lng });
    setPickupDisplay(fallbackAddress);
    setIsReversingGeocode(true);

    try {
      const address = await reverseGeocode(coords.lat, coords.lng);
      setPickup({ address, lat: coords.lat, lng: coords.lng });
      setPickupDisplay(address);
    } catch {
      setPickup({ address: fallbackAddress, lat: coords.lat, lng: coords.lng });
      setPickupDisplay(fallbackAddress);
    } finally {
      setIsReversingGeocode(false);
    }
  }, [pickup, pickupDisplay, userLocation, fallbackPickupCenter]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const useKm = useMemo(() => isInCambodia(pickup?.address, pickup?.lat) || isCambodiaCountry || currentLanguage === "km", [pickup?.address, pickup?.lat, isCambodiaCountry, currentLanguage]);
  const rideCountry = useKm ? "kh" : undefined;
  const locationModeKey = rideCountry ?? "global";

  const currentVehicle = vehicleOptions.find((v) => v.id === selectedVehicle) ?? vehicleOptions[0];
  const currentPrice = routeData
    ? calcPrice(currentVehicle, routeData.distance_miles, routeData.duration_minutes, surgeMultiplier)
    : calcPrice(currentVehicle, 0, 0, surgeMultiplier);

  const handleApplyPromo = useCallback(async () => {
    if (!promoInput.trim()) return;
    setPromoValidating(true);
    setPromoError(null);
    const code = promoInput.trim().toUpperCase();

    // FREE promo: 100% off, USA rides only
    if (code === "FREE") {
      if (useKm) {
        setPromoError("This promo code is only available for rides in the USA");
        setPromoValidating(false);
        return;
      }
      setAppliedPromo({ code: "FREE", description: "100% discount — Free ride!" });
      setPromoDiscount(currentPrice);
      toast.success("FREE promo applied — enjoy your free ride!");
      setPromoValidating(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("validate_ride_promo" as any, {
        p_code: code,
        p_user_id: user?.id || "",
        p_fare_amount: currentPrice,
      });
      if (error || !data || !(data as any).valid) {
        setPromoError((data as any)?.error || error?.message || "Invalid promo code");
      } else {
        const d = data as any;
        const discountAmt = Number(d.discount_amount) || 0;
        setAppliedPromo({ code, description: d.description || `${code} applied` });
        setPromoDiscount(Math.min(discountAmt, currentPrice));
        toast.success(`Promo ${code} applied!`);
      }
    } catch {
      setPromoError("Unable to validate promo code");
    } finally {
      setPromoValidating(false);
    }
  }, [promoInput, currentPrice, user?.id, user?.email]);

  /* ─── Back navigation ─── */
  const handleBack = () => {
    if (viewStep === "search") {
      // If in pin placement mode, exit it first instead of going all the way back to home
      if (pinPlacementMode) {
        setPinPlacementMode(null);
        setPlacingStopId(null);
        return;
      }
      setViewStep("home");
    }
    else if (viewStep === "route-preview") setViewStep("search");
    else if (viewStep === "rider-info") setViewStep("search");
    else if (viewStep === "ride-options") setViewStep(useKm ? "rider-info" : "search");
    else if (viewStep === "confirm-ride") setViewStep("ride-options");
    else if (
      viewStep === "driver-assigned" ||
      viewStep === "driver-en-route" ||
      viewStep === "trip-in-progress"
    ) {
      toast.info("Trip in progress");
    } else {
      navigate("/");
    }
  };

  const isSameLocation = useCallback((a: PlaceData | null, b: PlaceData | null) => {
    if (!a || !b) return false;
    // Very tight radius (~50m) for coordinate match
    const sameCoords = Math.abs(a.lat - b.lat) < 0.0005 && Math.abs(a.lng - b.lng) < 0.0005;
    if (sameCoords) return true;
    // Only match addresses if they're essentially identical (not substring)
    const normA = a.address.trim().toLowerCase().replace(/[,.\s]+/g, " ");
    const normB = b.address.trim().toLowerCase().replace(/[,.\s]+/g, " ");
    return normA === normB;
  }, []);

  const handlePickupSelect = useCallback((place: PlaceData) => {
    pickupManuallySet.current = true;
    setPickupConfirmed(true);
    if (reverseGeocodeTimerRef.current) {
      clearTimeout(reverseGeocodeTimerRef.current);
      reverseGeocodeTimerRef.current = null;
    }
    setIsReversingGeocode(false);
    setPickup(place);
    setPickupDisplay(place.address);
  }, []);

  const ensureAutoPickup = useCallback(() => {
    if (pickup) return pickup;

    const coords = userLocation ?? fallbackPickupCenter;
    const currentLocationLabel = t("ride.current_location") || "Current Location";
    const trimmedPickupDisplay = pickupDisplay.trim();
    const pickupLooksLikeDestination = !!destination && (
      trimmedPickupDisplay === destination.address ||
      trimmedPickupDisplay === destinationDisplay
    );

    const autoPickup = {
      address: trimmedPickupDisplay && !pickupLooksLikeDestination ? trimmedPickupDisplay : currentLocationLabel,
      lat: coords.lat,
      lng: coords.lng,
    };

    setPickup(autoPickup);
    setPickupDisplay(autoPickup.address);
    return autoPickup;
  }, [pickup, userLocation, fallbackPickupCenter, t, pickupDisplay, destination, destinationDisplay]);

  const handleDestinationSelect = useCallback((place: PlaceData) => {
    if (reverseGeocodeTimerRef.current) {
      clearTimeout(reverseGeocodeTimerRef.current);
      reverseGeocodeTimerRef.current = null;
    }
    setIsReversingGeocode(false);
    setDestination(place);
    setDestinationDisplay(place.address);

    // Update dedup ref so map drag doesn't immediately overwrite the selected destination
    lastGeocodedCoordsRef.current = `${place.lat.toFixed(4)},${place.lng.toFixed(4)}`;

    // Auto-confirm pickup from existing pickup/GPS — never from the destination-centered map
    if (!pickup) {
      ensureAutoPickup();
    }
    setPickupConfirmed(true);
    setViewStep("search");
    setPinPlacementMode("destination");
    userHasDraggedPinRef.current = false; // reset — require user to drag before updating
    setDestinationDisplay("");

    // Pan map to destination so user can fine-tune with the "D" pin
    setMapPanTarget({ lat: place.lat, lng: place.lng });
  }, [pickup, ensureAutoPickup]);
  /* ─── Multi-stop management ─── */
  const MAX_STOPS = 1;
  const handleAddStop = useCallback(() => {
    if (stops.length >= MAX_STOPS) {
      toast.error(`Maximum ${MAX_STOPS} stops allowed`);
      return;
    }
    const newId = Date.now().toString();
    setViewStep("search");
    setStops(prev => [...prev, { id: newId, place: null, display: "" }]);
    setPlacingStopId(newId);
    setPinPlacementMode("stop");
    lastGeocodedCoordsRef.current = null; // reset dedup so map drag immediately starts geocoding
    userHasDraggedPinRef.current = false; // require user to drag before setting stop address
  }, [stops.length]);

  // Stop management — NOT wrapped in useCallback so they always use latest state
  const handleStopSelect = (stopId: string, place: PlaceData) => {
    const updatedStops = stops.map(s => s.id === stopId ? { ...s, place, display: place.address } : s);
    setStops(updatedStops);
    
    // Immediately re-fetch route with the updated stops
    const currentPickup = pickup;
    const currentDest = destination;
    if (import.meta.env.DEV) console.log("[handleStopSelect] pickup:", currentPickup?.address, "dest:", currentDest?.address, "place:", place.address);
    
    if (currentPickup && currentDest && place.lat && place.lng) {
      const wp = updatedStops
        .filter(s => s.place && s.place.lat && s.place.lng)
        .map(s => ({ lat: s.place!.lat, lng: s.place!.lng }));
      
      if (import.meta.env.DEV) console.log("[handleStopSelect] Re-fetching with", wp.length, "waypoints");
      fetchRoute(currentPickup, currentDest, wp);
    } else {
      console.warn("[handleStopSelect] Missing pickup or destination, skipping route fetch");
    }
  };

  const handleRemoveStop = (stopId: string) => {
    const updatedStops = stops.filter(s => s.id !== stopId);
    setStops(updatedStops);
    
    if (pickup && destination) {
      const wp = updatedStops
        .filter(s => s.place && s.place.lat && s.place.lng)
        .map(s => ({ lat: s.place!.lat, lng: s.place!.lng }));
      fetchRoute(pickup, destination, wp);
    }
  };

  /** Confirm the current pin placement (destination or stop) and return to normal search */
  const handleConfirmPinPlacement = useCallback(async () => {
    reverseGeocodeRequestSeqRef.current += 1;
    if (reverseGeocodeTimerRef.current) {
      clearTimeout(reverseGeocodeTimerRef.current);
      reverseGeocodeTimerRef.current = null;
    }
    setIsReversingGeocode(false);

    if (pinPlacementMode === "stop" && placingStopId) {
      // Stop was placed — exit pin placement
      setPinPlacementMode(null);
      setPlacingStopId(null);
    } else if (pinPlacementMode === "destination") {
      if (!destination && destinationDisplay.trim().length >= 3) {
        const typedDestination = destinationDisplay.trim();
        setIsLoadingRoute(true);
        try {
          const coords = await forwardGeocode(typedDestination);
          if (!coords) {
            toast.error("Please choose a destination from the suggestions");
            return;
          }
          setDestination({ address: typedDestination, lat: coords.lat, lng: coords.lng });
          setDestinationDisplay(typedDestination);
        } finally {
          setIsLoadingRoute(false);
        }
      }
      setPinPlacementMode(null);
    } else if (pinPlacementMode === "pickup") {
      setPinPlacementMode(null);
    }
  }, [pinPlacementMode, placingStopId, destination, destinationDisplay]);

  const handleSavedPlace = (address: string, lat: number, lng: number) => {
    setDestinationDisplay(address);
    setDestination({ address, lat, lng });

    // If pickup is already confirmed, don't change it — just fetch route
    if (pickupConfirmed && pickup && pickup.lat && pickup.lng) {
      fetchRoute(pickup, { address, lat, lng });
      return;
    }

    // Set pickup from user's GPS location (not map center which may be at the destination)
    const coords = userLocation ?? fallbackPickupCenter;
    setPickupConfirmed(true);
    pickupManuallySet.current = true;

    // Reverse geocode the pickup location
    reverseGeocode(coords.lat, coords.lng)
      .then((addr) => {
        const pickupData = { address: addr, lat: coords.lat, lng: coords.lng };
        setPickup(pickupData);
        setPickupDisplay(addr);
        fetchRoute(pickupData, { address, lat, lng });
      })
      .catch(() => {
        const fallback = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
        const pickupData = { address: fallback, lat: coords.lat, lng: coords.lng };
        setPickup(pickupData);
        setPickupDisplay(fallback);
        fetchRoute(pickupData, { address, lat, lng });
      });
  };

  /* ─── Fetch route (for initial route + confirm search) ─── */
  const fetchRoute = async (from: PlaceData, to: PlaceData, stopWaypoints?: { lat: number; lng: number }[]) => {
    if (!from.lat || !to.lat) return;
    const waypoints = stopWaypoints ?? stopsRef.current
      .filter(s => s.place && s.place.lat && s.place.lng)
      .map(s => ({ lat: s.place!.lat, lng: s.place!.lng }));
    if (isSameLocation(from, to) && waypoints.length === 0) {
      toast.error("Pickup and destination can't be the same location");
      return;
    }
    setIsLoadingRoute(true);
    setRouteData(null);

    if (import.meta.env.DEV) console.log("[fetchRoute] waypoints:", waypoints.length, JSON.stringify(waypoints));
    try {
      const { data, error } = await supabase.functions.invoke("maps-route", {
        body: {
          origin_lat: from.lat,
          origin_lng: from.lng,
          dest_lat: to.lat,
          dest_lng: to.lng,
          waypoints: waypoints.length > 0 ? waypoints : undefined,
        },
      });
      if (import.meta.env.DEV) console.log("[fetchRoute] Response:", data?.ok, data?.distance_miles, data?.duration_minutes);
      if (error) throw error;
      if (data?.ok) {
        setRouteData({
          distance_miles: data.distance_miles,
          duration_minutes: data.duration_minutes,
          duration_in_traffic_minutes: data.duration_in_traffic_minutes ?? null,
          polyline: data.polyline,
          traffic_level: data.traffic_level,
          traffic_segments: data.traffic_segments ?? null,
        });
      } else {
        // Fallback: haversine including waypoints
        const points = [{ lat: from.lat, lng: from.lng }, ...waypoints, { lat: to.lat, lng: to.lng }];
        let totalKm = 0;
        for (let i = 0; i < points.length - 1; i++) {
          totalKm += haversineKm(points[i].lat, points[i].lng, points[i+1].lat, points[i+1].lng);
        }
        const distMiles = totalKm * 0.621371;
        setRouteData({
          distance_miles: Math.round(distMiles * 10) / 10,
          duration_minutes: Math.max(5, Math.round(distMiles * 3)),
          polyline: null,
        });
      }
    } catch (err) {
      console.error("[fetchRoute] error:", err);
      const points = [{ lat: from.lat, lng: from.lng }, ...waypoints, { lat: to.lat, lng: to.lng }];
      let totalKm = 0;
      for (let i = 0; i < points.length - 1; i++) {
        totalKm += haversineKm(points[i].lat, points[i].lng, points[i+1].lat, points[i+1].lng);
      }
      const distMiles = totalKm * 0.621371;
      setRouteData({
        distance_miles: Math.round(distMiles * 10) / 10,
        duration_minutes: Math.max(5, Math.round(distMiles * 3)),
        polyline: null,
      });
    } finally {
      setIsLoadingRoute(false);
    }
    setSheetExpanded(false);
    // Skip route-preview, go directly to ride options (or rider-info for KM)
    if (useKm) {
      setRiderName(userProfile?.full_name || "");
      const ph = userProfile?.phone || "";
      setRiderPhone(ph.startsWith("+855") ? ph : "");
      setViewStep("rider-info");
    } else {
      setViewStep("ride-options");
    }
  };

  const handleConfirmSearch = async () => {
    const resolvedPickup = pickup ?? ensureAutoPickup();

    if (!pickupConfirmed) {
      setPickupConfirmed(true);
    }
    let resolvedDestination = destination;
    const typedDestination = destinationDisplay.trim();
    if (!resolvedDestination && typedDestination.length >= 3) {
      setIsLoadingRoute(true);
      try {
        const coords = await forwardGeocode(typedDestination);
        if (coords) {
          resolvedDestination = { address: typedDestination, lat: coords.lat, lng: coords.lng };
          setDestination(resolvedDestination);
          setDestinationDisplay(typedDestination);
        } else {
          toast.error("Please choose a destination from the suggestions");
        }
      } finally {
        setIsLoadingRoute(false);
      }
    }
    if (!resolvedPickup || !resolvedDestination) return;
    const wp = stops.filter(s => s.place && s.place.lat && s.place.lng).map(s => ({ lat: s.place!.lat, lng: s.place!.lng }));
    if (isSameLocation(resolvedPickup, resolvedDestination) && wp.length === 0) {
      toast.error("Add a stop to create a round trip, or choose a different destination");
      return;
    }
    fetchRoute(resolvedPickup, resolvedDestination, wp);
  };

  /* ─── Auto-refresh route data every 30s for live traffic updates ─── */
  useEffect(() => {
    if (viewStep !== "route-preview" && viewStep !== "ride-options") return;
    if (!pickup?.lat || !destination?.lat) return;

    const refresh = async () => {
      try {
        const wp = stopsRef.current
          .filter(s => s.place && s.place.lat && s.place.lng)
          .map(s => ({ lat: s.place!.lat, lng: s.place!.lng }));
        const { data, error } = await supabase.functions.invoke("maps-route", {
          body: {
            origin_lat: pickup.lat,
            origin_lng: pickup.lng,
            dest_lat: destination.lat,
            dest_lng: destination.lng,
            waypoints: wp.length > 0 ? wp : undefined,
          },
        });
        if (!error && data?.ok) {
          setRouteData(prev => ({
            ...prev!,
            duration_minutes: data.duration_minutes,
            duration_in_traffic_minutes: data.duration_in_traffic_minutes ?? null,
            traffic_level: data.traffic_level,
            distance_miles: data.distance_miles,
            polyline: data.polyline ?? prev?.polyline ?? null,
          }));
        }
      } catch {}
    };

    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [viewStep, pickup?.lat, pickup?.lng, destination?.lat, destination?.lng]);

  /* ─── Request Ride — Create PaymentIntent + Confirm ─── */
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<"idle" | "authorizing" | "authorized" | "failed">("idle");

  const handleRequestRide = async (paymentMethodId?: string) => {
    if (!user || !pickup || !destination) {
      console.error("[handleRequestRide] Missing:", { user: !!user, pickup: !!pickup, destination: !!destination });
      toast.error("Please sign in and select locations");
      return;
    }

    const finalPrice = appliedPromo ? Math.max(currentPrice - promoDiscount, 0) : currentPrice;
    const amountCents = Math.round(finalPrice * 100);

    if (useKm && !paymentMethodId && amountCents < 50) {
      toast.error("Card payments require at least $0.50. Please choose cash for this ride.");
      setPaymentStep("idle");
      return;
    }

    setIsSubmitting(true);
    setPaymentStep("authorizing");
    try {
      // Build stops metadata
      const stopsData = stops.filter(s => s.place).map((s, idx) => ({
        order: idx + 1,
        address: s.place!.address,
        lat: s.place!.lat,
        lng: s.place!.lng,
      }));

      // 1. Create ride request in DB
      const { data: rideData, error: rideError } = await supabase.from("ride_requests").insert({
        user_id: user.id,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: destination.address,
        dropoff_lat: destination.lat,
        dropoff_lng: destination.lng,
        ride_type: selectedVehicle,
        quoted_total: currentPrice,
        distance_miles: routeData?.distance_miles ?? null,
        duration_minutes: routeData?.duration_minutes ?? null,
        status: scheduledDate ? "scheduled" : "pending_payment",
        customer_name: otherName.trim() || user.user_metadata?.full_name || "",
        customer_phone: otherPhone.trim() || user.user_metadata?.phone || "",
        requires_car_seat: currentVehicle.carSeat,
        car_seat_type: currentVehicle.carSeat ? "standard" : null,
        notes: [
          stopsData.length > 0 ? `Stops: ${stopsData.map(s => s.address).join(" → ")}` : "",
          scheduledDate ? `Scheduled: ${scheduledDate.toISOString()}` : "",
          otherName.trim() ? `Rider: ${otherName.trim()}${otherPhone.trim() ? ` (${otherPhone.trim()})` : ""}` : "",
        ].filter(Boolean).join(" | ") || null,
      }).select("id").single();

      if (rideError) throw rideError;
      setRideRequestId(rideData.id);

      // 2. Create Stripe PaymentIntent (pre-authorization)
      const { data: piData, error: piError } = await supabase.functions.invoke("create-ride-payment-intent", {
        body: {
          ride_request_id: rideData.id,
          amount_cents: amountCents,
          ride_type: selectedVehicle,
          city: pickupCity || undefined,
          payment_method_id: paymentMethodId || undefined,
          promo_code: appliedPromo?.code || undefined,
          discount_cents: appliedPromo ? Math.round(promoDiscount * 100) : 0,
        },
      });

      if (piError || !piData?.ok) {
        throw new Error(piData?.error || piError?.message || "Failed to create payment");
      }

      // If free ride (100% promo), skip Stripe entirely
      if (piData.free_ride) {
        setPaymentStep("idle");
        setClientSecret(null);
        await supabase.from("ride_requests").update({ status: "searching" }).eq("id", rideData.id);
        setViewStep("searching");
        toast.success("Free ride! Finding your driver...");
        return;
      }

      // If auto-confirmed with saved card, skip to searching
      if (piData.auto_confirmed && piData.status === "requires_capture") {
        setPaymentStep("idle");
        setClientSecret(null);
        await supabase.from("ride_requests").update({ status: "searching" }).eq("id", rideData.id);
        setViewStep("searching");
        toast.success("Payment authorized! Finding your driver...");
        return;
      }

      setClientSecret(piData.client_secret);
      setPaymentStep("authorized");
    } catch (err: unknown) {
      console.error("[RideBooking] Payment error:", err);
      toast.error(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setPaymentStep("failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  /** After Stripe confirms payment, proceed to searching */
  const handlePaymentSuccess = async (paymentIntent?: RideAuthorizedPayment) => {
    if (rideRequestId) {
      const paymentStatus = paymentIntent?.status === "requires_capture"
        ? "authorized"
        : paymentIntent?.status === "succeeded"
          ? "captured"
          : paymentIntent?.status === "processing"
            ? "pending"
            : undefined;
      const updatePayload: Record<string, unknown> = { status: "searching" };
      if (paymentIntent?.id) {
        updatePayload.payment_intent_id = paymentIntent.id;
        updatePayload.stripe_payment_intent_id = paymentIntent.id;
        if (paymentStatus) updatePayload.payment_status = paymentStatus;
        const capturedCents = Number(paymentIntent.amount_received ?? 0);
        if (paymentStatus === "captured" && capturedCents > 0) {
          updatePayload.captured_amount_cents = capturedCents;
        }
      }
      const { error } = await supabase.from("ride_requests").update(updatePayload as any).eq("id", rideRequestId);
      if (error) {
        toast.error("Payment authorized, but ride update failed. Please contact support.");
        console.error("[RideBooking] card authorization ride update failed:", error);
        return;
      }
    }
    setPaymentStep("idle");
    setClientSecret(null);
    setViewStep("searching");
    toast.success("Payment authorized! Finding your driver...");
  };

  /** Handle cash ride — creates ride request without Stripe, dispatches immediately */
  const handleCashRide = async () => {
    if (!user || !pickup || !destination) {
      toast.error("Please sign in and select locations");
      return;
    }

    setIsSubmitting(true);
    try {
      const stopsData = stops.filter(s => s.place).map((s, idx) => ({
        order: idx + 1,
        address: s.place!.address,
        lat: s.place!.lat,
        lng: s.place!.lng,
      }));

      const { data: rideData, error: rideError } = await supabase.from("ride_requests").insert({
        user_id: user.id,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: destination.address,
        dropoff_lat: destination.lat,
        dropoff_lng: destination.lng,
        ride_type: selectedVehicle,
        quoted_total: currentPrice,
        distance_miles: routeData?.distance_miles ?? null,
        duration_minutes: routeData?.duration_minutes ?? null,
        status: "searching",
        payment_status: "cash",
        customer_name: otherName.trim() || user.user_metadata?.full_name || "",
        customer_phone: otherPhone.trim() || user.user_metadata?.phone || "",
        requires_car_seat: currentVehicle.carSeat,
        car_seat_type: currentVehicle.carSeat ? "standard" : null,
        notes: [
          stopsData.length > 0 ? `Stops: ${stopsData.map(s => s.address).join(" → ")}` : "",
          otherName.trim() ? `Rider: ${otherName.trim()}${otherPhone.trim() ? ` (${otherPhone.trim()})` : ""}` : "",
          "Payment: Cash",
        ].filter(Boolean).join(" | ") || null,
      }).select("id").single();

      if (rideError) throw rideError;
      setRideRequestId(rideData.id);
      setPaymentStep("idle");
      setClientSecret(null);
      setViewStep("searching");
      toast.success("Cash ride confirmed! Finding your driver...");
    } catch (err: unknown) {
      console.error("[RideBooking] Cash ride error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to book ride");
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Handle Bakong KHQR ride - pay first, then dispatch */
  const handleAbaRide = async (receipt?: AbaKhqrPaymentReceipt) => {
    if (import.meta.env.DEV) console.log("[handleAbaRide] State check:", { user: !!user, pickup: JSON.stringify(pickup), destination: JSON.stringify(destination) });
    if (!user || !pickup || !destination) {
      toast.error("Please sign in and select locations");
      return;
    }

    const finalPrice = appliedPromo ? Math.max(currentPrice - promoDiscount, 0) : currentPrice;

    setIsSubmitting(true);
    try {
      const stopsData = stops.filter(s => s.place).map((s, idx) => ({
        order: idx + 1,
        address: s.place!.address,
        lat: s.place!.lat,
        lng: s.place!.lng,
      }));

      if (!receipt) {
        throw new Error("Missing Bakong payment receipt");
      }

      const rideNotes = [
        stopsData.length > 0 ? `Stops: ${stopsData.map(s => s.address).join(" → ")}` : "",
        scheduledDate ? `Scheduled: ${scheduledDate.toISOString()}` : "",
        otherName.trim() ? `Rider: ${otherName.trim()}${otherPhone.trim() ? ` (${otherPhone.trim()})` : ""}` : "",
      ].filter(Boolean);

      const { data: verifiedRide, error: verifiedRideError } = await supabase.functions.invoke("create-bakong-ride", {
        body: {
          pickup,
          dropoff: destination,
          ride_type: selectedVehicle,
          quoted_total: finalPrice,
          price_before_discount: currentPrice,
          promo_code: appliedPromo?.code || null,
          promo_discount: appliedPromo ? promoDiscount : 0,
          amount_khr: receipt.amountKhr,
          amount_usd: receipt.amountUsd,
          reference: receipt.reference,
          qr: receipt.qr,
          since_sec: receipt.openedAtSec,
          customer_name: otherName.trim() || user.user_metadata?.full_name || "",
          customer_phone: otherPhone.trim() || user.user_metadata?.phone || "",
          distance_miles: routeData?.distance_miles ?? null,
          duration_minutes: routeData?.duration_minutes ?? null,
          scheduled_at: scheduledDate?.toISOString() ?? null,
          requires_car_seat: currentVehicle.carSeat,
          car_seat_type: currentVehicle.carSeat ? "standard" : null,
          notes: rideNotes,
        },
      });

      if (verifiedRideError || !verifiedRide?.ok) {
        throw new Error(verifiedRide?.error || verifiedRideError?.message || "Payment could not be verified");
      }

      setRideRequestId(verifiedRide.ride_request_id);

      void supabase.functions.invoke("notify-aba-payment", {
        body: {
          ride_request_id: verifiedRide.ride_request_id,
          amount: finalPrice,
          amount_khr: verifiedRide.amount_khr ?? receipt.amountKhr,
          reference: verifiedRide.reference ?? receipt.reference,
          verified_by: verifiedRide.verified_by ?? receipt.verifiedBy,
          customer_name: otherName.trim() || user.user_metadata?.full_name || "",
          pickup: pickup.address,
          dropoff: destination.address,
          vehicle_type: getVehicleName(selectedVehicle, currentVehicle.name, isCambodiaCountry),
        },
      }).catch(() => {});

      setPaymentStep("idle");
      setClientSecret(null);
      setViewStep("searching");
      toast.success("Bakong payment confirmed! Finding your driver...");

    } catch (err: unknown) {
      console.error("[RideBooking] Bakong ride error:", err);
      toast.error(err instanceof Error ? err.message : "Bakong payment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Handle legacy ABA payment return - confirms the ride after payment */
  const handleAbaPaymentReturn = useCallback(async (rideId: string) => {
    try {
      // Update ride to searching status
      await supabase.from("ride_requests").update({
        status: "searching",
        payment_status: "aba_paid",
      }).eq("id", rideId);

      setRideRequestId(rideId);
      setPaymentStep("idle");
      setClientSecret(null);
      setViewStep("searching");
      sessionStorage.removeItem("aba_pending_ride_id");
      toast.success("Payment confirmed! Finding your driver...");
    } catch (err) {
      console.error("[RideBooking] ABA return error:", err);
      toast.error("Failed to confirm ride after payment");
    }
  }, []);

  // Handle ABA Payway return URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const abaPayment = params.get("aba_payment");
    const rideId = params.get("ride_id") || sessionStorage.getItem("aba_pending_ride_id");
    if (abaPayment === "success" && rideId) {
      const url = new URL(window.location.href);
      url.searchParams.delete("aba_payment");
      url.searchParams.delete("ride_id");
      window.history.replaceState({}, "", url.pathname);
      handleAbaPaymentReturn(rideId);
    }
  }, [handleAbaPaymentReturn]);

  /* ─── Reset state ─── */
  const handleReset = () => {
    if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    pickupManuallySet.current = false;
    setPickupConfirmed(false);
    setViewStep("home");
    setPickup(null);
    setDestination(null);
    setPickupDisplay("");
    setDestinationDisplay("");
    setRideRequestId(null);
    setActiveJobId(null);
    setRouteData(null);
    setDriverCoords(null);
    setDriverEta(0);
    setAssignedDriver(EMPTY_DRIVER);
    setRating(0);
    setTip(null);
    setSurgeMultiplier(1.0);
    setRideCategory("popular");
    setClientSecret(null);
    setPaymentStep("idle");
    setAppliedPromo(null);
    setPromoInput("");
    setPromoDiscount(0);
    setPromoError(null);
  };

  /* ─── Cancel ride ─── */
  const handleOpenCancelModal = () => setShowCancelModal(true);

  const handleConfirmCancel = async (reason: string, fee: number) => {
    if (rideRequestId) {
      try {
        const { data, error } = await supabase.functions.invoke("cancel-ride-request", {
          body: { ride_request_id: rideRequestId, reason, cancel_fee_cents: Math.round(fee * 100) },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const result = data as any;
        const manualRefund = result.manual_refund as { refund_amount_khr?: number; fee_amount_khr?: number } | null | undefined;
        const refundDollars = (result.refund_cents || 0) / 100;
        const feeDisplay = useKm ? dualPrice(fee, true) : `$${fee.toFixed(2)}`;
        const khrDisplay = (amount: number) => `${Math.round(amount).toLocaleString()} KHR`;
        if (manualRefund) {
          const refundKhr = Number(manualRefund.refund_amount_khr || 0);
          const feeKhr = Number(manualRefund.fee_amount_khr || 0);
          if (refundKhr > 0) {
            toast.success(`Ride cancelled - ${khrDisplay(refundKhr)} Bakong refund pending${feeKhr > 0 ? ` (after ${khrDisplay(feeKhr)} fee)` : ""}`);
          } else {
            toast.info("Ride cancelled - no Bakong refund due");
          }
        } else if (refundDollars > 0) {
          toast.success(`Ride cancelled — $${refundDollars.toFixed(2)} refunded${fee > 0 ? ` (after ${feeDisplay} fee)` : ""}`);
        } else if (fee > 0) {
          toast.error(`Ride cancelled — ${feeDisplay} cancellation fee applied`);
        } else {
          toast.info("Ride cancelled — no fee charged");
        }
        if (result.fee_charge_skipped) {
          // Surface the honest gap so the rider knows we'll follow up.
          toast.message("Heads up", { description: result.fee_charge_skipped });
        }
      } catch (err: any) {
        console.error("[ride cancel] error", err);
        toast.error(err?.message || "Could not cancel ride");
        return; // keep modal open / state intact
      }
    }
    setShowCancelModal(false);
    handleReset();
  };

  const handleCancelRide = handleOpenCancelModal;

  const filteredVehiclesByCategory = vehicleOptions.filter((v) => v.category === rideCategory);

  return (
    <div className="relative h-full overflow-hidden bg-background flex flex-col">

      {/* ═══════ GPS Permission Prompt ═══════ */}
      {locationPermission === "prompt" && (
        <div className="absolute inset-0 z-[100] bg-background/98 backdrop-blur-sm flex flex-col items-center justify-center px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Navigation className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Enable Location</h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              ZIVO needs your location to find nearby drivers, calculate routes, and get you picked up quickly.
            </p>
            <Button
              onClick={handleAllowLocation}
              className="w-full h-14 rounded-2xl text-base font-bold bg-primary text-primary-foreground shadow-lg"
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Getting location...
                </span>
              ) : (
                "Allow Location Access"
              )}
            </Button>
            <button type="button"
              onClick={() => {
                setLocationPermission("denied");
                setUserLocation(fallbackPickupCenter);
              }}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip — enter address manually
            </button>
          </motion.div>
        </div>
      )}

      {locationPermission === "checking" && !isCambodiaCountry && (
        <div className="absolute inset-0 z-[100] bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Checking location...</span>
          </div>
        </div>
      )}
      {/* ═══════ 1. HEADER — visible on non-home steps ═══════ */}
      {viewStep !== "home" && viewStep !== "trip-complete" && viewStep !== "confirm-ride" && (
        <div className="relative z-50 flex items-center h-14 px-4 bg-background/95 backdrop-blur-xl border-b border-border/10">
          <button type="button"
            onClick={handleBack}
            className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all duration-200 active:scale-90 touch-manipulation"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="flex-1 text-center font-black text-lg tracking-tight">
            <span className="text-primary">Zivo</span> Ride
          </h1>
          <div className="flex items-center gap-1 -mr-2">
            <div className="relative">
              <button type="button"
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all duration-200 active:scale-90 touch-manipulation"
                aria-label="Change language"
              >
                <Globe className="w-5 h-5 text-muted-foreground" />
              </button>
              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                  <div className="absolute right-0 top-11 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 min-w-[200px]">
                    <div className="px-3 py-2.5 border-b border-border/30 bg-muted/30">
                      <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Globe className="w-3 h-3" /> {t("lang.select")}</p>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto py-1">
                      {LANGS.map(l => (
                        <button type="button"
                          key={l.code}
                          onClick={() => { changeLanguage(l.code); setShowLangMenu(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all relative overflow-hidden",
                            currentLanguage === l.code ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/60"
                          )}
                        >
	                          <img src={l.flagImg} alt="" className="absolute right-0 top-1/2 -translate-y-1/2 h-[120%] w-auto opacity-[0.07] pointer-events-none" loading="lazy" decoding="async" />
                          <span className="text-xs font-bold text-muted-foreground uppercase w-6 shrink-0">{l.cc}</span>
                          <span className="font-medium relative z-10">{l.label}</span>
                          {currentLanguage === l.code && <CheckCircle className="w-4 h-4 ml-auto text-primary relative z-10" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button type="button"
              onClick={() => navigate("/notifications")}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all duration-200 active:scale-90 touch-manipulation"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════ PERSISTENT MAP — visible behind search, route-preview, searching, driver-assigned, en-route, trip-in-progress ═══════ */}
      {["search", "route-preview", "searching", "driver-assigned", "driver-en-route", "trip-in-progress"].includes(viewStep) && (
        <div className="flex-1 relative z-0 min-h-0">
          <div className="absolute inset-0">
            <MapSection
              key={`persistent-map-${locationModeKey}`}
              compact
                pickupCoords={viewStep === "search" && !pickupConfirmed ? null : pickup}
                dropoffCoords={viewStep === "search" && pinPlacementMode ? null : destination}
              panToCoords={mapPanTarget}
              stopCoords={
                viewStep === "search" && pinPlacementMode === "stop"
                  ? stops.filter(s => s.place && s.id !== placingStopId).map(s => ({ lat: s.place!.lat, lng: s.place!.lng }))
                  : stops.filter(s => s.place).map(s => ({ lat: s.place!.lat, lng: s.place!.lng }))
              }
              driverCoords={driverCoords}
              driverNavigationTarget={
                viewStep === "driver-en-route" ? (pickup || null) :
                viewStep === "trip-in-progress" ? (destination || null) :
                null
              }
              userLocation={userLocation}
              nearbyDrivers={driverCoords ? [] : realNearbyDrivers}
              showUserLocationDot={!pickup}
              onLocateUser={handleLocateUser}
              routePolyline={viewStep === "search" && pinPlacementMode ? null : (routeData?.polyline || null)}
              trafficSegments={viewStep === "search" && pinPlacementMode ? null : (routeData?.traffic_segments || null)}
              onCenterChanged={handleMapCenterChanged}
              suppressAutoViewport={viewStep === "search" && (!pickupConfirmed || !!pinPlacementMode)}
              mapInteractive={viewStep !== "search" || !pickupConfirmed || !!pinPlacementMode}
              onMapReadyExtra={(map) => {
                map.addListener("dragstart", () => {
                  userHasDraggedPinRef.current = true;
                });
              }}
            >
              {/* Center pin for pickup (when not yet confirmed in search step) */}
              {viewStep === "search" && !pickupConfirmed && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ marginBottom: 80 }}>
                  <div className="flex flex-col items-center">
                    <div className="relative w-10 h-10 rounded-full bg-emerald-500 border-[3px] border-background shadow-xl flex items-center justify-center">
                      <span className="text-sm font-black text-primary-foreground leading-none">Z</span>
                    </div>
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-emerald-500 -mt-[2px]" />
                    <div className="w-3 h-1 rounded-full bg-foreground/15 mt-0.5 blur-[1px]" />
                    {isReversingGeocode && (
                      <span className="mt-1.5 px-2.5 py-1 rounded-full bg-background/95 text-[10px] font-semibold text-foreground shadow-md flex items-center gap-1.5 backdrop-blur-sm border border-border/30">
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Locating pickup...
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* Center pin for pickup (pin placement mode) */}
              {viewStep === "search" && pinPlacementMode === "pickup" && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ marginBottom: 80 }}>
                  <div className="flex flex-col items-center">
                    <div className="relative w-10 h-10 rounded-full bg-primary border-[3px] border-background shadow-xl flex items-center justify-center">
                      <span className="text-sm font-black text-primary-foreground leading-none">Z</span>
                    </div>
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary -mt-[2px]" />
                    <div className="w-3 h-1 rounded-full bg-foreground/15 mt-0.5 blur-[1px]" />
                    {isReversingGeocode && (
                      <span className="mt-1.5 px-2.5 py-1 rounded-full bg-background/95 text-[10px] font-semibold text-foreground shadow-md flex items-center gap-1.5 backdrop-blur-sm border border-border/30">
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Locating pickup...
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* Center pin for destination (pin placement mode) */}
              {viewStep === "search" && pinPlacementMode === "destination" && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ marginBottom: 80 }}>
                  <div className="flex flex-col items-center">
                    <div className="relative w-10 h-10 rounded-lg bg-foreground border-[3px] border-background shadow-xl flex items-center justify-center">
                      <span className="text-sm font-black text-background leading-none">D</span>
                    </div>
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-foreground -mt-[2px]" />
                    <div className="w-3 h-1 rounded-full bg-foreground/15 mt-0.5 blur-[1px]" />
                    {isReversingGeocode && (
                      <span className="mt-1.5 px-2.5 py-1 rounded-full bg-background/95 text-[10px] font-semibold text-foreground shadow-md flex items-center gap-1.5 backdrop-blur-sm border border-border/30">
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Locating drop-off...
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* Center pin for stop (stop pin placement mode) */}
              {viewStep === "search" && pinPlacementMode === "stop" && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ marginBottom: 80 }}>
                  <div className="flex flex-col items-center">
                    <div className="relative w-10 h-10 rounded-full bg-amber-500 border-[3px] border-background shadow-xl flex items-center justify-center">
                      <span className="text-sm font-black text-primary-foreground leading-none">S</span>
                    </div>
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-amber-500 -mt-[2px]" />
                    <div className="w-3 h-1 rounded-full bg-foreground/15 mt-0.5 blur-[1px]" />
                    {isReversingGeocode && (
                      <span className="mt-1.5 px-2.5 py-1 rounded-full bg-background/95 text-[10px] font-semibold text-foreground shadow-md flex items-center gap-1.5 backdrop-blur-sm border border-border/30">
                        <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        Locating stop...
                      </span>
                    )}
                  </div>
                </div>
              )}
            </MapSection>
          </div>

          {/* ═══════ 3a. SEARCH — compact bar during pin placement ═══════ */}
          {viewStep === "search" && pinPlacementMode && (
            <div className="absolute left-0 right-0 bottom-0 z-30 rounded-t-[20px] bg-background shadow-[0_-8px_30px_hsl(var(--foreground)/0.10)]">
              <div className="flex justify-center pt-2 pb-1">
                <div className="h-1 w-8 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="px-5 pt-1" style={{ paddingBottom: `calc(12px + ${SAFE_BOTTOM})` }}>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {pinPlacementMode === "pickup" ? "Drag map to set pickup" : pinPlacementMode === "destination" ? "Drag map to set drop-off" : "Drag map to set stop"}
                </p>

                {/* Address display + search input */}
                {pinPlacementMode === "pickup" ? (
                  <AddressAutocomplete
                    placeholder="Search or drag map..."
                    value={pickupDisplay}
                    onSelect={(place) => {
                      reverseGeocodeRequestSeqRef.current += 1;
                      if (reverseGeocodeTimerRef.current) {
                        clearTimeout(reverseGeocodeTimerRef.current);
                        reverseGeocodeTimerRef.current = null;
                      }
                      setIsReversingGeocode(false);
                      setPickup(place);
                      setPickupDisplay(place.address);
                      lastGeocodedCoordsRef.current = `${place.lat.toFixed(4)},${place.lng.toFixed(4)}`;
                      userHasDraggedPinRef.current = false;
                      setMapPanTarget({ lat: place.lat, lng: place.lng });
                    }}
                    className="[&_input]:h-11 [&_input]:rounded-xl [&_input]:text-sm [&_input]:font-medium [&_input]:bg-muted/15 [&_input]:border-border/30 mb-3"
                  />
                ) : pinPlacementMode === "destination" ? (
                  <AddressAutocomplete
                    placeholder="Search or drag map..."
                    value={destinationDisplay}
                    onInputChange={setDestinationDisplay}
                    onSelect={(place) => {
                      // Cancel any pending reverse geocode so it doesn't overwrite the selected address
                      reverseGeocodeRequestSeqRef.current += 1;
                      if (reverseGeocodeTimerRef.current) {
                        clearTimeout(reverseGeocodeTimerRef.current);
                        reverseGeocodeTimerRef.current = null;
                      }
                      setIsReversingGeocode(false);

                      setDestination(place);
                      setDestinationDisplay(place.address);
                      lastGeocodedCoordsRef.current = `${place.lat.toFixed(4)},${place.lng.toFixed(4)}`;
                      // Reset drag flag so the map pan doesn't trigger a new geocode
                      userHasDraggedPinRef.current = false;
                      setMapPanTarget({ lat: place.lat, lng: place.lng });
                    }}
                    className="[&_input]:h-11 [&_input]:rounded-xl [&_input]:text-sm [&_input]:font-medium [&_input]:bg-muted/15 [&_input]:border-border/30 mb-3"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground truncate mb-3">
                    {stops.find(s => s.id === placingStopId)?.display || "Move the map..."}
                  </p>
                )}

                <div className="flex gap-2">
                  {pinPlacementMode === "destination" && destination && stops.length < MAX_STOPS && (
                    <Button variant="outline" onClick={handleAddStop} className="flex-1 h-12 rounded-2xl text-sm font-bold border-border/30">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Stop
                    </Button>
                  )}
                  <Button
                    onClick={handleConfirmPinPlacement}
                    disabled={isLoadingRoute || (pinPlacementMode === "pickup" ? !pickup : pinPlacementMode === "destination" ? (!destination && destinationDisplay.trim().length < 3) : !stops.find(s => s.id === placingStopId)?.place)}
                    className={cn(
                      "h-12 rounded-2xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20",
                      pinPlacementMode === "destination" && destination && stops.length < MAX_STOPS ? "flex-1" : "w-full"
                    )}
                  >
                    {isReversingGeocode ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Locating...
                      </span>
                    ) : pinPlacementMode === "pickup" ? "Confirm pickup" : pinPlacementMode === "destination" ? "Confirm drop-off" : "Confirm stop"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ 3b. SEARCH — full bottom sheet (no pin placement active) ═══════ */}
          {viewStep === "search" && !pinPlacementMode && (
            <motion.div
              className="absolute left-0 right-0 bottom-0 z-30 rounded-t-[28px] bg-background shadow-[0_-16px_50px_hsl(var(--foreground)/0.12)]"
              drag="y"
              dragControls={searchDragControls}
              dragListener={true}
              dragConstraints={{ top: SEARCH_SHEET_EXPANDED_Y, bottom: SEARCH_SHEET_COLLAPSED_Y }}
              dragElastic={0.15}
              animate={{ y: searchSheetY }}
              transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
              onDragEnd={handleSearchSheetDragEnd}
              style={{
                maxHeight: "65vh",
                display: "flex",
                flexDirection: "column",
                touchAction: "pan-x",
              }}
            >
              {/* Drag handle */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Drag to resize"
                onClick={() => setSearchSheetY(searchSheetY === SEARCH_SHEET_EXPANDED_Y ? SEARCH_SHEET_COLLAPSED_Y : SEARCH_SHEET_EXPANDED_Y)}
                className="flex justify-center pt-3 pb-3 shrink-0 cursor-grab active:cursor-grabbing"
              >
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
              </div>

              <div
                className="px-5 pt-1 overflow-y-auto min-h-0 flex-1 overscroll-contain"
                style={{ paddingBottom: `calc(16px + ${SAFE_BOTTOM})`, touchAction: "pan-y" }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Pickup & Destination addresses */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex flex-col items-center mt-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary/20">
                      <span className="text-[11px] font-black text-primary-foreground leading-none">Z</span>
                    </div>
                    <div className="w-px h-6 border-l-[2px] border-dashed border-muted-foreground/30 my-0.5" />
                    <div className="w-6 h-6 rounded-sm bg-foreground flex items-center justify-center">
                      <span className="text-[11px] font-black text-background leading-none">D</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Pickup row — tappable to enter pin mode */}
                    {destination ? (
                      <div
                        className="flex items-center h-11 rounded-xl bg-muted/15 border border-border/30 px-3 gap-2 cursor-pointer hover:border-primary/30 transition-colors"
                        onClick={() => {
                          setPinPlacementMode("pickup");
                          userHasDraggedPinRef.current = false;
                          lastGeocodedCoordsRef.current = null;
                          if (pickup) setMapPanTarget({ lat: pickup.lat, lng: pickup.lng });
                        }}
                      >
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm font-medium text-foreground truncate">{pickupDisplay || "Pickup location"}</span>
                        <span className="text-[10px] font-semibold text-primary px-2 py-1 rounded-lg hover:bg-primary/10">Edit</span>
                        <button
                          type="button"
                          aria-label="Clear pickup location"
                          onClick={(e) => { e.stopPropagation(); setPickup(null); setPickupDisplay(""); pickupManuallySet.current = false; setPickupConfirmed(false); }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <AddressAutocomplete
                        placeholder={t("ride.pickup") || "Pickup location"}
                        value={pickupDisplay}
                        onSelect={handlePickupSelect}
                        proximity={userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined}
                        country={rideCountry}
                        className="[&_input]:h-11 [&_input]:rounded-xl [&_input]:text-sm [&_input]:font-medium [&_input]:bg-muted/15 [&_input]:border-border/30"
                      />
                    )}

                    {/* Destination row — tappable to enter pin mode */}
                    {destination ? (
                      <div
                        className="flex items-center h-11 rounded-xl bg-muted/15 border border-border/30 px-3 gap-2 cursor-pointer hover:border-primary/30 transition-colors"
                        onClick={() => {
                          setPinPlacementMode("destination");
                          userHasDraggedPinRef.current = false;
                          lastGeocodedCoordsRef.current = null;
                          setMapPanTarget({ lat: destination.lat, lng: destination.lng });
                        }}
                      >
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm font-medium text-foreground truncate">{destinationDisplay || "Destination"}</span>
                        <span className="text-[10px] font-semibold text-primary px-2 py-1 rounded-lg hover:bg-primary/10">Edit</span>
                        <button
                          type="button"
                          aria-label="Clear destination"
                          onClick={(e) => { e.stopPropagation(); setDestination(null); setDestinationDisplay(""); }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <AddressAutocomplete
                        placeholder={t("ride.destination") || "Where to?"}
                        value={destinationDisplay}
                        onInputChange={setDestinationDisplay}
                        onSelect={handleDestinationSelect}
                        onFocus={() => {
                          if (!pickup) ensureAutoPickup();
                          pickupManuallySet.current = true;
                          setPickupConfirmed(true);
                          lastGeocodedCoordsRef.current = null;
                          setPinPlacementMode("destination");
                          userHasDraggedPinRef.current = false;
                          setDestinationDisplay("");
                        }}
                        proximity={pickup ? { lat: pickup.lat, lng: pickup.lng } : userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined}
                        country={rideCountry}
                        className="[&_input]:h-11 [&_input]:rounded-xl [&_input]:text-sm [&_input]:font-medium [&_input]:bg-muted/15 [&_input]:border-border/30"
                      />
                    )}
                  </div>
                </div>

                {/* Stops display */}
                {stops.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {stops.map((stop) => (
                      <div key={stop.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-black text-primary-foreground leading-none">S</span>
                        </div>
                        <span className="flex-1 text-xs font-medium text-foreground truncate">{stop.display || "Tap to set stop"}</span>
                        <button type="button"
                          onClick={() => {
                            ensureAutoPickup();
                            setPickupConfirmed(true);
                            setViewStep("search");
                            setPlacingStopId(stop.id);
                            setPinPlacementMode("stop");
                            lastGeocodedCoordsRef.current = null;
                            if (stop.place) setMapPanTarget({ lat: stop.place.lat, lng: stop.place.lng });
                          }}
                          className="text-[10px] font-semibold text-primary px-2 py-1 rounded-lg hover:bg-primary/10"
                        >Edit</button>
                        <button type="button" aria-label="Remove stop" onClick={() => handleRemoveStop(stop.id)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add stop button */}
                {pickupConfirmed && destination && stops.length < MAX_STOPS && (
                  <button type="button"
                    onClick={() => {
                      ensureAutoPickup();
                      setPickupConfirmed(true);
                      handleAddStop();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-3 rounded-xl border border-dashed border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary">Add a stop</span>
                  </button>
                )}

                {/* Saved places — only when no destination yet */}
                {savedPlaces.length > 0 && !destination && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("ride.saved_places") || "Saved places"}</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5" style={{ WebkitOverflowScrolling: "touch" }}>
                      {savedPlaces.map((place) => {
                        const Icon = place.icon;
                        return (
                          <button type="button"
                            key={place.id}
                            onClick={() => handleDestinationSelect({ address: place.address, lat: place.lat, lng: place.lng })}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/15 border border-border/20 hover:border-primary/20 shrink-0 transition-all active:scale-[0.97]"
                          >
                            <Icon className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-xs font-semibold text-foreground whitespace-nowrap">{place.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent destinations — only when no destination yet */}
                {recentDestinations.length > 0 && !destination && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("ride.recent") || "Recent"}</p>
                    <div className="space-y-1">
                      {recentDestinations.slice(0, 3).map((dest) => (
                        <button type="button"
                          key={dest.id}
                          onClick={() => handleDestinationSelect({ address: dest.address, lat: dest.lat, lng: dest.lng })}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/15 transition-all active:scale-[0.98]"
                        >
                          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-medium text-foreground truncate">{dest.address}</p>
                            <p className="text-[10px] text-muted-foreground">{dest.time}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search / Confirm button */}
                <Button
                  onClick={handleConfirmSearch}
                  disabled={!pickup || (!destination && destinationDisplay.trim().length < 3) || isLoadingRoute}
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/20"
                  size="lg"
                >
                  {isLoadingRoute ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      {t("ride.calculating_route") || "Calculating..."}
                    </span>
                  ) : destination ? (
                    t("ride.confirm_dropoff") || "Confirm drop-off"
                  ) : (
                    t("ride.search_destination") || "Search destination"
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ═══════ 2. HOME — Full-screen map with floating UI ═══════ */}
      {viewStep === "home" && (
        <>
          {/* Header for home */}
          <div className="relative z-20 flex items-center h-14 px-4 bg-background/95 backdrop-blur-xl border-b border-border/10">
            <button type="button"
              onClick={handleBack}
              className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all duration-200 active:scale-90 touch-manipulation"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="flex-1 text-center font-black text-lg tracking-tight">
              <span className="text-primary">Zivo</span> Ride
            </h1>
            <div className="flex items-center gap-1 -mr-2">
              <div className="relative">
                <button type="button"
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all duration-200 active:scale-90 touch-manipulation"
                  aria-label="Change language"
                >
                  <Globe className="w-5 h-5 text-muted-foreground" />
                </button>
                {showLangMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                    <div className="absolute right-0 top-11 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 min-w-[200px]">
                      <div className="px-3 py-2.5 border-b border-border/30 bg-muted/30">
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Globe className="w-3 h-3" /> {t("lang.select")}</p>
                      </div>
                      <div className="max-h-[320px] overflow-y-auto py-1">
                        {LANGS.map(l => (
                          <button type="button"
                            key={l.code}
                            onClick={() => { changeLanguage(l.code); setShowLangMenu(false); }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all relative overflow-hidden",
                              currentLanguage === l.code ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/60"
                            )}
                          >
	                            <img src={l.flagImg} alt="" className="absolute right-0 top-1/2 -translate-y-1/2 h-[120%] w-auto opacity-[0.07] pointer-events-none" loading="lazy" decoding="async" />
                            <span className="text-xs font-bold text-muted-foreground uppercase w-6 shrink-0">{l.cc}</span>
                            <span className="font-medium relative z-10">{l.label}</span>
                            {currentLanguage === l.code && <CheckCircle className="w-4 h-4 ml-auto text-primary relative z-10" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button type="button"
                onClick={() => navigate("/notifications")}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all duration-200 active:scale-90 touch-manipulation"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Map + bottom sheet container */}
          <div className="flex-1 relative z-0 min-h-0">
            <div className="absolute inset-0">
              <MapSection
                key={`home-map-${locationModeKey}`}
                compact
                pickupCoords={null}
                dropoffCoords={null}
                userLocation={userLocation}
                nearbyDrivers={realNearbyDrivers}
                showUserLocationDot
                onLocateUser={handleLocateUser}
                routePolyline={null}
                onCenterChanged={handleMapCenterChanged}
                onMapReadyExtra={(map) => {
                  userHasDraggedHomeMapRef.current = false;
                  map.addListener("dragstart", () => {
                    userHasDraggedHomeMapRef.current = true;
                  });
                }}
              >
                {/* Center destination pin — ZIVO branded */}
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ marginBottom: 80 }}>
                  <div className="flex flex-col items-center">
                    <div className="relative w-10 h-10 rounded-full bg-primary border-[3px] border-background shadow-xl flex items-center justify-center">
                      <span className="text-sm font-black text-primary-foreground leading-none">Z</span>
                    </div>
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary -mt-[2px]" />
                    <div className="w-3 h-1 rounded-full bg-foreground/15 mt-0.5 blur-[1px]" />
                    {isReversingGeocode && (
                      <span className="mt-1.5 px-2.5 py-1 rounded-full bg-background/95 text-[10px] font-semibold text-foreground shadow-md flex items-center gap-1.5 backdrop-blur-sm border border-border/30">
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Locating...
                      </span>
                    )}
                  </div>
                </div>
              </MapSection>
            </div>

            <div
              className="absolute left-0 right-0 bottom-0 z-30 rounded-t-[28px] bg-background shadow-[0_-16px_50px_hsl(var(--foreground)/0.12)]"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
              </div>

              <div className="px-5 pt-1 pb-24">
                {/* Title */}
                <div className="text-center mb-3">
                  <h2 className="text-lg font-black text-foreground tracking-tight">{t("ride.set_destination")}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("ride.drag_map_move_pin")}</p>
                </div>

                {/* Destination input */}
                <button type="button"
                  onClick={() => {
                    // If destination was auto-set from map center and matches pickup location, clear it
                    const effectivePickup = pickup ?? (userLocation ? { address: "", lat: userLocation.lat, lng: userLocation.lng } : null);
                    if (destination && effectivePickup && isSameLocation(destination, effectivePickup)) {
                      setDestination(null);
                      setDestinationDisplay("");
                    }
                    setViewStep("search");
                  }}
                  className="w-full flex items-center gap-3 bg-muted/15 border border-border/20 rounded-2xl px-4 py-3 transition-all duration-200 hover:bg-muted/25 hover:border-primary/20 active:scale-[0.98] group"
                >
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-primary-foreground leading-none">Z</span>
                  </div>
                  <span className="flex-1 text-left text-sm font-medium truncate" style={{ color: destinationDisplay ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                    {destinationDisplay || t("ride.book_a_ride")}
                  </span>
                  <Navigation className="w-4 h-4 text-primary/60 shrink-0" />
                </button>
              </div>

              {/* Sticky Choose Ride button at bottom */}
              <div className="shrink-0 px-5 pt-3" style={{ paddingBottom: `calc(12px + ${SAFE_BOTTOM})` }}>
                <Button
                  onClick={() => {
                    // If destination was auto-set from map center and matches pickup location, clear it
                    const effectivePickup = pickup ?? (userLocation ? { address: "", lat: userLocation.lat, lng: userLocation.lng } : null);
                    if (destination && effectivePickup && isSameLocation(destination, effectivePickup)) {
                      setDestination(null);
                      setDestinationDisplay("");
                    }
                    // If user actually dragged to a different destination, keep it and go to search
                    setViewStep("search");
                  }}
                  disabled={isReversingGeocode}
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/20"
                  size="lg"
                >
                  {isReversingGeocode ? t("ride.locating") : destinationDisplay ? t("ride.choose_ride") : t("ride.search_destination")}
                </Button>
              </div>
            </div>
          </div>

        </>
      )}

      {/* ═══════ Zoom controls — route-preview only ═══════ */}
      {viewStep === "route-preview" && (
        <div
          className="absolute right-3 flex flex-col gap-2 z-20"
          style={{
            bottom: `calc(${COLLAPSED_SHEET_HEIGHT}px + ${BOTTOM_NAV_HEIGHT}px + 16px + ${SAFE_BOTTOM})`,
          }}
        >
          <button type="button" className="h-12 w-12 rounded-2xl bg-card shadow-md flex items-center justify-center text-foreground font-bold text-base" aria-label="Zoom in">+</button>
          <button type="button" className="h-12 w-12 rounded-2xl bg-card shadow-md flex items-center justify-center text-foreground font-bold text-base" aria-label="Zoom out">-</button>
        </div>
      )}

      {/* ═══════ 4b. ROUTE PREVIEW — draggable bottom sheet ═══════ */}
      {viewStep === "route-preview" && (
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.12}
          onDragEnd={(_, info) => {
            const shouldCollapse = info.offset.y > 80 || info.velocity.y > 500;
            if (shouldCollapse) setSheetExpanded(false);
          }}
          initial={{ height: COLLAPSED_SHEET_HEIGHT, y: 0 }}
          animate={{ height: COLLAPSED_SHEET_HEIGHT, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="absolute left-0 right-0 z-[100] rounded-t-[28px] bg-background shadow-[0_-8px_30px_hsl(var(--foreground)/0.15)] flex flex-col overflow-hidden border-t border-border/20"
          style={{
            bottom: 0,
            height: COLLAPSED_SHEET_HEIGHT,
            touchAction: "none",
          }}
        >
          <div className="mx-auto mt-2 h-1.5 w-14 rounded-full bg-muted-foreground/25 cursor-grab active:cursor-grabbing shrink-0" />

          <div className="flex-1 overflow-hidden flex flex-col justify-between">
            {/* Route info */}
            <div className="px-5 pt-3 pb-2 shrink-0">
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex flex-col items-center mt-0.5">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary/20">
                      <span className="text-[11px] font-black text-primary-foreground leading-none">Z</span>
                    </div>
                    {stops.map((stop) => (
                      <div key={stop.id} className="flex flex-col items-center">
                        <div className="w-px flex-1 min-h-[14px] border-l-[2px] border-dashed border-muted-foreground/30 my-0.5" />
                        <div className="w-5 h-5 rounded-full bg-muted-foreground/60 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-background leading-none">S</span>
                        </div>
                      </div>
                    ))}
                    <div className="w-px flex-1 min-h-[20px] border-l-[2px] border-dashed border-muted-foreground/30 my-0.5" />
                    <div className="w-6 h-6 rounded-sm bg-foreground flex items-center justify-center">
                      <span className="text-[11px] font-black text-background leading-none">D</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div>
                      <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{t("ride.pickup")}</p>
                      <p className="text-sm font-semibold text-foreground leading-tight whitespace-normal break-words">{pickup?.address || pickupDisplay}</p>
                    </div>
                    {stops.map((stop, idx) => (
                      <div key={stop.id}>
                        <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Stop {idx + 1}</p>
                        {stop.place?.address ? (
                          <p className="text-xs font-medium text-foreground truncate leading-tight">{stop.place.address}</p>
                        ) : (
                          <div className="relative">
                             <AddressAutocomplete
                              placeholder={`Enter stop ${idx + 1} address`}
                              value={stop.display}
                              onSelect={(place) => handleStopSelect(stop.id, place)}
                              proximity={pickup ? { lat: pickup.lat, lng: pickup.lng } : undefined}
                              country={rideCountry}
                              className="[&_input]:h-8 [&_input]:rounded-lg [&_input]:text-xs [&_input]:font-medium [&_input]:bg-muted/30 [&_input]:border-border/30 [&_input]:px-2"
                            />
                            <button type="button"
                              aria-label="Remove stop"
                              onClick={() => handleRemoveStop(stop.id)}
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted/50"
                            >
                              <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div>
                      <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{t("ride.destination")}</p>
                      <p className="text-sm font-semibold text-foreground leading-tight whitespace-normal break-words">{destination?.address || destinationDisplay}</p>
                    </div>
                  </div>
                </div>

              {routeData && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex-1 min-w-[70px] flex items-center gap-1.5 rounded-lg bg-muted/20 border border-border/20 px-2 py-1.5">
                    <Timer className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-foreground leading-none">
                        {routeData.duration_in_traffic_minutes
                          ? `${routeData.duration_in_traffic_minutes} ${t("ride.min_unit")}`
                          : `${routeData.duration_minutes} ${t("ride.min_unit")}`}
                      </p>
                      {routeData.duration_in_traffic_minutes && routeData.duration_in_traffic_minutes !== routeData.duration_minutes && (
                        <p className="text-[8px] text-muted-foreground/60 line-through">{routeData.duration_minutes} {t("ride.min_unit")}</p>
                      )}
                      <p className="text-[9px] text-muted-foreground">{t("ride.trip_time")}</p>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[70px] flex items-center gap-1.5 rounded-lg bg-muted/20 border border-border/20 px-2 py-1.5">
                    <Route className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-foreground leading-none">{formatDist(routeData.distance_miles, useKm)}</p>
                      <p className="text-[9px] text-muted-foreground">{t("ride.distance")}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "flex-1 min-w-[70px] flex items-center gap-1.5 rounded-lg border px-2 py-1.5",
                    routeData.traffic_level === "heavy"
                      ? "bg-destructive/10 border-destructive/20"
                      : routeData.traffic_level === "moderate"
                        ? "bg-amber-500/10 border-amber-500/20"
                        : "bg-emerald-500/10 border-emerald-500/20"
                  )}>
                    <Car className={cn(
                      "w-3.5 h-3.5 shrink-0",
                      routeData.traffic_level === "heavy"
                        ? "text-destructive"
                        : routeData.traffic_level === "moderate"
                          ? "text-amber-500"
                          : "text-emerald-500"
                    )} />
                    <div>
                      <p className={cn(
                        "text-sm font-bold leading-none capitalize",
                        routeData.traffic_level === "heavy"
                          ? "text-destructive"
                          : routeData.traffic_level === "moderate"
                            ? "text-amber-500"
                            : "text-emerald-500"
                      )}>
                        {routeData.traffic_level
                          ? (t(`ride.${routeData.traffic_level.toLowerCase()}`) !== `ride.${routeData.traffic_level.toLowerCase()}`
                            ? t(`ride.${routeData.traffic_level.toLowerCase()}`)
                            : routeData.traffic_level)
                          : t("ride.light") !== "ride.light" ? t("ride.light") : "Light"}
                      </p>
                      <p className="text-[9px] text-muted-foreground">{t("ride.traffic")}</p>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[70px] flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-2 py-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-primary leading-none">{useKm ? dualPrice(currentPrice, true) : `$${currentPrice.toFixed(2)}`}</p>
                      <p className="text-[9px] text-muted-foreground">{t("ride.est")}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Stop button */}
              <div className="px-5 pt-1 pb-1 shrink-0">
                <button type="button"
                  onClick={handleAddStop}
                  disabled={stops.length >= MAX_STOPS}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    stops.length >= MAX_STOPS
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : "text-primary hover:bg-primary/10 active:scale-[0.98]"
                  )}
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </div>
                  {t("ride.add_stop")}
                </button>
              </div>
            </div>

            {/* Choose a ride button — collapsed */}
            {!sheetExpanded && (
              <div className="px-4 pt-2 pb-2 shrink-0">
                {isLoadingRoute ? (
                  <div className="flex items-center justify-center py-3">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">{t("ride.calculating_route")}</span>
                  </div>
                ) : (
                  <Button
                    className="w-full h-14 rounded-2xl text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/20"
                    onClick={() => { if (useKm) { setRiderName(userProfile?.full_name || ""); const ph = userProfile?.phone || ""; setRiderPhone(ph.startsWith("+855") ? ph : ""); setViewStep("rider-info"); } else { setViewStep("ride-options"); } }}
                  >
                    {t("ride.choose_ride")}
                  </Button>
                )}
              </div>
            )}

            {/* Expanded — also go to ride-options */}
            <AnimatePresence>
              {sheetExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 overflow-hidden flex flex-col items-center justify-center px-4 border-t border-border/15"
                >
                  <p className="text-sm text-muted-foreground mb-4">{t("ride.browse_available_rides")}</p>
                  <Button
                    className="w-full h-12 rounded-2xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => { if (useKm) { setRiderName(userProfile?.full_name || ""); const ph = userProfile?.phone || ""; setRiderPhone(ph.startsWith("+855") ? ph : ""); setViewStep("rider-info"); } else { setViewStep("ride-options"); } }}
                  >
                    {t("ride.see_ride_options")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* ═══════ RIDER INFO — collect name, phone, pickup note ═══════ */}
      {viewStep === "rider-info" && (
        <div
          className="absolute left-0 right-0 bottom-0 z-40 bg-background flex flex-col"
          style={{ top: HEADER_HEIGHT }}
        >
          <div className="px-5 pt-5 pb-3 shrink-0">
            <h2 className="text-xl font-black text-foreground tracking-tight">{t("ride.rider_info_title") || "Rider Information"}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("ride.rider_info_desc") || "Confirm your details before choosing a ride"}</p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <User className="w-4 h-4 text-primary" />
                {t("ride.your_name") || "Full Name"}
              </label>
              <Input
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
                placeholder={t("ride.your_name_placeholder") || "Enter your name"}
                className="h-12 rounded-2xl bg-muted/30 border-border/40 text-base shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Phone className="w-4 h-4 text-primary" />
                {t("ride.your_phone") || "Phone Number"}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 h-12 px-3 rounded-2xl bg-muted/30 border border-border/40 shrink-0">
	                  <img src="/flags/kh.svg" alt="KH" className="w-5 h-4 rounded-sm object-cover" loading="lazy" decoding="async" />
                  <span className="text-sm font-medium text-foreground">+855</span>
                </div>
                <Input
                  value={riderPhone.replace(/^\+855\s?/, "")}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9);
                    setRiderPhone(digits ? `+855 ${digits}` : "");
                  }}
                  placeholder="12 345 678"
                  type="tel"
                  inputMode="numeric"
                  className="h-12 rounded-2xl bg-muted/30 border-border/40 text-base shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]"
                />
              </div>
              <p className="text-xs text-muted-foreground">Cambodia · 8-9 digits</p>
            </div>

            {/* Pickup Note */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageSquare className="w-4 h-4 text-primary" />
                {t("ride.pickup_note") || "Pickup Note"} <span className="text-muted-foreground font-normal text-xs">({t("ride.optional") || "optional"})</span>
              </label>
              <Input
                value={pickupNote}
                onChange={(e) => setPickupNote(e.target.value)}
                placeholder={t("ride.pickup_note_placeholder") || "e.g. Gate code #1234, near the blue building"}
                className="h-12 rounded-2xl bg-muted/30 border-border/40 text-base shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]"
              />
            </div>

            {/* Route summary */}
            <div className="rounded-2xl bg-muted/20 border border-border/30 p-4 space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 mt-1 rounded-full bg-primary ring-4 ring-primary/20 shrink-0" />
                <p className="text-sm text-foreground truncate">{pickup?.address || "Pickup"}</p>
              </div>
              <div className="ml-1.5 border-l-2 border-dashed border-border/40 h-4" />
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 mt-1 rounded-full bg-foreground ring-4 ring-foreground/20 shrink-0" />
                <p className="text-sm text-foreground truncate">{destination?.address || "Destination"}</p>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="px-5 pb-5 shrink-0" style={{ paddingBottom: `calc(20px + ${SAFE_BOTTOM})` }}>
            <Button
              className="w-full h-14 rounded-2xl text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
              disabled={!riderName.trim() || !riderPhone.trim()}
              onClick={() => setViewStep("ride-options")}
            >
              {t("ride.continue_to_rides") || "Continue"}
            </Button>
            {(!riderName.trim() || !riderPhone.trim()) && (
              <p className="text-xs text-destructive text-center mt-2">{t("ride.rider_info_required") || "Name and phone number are required"}</p>
            )}
          </div>
        </div>
      )}

      {/* ═══════ RIDE OPTIONS — full-screen overlay ═══════ */}
      {viewStep === "ride-options" && (
        <div
          className="absolute left-0 right-0 bottom-0 z-40 bg-background flex flex-col"
          style={{ top: HEADER_HEIGHT }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
            <h2 className="text-xl font-black text-foreground tracking-tight">{t("ride.choose_ride")}</h2>
            {/* Promo badge — only when promo is actually applied */}
            {appliedPromo && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-primary">{appliedPromo.description}</span>
              </div>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 px-5 pb-3 shrink-0">
            {(["popular", "premium", "accessible"] as const).map((cat) => (
              <button type="button"
                key={cat}
                onClick={() => setRideCategory(cat)}
                className={cn(
                  "px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-200 active:scale-95",
                  rideCategory === cat
                    ? "bg-foreground text-background shadow-md"
                    : "bg-card border border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
                )}
              >
                {t(`ride.${cat}`)}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-border/15 mx-5" />

          {/* Vehicle list — scrollable */}
          <div className="flex-1 overflow-y-auto px-1">
            {filteredVehiclesByCategory.map((v, index) => {
              const isSelected = selectedVehicle === v.id;
              const price = calcPrice(v, routeData?.distance_miles ?? 0, routeData?.duration_minutes ?? 0);
              const rawPrice = (() => {
                const raw = (v.basePrice + v.pricePerMile * (routeData?.distance_miles ?? 0) + v.perMinute * (routeData?.duration_minutes ?? 0)) * 1.0 * v.surgeMultiplier;
                return raw + v.bookingFee;
              })();
              const isMinFareApplied = rawPrice < v.minimumFare;
              const isDiscount = v.surgeMultiplier < 1;
              const originalPrice = isDiscount ? calcPrice({ ...v, surgeMultiplier: 1.0 }, routeData?.distance_miles ?? 0, routeData?.duration_minutes ?? 0) : null;

              return (
                <button type="button"
                  key={v.id}
                  onClick={() => setSelectedVehicle(v.id)}
                  className={cn(
                    "w-full flex items-center gap-3.5 px-4 py-4 text-left transition-all duration-200 active:scale-[0.98] relative",
                    isSelected
                      ? "bg-primary/5"
                      : "hover:bg-muted/8",
                    index < filteredVehiclesByCategory.length - 1 && "border-b border-border/8"
                  )}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
                  )}

                  {/* Vehicle image */}
                  <div className="w-[68px] shrink-0 flex items-center justify-center">
                    <img
	                      src={getVehicleImage(v.id, isCambodiaCountry)}
	                      alt={getVehicleName(v.id, v.name, isCambodiaCountry)}
	                      className={cn("w-[68px] h-auto transition-transform duration-200", isSelected && "scale-105")}
	                      loading="lazy"
	                      decoding="async"
	                    />
                  </div>

                  {/* Center: Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("text-[14px] font-bold", isSelected ? "text-foreground" : "text-foreground")}>{getVehicleName(v.id, v.name, isCambodiaCountry)}</span>
                      {v.id === "economy" && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary text-foreground dark:text-foreground text-[10px] font-bold">
                          <TrendingDown className="w-3 h-3" />LOW
                        </span>
                      )}
                      {v.id === "share" && (
                        <span className={cn(
                          "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold",
                          isCambodiaCountry
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-primary/10 text-primary"
                        )}>
                          {isCambodiaCountry ? <Zap className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                          {isCambodiaCountry ? "EV" : "SAVE"}
                        </span>
                      )}
                      {v.id === "comfort" && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary text-foreground dark:text-foreground text-[10px] font-bold">
                          <Sparkles className="w-3 h-3" />TOP
                        </span>
                      )}
                      {v.id === "ev" && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          <Zap className="w-3 h-3" />EV
                        </span>
                      )}
                      {v.id === "xl" && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold">
                          <Users className="w-3 h-3" />5+
                        </span>
                      )}
                      {v.id === "black-lane" && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                          <Crown className="w-3 h-3" />VIP
                        </span>
                      )}
                      {v.id === "black-xl" && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted/30 text-muted-foreground text-[10px] font-bold">
                          <Shield className="w-3 h-3" />PREMIUM
                        </span>
                      )}
                      {v.id === "luxury-xl" && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary text-foreground dark:text-foreground text-[10px] font-bold">
                          <Gem className="w-3 h-3" />ELITE
                        </span>
                      )}
                      {v.id === "pet" && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary text-foreground dark:text-foreground text-[10px] font-bold">
                          <PawPrint className="w-3 h-3" />PET
                        </span>
                      )}
                      {v.id === "wheelchair" && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                          <Accessibility className="w-3 h-3" />WAV
                        </span>
                      )}
                      <div className="flex items-center gap-0.5 text-muted-foreground/60">
                        <User className="w-3 h-3" />
                        <span className="text-[11px]">{getVehicleCapacity(v.id, v.capacity, isCambodiaCountry)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">
                      {etaTime(v.etaMin + (routeData?.duration_in_traffic_minutes ?? routeData?.duration_minutes ?? 0))} · {getVehicleDesc(v.id, v.desc, isCambodiaCountry)}
                    </p>
                  </div>

                  {/* Right: Price + check */}
                  <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
                    {isDiscount && originalPrice ? (
                      <>
                        {useKm ? (
                          <>
                            <span className="text-[11px] text-muted-foreground line-through">{toKHR(originalPrice)}</span>
                            <span className="text-[15px] font-bold text-primary">{toKHR(price)}</span>
                            <span className="text-[11px] text-muted-foreground">${price.toFixed(2)}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-[11px] text-muted-foreground line-through">${originalPrice.toFixed(2)}</span>
                            <span className="text-[15px] font-bold text-primary flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                              ${price.toFixed(2)}
                            </span>
                          </>
                        )}
                      </>
                    ) : useKm ? (
                      <>
                        <span className="text-[15px] font-bold text-foreground">{toKHR(price)}</span>
                        <span className="text-[11px] text-muted-foreground">${price.toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-[15px] font-bold text-foreground">${price.toFixed(2)}</span>
                    )}
                    {isMinFareApplied && (
                      <span className="text-[9px] text-amber-500 dark:text-amber-400 font-medium whitespace-nowrap">
                        Min: {useKm ? `${toKHR(v.minimumFare)}` : `$${v.minimumFare.toFixed(2)}`}
                      </span>
                    )}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Payment row */}
          <div className="shrink-0 border-t border-border/15">
            <button type="button"
              className="w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-muted/8 transition-colors active:scale-[0.98]"
              onClick={() => { setPaymentStep("idle"); setViewStep("confirm-ride"); }}
            >
              <div className="w-10 h-10 rounded-xl bg-muted/20 border border-border/20 flex items-center justify-center">
                <CreditCard className="w-[18px] h-[18px] text-muted-foreground" />
              </div>
              <span className="flex-1 text-[14px] text-foreground font-semibold text-left">{t("ride.payment_method")}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </button>
          </div>

          {/* Confirm button */}
          <div className="shrink-0 px-5 pt-1" style={{ paddingBottom: `calc(16px + ${SAFE_BOTTOM})` }}>
            <Button
              className="w-full h-14 rounded-2xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-[0.97] transition-all duration-200"
              onClick={() => { setPaymentStep("idle"); setViewStep("confirm-ride"); }}
            >
              {t("ride.confirm")} {getVehicleName(selectedVehicle, currentVehicle.name, isCambodiaCountry)} · {useKm ? `${toKHR(appliedPromo ? Math.max(0, currentPrice - promoDiscount) : currentPrice)} ($${(appliedPromo ? Math.max(0, currentPrice - promoDiscount) : currentPrice).toFixed(2)})` : `$${(appliedPromo ? Math.max(0, currentPrice - promoDiscount) : currentPrice).toFixed(2)}`}
            </Button>
          </div>
        </div>
      )}

      {/* ═══════ CONFIRM RIDE — with real Stripe payment ═══════ */}
      {viewStep === "confirm-ride" && (
        <div
          className="fixed inset-0 z-40 bg-background flex flex-col overflow-hidden"
        >
          <div
            className="w-full px-4 pb-2 shrink-0"
            style={{ paddingTop: "max(calc(var(--zivo-safe-top,0px) + 0.75rem), 20px)" }}
          >
            <button type="button"
              onClick={() => setViewStep("ride-options")}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors shrink-0 active:scale-95 touch-manipulation"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="pt-3">
              <h2 className="text-lg font-black text-foreground tracking-tight leading-none">{t("ride.confirm_your_ride")}</h2>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto min-h-0 px-4 overscroll-contain scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
            {/* Route card */}
            <div className="rounded-lg bg-card border border-border/20 px-3 py-2 shrink-0">
              <div className="flex items-start gap-2.5">
                <div className="flex flex-col items-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary ring-2 ring-primary/15" />
                  <div className="w-px flex-1 min-h-[18px] border-l-[1.5px] border-dashed border-muted-foreground/25 my-0.5" />
                  <div className="w-2 h-2 rounded-sm bg-foreground ring-2 ring-foreground/10" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("ride.pickup")}</p>
                    <p className="text-sm font-bold text-foreground leading-tight line-clamp-1">{pickup?.address || pickupDisplay}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("ride.dropoff")}</p>
                    <p className="text-sm font-bold text-foreground leading-tight line-clamp-1">{destination?.address || destinationDisplay}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Flight linked badge — shows when ride is connected to a flight booking */}
            {(upcomingFlight || isAirportAddress(pickup?.address)) && (
              <div className="rounded-lg bg-secondary border border-border px-3 py-2 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Plane className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-foreground">
                      {upcomingFlight ? "✈️ Linked to your flight" : "✈️ Airport Pickup"}
                    </p>
                    {upcomingFlight && (
                      <p className="text-[10px] text-muted-foreground">
                        {upcomingFlight.origin} → {upcomingFlight.destination} · Ref: {upcomingFlight.bookingReference}
                      </p>
                    )}
                    <p className="text-[9px] text-foreground font-medium mt-0.5">
                      {upcomingFlight ? "Driver will see your flight details for timely pickup" : "Driver notified this is an airport pickup"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-card border border-border/20 px-3 py-2 shrink-0">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-[50px] h-[36px] flex items-center justify-center shrink-0 bg-muted/10 rounded-md">
	                  <img src={getVehicleImage(selectedVehicle, isCambodiaCountry)} alt={getVehicleName(selectedVehicle, currentVehicle.name, isCambodiaCountry)} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground leading-tight">{getVehicleName(selectedVehicle, currentVehicle.name, isCambodiaCountry)} · {getVehicleCapacity(selectedVehicle, currentVehicle.capacity, isCambodiaCountry)} {t("ride.seats")}</p>
                  <p className="text-xs text-muted-foreground">{currentVehicle.etaMin} {t("ride.min_away")} · {getVehicleDesc(selectedVehicle, currentVehicle.desc, isCambodiaCountry)}</p>
                </div>
              </div>

              {routeData && (
              <div className="border-t border-border/15 pt-1.5 space-y-0.5 text-sm">
                  {currentVehicle.basePrice > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("ride.base_fare")}</span>
                      <span className="text-foreground">{dualPrice(currentVehicle.basePrice, useKm)}</span>
                    </div>
                  )}
                  {currentPrice <= currentVehicle.minimumFare && (
                    <p className="text-[10px] text-amber-500 dark:text-amber-400">
                      {t("ride.minimum_fare_applied")} · Min: {useKm ? `${toKHR(currentVehicle.minimumFare)} ($${currentVehicle.minimumFare.toFixed(2)})` : `$${currentVehicle.minimumFare.toFixed(2)}`}
                    </p>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("ride.distance")} ({formatDist(routeData.distance_miles, useKm)} × {useKm ? `${toKHR(perDistRate(currentVehicle.pricePerMile, useKm))}` : `$${perDistRate(currentVehicle.pricePerMile, useKm).toFixed(2)}`}/{distUnit(useKm)})</span>
                    <span className="text-foreground">{dualPrice(routeData.distance_miles * currentVehicle.pricePerMile, useKm)}</span>
                  </div>
                  {useKm && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground/70 text-[10px]">{t("ride.rate")}: {toKHR(perDistRate(currentVehicle.pricePerMile, useKm))}/km</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("ride.trip_time")} ({routeData.duration_minutes} min × {useKm ? toKHR(currentVehicle.perMinute) : `$${currentVehicle.perMinute.toFixed(2)}`})</span>
                    <span className="text-foreground">{dualPrice(routeData.duration_minutes * currentVehicle.perMinute, useKm)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("ride.booking_fee")}</span>
                    <span className="text-foreground">{dualPrice(currentVehicle.bookingFee, useKm)}</span>
                  </div>
                  {selectedCambodiaPayment === "card" && (currentVehicle as any).cardFeePct > 0 && (() => {
                    const baseFare = appliedPromo ? Math.max(0, currentPrice - promoDiscount) : currentPrice;
                    const cardFeeAmt = baseFare * ((currentVehicle as any).cardFeePct / 100);
                    return (
                      <div className="flex justify-between text-amber-600 dark:text-amber-400">
                        <span className="text-muted-foreground">{t("ride.card_fee")} ({(currentVehicle as any).cardFeePct}%)</span>
                        <span className="text-foreground">{dualPrice(cardFeeAmt, useKm)}</span>
                      </div>
                    );
                  })()}
                  {appliedPromo && promoDiscount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span className="font-medium">{t("ride.promo")} ({appliedPromo.code})</span>
                      <span className="font-medium">-{dualPrice(promoDiscount, useKm)}</span>
                    </div>
                  )}
                  {(() => {
                    const baseFare = appliedPromo ? Math.max(0, currentPrice - promoDiscount) : currentPrice;
                    const cardFeeAmt = selectedCambodiaPayment === "card" && (currentVehicle as any).cardFeePct > 0
                      ? baseFare * ((currentVehicle as any).cardFeePct / 100) : 0;
                    const totalWithCardFee = baseFare + cardFeeAmt;
                    return (
                      <div className="flex justify-between border-t border-border/15 pt-1 mt-0.5">
                        <span className="font-bold text-foreground text-[13px]">{t("ride.total")}</span>
                        <div className="text-right">
                          {useKm ? (
                            <>
                              <p className="font-bold text-foreground text-[15px]">{toKHR(totalWithCardFee)}</p>
                              <p className="text-[10px] text-muted-foreground">${totalWithCardFee.toFixed(2)}</p>
                            </>
                          ) : (
                            <span className="font-bold text-foreground text-[15px]">${totalWithCardFee.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {!routeData && (
                <div className="text-right">
                  {useKm ? (
                    <>
                      <p className="text-lg font-black text-foreground">{toKHR(currentPrice)}</p>
                      <p className="text-[11px] text-muted-foreground">${currentPrice.toFixed(2)}</p>
                    </>
                  ) : (
                    <p className="text-lg font-black text-foreground">${currentPrice.toFixed(2)}</p>
                  )}
                </div>
              )}
            </div>

            {/* Route info pills */}
            {routeData && (
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex-1 flex items-center justify-center gap-1 rounded-md bg-card border border-border/20 px-1.5 py-1.5">
                  <Timer className="w-3 h-3 text-primary" />
                  <span className="text-sm font-bold text-foreground">{routeData.duration_minutes} {t("ride.min_unit")}</span>
                </div>
                <div className="flex-1 flex items-center justify-center gap-1 rounded-md bg-card border border-border/20 px-1.5 py-1.5">
                  <Route className="w-3 h-3 text-primary" />
                  <span className="text-sm font-bold text-foreground">{formatDist(routeData.distance_miles, useKm)}</span>
                </div>
                {routeData.traffic_level && (
                  <div className="flex-1 flex items-center justify-center gap-1 rounded-md bg-card border border-border/20 px-1.5 py-1.5">
                    <Car className="w-3 h-3 text-primary" />
                    <span className="text-sm font-bold text-foreground capitalize">{t(`ride.traffic_${routeData.traffic_level}`)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Promo Code — inline row */}
            <div className="rounded-lg bg-card border border-border/20 px-3 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <Tag className="w-3 h-3 text-primary shrink-0" />
                <span className="text-sm font-bold text-foreground shrink-0">{t("ride.promo")}</span>
                <Input
                  placeholder={t("ride.enter_code")}
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  className="flex-1 h-8 font-mono text-[11px] uppercase tracking-wider"
                  disabled={!!appliedPromo}
                />
                {appliedPromo ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => { setAppliedPromo(null); setPromoInput(""); setPromoDiscount(0); }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-semibold text-[12px]"
                    disabled={!promoInput.trim() || promoValidating}
                    onClick={handleApplyPromo}
                  >
                    {promoValidating ? <Loader2 className="w-3 h-3 animate-spin" /> : t("ride.apply")}
                  </Button>
                )}
              </div>
              {appliedPromo && (
                <div className="flex items-center gap-1 mt-1.5 px-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-[10px] font-semibold text-primary">{appliedPromo.description} — saves ${promoDiscount.toFixed(2)}</span>
                </div>
              )}
              {promoError && (
                <p className="text-[10px] text-destructive mt-1 px-0.5">{promoError}</p>
              )}
            </div>

            {/* Payment Section — skip if free ride */}
            <div className="shrink-0 pb-6">
              {(() => {
                const base = appliedPromo ? Math.max(0, currentPrice - promoDiscount) : currentPrice;
                const cardFee = selectedCambodiaPayment === "card" && (currentVehicle as any).cardFeePct > 0
                  ? base * ((currentVehicle as any).cardFeePct / 100) : 0;
                const finalPrice = base + cardFee;

                if (finalPrice <= 0) {
                  return (
                    <div className="space-y-3">
                      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 text-center space-y-1">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm font-bold text-foreground">No payment needed</p>
                        <p className="text-xs text-muted-foreground">This ride is completely free with your promo code!</p>
                      </div>
                      <Button
                        className="w-full h-14 rounded-2xl text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                        disabled={isSubmitting}
                        onClick={() => handleRequestRide()}
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Book Free ${getVehicleName(selectedVehicle, currentVehicle.name, isCambodiaCountry)}`}
                      </Button>
                    </div>
                  );
                }

                return (
                  <RidePaymentSection
                    price={finalPrice}
                    vehicleName={getVehicleName(selectedVehicle, currentVehicle.name, isCambodiaCountry)}
                    isSubmitting={isSubmitting}
                    onAuthorizeWithSavedCard={(pmId) => handleRequestRide(pmId)}
                    onAuthorizeWithNewCard={() => handleRequestRide()}
                    clientSecret={clientSecret}
                    onPaymentSuccess={handlePaymentSuccess}
                    paymentFailed={paymentStep === "failed"}
                    onClearError={() => setPaymentStep("idle")}
                    isCambodia={useKm}
                    cashAllowed={cashAllowed}
                    onCashConfirm={handleCashRide}
                    onAbaConfirm={handleAbaRide}
                    onBackToMethods={() => { setClientSecret(null); setPaymentStep("idle"); }}
                    selectedPaymentMethod={selectedCambodiaPayment}
                    onPaymentMethodChange={(m) => setSelectedCambodiaPayment(m)}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ ABA WAITING — waiting for payment completion ═══════ */}
      {viewStep === "aba-waiting" && (
        <div
          className="absolute left-0 right-0 z-30 rounded-t-[28px] bg-background shadow-[0_-8px_30px_hsl(var(--foreground)/0.08)] px-5 pt-4 pb-6"
          style={{ bottom: `calc(${BOTTOM_NAV_HEIGHT}px + ${SAFE_BOTTOM})`, minHeight: 300 }}
        >
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-muted-foreground/25" />

          <div className="flex flex-col items-center justify-center gap-3 py-4">
            {/* KHQR Code Image */}
            <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-border/50 bg-white p-2">
              <img
	                src="/images/aba-khqr.jpeg"
	                alt="Bakong KHQR Payment Code"
	                className="w-full h-full object-contain"
	                loading="lazy"
	                decoding="async"
	              />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-foreground">ស្កេន QR ដើម្បីបង់ប្រាក់</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
                Scan this QR code with ABA Mobile app to pay
              </p>
              {currentPrice > 0 && (
                <p className="text-xl font-bold text-foreground mt-1">
                  ${(appliedPromo ? Math.max(0, currentPrice - promoDiscount) : currentPrice).toFixed(2)}
                </p>
              )}
            </div>

            {/* Confirm payment button */}
            <Button
              className="w-full h-12 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              onClick={async () => {
                const pendingId = rideRequestId || sessionStorage.getItem("aba_pending_ride_id");
                if (pendingId) {
                  // Send Telegram notification (fire-and-forget)
                  supabase.functions.invoke("notify-aba-payment", {
                    body: {
                      ride_request_id: pendingId,
                      amount: appliedPromo ? Math.max(0, currentPrice - promoDiscount) : currentPrice,
                      customer_name: otherName.trim() || user?.user_metadata?.full_name || "",
                      pickup: pickup?.address || "",
                      dropoff: destination?.address || "",
                      vehicle_type: selectedVehicle,
                    },
                  }).catch(err => console.warn("[Telegram] Notification failed:", err));

                  handleAbaPaymentReturn(pendingId);
                }
              }}
            >
              <CheckCircle className="w-4 h-4" />
              បានបង់រួចហើយ / I've Paid
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/80"
              onClick={async () => {
                if (rideRequestId) {
                  await supabase.from("ride_requests").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", rideRequestId);
                }
                sessionStorage.removeItem("aba_pending_ride_id");
                setViewStep("confirm-ride");
                toast.info("Payment cancelled. Choose another payment method.");
              }}
            >
              បោះបង់ / Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ═══════ SEARCHING — bottom sheet over map ═══════ */}
      {viewStep === "searching" && (() => {
        const phaseConfig = {
          dispatching: { label: t("ride.search_phase_dispatching"), icon: "🔍", color: "text-primary" },
          waiting_response: { label: t("ride.search_phase_waiting"), icon: "📡", color: "text-primary" },
          expanding: { label: t("ride.search_phase_expanding"), icon: "📡", color: "text-amber-500" },
          retrying: { label: t("ride.search_phase_retrying"), icon: "🔄", color: "text-amber-500" },
        };
        const phase = phaseConfig[searchPhase];
        const mins = Math.floor(searchElapsed / 60);
        const secs = searchElapsed % 60;
        const progressPct = Math.min(95, (searchElapsed / 90) * 100);

        return (
        <div
          className="absolute left-0 right-0 z-30 rounded-t-[28px] bg-background shadow-[0_-8px_30px_hsl(var(--foreground)/0.08)] px-5 pt-4 pb-4"
          style={{ bottom: `calc(${BOTTOM_NAV_HEIGHT}px + ${SAFE_BOTTOM})` }}
        >
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-muted-foreground/25" />

          <div className="flex flex-col items-center justify-center">
            {/* Animated pulse ring */}
            <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-1 rounded-full border-2 border-primary/20"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
              />
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg">{phase.icon}</span>
              </div>
            </div>

            <h3 className="text-lg font-bold text-foreground mb-1">{t("ride.finding_your_driver")}</h3>
            
            {/* Live status phase */}
            <motion.p
              key={searchPhase}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm font-medium ${phase.color} mb-2`}
            >
              {phase.label}
            </motion.p>

            {/* Progress bar */}
            <div className="w-full max-w-[220px] h-1.5 rounded-full bg-muted/40 mb-3 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <span>{t("ride.drivers_nearby")}: {nearbyDriverCount}</span>
              <span>·</span>
              <span>{t("ride.estimated_pickup")}: {currentVehicle.etaMin} {t("ride.min_unit")}</span>
            </div>

            {/* Elapsed timer */}
            <p className="text-[11px] text-muted-foreground/60 mb-3">
              {t("ride.search_elapsed")}: {mins}:{secs.toString().padStart(2, "0")}
            </p>

            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/80"
              onClick={handleCancelRide}
            >
              {t("ride.cancel_ride")}
            </Button>
          </div>
        </div>
        );
      })()}

      {/* ═══════ DRIVER ASSIGNED — bottom sheet over map ═══════ */}
      {viewStep === "driver-assigned" && (
        <div
          className="absolute left-0 right-0 z-30 rounded-t-[28px] bg-background shadow-[0_-8px_30px_hsl(var(--foreground)/0.08)] px-5 pt-3 pb-4"
          style={{ bottom: `calc(${BOTTOM_NAV_HEIGHT}px + ${SAFE_BOTTOM})` }}
        >
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-muted-foreground/25" />

          <h3 className="text-base font-bold text-foreground text-center mb-0.5">{t("ride.meet_driver_at_pickup")}</h3>
          <p className="text-xs text-muted-foreground text-center mb-3">{t("ride.driver_arriving_in_minutes").replace("{minutes}", String(assignedDriver.etaMin))}</p>

          <div className="border-t border-border/15 pt-3">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-14 h-14 shrink-0">
                <AvatarFallback className="bg-foreground text-background font-bold text-lg">{assignedDriver.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground">{assignedDriver.name}</p>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-sm text-muted-foreground">{assignedDriver.rating} · {assignedDriver.trips.toLocaleString()} {t("ride.trips")}</span>
                </div>
                <p className="text-xs text-muted-foreground">{assignedDriver.vehicle}</p>
                <p className="text-xs font-mono font-bold text-foreground">{assignedDriver.plate}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border/15 pt-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl gap-1.5 text-sm"
              onClick={() => navigate("/chat", { state: { openChat: { userId: assignedDriver.id, name: assignedDriver.name } } })}
            >
              <MessageSquare className="w-4 h-4" />
              {t("ride.message")}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl gap-1.5 text-sm"
              onClick={() => assignedDriver.phone ? window.location.href = `tel:${assignedDriver.phone}` : toast.info("Driver phone not available")}
            >
              <Phone className="w-4 h-4" />
              {t("ride.call")}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl gap-1.5 text-sm text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={handleCancelRide}
            >
              <X className="w-4 h-4" />
              {t("ride.cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* ═══════ DRIVER EN ROUTE — bottom sheet over map ═══════ */}
      {viewStep === "driver-en-route" && (
        <div
          className="absolute left-0 right-0 z-30 rounded-t-[28px] bg-background shadow-[0_-8px_30px_hsl(var(--foreground)/0.08)] px-5 pt-3 pb-4"
          style={{ bottom: `calc(${BOTTOM_NAV_HEIGHT}px + ${SAFE_BOTTOM})`, height: 200 }}
        >
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-muted-foreground/25" />

          <h3 className="text-base font-bold text-foreground mb-2">
            {t("ride.driver_arriving_in")} {driverEta > 0 ? `${driverEta} ${t("ride.min_unit")}` : t("ride.now")}
          </h3>

          <div className="flex items-center gap-2 mb-3 text-sm">
            <Car className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-foreground">{assignedDriver.name}</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">{assignedDriver.vehicle}</span>
            <span className="text-muted-foreground">|</span>
            <span className="font-mono font-bold text-foreground">{assignedDriver.plate}</span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl gap-1.5 text-sm"
              onClick={() => navigate("/chat", { state: { openChat: { userId: assignedDriver.id, name: assignedDriver.name } } })}
            >
              <MessageSquare className="w-4 h-4" />
              {t("ride.message")}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl gap-1.5 text-sm"
              onClick={() => assignedDriver.phone ? window.location.href = `tel:${assignedDriver.phone}` : toast.info("Driver phone not available")}
            >
              <Phone className="w-4 h-4" />
              {t("ride.call")}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl gap-1.5 text-sm text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={handleCancelRide}
            >
              <X className="w-4 h-4" />
              {t("ride.cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* ═══════ TRIP IN PROGRESS — bottom sheet over map ═══════ */}
      {viewStep === "trip-in-progress" && (
        <div
          className="absolute left-0 right-0 z-30 rounded-t-[28px] bg-background shadow-[0_-8px_30px_hsl(var(--foreground)/0.08)] px-5 pt-3 pb-4"
          style={{ bottom: `calc(${BOTTOM_NAV_HEIGHT}px + ${SAFE_BOTTOM})`, height: 220 }}
        >
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-muted-foreground/25" />

          <h3 className="text-base font-bold text-foreground mb-0.5">{t("ride.heading_to_destination")}</h3>
          {driverEta > 0 ? (
            <p className="text-xs text-muted-foreground mb-2">{t("ride.eta")}: {driverEta} {t("ride.min_unit")}</p>
          ) : routeData ? (
            <p className="text-xs text-muted-foreground mb-2">{t("ride.eta")}: {routeData.duration_minutes} {t("ride.min_unit")}</p>
          ) : null}

          <div className="flex items-center gap-2 mb-3 text-sm">
            <Car className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-foreground">{assignedDriver.name}</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground truncate">{assignedDriver.vehicle}</span>
            <span className="text-muted-foreground">|</span>
            <span className="font-mono font-bold text-foreground shrink-0">{assignedDriver.plate}</span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl gap-1.5 text-sm"
              onClick={() => {
                const link = `${window.location.origin}/rides/track/${rideRequestId ?? ""}`;
                navigator.clipboard.writeText(link).then(() => toast.success("Trip link copied!")).catch(() => toast.info(link));
              }}
            >
              <Route className="w-4 h-4" />
              Share Trip
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl gap-1.5 text-sm"
              onClick={() => assignedDriver.phone ? window.location.href = `tel:${assignedDriver.phone}` : toast.info("Driver phone not available")}
            >
              <Phone className="w-4 h-4" />
              Call
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl gap-1.5 text-sm"
              onClick={() => navigate("/safety")}
            >
              <Shield className="w-4 h-4" />
              Safety
            </Button>
          </div>
        </div>
      )}

      {/* ═══════ TRIP COMPLETE — full-screen overlay ═══════ */}
      {(viewStep === "trip-complete" || viewStep === "complete") && (
        <div
          className="absolute inset-0 z-30 bg-background overflow-y-auto flex flex-col px-5 pt-6 pb-6"
        >
          <div className="text-center mb-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
            </motion.div>
            <h3 className="text-xl font-bold text-foreground">Trip Complete!</h3>
            <p className="text-sm text-muted-foreground mt-1">You've arrived</p>
          </div>

          {/* Trip summary */}
          <div className="rounded-2xl bg-card border border-border/30 p-4 mb-4">
            <h4 className="text-sm font-bold text-foreground mb-3">Trip summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pickup</span>
                <span className="text-foreground text-right max-w-[60%] truncate">{pickup?.address || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destination</span>
                <span className="text-foreground text-right max-w-[60%] truncate">{destination?.address || "—"}</span>
              </div>
              {routeData && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="text-foreground">{routeData.duration_minutes} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance</span>
                    <span className="text-foreground">{formatDist(routeData.distance_miles, useKm)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vehicle</span>
                <span className="text-foreground">{getVehicleName(selectedVehicle, currentVehicle.name, isCambodiaCountry)}</span>
              </div>
              {routeData && (
                <>
                  <div className="border-t border-border/15 pt-2 mt-1 space-y-1.5">
                    {currentVehicle.basePrice > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t("ride.base_fare")}</span>
                        <span className="text-foreground">{dualPrice(currentVehicle.basePrice, useKm)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Distance</span>
                      <span className="text-foreground">{dualPrice(routeData.distance_miles * currentVehicle.pricePerMile, useKm)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Time</span>
                      <span className="text-foreground">{dualPrice(routeData.duration_minutes * currentVehicle.perMinute, useKm)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Booking fee</span>
                      <span className="text-foreground">{dualPrice(currentVehicle.bookingFee, useKm)}</span>
                    </div>
                  </div>
                </>
              )}
              {appliedPromo && promoDiscount > 0 && (
                <div className="flex justify-between text-primary">
                  <span className="font-medium">Discount ({appliedPromo.code})</span>
                  <span className="font-medium">-{dualPrice(promoDiscount, useKm)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border/20 pt-2">
                <span className="font-bold text-foreground">Amount charged</span>
                <span className="font-bold text-foreground">{dualPrice(appliedPromo ? Math.max(0, currentPrice - promoDiscount) : currentPrice, useKm)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment</span>
                <span className="text-foreground">{ridePaymentLabel(selectedCambodiaPayment, useKm)}</span>
              </div>
            </div>
          </div>

          {/* Rate driver */}
          <div className="rounded-2xl bg-card border border-border/30 p-4 mb-4">
            <h4 className="text-sm font-bold text-foreground mb-3">Rate {assignedDriver.name}</h4>
            <div className="flex justify-center gap-2 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button type="button" key={star} aria-label={`Rate ${star} ${star === 1 ? "star" : "stars"}`} onClick={() => setRating(star)} className="touch-manipulation">
                  <Star
                    className={cn(
                      "w-8 h-8 transition-colors",
                      star <= rating ? "text-amber-500 fill-amber-500" : "text-border"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Add tip */}
          <div className="rounded-2xl bg-card border border-border/30 p-4 mb-6">
            <h4 className="text-sm font-bold text-foreground mb-3">Add a tip?</h4>
            <div className="flex gap-2">
              {[5, 10, 20, 50].map((pct) => {
                const tipAmount = Math.round(currentPrice * pct) / 100;
                const isSelected = tip !== null && Math.abs(tip - tipAmount) < 0.01;
                return (
                  <button type="button"
                    key={pct}
                    onClick={() => setTip(isSelected ? null : tipAmount)}
                    className={cn(
                      "flex-1 py-2 rounded-xl border text-center transition-all",
                      isSelected
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-foreground border-border/40 hover:border-foreground/30"
                    )}
                  >
                    <span className="text-sm font-bold block">{pct}%</span>
                    <span className="text-[10px] opacity-70">{dualPrice(tipAmount, useKm)}</span>
                  </button>
                );
              })}
              <button type="button"
                onClick={() => {
                  const input = prompt("Enter custom tip amount ($):");
                  if (input) {
                    const val = parseFloat(input);
                    if (!isNaN(val) && val > 0) setTip(val);
                  }
                }}
                className={cn(
                  "flex-1 py-2 rounded-xl border text-sm font-bold transition-all",
                  tip !== null && ![5, 10, 20, 50].some(p => Math.abs(tip - Math.round(currentPrice * p) / 100) < 0.01)
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-border/40 hover:border-foreground/30"
                )}
              >
                {tip !== null && ![5, 10, 20, 50].some(p => Math.abs(tip - Math.round(currentPrice * p) / 100) < 0.01)
                  ? dualPrice(tip, useKm)
                  : "Custom"}
              </button>
            </div>
          </div>

          <Button
            className="w-full h-14 rounded-2xl text-base font-bold bg-foreground text-background hover:bg-foreground/90 shadow-lg"
            onClick={handleReset}
          >
            Done
          </Button>
        </div>
      )}

      {/* ═══════ Legacy: PICKUP CONFIRM (backward compat) ═══════ */}
      {viewStep === "pickup-confirm" && (
        <div
          className="absolute left-0 right-0 z-30 bg-background rounded-t-[1.5rem] border-t border-border/30 px-4 pt-4 pb-4 overflow-y-auto"
          style={{ bottom: `calc(${BOTTOM_NAV_HEIGHT}px + ${SAFE_BOTTOM})` }}
        >
          <h3 className="text-base font-bold text-foreground mb-3">Confirm pickup</h3>
          <AddressAutocomplete
            placeholder="Edit pickup location"
            value={pickupDisplay}
            onSelect={handlePickupSelect}
            country={rideCountry}
            className="mb-3"
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <MapPin className="w-4 h-4 text-foreground" />
            <span className="font-medium text-foreground">To:</span>
            <span className="truncate">{destination?.address || destinationDisplay}</span>
          </div>
          <Button
            className="w-full h-14 rounded-2xl text-base font-bold bg-foreground text-background hover:bg-foreground/90 shadow-lg gap-2"
            onClick={() => handleRequestRide()}
            disabled={isSubmitting}
          >
            <Zap className="w-5 h-5" />
            {isSubmitting ? "Requesting..." : "Request Ride"}
          </Button>
        </div>
      )}

      {/* Cancel Ride Modal */}
      <CancelRideModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirmCancel={handleConfirmCancel}
        role="customer"
        tripPrice={currentPrice}
        tripPhase={
          viewStep === "searching" ? "searching"
            : viewStep === "driver-assigned" ? "driver-assigned"
            : viewStep === "driver-en-route" ? "driver-en-route"
            : "trip-in-progress"
        }
        bookedPassengers={1}
        driverWaitMinutes={0}
        t={t}
      />

    </div>
  );
}

/* ─── Haversine fallback for distance estimation ─── */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
