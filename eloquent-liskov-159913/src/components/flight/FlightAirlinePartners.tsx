/**
 * Flight Airline Partners Section
 * Modern grid display with alliance filtering
 */

import { Badge } from "@/components/ui/badge";
import { Globe, Star, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { topAirlines } from "@/data/airlines";

const FlightAirlinePartners = () => {
  return (
    <section className="py-12 sm:py-16 border-t border-border/50 relative overflow-hidden">
      <div className="absolute inset-0 via-transparent bg-secondary" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border text-foreground text-sm font-medium mb-4">
            <Globe className="w-4 h-4" />
            Global Network
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            Airline Partners
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Access flights from 500+ airlines worldwide through our trusted partners.
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {topAirlines.slice(0, 12).map((airline) => (
            <div
              key={airline.code}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 hover:border-border hover:shadow-md transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center font-bold text-sm">
                {airline.code}
              </div>
              <span className="text-xs text-center text-muted-foreground line-clamp-1">{airline.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlightAirlinePartners;
