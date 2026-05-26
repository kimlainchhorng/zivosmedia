/**
 * Car Detail Page
 * Public vehicle detail with booking flow
 */

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/shared/StarRating";
import SafeCaption from "@/components/social/SafeCaption";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Fuel,
  Settings2,
  Star,
  Zap,
  Shield,
  CheckCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, differenceInDays } from "date-fns";
import { useP2PVehicleDetail, useBookingPricing, useVehicleReviews } from "@/hooks/useP2PBooking";
import { useAuth } from "@/contexts/AuthContext";

export default function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [returnDate, setReturnDate] = useState<Date | undefined>(addDays(new Date(), 4));

  // Queries
  const { data: vehicle, isLoading } = useP2PVehicleDetail(id);
  const { data: reviews = [] } = useVehicleReviews(id);
  const totalDays = pickupDate && returnDate ? Math.max(1, differenceInDays(returnDate, pickupDate)) : 0;
  const { data: pricing } = useBookingPricing(id, totalDays);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="aspect-[16/10] rounded-xl" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 container mx-auto px-4 text-center">
          <Car className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Vehicle Not Found</h1>
          <p className="text-muted-foreground mb-4">This vehicle is no longer available.</p>
          <Button asChild>
            <Link to="/cars">Browse Available Cars</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const images = (vehicle.images as string[]) || [];

  const handleBookNow = () => {
    if (!user) {
      navigate(`/auth?redirect=/cars/${id}`);
      return;
    }
    navigate(`/cars/${id}/checkout?pickup=${format(pickupDate!, "yyyy-MM-dd")}&return=${format(returnDate!, "yyyy-MM-dd")}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${vehicle.year} ${vehicle.make} ${vehicle.model} | ZIVO Car Rental`}
        description={`Rent this ${vehicle.year} ${vehicle.make} ${vehicle.model} in ${vehicle.location_city}. $${vehicle.daily_rate}/day.`}
      />
      <Header />

      <main className="pt-20 pb-16">
        {/* Back button */}
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/cars")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Button>
        </div>

        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <div className="relative rounded-xl overflow-hidden bg-muted aspect-[16/10]">
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[currentImageIndex]}
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                    />
                    {images.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="icon"
                          aria-label="Previous image"
                          className="absolute left-3 top-1/2 -translate-y-1/2"
                          onClick={() => setCurrentImageIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          aria-label="Next image"
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          onClick={() => setCurrentImageIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {images.map((_, idx) => (
                            <button type="button"
                              key={idx}
                              aria-label={`Go to image ${idx + 1}`}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={cn(
                                "w-2 h-2 rounded-full transition-colors",
                                idx === currentImageIndex ? "bg-white" : "bg-white/50"
                              )}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Car className="w-20 h-20 text-muted-foreground" />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {vehicle.instant_book && (
                    <Badge className="bg-amber-500 text-primary-foreground gap-1">
                      <Zap className="w-3 h-3" />
                      Instant Book
                    </Badge>
                  )}
                </div>
              </div>

              {/* Title & Location */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h1>
                {vehicle.trim && (
                  <p className="text-muted-foreground">{vehicle.trim}</p>
                )}
                <p className="text-muted-foreground flex items-center gap-1 mt-2">
                  <MapPin className="w-4 h-4" />
                  {vehicle.location_city}, {vehicle.location_state}
                </p>
              </div>

              {/* Key Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Seats</p>
                    <p className="font-medium">{vehicle.seats || 5}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Settings2 className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Trans</p>
                    <p className="font-medium capitalize">{vehicle.transmission}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Fuel className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fuel</p>
                    <p className="font-medium capitalize">{vehicle.fuel_type?.replace("_", " ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Car className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Doors</p>
                    <p className="font-medium">{vehicle.doors || 4}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {vehicle.description && (
                <div>
                  <h2 className="text-lg font-semibold mb-2">About this car</h2>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {vehicle.description}
                  </p>
                </div>
              )}

              {/* Features */}
              {vehicle.features && (vehicle.features as string[]).length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">Features</h2>
                  <div className="flex flex-wrap gap-2">
                    {(vehicle.features as string[]).map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Owner Info */}
              {vehicle.owner && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">
                          {vehicle.owner.full_name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{vehicle.owner.full_name}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {vehicle.owner.rating && (
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                              {vehicle.owner.rating.toFixed(1)}
                            </span>
                          )}
                          {vehicle.owner.total_trips && (
                            <span>{vehicle.owner.total_trips} trips</span>
                          )}
                          {vehicle.owner.response_rate && (
                            <span>{vehicle.owner.response_rate}% response</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reviews */}
              {reviews.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Reviews</h2>
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map((review) => (
                      <Card key={review.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <StarRating value={review.rating || 0} size="md" />
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(review.created_at), "MMM d, yyyy")}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-muted-foreground"><SafeCaption text={review.comment} /></p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Booking Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>${vehicle.daily_rate}/day</span>
                    {vehicle.instant_book && (
                      <Badge variant="secondary" className="gap-1">
                        <Zap className="w-3 h-3" />
                        Instant
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Date Selection */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Pickup</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {pickupDate ? format(pickupDate, "MMM d") : "Select"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={pickupDate}
                            onSelect={setPickupDate}
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Return</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {returnDate ? format(returnDate, "MMM d") : "Select"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={returnDate}
                            onSelect={setReturnDate}
                            disabled={(date) => date < (pickupDate || new Date())}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  {pricing && totalDays > 0 && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          ${pricing.dailyRate.toFixed(2)} × {pricing.days} days
                        </span>
                        <span>${pricing.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service fee</span>
                        <span>${pricing.serviceFee.toFixed(2)}</span>
                      </div>
                      {pricing.cleaningFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cleaning fee</span>
                          <span>${pricing.cleaningFee.toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-semibold text-base">
                        <span>Total</span>
                        <span>${pricing.total.toFixed(2)}</span>
                      </div>
                      {pricing.deposit > 0 && (
                        <p className="text-xs text-muted-foreground">+ ${pricing.deposit.toFixed(2)} refundable deposit</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleBookNow}
                      className="flex-1"
                      size="lg"
                      disabled={!pickupDate || !returnDate || totalDays <= 0}
                    >
                      {vehicle.instant_book ? "Book Now" : "Request to Book"}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="shrink-0 px-3"
                      aria-label="Share to chat"
                      onClick={() => openShareToChat({
                        kind: "ride",
                        title: vehicle.name,
                        subtitle: vehicle.description?.slice(0, 60) || "P2P vehicle rental",
                        meta: pricing ? `$${pricing.total.toFixed(0)} total · ${totalDays}d` : undefined,
                        image: vehicle.images?.[0] ?? null,
                        deepLink: `/cars/${id ?? ""}`,
                      })}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {!user && (
                    <p className="text-xs text-center text-muted-foreground">
                      You'll need to sign in to complete your booking
                    </p>
                  )}

                  {/* Trust Badges */}
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      <span>Protected by ZIVO insurance</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Verified owner</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      <span>Free cancellation (24h notice)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
