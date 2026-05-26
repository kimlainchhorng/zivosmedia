/**
 * Real Hotel Search Hook
 * Uses Booking.com affiliate via Travelpayouts redirect
 * 
 * Since Hotellook was discontinued (Oct 2025), we use Booking.com redirect
 * with proper tracking through /out endpoint
 */

import { useState, useCallback } from "react";
import type { HotelResult } from "@/components/hotels/HotelResultCard";
import type { HotelFilters } from "@/components/hotels/HotelFilters";
import { getCityBySlug, type City } from "@/data/cities";

export interface HotelSearchParams {
  citySlug: string;        // URL-safe slug
  cityName: string;        // Display name
  checkIn: string;         // YYYY-MM-DD
  checkOut: string;        // YYYY-MM-DD
  adults: number;
  rooms: number;
  children?: number;
}

export interface HotelSearchResponse {
  hotels: HotelResult[];
  isRealPrice: boolean;
  whitelabelUrl: string;
  message?: string;
  totalResults: number;
}

// Build Booking.com affiliate URL for hotel search
export function buildBookingUrl(params: HotelSearchParams): string {
  const marker = '618730';  // Travelpayouts marker
  
  const urlParams = new URLSearchParams({
    ss: params.cityName,
    checkin: params.checkIn,
    checkout: params.checkOut,
    group_adults: String(params.adults),
    no_rooms: String(params.rooms),
    aid: marker,
    label: 'zivo_hotels',
  });
  
  if (params.children) {
    urlParams.set('group_children', String(params.children));
  }
  
  return `https://www.booking.com/searchresults.html?${urlParams.toString()}`;
}

// Build Hotels.com affiliate URL
export function buildHotelsComUrl(params: HotelSearchParams): string {
  const urlParams = new URLSearchParams({
    'q-destination': params.cityName,
    'q-check-in': params.checkIn,
    'q-check-out': params.checkOut,
    'q-room-0-adults': String(params.adults),
    'q-rooms': String(params.rooms),
  });
  
  return `https://www.hotels.com/search.do?${urlParams.toString()}`;
}

// Build Expedia affiliate URL
export function buildExpediaUrl(params: HotelSearchParams): string {
  const urlParams = new URLSearchParams({
    destination: params.cityName,
    startDate: params.checkIn,
    endDate: params.checkOut,
    adults: String(params.adults),
    rooms: String(params.rooms),
  });
  
  return `https://www.expedia.com/Hotel-Search?${urlParams.toString()}`;
}

// Generate indicative hotel results for display
// These are NOT real prices - users will see real prices on partner site
function generateIndicativeHotels(
  citySlug: string, 
  cityName: string,
  nights: number,
  count: number = 10
): HotelResult[] {
  const hotelChains = [
    { name: "Marriott", prefix: "JW Marriott", stars: 5, priceMultiplier: 1.8 },
    { name: "Hilton", prefix: "Hilton", stars: 5, priceMultiplier: 1.6 },
    { name: "Hyatt", prefix: "Grand Hyatt", stars: 5, priceMultiplier: 1.7 },
    { name: "Sheraton", prefix: "Sheraton", stars: 4, priceMultiplier: 1.3 },
    { name: "Holiday Inn", prefix: "Holiday Inn", stars: 4, priceMultiplier: 1.0 },
    { name: "Novotel", prefix: "Novotel", stars: 4, priceMultiplier: 1.1 },
    { name: "Ibis", prefix: "Ibis Styles", stars: 3, priceMultiplier: 0.7 },
    { name: "Best Western", prefix: "Best Western Plus", stars: 3, priceMultiplier: 0.8 },
    { name: "Boutique", prefix: "The", stars: 4, priceMultiplier: 1.2 },
    { name: "Resort", prefix: "Royal", stars: 5, priceMultiplier: 2.0 },
  ];

  const areas = [
    "City Center",
    "Downtown",
    "Business District",
    "Old Town",
    "Riverfront",
    "Arts District",
    "Financial District",
    "Historic Quarter",
  ];

  const hotelImages = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop&q=75&fm=webp",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=300&fit=crop&q=75&fm=webp",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop&q=75&fm=webp",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=300&fit=crop&q=75&fm=webp",
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&h=300&fit=crop&q=75&fm=webp",
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=400&h=300&fit=crop&q=75&fm=webp",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop&q=75&fm=webp",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&h=300&fit=crop&q=75&fm=webp",
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=300&fit=crop&q=75&fm=webp",
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop&q=75&fm=webp",
  ];

  // Base price varies by destination (rough estimates)
  const cityPriceMultiplier: Record<string, number> = {
    'new-york': 2.5,
    'paris': 2.2,
    'london': 2.4,
    'tokyo': 2.0,
    'dubai': 2.3,
    'singapore': 1.8,
    'bangkok': 0.8,
    'bali': 1.0,
    'phnom-penh': 0.5,
    'default': 1.0,
  };

  const cityMultiplier = cityPriceMultiplier[citySlug] || cityPriceMultiplier.default;
  const basePrice = 60 * cityMultiplier;

  return Array.from({ length: count }, (_, i) => {
    const chain = hotelChains[i % hotelChains.length];
    const area = areas[i % areas.length];
    const pricePerNight = Math.round(basePrice * chain.priceMultiplier * (0.9 + Math.random() * 0.4));
    
    return {
      id: `hotel-${citySlug}-${i}`,
      name: `${chain.prefix} ${cityName}`,
      area: `${area}, ${cityName}`,
      imageUrl: hotelImages[i % hotelImages.length],
      starRating: chain.stars,
      guestRating: 7.5 + Math.random() * 2, // 7.5-9.5
      reviewCount: Math.floor(500 + Math.random() * 3000),
      pricePerNight,
      amenities: ["wifi", "parking", "breakfast"].filter(() => Math.random() > 0.3),
      freeCancellation: Math.random() > 0.3,
      distanceFromCenter: Math.round((0.3 + Math.random() * 4) * 10) / 10,
    };
  }).sort((a, b) => a.pricePerNight - b.pricePerNight);
}

