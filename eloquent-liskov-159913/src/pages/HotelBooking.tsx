import { useState } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import HotelResultsSkeleton from "@/components/hotel/HotelResultsSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Hotel,
  Search,
  CalendarDays,
  Users,
  Loader2,
  AlertCircle,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTripadvisorSearch, type TripadvisorLocation } from "@/hooks/useTripadvisorSearch";
import HotelResultCardPro from "@/components/hotel/HotelResultCardPro";
import HotelPartnerSelector from "@/components/hotel/HotelPartnerSelector";
import AffiliateRedirectNotice from "@/components/shared/AffiliateRedirectNotice";
import HotelTopSearchCTA from "@/components/hotel/HotelTopSearchCTA";
import HotelStickyBookingCTA from "@/components/hotel/HotelStickyBookingCTA";
import ImageHero from "@/components/shared/ImageHero";
import BigSearchCard from "@/components/shared/BigSearchCard";
import DestinationCardsGrid from "@/components/shared/DestinationCardsGrid";
import TrustSection from "@/components/shared/TrustSection";
import { EnhanceYourTrip } from "@/components/travel-extras";
import TravelFAQ from "@/components/shared/TravelFAQ";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import { TrustFeatureCards, OGImageMeta } from "@/components/marketing";
import { SEOContentBlock, InternalLinkGrid, PopularDestinationsGrid } from "@/components/seo";
import { hotelAffiliatePartners } from "@/data/hotelAffiliatePartners";
import HotelImageShowcase from "@/components/hotel/HotelImageShowcase";
import HotelExperienceGallery from "@/components/hotel/HotelExperienceGallery";
import HotelInspirationalBanner from "@/components/hotel/HotelInspirationalBanner";
import { HOTEL_DISCLAIMERS } from "@/config/hotelCompliance";

/**
 * ZIVO HOTELS - Top-Tier Hotel Search
 * Booking.com / Expedia quality
 */

