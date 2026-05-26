/**
 * Hotel Filters Component
 * Desktop: sidebar, Mobile: bottom sheet
 */

import { Filter, Star, Wifi, Car, Waves, Coffee, Building2, MapPin, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface HotelFilters {
  priceRange: [number, number];
  starRating: number[];
  guestRating: number | null;
  amenities: string[];
  propertyType: string[];
  distance: number | null;
  payAtHotelOnly: boolean;
  freeCancellation: boolean;
}

interface HotelFiltersProps {
  filters: HotelFilters;
  onFilterChange: (filters: HotelFilters) => void;
  className?: string;
}

const starOptions = [5, 4, 3, 2, 1];
const guestRatingOptions = [
  { value: 9, label: "Exceptional (9+)" },
  { value: 8, label: "Excellent (8+)" },
  { value: 7, label: "Very Good (7+)" },
  { value: 6, label: "Good (6+)" },
];
const amenityOptions = [
  { id: "wifi", label: "Free WiFi", icon: Wifi },
  { id: "parking", label: "Free Parking", icon: Car },
  { id: "pool", label: "Swimming Pool", icon: Waves },
  { id: "breakfast", label: "Breakfast Included", icon: Coffee },
];
const propertyTypeOptions = [
  { id: "hotel", label: "Hotel" },
  { id: "apartment", label: "Apartment" },
  { id: "resort", label: "Resort" },
  { id: "villa", label: "Villa" },
  { id: "hostel", label: "Hostel" },
];
const distanceOptions = [
  { value: 1, label: "Within 1 km" },
  { value: 3, label: "Within 3 km" },
  { value: 5, label: "Within 5 km" },
  { value: 10, label: "Within 10 km" },
];

const paymentOptions = [
  { id: "payAtHotel", label: "Pay at Hotel", icon: Building2, description: "No upfront payment required" },
  { id: "freeCancellation", label: "Free Cancellation", icon: CreditCard, description: "Cancel anytime for free" },
];

function FilterContent({ filters, onFilterChange }: HotelFiltersProps) {
  return (
    <div className="space-y-6">
      {/* Payment & Cancellation Options - Featured at top */}
      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
        <Label className="text-sm font-semibold mb-3 block">Payment Options</Label>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="pay-at-hotel"
              checked={filters.payAtHotelOnly}
              onCheckedChange={(checked) => 
                onFilterChange({ ...filters, payAtHotelOnly: checked === true })
              }
            />
            <div className="flex-1">
              <Label htmlFor="pay-at-hotel" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Pay at Hotel
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">No upfront payment required</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="free-cancellation"
              checked={filters.freeCancellation}
              onCheckedChange={(checked) => 
                onFilterChange({ ...filters, freeCancellation: checked === true })
              }
            />
            <div className="flex-1">
              <Label htmlFor="free-cancellation" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Free Cancellation
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">Cancel anytime for full refund</p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Range */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Price per night</Label>
        <div className="px-2">
          <Slider
            value={filters.priceRange}
            onValueChange={(value) => onFilterChange({ ...filters, priceRange: value as [number, number] })}
            min={0}
            max={500}
            step={10}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>${filters.priceRange[0]}</span>
            <span>${filters.priceRange[1]}+</span>
          </div>
        </div>
      </div>

      {/* Star Rating */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Star Rating</Label>
        <div className="flex flex-wrap gap-2">
          {starOptions.map((star) => (
            <Button
              key={star}
              variant={filters.starRating.includes(star) ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 px-3 rounded-lg active:scale-95 transition-all duration-200 touch-manipulation",
                filters.starRating.includes(star) && "bg-hotels hover:bg-hotels/90"
              )}
              onClick={() => {
                const newRatings = filters.starRating.includes(star)
                  ? filters.starRating.filter(r => r !== star)
                  : [...filters.starRating, star];
                onFilterChange({ ...filters, starRating: newRatings });
              }}
            >
              {star} <Star className="w-3 h-3 ml-1 fill-current" />
            </Button>
          ))}
        </div>
      </div>

      {/* Guest Rating */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Guest Rating</Label>
        <div className="space-y-2">
          {guestRatingOptions.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={`rating-${option.value}`}
                checked={filters.guestRating === option.value}
                onCheckedChange={(checked) => 
                  onFilterChange({ ...filters, guestRating: checked ? option.value : null })
                }
              />
              <Label htmlFor={`rating-${option.value}`} className="text-sm cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Amenities</Label>
        <div className="space-y-2">
          {amenityOptions.map((amenity) => (
            <div key={amenity.id} className="flex items-center gap-2">
              <Checkbox
                id={`amenity-${amenity.id}`}
                checked={filters.amenities.includes(amenity.id)}
                onCheckedChange={(checked) => {
                  const newAmenities = checked
                    ? [...filters.amenities, amenity.id]
                    : filters.amenities.filter(a => a !== amenity.id);
                  onFilterChange({ ...filters, amenities: newAmenities });
                }}
              />
              <amenity.icon className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor={`amenity-${amenity.id}`} className="text-sm cursor-pointer">
                {amenity.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Property Type */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Property Type</Label>
        <div className="space-y-2">
          {propertyTypeOptions.map((type) => (
            <div key={type.id} className="flex items-center gap-2">
              <Checkbox
                id={`type-${type.id}`}
                checked={filters.propertyType.includes(type.id)}
                onCheckedChange={(checked) => {
                  const newTypes = checked
                    ? [...filters.propertyType, type.id]
                    : filters.propertyType.filter(t => t !== type.id);
                  onFilterChange({ ...filters, propertyType: newTypes });
                }}
              />
              <Label htmlFor={`type-${type.id}`} className="text-sm cursor-pointer">
                {type.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Distance from Center */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Distance from Center</Label>
        <div className="space-y-2">
          {distanceOptions.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={`distance-${option.value}`}
                checked={filters.distance === option.value}
                onCheckedChange={(checked) => 
                  onFilterChange({ ...filters, distance: checked ? option.value : null })
                }
              />
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor={`distance-${option.value}`} className="text-sm cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HotelFiltersComponent({ filters, onFilterChange, className }: HotelFiltersProps) {
  const activeFilterCount = [
    filters.starRating.length > 0,
    filters.guestRating !== null,
    filters.amenities.length > 0,
    filters.propertyType.length > 0,
    filters.distance !== null,
    filters.priceRange[0] > 0 || filters.priceRange[1] < 500,
    filters.payAtHotelOnly,
    filters.freeCancellation,
  ].filter(Boolean).length;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn("hidden lg:block w-64 shrink-0", className)}>
        <div className="sticky top-20 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </h3>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 rounded-lg active:scale-95 transition-all duration-200 touch-manipulation"
                onClick={() => onFilterChange({
                  priceRange: [0, 500],
                  starRating: [],
                  guestRating: null,
                  amenities: [],
                  propertyType: [],
                  distance: null,
                  payAtHotelOnly: false,
                  freeCancellation: false,
                })}
              >
                Clear all
              </Button>
            )}
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <FilterContent filters={filters} onFilterChange={onFilterChange} />
          </ScrollArea>
        </div>
      </aside>

      {/* Mobile Sheet */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2 rounded-xl h-10 px-4 active:scale-95 transition-all duration-200 touch-manipulation bg-background/50 backdrop-blur-sm shadow-sm">
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-hotels text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
            <SheetHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle>Filters</SheetTitle>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs rounded-lg active:scale-95 transition-all duration-200 touch-manipulation"
                    onClick={() => onFilterChange({
                      priceRange: [0, 500],
                      starRating: [],
                      guestRating: null,
                      amenities: [],
                      propertyType: [],
                      distance: null,
                      payAtHotelOnly: false,
                      freeCancellation: false,
                    })}
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </SheetHeader>
            <ScrollArea className="h-[calc(85vh-120px)] py-4">
              <FilterContent filters={filters} onFilterChange={onFilterChange} />
            </ScrollArea>
            <div className="pt-4 border-t">
              <SheetClose asChild>
                <Button className="w-full bg-hotels hover:bg-hotels/90 rounded-xl h-12 text-base font-semibold shadow-lg shadow-hotels/20 active:scale-[0.98] transition-all duration-200 touch-manipulation">
                  Show Results
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
