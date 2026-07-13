/**
 * TripTimeline Component
 * Premium 2026-era visual journey flow from Flight → Hotel
 */
import { useState, useEffect, useCallback } from "react";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { Plane, Hotel, CloudRain, Sun, Cloud, ArrowRight, Calendar, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useMyTrips } from "@/hooks/useMyTrips";
import { format, differenceInHours, differenceInMinutes, isTomorrow, isToday } from "date-fns";

function getWeatherForCity(_city: string) {
  return { temp: "--", condition: "N/A", Icon: Sun };
}

function getDepartureLabel(date: Date): string {
  if (isToday(date)) return "Departing Today";
  if (isTomorrow(date)) return "Departing Tomorrow";
  return `Departing ${format(date, "MMM d")}`;
}

// Countdown hook
function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0 });

  const updateCountdown = useCallback(() => {
    const now = new Date();
    const hours = differenceInHours(targetDate, now);
    const minutes = differenceInMinutes(targetDate, now) % 60;
    setTimeLeft({ hours: Math.max(0, hours), minutes: Math.max(0, minutes) });
  }, [targetDate]);

  useEffect(() => {
    updateCountdown();
  }, [updateCountdown]);

  useVisibleInterval(updateCountdown, 60000, { tickOnVisible: true });

  return timeLeft;
}

interface FlightCardProps {
  origin: string;
  destination: string;
  departureTime: string;
  flightNumber: string;
  terminal?: string;
  gate?: string;
  departureDate: Date;
}

function FlightCard({ origin, destination, departureTime, flightNumber, terminal, gate, departureDate }: FlightCardProps) {
  const countdown = useCountdown(departureDate);
  const departureLabel = getDepartureLabel(departureDate);

  return (
    <div className="relative pl-20">
      <div className="absolute left-0 top-0 w-16 h-16 bg-primary rounded-2xl flex items-center justify-center z-10 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
        <Plane className="w-8 h-8 text-primary-foreground" />
      </div>
      
      <div className="bg-card border border-border/50 rounded-3xl p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{departureLabel}</div>
            <h3 className="text-xl font-bold text-foreground">{origin} <span className="text-muted-foreground">to</span> {destination}</h3>
            {countdown.hours > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Departs in {countdown.hours}h {countdown.minutes}m
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl text-foreground">{departureTime}</div>
            <div className="text-xs text-muted-foreground">AM EST</div>
          </div>
        </div>
        
        <div className="flex gap-4 items-center bg-muted/50 rounded-xl p-4">
          <div className="flex-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Flight</div>
            <div className="text-foreground font-mono">{flightNumber}</div>
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Terminal</div>
            <div className="text-foreground font-mono">{terminal || "—"}</div>
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Gate</div>
            <div className={`font-mono ${gate ? "text-foreground" : "text-emerald-400"}`}>{gate || "TBD"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface HotelCardProps {
  name: string;
  roomType: string;
  checkInDate: Date;
  city: string;
}

function HotelCard({ name, roomType, checkInDate, city }: HotelCardProps) {
  const weather = getWeatherForCity(city);
  const WeatherIcon = weather.Icon;

  return (
    <div className="relative pl-20">
      <div className="absolute left-0 top-0 w-16 h-16 bg-muted rounded-2xl flex items-center justify-center z-10 border border-border/50">
        <Hotel className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <div className="bg-card border border-border/50 rounded-3xl p-6 relative overflow-hidden">
        {/* Weather Widget Overlay */}
        <div className="absolute top-0 right-0 p-6 text-right z-20">
          <WeatherIcon className="w-6 h-6 text-primary ml-auto mb-1" />
          <div className="text-lg font-bold text-foreground">{weather.temp}</div>
          <div className="text-[10px] text-muted-foreground">{weather.condition} in {city}</div>
        </div>

        <div className="relative z-10 pr-20">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
            Check-in: {format(checkInDate, "MMM d")}
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{name}</h3>
          <p className="text-sm text-muted-foreground">{roomType}</p>
          
          <button type="button" className="mt-4 text-xs font-bold text-foreground bg-muted/50 px-4 py-2 rounded-xl hover:bg-muted active:scale-[0.95] transition-all duration-200 flex items-center gap-2 touch-manipulation min-h-[36px]">
            Get Directions <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function TripTimeline() {
  const { data: upcomingTrips, isLoading } = useMyTrips("upcoming");

  // Get the next upcoming trip
  const nextTrip = upcomingTrips?.[0];

  // Extract hotel from the trip
  let hotelData: HotelCardProps | null = null;

  if (nextTrip?.travel_order_items) {
    for (const item of nextTrip.travel_order_items) {
      const meta = item.meta as Record<string, unknown>;
      const startDate = new Date(item.start_date);

      if (item.type === "hotel" && !hotelData) {
        hotelData = {
          name: item.title || "Hotel Stay",
          roomType: (meta?.room_type as string) || "1 King Bed • City View",
          checkInDate: startDate,
          city: (meta?.city as string) || (meta?.destination as string) || "London",
        };
      }
    }
  }

  const flightData: FlightCardProps | null = null;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-6">Upcoming Journey</h2>
        <div className="space-y-8 relative">
          <div className="absolute left-[2.25rem] top-16 bottom-0 w-[2px] bg-gradient-to-b from-primary via-muted to-transparent" />
          {[1, 2].map((i) => (
            <div key={i} className="pl-20 relative">
              <div className="absolute left-0 top-0 w-16 h-16 rounded-2xl bg-muted animate-pulse" />
              <div className="bg-card border border-border/50 rounded-3xl p-6 h-40 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!nextTrip) {
    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-6">Upcoming Journey</h2>
        <div className="bg-card border border-border/50 rounded-3xl p-8 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">No upcoming trips</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start planning your next adventure!
          </p>
          <Link 
            to="/hotels"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all duration-200 touch-manipulation min-h-[44px] shadow-lg"
          >
            <Plane className="w-4 h-4" />
            Browse Destinations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 relative">
      <h2 className="text-2xl font-bold text-foreground mb-6">Upcoming Journey</h2>
      
      {/* Vertical Connecting Line */}
      <div className="absolute left-[2.25rem] top-16 bottom-0 w-[2px] bg-gradient-to-b from-primary via-muted to-transparent" />

      {/* Flight Card */}
      {flightData && <FlightCard {...flightData} />}

      {/* Hotel Card */}
      {hotelData && <HotelCard {...hotelData} />}
    </div>
  );
}

export default TripTimeline;