/**
 * Hook for hotel search with partner redirect
 */
export function useRealHotelSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<HotelResult[]>([]);
  const [searchParams, setSearchParams] = useState<HotelSearchParams | null>(null);
  const [whitelabelUrl, setWhitelabelUrl] = useState<string>("");
  const [isRealPrice, setIsRealPrice] = useState(false);

  const search = useCallback(async (
    params: HotelSearchParams, 
    filters?: HotelFilters
  ): Promise<HotelSearchResponse> => {
    setIsLoading(true);
    setSearchParams(params);

    // Build partner URLs
    const bookingUrl = buildBookingUrl(params);
    setWhitelabelUrl(bookingUrl);

    // Calculate nights
    const checkInDate = new Date(params.checkIn);
    const checkOutDate = new Date(params.checkOut);
    const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Simulate loading (real prices would come from API)
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate indicative results for UI
    // Real prices will be shown on partner site
    const indicativeHotels = generateIndicativeHotels(params.citySlug, params.cityName, nights, 12);
    
    // Apply filters if provided
    let filteredHotels = indicativeHotels;
    if (filters) {
      filteredHotels = indicativeHotels.filter(hotel => {
        if (hotel.pricePerNight < filters.priceRange[0] || hotel.pricePerNight > filters.priceRange[1]) {
          return false;
        }
        if (filters.starRating.length > 0 && !filters.starRating.includes(hotel.starRating)) {
          return false;
        }
        if (filters.guestRating && hotel.guestRating < filters.guestRating) {
          return false;
        }
        if (filters.distance && hotel.distanceFromCenter > filters.distance) {
          return false;
        }
        return true;
      });
    }

    setResults(filteredHotels);
    setIsRealPrice(false); // These are indicative, not real
    setIsLoading(false);

    return {
      hotels: filteredHotels,
      isRealPrice: false,
      whitelabelUrl: bookingUrl,
      message: "Prices shown are indicative. View real-time prices on partner site.",
      totalResults: filteredHotels.length,
    };
  }, []);

  const applyFilters = useCallback((filters: HotelFilters) => {
    if (!searchParams) return;
    
    const checkInDate = new Date(searchParams.checkIn);
    const checkOutDate = new Date(searchParams.checkOut);
    const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    const indicativeHotels = generateIndicativeHotels(searchParams.citySlug, searchParams.cityName, nights, 12);
    
    const filteredHotels = indicativeHotels.filter(hotel => {
      if (hotel.pricePerNight < filters.priceRange[0] || hotel.pricePerNight > filters.priceRange[1]) {
        return false;
      }
      if (filters.starRating.length > 0 && !filters.starRating.includes(hotel.starRating)) {
        return false;
      }
      if (filters.guestRating && hotel.guestRating < filters.guestRating) {
        return false;
      }
      if (filters.distance && hotel.distanceFromCenter > filters.distance) {
        return false;
      }
      return true;
    });
    
    setResults(filteredHotels);
  }, [searchParams]);

  return {
    isLoading,
    results,
    searchParams,
    whitelabelUrl,
    isRealPrice,
    search,
    applyFilters,
  };
}
