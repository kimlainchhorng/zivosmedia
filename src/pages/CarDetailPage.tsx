/**
 * Car Rental Detail Page
 * Ramp-style booking summary with policies and CTA
 */

import { useState, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Users, 
  Briefcase, 
  Cog, 
  Snowflake, 
  CheckCircle, 
  Shield, 
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  CarFront
} from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { brandedCarModels } from "@/config/photos";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getAirportByCode } from "@/components/car/AirportAutocomplete";
import { RampGlobalDisclaimer } from "@/components/results";

// Get branded car for category
function getBrandedCarForCategory(category: string, id: string) {
  const categoryMapping: Record<string, string[]> = {
    economy: ["compact", "economy"],
    compact: ["compact"],
    midsize: ["midsize", "sedan"],
    suv: ["suv"],
    luxury: ["luxury", "exotic"],
  };
  
  const categoryKey = category.toLowerCase().split(" ")[0];
  const mappedCategories = categoryMapping[categoryKey] || [categoryKey];
  const matchingCars = brandedCarModels.filter(car => mappedCategories.includes(car.category));
  
  if (matchingCars.length === 0) return null;
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return matchingCars[hash % matchingCars.length];
}

export default function CarDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getDisplay } = useCurrency();

  // Parse search params
  const pickupCode = searchParams.get("pickup") || "";
  const pickupDate = searchParams.get("pickup_date") || "";
  const dropoffDate = searchParams.get("dropoff_date") || "";
  const pickupTime = searchParams.get("pickup_time") || "10:00";
  const dropoffTime = searchParams.get("dropoff_time") || "10:00";
  const category = searchParams.get("category") || "Economy";
  const price = parseFloat(searchParams.get("price") || "45");
  const carId = searchParams.get("carId") || "car-1";

  const days = useMemo(() => {
    if (!pickupDate || !dropoffDate) return 1;
    try {
      return Math.max(1, differenceInDays(parseISO(dropoffDate), parseISO(pickupDate)));
    } catch {
      return 1;
    }
  }, [pickupDate, dropoffDate]);

  const totalPrice = price * days;
  const brandedCar = useMemo(() => getBrandedCarForCategory(category, carId), [category, carId]);
  const airport = getAirportByCode(pickupCode);
  const locationName = airport?.city || pickupCode;

  const { formatted: dailyFormatted } = getDisplay(price, "USD");
  const { formatted: totalFormatted } = getDisplay(totalPrice, "USD");

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "EEE, MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const handleContinue = () => {
    const params = new URLSearchParams(searchParams);
    navigate(`/rent-car/traveler-info?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={`${category} Car Rental in ${locationName} | ZIVO`}
        description={`Book a ${category} rental car in ${locationName}. ${days} days from ${dailyFormatted}/day.`}
      />
      <Header />

      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Back Link */}
          <Link 
            to={`/rent-car/results?${searchParams.toString()}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to results
          </Link>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Car Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Card */}
              <div className="bg-card rounded-2xl border border-border/60 shadow-[var(--shadow-card)] overflow-hidden">
                {/* Image */}
                <div className="bg-muted/30 p-8 flex items-center justify-center">
                  {brandedCar ? (
                    <img
                      src={brandedCar.src}
	                      alt={`${brandedCar.brand} ${brandedCar.model}`}
	                      className="max-h-48 object-contain"
	                      loading="lazy"
	                      decoding="async"
	                    />
                  ) : (
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 flex items-center justify-center">
                      <CarFront className="w-14 h-14 text-emerald-500" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-ig-gradient mb-1">{category}</h1>
                      {brandedCar && (
                        <p className="text-muted-foreground">
                          {brandedCar.brand} {brandedCar.model} or similar
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">or similar</Badge>
                  </div>

                  {/* Specs */}
                  <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>5 seats</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" />
                      <span>2 bags</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Cog className="w-4 h-4" />
                      <span>Automatic</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Snowflake className="w-4 h-4" />
                      <span>A/C</span>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Pickup/Dropoff Details */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">Rental Details</h3>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-muted/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Calendar className="w-4 h-4" />
                          Pickup
                        </div>
                        <p className="font-medium">{formatDate(pickupDate)}</p>
                        <p className="text-sm text-muted-foreground">{pickupTime}</p>
                      </div>
                      
                      <div className="bg-muted/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Calendar className="w-4 h-4" />
                          Drop-off
                        </div>
                        <p className="font-medium">{formatDate(dropoffDate)}</p>
                        <p className="text-sm text-muted-foreground">{dropoffTime}</p>
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-4 h-4" />
                        Location
                      </div>
                      <p className="font-medium">{locationName} ({pickupCode})</p>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Policies */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">Policies</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Free Cancellation</p>
                          <p className="text-xs text-muted-foreground">Cancel up to 48 hours before pickup</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Theft Protection</p>
                          <p className="text-xs text-muted-foreground">Included in the rental price</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Unlimited Mileage</p>
                          <p className="text-xs text-muted-foreground">No restrictions on distance</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Booking Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <div className="bg-card rounded-2xl border border-border/60 shadow-[var(--shadow-card)] p-6">
                  <h3 className="font-semibold text-lg mb-4">Booking Summary</h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily rate</span>
                      <span>{dailyFormatted}/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span>{days} day{days !== 1 ? "s" : ""}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Estimated Total</span>
                      <span className="text-primary">{totalFormatted}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-3 mb-4 leading-relaxed">
                    Indicative price · Final price, availability, and booking terms confirmed on partner's secure checkout.
                  </p>

                  <Button 
                    onClick={handleContinue}
                    className="w-full gap-2 font-medium"
                    size="lg"
                  >
                    Continue to secure booking
                    <ExternalLink className="w-4 h-4" />
                  </Button>

                  <p className="text-[10px] text-center text-muted-foreground mt-3">
                    Powered by licensed travel partners
                  </p>
                </div>

                <RampGlobalDisclaimer className="mt-4" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
