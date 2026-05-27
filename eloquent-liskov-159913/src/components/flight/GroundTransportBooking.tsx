import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Car,
  Bus,
  Train,
  UserRound,
  MapPin,
  Clock,
  Luggage,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Shield,
  Star,
  Wifi,
  Snowflake,
  Baby,
  Accessibility,
  Crown,
  Package,
  CarFront,
  Gem,
  Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface TransportOption {
  id: string;
  type: "private" | "shared" | "rental" | "shuttle";
  name: string;
  provider: string;
  price: number;
  priceType: "fixed" | "estimated" | "per_day";
  duration: string;
  capacity: number;
  luggage: number;
  rating: number;
  features: string[];
  icon: typeof Car;
  popular?: boolean;
  eco?: boolean;
}

interface GroundTransportBookingProps {
  arrivalAirport: string;
  arrivalTime: Date;
  departureAirport?: string;
  departureTime?: Date;
  destination?: string;
  onTransportBooked?: (optionId: string, details: { pickup: string; dropoff: string }) => void;
}

const transportOptions: TransportOption[] = [
  {
    id: "private_sedan",
    type: "private",
    name: "Private Sedan",
    provider: "ZIVO Executive",
    price: 85,
    priceType: "fixed",
    duration: "35 min",
    capacity: 3,
    luggage: 3,
    rating: 4.9,
    features: ["Meet & Greet", "Flight tracking", "Free waiting", "WiFi"],
    icon: Car,
    popular: true,
  },
  {
    id: "private_suv",
    type: "private",
    name: "Private SUV",
    provider: "ZIVO Executive",
    price: 120,
    priceType: "fixed",
    duration: "35 min",
    capacity: 5,
    luggage: 5,
    rating: 4.9,
    features: ["Meet & Greet", "Flight tracking", "Free waiting", "WiFi", "Child seat"],
    icon: CarFront,
  },
  {
    id: "private_luxury",
    type: "private",
    name: "Luxury Mercedes S-Class",
    provider: "ZIVO Black",
    price: 250,
    priceType: "fixed",
    duration: "35 min",
    capacity: 3,
    luggage: 3,
    rating: 5.0,
    features: ["VIP Meet & Greet", "Flight tracking", "Champagne", "WiFi", "Newspaper"],
    icon: Crown,
  },
  {
    id: "shared_shuttle",
    type: "shared",
    name: "Airport Shuttle",
    provider: "SuperShuttle",
    price: 25,
    priceType: "fixed",
    duration: "45-60 min",
    capacity: 8,
    luggage: 2,
    rating: 4.3,
    features: ["Door-to-door", "Shared ride", "WiFi"],
    icon: Bus,
    eco: true,
  },
  {
    id: "shared_express",
    type: "shared",
    name: "Express Bus",
    provider: "AirportExpress",
    price: 15,
    priceType: "fixed",
    duration: "40 min",
    capacity: 40,
    luggage: 2,
    rating: 4.5,
    features: ["Direct route", "USB charging", "WiFi"],
    icon: Bus,
    eco: true,
  },
  {
    id: "rental_economy",
    type: "rental",
    name: "Economy Car",
    provider: "Hertz",
    price: 45,
    priceType: "per_day",
    duration: "Self-drive",
    capacity: 4,
    luggage: 2,
    rating: 4.4,
    features: ["Unlimited miles", "Insurance included", "GPS"],
    icon: Car,
  },
  {
    id: "rental_suv",
    type: "rental",
    name: "Full-Size SUV",
    provider: "Enterprise",
    price: 85,
    priceType: "per_day",
    duration: "Self-drive",
    capacity: 7,
    luggage: 4,
    rating: 4.6,
    features: ["Unlimited miles", "Insurance included", "GPS", "Child seat available"],
    icon: CarFront,
  },
  {
    id: "shuttle_hotel",
    type: "shuttle",
    name: "Hotel Shuttle",
    provider: "Partner Hotels",
    price: 0,
    priceType: "fixed",
    duration: "30-45 min",
    capacity: 15,
    luggage: 2,
    rating: 4.2,
    features: ["Free for hotel guests", "Scheduled departures"],
    icon: Bell,
  },
];

const featureIcons: Record<string, typeof Car> = {
  "Meet & Greet": UserRound,
  "VIP Meet & Greet": Crown,
  "Flight tracking": Clock,
  "Free waiting": Clock,
  "WiFi": Wifi,
  "Child seat": Baby,
  "Champagne": Sparkles,
  "Door-to-door": MapPin,
  "Shared ride": Users,
  "Insurance included": Shield,
  "Wheelchair access": Accessibility,
};

