/**
 * Edit Search Form Wrappers
 * 
 * Service-specific form wrappers for the EditSearchModal.
 * Pre-fills forms with current search params and handles updates.
 */

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { parseISO, format } from "date-fns";
import { FlightSearchFormPro, HotelSearchFormPro, CarSearchFormPro } from "@/components/search";
import { parseFlightSearchParams } from "@/lib/flightSearchParams";
import { getCityBySlug } from "@/data/cities";

interface EditSearchFormProps {
  onSearch: (params: URLSearchParams) => void;
  onCancel: () => void;
  isUpdating?: boolean;
}

/**
 * Flight Edit Search Form
 * Pre-fills with current flight search params
 */
export function FlightEditSearchForm({ onSearch, onCancel, isUpdating }: EditSearchFormProps) {
  const [searchParams] = useSearchParams();
  
  // Parse current params
  const parsed = useMemo(() => parseFlightSearchParams(searchParams), [searchParams]);
  
  // Convert dates
  const departDate = parsed.departureDate ? parseISO(parsed.departureDate) : undefined;
  const returnDate = parsed.returnDate ? parseISO(parsed.returnDate) : undefined;

  return (
    <FlightSearchFormPro
      initialFrom={parsed.originIata}
      initialTo={parsed.destinationIata}
      initialDepartDate={departDate}
      initialReturnDate={returnDate}
      initialPassengers={parsed.passengers}
      initialCabin={parsed.cabinClass}
      initialTripType={parsed.tripType}
      onSearch={onSearch}
      navigateOnSearch={false}
      className="shadow-none border-0 bg-transparent p-0"
    />
  );
}

/**
 * Hotel Edit Search Form
 * Pre-fills with current hotel search params
 */
export function HotelEditSearchForm({ onSearch, onCancel, isUpdating }: EditSearchFormProps) {
  const [searchParams] = useSearchParams();
  
  // Parse current params
  const citySlug = searchParams.get("city") || "";
  const city = getCityBySlug(citySlug);
  const cityName = city?.name || citySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  
  const checkInStr = searchParams.get("checkin") || "";
  const checkOutStr = searchParams.get("checkout") || "";
  const adults = parseInt(searchParams.get("adults") || "2", 10);
  const rooms = parseInt(searchParams.get("rooms") || "1", 10);
  
  const checkIn = checkInStr ? parseISO(checkInStr) : undefined;
  const checkOut = checkOutStr ? parseISO(checkOutStr) : undefined;

  // Custom handler to convert HotelSearchParams to URLSearchParams
  const handleSearch = (hotelParams: any) => {
    const params = new URLSearchParams({
      city: hotelParams.citySlug,
      checkin: format(hotelParams.checkIn, "yyyy-MM-dd"),
      checkout: format(hotelParams.checkOut, "yyyy-MM-dd"),
      adults: String(hotelParams.adults),
      rooms: String(hotelParams.rooms),
    });
    
    if (hotelParams.children) {
      params.set("children", String(hotelParams.children));
    }
    
    onSearch(params);
  };

  return (
    <HotelSearchFormPro
      initialCity={citySlug}
      initialCityDisplay={cityName}
      initialCheckIn={checkIn}
      initialCheckOut={checkOut}
      initialAdults={adults}
      initialRooms={rooms}
      onSearch={handleSearch}
      navigateOnSearch={false}
      className="shadow-none border-0 bg-transparent p-0"
    />
  );
}

/**
 * Car Edit Search Form
 * Pre-fills with current car search params
 */
export function CarEditSearchForm({ onSearch, onCancel, isUpdating }: EditSearchFormProps) {
  const [searchParams] = useSearchParams();
  
  // Parse current params
  const pickupCode = searchParams.get("pickup") || "";
  const pickupDate = searchParams.get("pickup_date") || "";
  const pickupTime = searchParams.get("pickup_time") || "10:00";
  const dropoffDate = searchParams.get("dropoff_date") || "";
  const dropoffTime = searchParams.get("dropoff_time") || "10:00";
  const driverAge = searchParams.get("age") || "30";
  
  const pickupDateParsed = pickupDate ? parseISO(pickupDate) : undefined;
  const dropoffDateParsed = dropoffDate ? parseISO(dropoffDate) : undefined;

  return (
    <CarSearchFormPro
      initialPickup={pickupCode}
      initialPickupDate={pickupDateParsed}
      initialPickupTime={pickupTime}
      initialDropoffDate={dropoffDateParsed}
      initialDropoffTime={dropoffTime}
      initialDriverAge={driverAge}
      onSearch={onSearch}
      navigateOnSearch={false}
      className="shadow-none border-0 bg-transparent p-0"
    />
  );
}
