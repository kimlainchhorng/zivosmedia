import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plane,
  Search,
  Users,
  ArrowLeftRight,
  RefreshCw,
  MapPin,
  Crown,
  Sunrise,
  Sun,
} from "lucide-react";
import { format } from "date-fns";
import AirportAutocomplete from "@/components/flight/AirportAutocomplete";
import { extractIataCode } from "@/lib/flightSearchParams";
import { cn } from "@/lib/utils";

interface FlightSearchFormProps {
  defaultFrom?: string;
  defaultTo?: string;
  onSearch: (params: URLSearchParams) => void;
}

export default function FlightSearchForm({ 
  defaultFrom = "", 
  defaultTo = "", 
  onSearch 
}: FlightSearchFormProps) {
  const [tripType, setTripType] = useState<"roundtrip" | "oneway" | "multicity">("roundtrip");
  const [fromCity, setFromCity] = useState(defaultFrom);
  const [toCity, setToCity] = useState(defaultTo);
  const [departDate, setDepartDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [passengers, setPassengers] = useState("1");
  const [cabinClass, setCabinClass] = useState("economy");

  const swapCities = () => {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  };

  // Extract IATA codes from city values
  const fromIata = extractIataCode(fromCity);
  const toIata = extractIataCode(toCity);

  const handleSearch = () => {
    // Use extracted IATA codes as the URL parameter values
    const params = new URLSearchParams({
      from: fromIata || fromCity, // Use IATA if extracted, fallback to raw input
      to: toIata || toCity,
      depart: departDate ? format(departDate, "yyyy-MM-dd") : "",
      passengers,
      cabin: cabinClass,
      tripType: tripType === "multicity" ? "roundtrip" : tripType, // Multicity falls back to roundtrip
    });
    if (returnDate && tripType === "roundtrip") {
      params.set("return", format(returnDate, "yyyy-MM-dd"));
    }
    onSearch(params);
  };

  return (
    <Card className="max-w-4xl mx-auto overflow-hidden border-0 bg-card/95 backdrop-blur-2xl shadow-2xl shadow-black/40 ring-1 ring-white/10">
      <div className="h-1.5 bg-secondary" />
      <CardContent className="p-6">
        {/* Trip Type Toggle */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: "roundtrip", label: "Round Trip", icon: RefreshCw },
            { id: "oneway", label: "One Way", icon: Plane },
            { id: "multicity", label: "Multi-City", icon: MapPin },
          ].map((type) => (
            <button type="button"
              key={type.id}
              onClick={() => setTripType(type.id as typeof tripType)}
              className={cn(
                "px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 text-sm",
                tripType === type.id
                  ? "bg-gradient-to-r from-sky-500 to-blue-600 text-primary-foreground shadow-lg shadow-sky-500/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <type.icon className="w-4 h-4" />
              {type.label}
            </button>
          ))}
        </div>

        {/* Search Fields */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* From/To with Swap */}
          <div className="md:col-span-2 grid md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
            <AirportAutocomplete
              value={fromCity}
              onChange={setFromCity}
              placeholder="From where?"
              label="From"
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Swap cities"
              onClick={swapCities}
              className="h-12 w-12 rounded-full border-dashed hover:border-border hover:bg-secondary shrink-0 transition-all hover:rotate-180 duration-500"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
            <AirportAutocomplete
              value={toCity}
              onChange={setToCity}
              placeholder="To where?"
              label="To"
              excludeCode={fromCity.match(/\(([A-Z]{3})\)/)?.[1]}
            />
          </div>

          {/* Dates */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-14 justify-start text-left font-normal bg-background/50 hover:bg-background/80"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Sunrise className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Departure</p>
                    <p className="font-medium">{departDate ? format(departDate, "EEE, MMM d") : "Select date"}</p>
                  </div>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={departDate}
                onSelect={setDepartDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {tripType === "roundtrip" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-14 justify-start text-left font-normal bg-background/50 hover:bg-background/80"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <Sun className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Return</p>
                      <p className="font-medium">{returnDate ? format(returnDate, "EEE, MMM d") : "Select date"}</p>
                    </div>
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={returnDate}
                  onSelect={setReturnDate}
                  disabled={(date) => date < (departDate || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Passengers */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Passengers</label>
            <Select value={passengers} onValueChange={setPassengers}>
              <SelectTrigger className="h-14 bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Users className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">Travelers</p>
                    <p className="font-medium">{passengers} {parseInt(passengers) === 1 ? "Passenger" : "Passengers"}</p>
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} {n === 1 ? "Passenger" : "Passengers"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cabin Class */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Cabin Class</label>
            <Select value={cabinClass} onValueChange={setCabinClass}>
              <SelectTrigger className="h-14 bg-background/50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    cabinClass === "first" ? "bg-amber-500/10" :
                    cabinClass === "business" ? "bg-blue-500/10" : "bg-emerald-500/10"
                  )}>
                    <Crown className={cn(
                      "w-5 h-5",
                      cabinClass === "first" ? "text-amber-500" :
                      cabinClass === "business" ? "text-blue-500" : "text-emerald-500"
                    )} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">Class</p>
                    <p className="font-medium capitalize">{cabinClass}</p>
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="economy">Economy</SelectItem>
                <SelectItem value="premium">Premium Economy</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="first">First Class</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          disabled={!fromCity || !toCity || !departDate}
          size="lg"
          className="w-full h-14 hover:hover:hover:text-primary-foreground font-bold text-lg shadow-xl transition-all hover: bg-foreground"
        >
          <Search className="w-5 h-5 mr-2" />
          Search Flights
        </Button>

        {/* Affiliate Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          ZIVO may earn a commission when users book through partner links.
        </p>
      </CardContent>
    </Card>
  );
}