const GroundTransportBooking = ({
  arrivalAirport,
  arrivalTime,
  departureAirport,
  departureTime,
  destination = "Downtown Manhattan",
  onTransportBooked,
}: GroundTransportBookingProps) => {
  const [selectedType, setSelectedType] = useState<string>("private");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [pickupLocation, setPickupLocation] = useState(arrivalAirport);
  const [dropoffLocation, setDropoffLocation] = useState(destination);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [rentalDays, setRentalDays] = useState(1);
  const [bundleDiscount, setBundleDiscount] = useState(false);

  const filteredOptions = transportOptions.filter((opt) => opt.type === selectedType);

  const handleSelectOption = (optionId: string) => {
    setSelectedOption(optionId);
    setBundleDiscount(true); // Simulating bundle discount with flight
  };

  const handleConfirmBooking = () => {
    if (!selectedOption) return;
    setShowConfirmation(true);
    onTransportBooked?.(selectedOption, { pickup: pickupLocation, dropoff: dropoffLocation });
  };

  const getSelectedOptionDetails = () => {
    return transportOptions.find((opt) => opt.id === selectedOption);
  };

  const calculatePrice = (option: TransportOption) => {
    let price = option.priceType === "per_day" ? option.price * rentalDays : option.price;
    if (bundleDiscount && option.type !== "shuttle") {
      price = Math.round(price * 0.85); // 15% bundle discount
    }
    return price;
  };

  const selectedDetails = getSelectedOptionDetails();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Ground Transportation
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {arrivalAirport} → {destination}
          </p>
        </div>
        {bundleDiscount && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500 text-primary-foreground">
              <Package className="h-3 w-3" />
              15% Bundle Discount
            </span>
        )}
      </div>

      {/* Location Inputs */}
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <div className="w-px h-8 bg-border mx-auto" />
              <div className="w-3 h-3 rounded-full border-2 border-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <Input
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="Pickup location"
                className="h-10"
              />
              <Input
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                placeholder="Drop-off location"
                className="h-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <Clock className="h-3 w-3" />
            Arrival: {arrivalTime.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
          </div>
        </CardContent>
      </Card>

      {/* Transport Type Tabs */}
      <Tabs value={selectedType} onValueChange={setSelectedType}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="private" className="gap-1.5">
            <Car className="h-4 w-4" />
            <span className="hidden sm:inline">Private</span>
          </TabsTrigger>
          <TabsTrigger value="shared" className="gap-1.5">
            <Bus className="h-4 w-4" />
            <span className="hidden sm:inline">Shared</span>
          </TabsTrigger>
          <TabsTrigger value="rental" className="gap-1.5">
            <Car className="h-4 w-4" />
            <span className="hidden sm:inline">Rental</span>
          </TabsTrigger>
          <TabsTrigger value="shuttle" className="gap-1.5">
            <Train className="h-4 w-4" />
            <span className="hidden sm:inline">Shuttle</span>
          </TabsTrigger>
        </TabsList>

        {["private", "shared", "rental", "shuttle"].map((type) => (
          <TabsContent key={type} value={type} className="space-y-4 mt-4">
            {/* Rental Days Selector */}
            {type === "rental" && (
              <Card className="border-dashed bg-muted/30">
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="text-sm">Rental duration</span>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Fewer rental days"
                      className="h-8 w-8"
                      onClick={() => setRentalDays(Math.max(1, rentalDays - 1))}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center font-bold">{rentalDays} day{rentalDays > 1 && "s"}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="More rental days"
                      className="h-8 w-8"
                      onClick={() => setRentalDays(Math.min(30, rentalDays + 1))}
                    >
                      +
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Options Grid */}
            <RadioGroup value={selectedOption || ""} onValueChange={handleSelectOption}>
              <div className="grid gap-3">
                {filteredOptions.map((option) => {
                  const isSelected = selectedOption === option.id;
                  const price = calculatePrice(option);
                  const originalPrice = option.priceType === "per_day" ? option.price * rentalDays : option.price;

                  return (
                    <motion.div
                      key={option.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <Label htmlFor={option.id} className="cursor-pointer">
                        <Card
                          className={`transition-all ${
                            isSelected
                              ? "ring-2 ring-primary shadow-lg"
                              : "hover:shadow-md hover:border-primary/30"
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                <option.icon className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold">{option.name}</h3>
                                      {option.popular && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                                          Popular
                                        </span>
                                      )}
                                      {option.eco && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-emerald-600 border border-emerald-300">
                                          Eco
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{option.provider}</p>
                                  </div>
                                  <div className="text-right">
                                    {bundleDiscount && price !== originalPrice && (
                                      <p className="text-xs text-muted-foreground line-through">
                                        ${originalPrice}
                                      </p>
                                    )}
                                    <p className="font-bold text-lg">
                                      {option.price === 0 ? "Free" : `$${price}`}
                                    </p>
                                    {option.priceType === "per_day" && (
                                      <p className="text-xs text-muted-foreground">
                                        for {rentalDays} day{rentalDays > 1 && "s"}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Details */}
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {option.duration}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    Up to {option.capacity}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Luggage className="h-3 w-3" />
                                    {option.luggage} bags
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    {option.rating}
                                  </span>
                                </div>

                                {/* Features */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {option.features.slice(0, 4).map((feature) => {
                                    const Icon = featureIcons[feature] || CheckCircle2;
                                    return (
                                      <span key={feature} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border border-border text-muted-foreground">
                                        <Icon className="h-3 w-3" />
                                        {feature}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Label>
                    </motion.div>
                  );
                })}
              </div>
            </RadioGroup>
          </TabsContent>
        ))}
      </Tabs>

      {/* Booking Summary */}
      <AnimatePresence>
        {selectedDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <selectedDetails.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{selectedDetails.name}</h4>
                      <p className="text-xs text-muted-foreground">{selectedDetails.provider}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">${calculatePrice(selectedDetails)}</p>
                    {bundleDiscount && (
                      <p className="text-xs text-emerald-600">Bundle discount applied</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 text-sm mb-4">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{pickupLocation}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span>{dropoffLocation}</span>
                </div>

                <Button className="w-full gap-2" size="lg" onClick={handleConfirmBooking}>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Booking
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Toast */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed left-1/2 -translate-x-1/2 z-50"
            style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 24px)" }}
          >
            <Card className="bg-emerald-500 text-primary-foreground border-0 shadow-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  Transportation booked! Confirmation sent to your email.
                </span>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroundTransportBooking;
