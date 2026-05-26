/**
 * Hero Search Tabs
 * Tabbed search form for homepage hero section
 * Supports Flights, Hotels, and Cars
 */

import { useState } from "react";
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import CarFront from "lucide-react/dist/esm/icons/car-front";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { FlightSearchFormPro, HotelSearchFormPro, CarSearchFormPro } from "@/components/search";

interface HeroSearchTabsProps {
  className?: string;
  defaultTab?: "flights" | "hotels" | "cars";
}

export function HeroSearchTabs({ className, defaultTab = "flights" }: HeroSearchTabsProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  return (
    <div className={cn("w-full", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14 p-1 bg-muted/80 backdrop-blur-sm rounded-xl mb-4">
          <TabsTrigger 
            value="flights" 
            className={cn(
              "flex items-center gap-2 h-12 rounded-xl font-semibold transition-all duration-200 touch-manipulation",
              "data-[state=active]:bg-flights data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            )}
          >
            <Plane className="w-4 h-4" />
            <span className="hidden sm:inline">Flights</span>
          </TabsTrigger>
          <TabsTrigger 
            value="hotels" 
            className={cn(
              "flex items-center gap-2 h-12 rounded-xl font-semibold transition-all duration-200 touch-manipulation",
              "data-[state=active]:bg-hotels data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            )}
          >
            <Hotel className="w-4 h-4" />
            <span className="hidden sm:inline">Hotels</span>
          </TabsTrigger>
          <TabsTrigger 
            value="cars" 
            className={cn(
              "flex items-center gap-2 h-12 rounded-xl font-semibold transition-all duration-200 touch-manipulation",
              "data-[state=active]:bg-cars data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            )}
          >
            <CarFront className="w-4 h-4" />
            <span className="hidden sm:inline">Cars</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flights" className="mt-0">
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-lg">
            <FlightSearchFormPro 
              navigateOnSearch={false}
              className="[&_.search-button]:w-full"
            />
          </div>
        </TabsContent>

        <TabsContent value="hotels" className="mt-0">
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-lg">
            <HotelSearchFormPro 
              navigateOnSearch={true}
              className="[&_.search-button]:w-full"
            />
          </div>
        </TabsContent>

        <TabsContent value="cars" className="mt-0">
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-lg">
            <CarSearchFormPro 
              navigateOnSearch={true}
              className="[&_.search-button]:w-full"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Trust indicators below search */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Real-time prices
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-foreground" />
          Secure checkout
        </span>
        <span className="flex items-center gap-1.5 hidden sm:flex">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Instant e-tickets
        </span>
      </div>
    </div>
  );
}

export default HeroSearchTabs;