const HotelBooking = () => {
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState("2");
  const [rooms, setRooms] = useState("1");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<TripadvisorLocation | null>(null);

  const { isLoading, error, results, searchHotels } = useTripadvisorSearch();

  const handleSearch = async () => {
    if (!destination.trim()) return;
    setHasSearched(true);
    setSelectedHotel(null);
    await searchHotels(destination);
  };

  const handleSelectHotel = (hotel: TripadvisorLocation) => {
    setSelectedHotel(hotel);
    setTimeout(() => {
      document.getElementById('partner-selector')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleBookHotel = (hotel: TripadvisorLocation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const partner = hotelAffiliatePartners[0];
    const url = partner.urlTemplate({
      destination: hotel.name,
      checkIn: checkIn ? format(checkIn, "yyyy-MM-dd") : undefined,
      checkOut: checkOut ? format(checkOut, "yyyy-MM-dd") : undefined,
      guests: parseInt(guests),
      rooms: parseInt(rooms),
    });
    import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(url));
  };

  const handleDestinationSelect = (city: string) => {
    setDestination(city);
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <SEOHead 
        title="ZIVO Hotels – Compare & Book Hotels Worldwide"
        description="Compare hotel prices from leading booking platforms. Find the best deals on hotels, resorts, and vacation rentals. Book with trusted partners."
      />
      <OGImageMeta pageType="hotels" />
      <Header />
      
      <main className="pb-32 lg:pb-20">
        {/* Hotel Disclaimer Banner - LOCKED TEXT */}
        <section className="border-b border-amber-500/20 py-2.5 bg-amber-500/5">
          <div className="container mx-auto px-4">
            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              {HOTEL_DISCLAIMERS.partnerBooking}
            </p>
          </div>
        </section>

        {/* Hero with Big Search */}
        <ImageHero service="hotels" icon={Hotel}>
          <BigSearchCard service="hotels">
            {/* Main Search Fields */}
            <div className="space-y-4">
              {/* Row 1: Destination */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Where are you going?</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 pointer-events-none" />
                  <Input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="City, hotel name, or destination"
                    className="h-14 pl-11 text-base"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>

              {/* Row 2: Dates & Guests */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Check-in */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Check-in</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-12 justify-start">
                        <CalendarDays className="mr-2 h-4 w-4 text-amber-500" />
                        {checkIn ? format(checkIn, "MMM d") : "Add date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={checkIn}
                        onSelect={setCheckIn}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Check-out */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Check-out</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-12 justify-start">
                        <CalendarDays className="mr-2 h-4 w-4 text-orange-500" />
                        {checkOut ? format(checkOut, "MMM d") : "Add date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={checkOut}
                        onSelect={setCheckOut}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Guests */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Guests</label>
                  <Select value={guests} onValueChange={setGuests}>
                    <SelectTrigger className="h-12">
                      <Users className="w-4 h-4 mr-2 text-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Guest</SelectItem>
                      <SelectItem value="2">2 Guests</SelectItem>
                      <SelectItem value="3">3 Guests</SelectItem>
                      <SelectItem value="4">4 Guests</SelectItem>
                      <SelectItem value="5">5+ Guests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Rooms */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Rooms</label>
                  <Select value={rooms} onValueChange={setRooms}>
                    <SelectTrigger className="h-12">
                      <Hotel className="w-4 h-4 mr-2 text-amber-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Room</SelectItem>
                      <SelectItem value="2">2 Rooms</SelectItem>
                      <SelectItem value="3">3 Rooms</SelectItem>
                      <SelectItem value="4">4+ Rooms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Search Button - Big & Prominent */}
            <Button 
              onClick={handleSearch}
              disabled={isLoading || !destination.trim()}
              size="lg"
              className={cn(
                "w-full h-14 font-bold text-lg mt-6",
                "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
                "shadow-xl shadow-amber-500/30 hover:shadow-amber-500/40",
                "transition-all duration-200 active:scale-[0.98]"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Search Hotels
                </>
              )}
            </Button>
          </BigSearchCard>
        </ImageHero>

        {/* Error State */}
        {error && (
          <div className="container mx-auto px-4 mb-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Search Results */}
        {hasSearched && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="container mx-auto px-4 py-8"
          >
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Searching hotels in {destination}...</span>
                </div>
                <HotelResultsSkeleton count={6} />
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">
                      Hotels in {destination}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {results.length} properties found • Compare prices across booking sites
                    </p>
                  </div>
                  <Badge variant="outline" className="hidden sm:flex">
                    Powered by TripAdvisor
                  </Badge>
                </div>

                <HotelTopSearchCTA 
                  hotelCount={results.length}
                  destination={destination}
                  checkIn={checkIn ? format(checkIn, "yyyy-MM-dd") : undefined}
                  checkOut={checkOut ? format(checkOut, "yyyy-MM-dd") : undefined}
                  guests={parseInt(guests)}
                  rooms={parseInt(rooms)}
                  className="mb-6"
                />

                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    {results.map((hotel) => (
                      <HotelResultCardPro
                        key={hotel.location_id}
                        id={hotel.location_id}
                        name={hotel.name}
                        image={hotel.photos?.[0]?.images?.medium?.url}
                        address={hotel.address_obj?.address_string || ""}
                        city={hotel.address_obj?.city || destination}
                        rating={parseFloat(hotel.rating || "0")}
                        reviewCount={parseInt(hotel.num_reviews || "0")}
                        priceLevel={hotel.price_level}
                        amenities={hotel.amenities || []}
                        isSelected={selectedHotel?.location_id === hotel.location_id}
                        onSelect={() => handleSelectHotel(hotel)}
                        onBook={() => handleBookHotel(hotel)}
                      />
                    ))}
                  </div>

                  <div className="space-y-6">
                    {selectedHotel && (
                      <div id="partner-selector">
                        <HotelPartnerSelector
                          hotelName={selectedHotel.name}
                          destination={destination}
                          checkIn={checkIn ? format(checkIn, "yyyy-MM-dd") : undefined}
                          checkOut={checkOut ? format(checkOut, "yyyy-MM-dd") : undefined}
                          guests={parseInt(guests)}
                          rooms={parseInt(rooms)}
                        />
                      </div>
                    )}

                    <AffiliateRedirectNotice variant="banner" />
                  </div>
                </div>

                {/* Price Disclaimer - LOCKED TEXT */}
                <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <p className="text-xs text-muted-foreground text-center font-medium mb-1">
                    {HOTEL_DISCLAIMERS.partnerBooking}
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    {HOTEL_DISCLAIMERS.price} ZIVO may earn a commission when you book through partner links.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <Hotel className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No hotels found</h3>
                <p className="text-muted-foreground mb-4">Try searching for a different destination</p>
              </div>
            )}
          </motion.section>
        )}

        {/* Discovery Sections (shown when no search) */}
        {!hasSearched && (
          <>
            {/* Inspirational Banner */}
            <HotelInspirationalBanner />
            
            {/* Featured Properties with Real Images */}
            <HotelImageShowcase onSelect={handleDestinationSelect} />
            
            {/* Experience Gallery */}
            <HotelExperienceGallery onCategorySelect={handleDestinationSelect} />
            
            {/* SEO Content Block */}
            <SEOContentBlock serviceType="hotels" className="bg-muted/5" />
            
            <DestinationCardsGrid 
              service="hotels" 
              onSelect={handleDestinationSelect}
            />
            
            {/* Popular Destinations for SEO */}
            <PopularDestinationsGrid />
            
            <TrustFeatureCards columns={4} />
            <TrustSection service="hotels" />
            <EnhanceYourTrip currentService="hotels" destination={destination} />
            
            {/* Internal Linking */}
            <InternalLinkGrid currentService="hotels" />
            
            <TravelFAQ serviceType="hotels" className="bg-muted/20" />
          </>
        )}

        {/* Sticky CTA */}
        {hasSearched && results.length > 0 && (
          <HotelStickyBookingCTA
            destination={destination}
            checkIn={checkIn ? format(checkIn, "yyyy-MM-dd") : undefined}
            checkOut={checkOut ? format(checkOut, "yyyy-MM-dd") : undefined}
            guests={parseInt(guests)}
            rooms={parseInt(rooms)}
          />
        )}
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default HotelBooking;
