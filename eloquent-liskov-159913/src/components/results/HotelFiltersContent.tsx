/**
 * Hotel Filters Content
 * Reusable filter controls for hotels (extracted from HotelFilters.tsx)
 */

import { Star, Wifi, Car, Waves, Coffee, MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HotelFiltersState } from "@/hooks/useResultsFilters";

interface HotelFiltersContentProps {
  filters: HotelFiltersState;
  onFilterChange: (filters: Partial<HotelFiltersState>) => void;
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

export function HotelFiltersContent({
  filters,
  onFilterChange,
}: HotelFiltersContentProps) {
  const toggleStar = (star: number) => {
    const newStars = filters.starRating.includes(star)
      ? filters.starRating.filter((s) => s !== star)
      : [...filters.starRating, star];
    onFilterChange({ starRating: newStars });
  };

  const toggleAmenity = (id: string) => {
    const newAmenities = filters.amenities.includes(id)
      ? filters.amenities.filter((a) => a !== id)
      : [...filters.amenities, id];
    onFilterChange({ amenities: newAmenities });
  };

  const togglePropertyType = (id: string) => {
    const newTypes = filters.propertyType.includes(id)
      ? filters.propertyType.filter((t) => t !== id)
      : [...filters.propertyType, id];
    onFilterChange({ propertyType: newTypes });
  };

  return (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Price per night</Label>
        <div className="px-1">
          <Slider
            value={filters.priceRange}
            onValueChange={(value) => onFilterChange({ priceRange: value as [number, number] })}
            min={0}
            max={1000}
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
                "h-9 px-3 rounded-xl",
                filters.starRating.includes(star) && "bg-amber-500 hover:bg-amber-500/90"
              )}
              onClick={() => toggleStar(star)}
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
            <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={filters.guestRating === option.value}
                onCheckedChange={(checked) =>
                  onFilterChange({ guestRating: checked ? option.value : null })
                }
              />
              <span className="flex-1 group-hover:text-foreground transition-colors text-sm">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Amenities</Label>
        <div className="space-y-2">
          {amenityOptions.map((amenity) => (
            <label key={amenity.id} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={filters.amenities.includes(amenity.id)}
                onCheckedChange={() => toggleAmenity(amenity.id)}
              />
              <amenity.icon className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 group-hover:text-foreground transition-colors text-sm">
                {amenity.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Property Type */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Property Type</Label>
        <div className="space-y-2">
          {propertyTypeOptions.map((type) => (
            <label key={type.id} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={filters.propertyType.includes(type.id)}
                onCheckedChange={() => togglePropertyType(type.id)}
              />
              <span className="flex-1 group-hover:text-foreground transition-colors text-sm">
                {type.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Distance from Center */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Distance from Center</Label>
        <div className="space-y-2">
          {distanceOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={filters.distance === option.value}
                onCheckedChange={(checked) =>
                  onFilterChange({ distance: checked ? option.value : null })
                }
              />
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 group-hover:text-foreground transition-colors text-sm">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Filter Note */}
      <p className="text-[10px] text-muted-foreground italic mt-4 px-1">
        Filters adjust partner-provided results only.
      </p>
    </div>
  );
}
