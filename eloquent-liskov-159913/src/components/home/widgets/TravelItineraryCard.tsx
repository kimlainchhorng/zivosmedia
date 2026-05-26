/**
 * TravelItineraryCard - Upcoming trips timeline with flight, hotel, car in one card
 */
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { motion } from "framer-motion";
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import Car from "lucide-react/dist/esm/icons/car";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Luggage from "lucide-react/dist/esm/icons/luggage";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, parseISO } from "date-fns";

interface ItineraryItem {
  id: string;
  type: "flight" | "hotel" | "car";
  title: string;
  subtitle: string;
  date: string;
  status: "confirmed" | "pending" | "upcoming";
}

interface TripGroup {
  destination: string;
  startDate: string;
  daysUntil: number;
  items: ItineraryItem[];
}

const itemConfig = {
  flight: { icon: Plane },
  hotel: { icon: Hotel },
  car: { icon: Car },
};

// No demo trip — show empty state for guests

export default function TravelItineraryCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  const { data: tripData } = useQuery({
    queryKey: ["home-itinerary", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch upcoming bookings from trip_itineraries
      const { data: itineraries } = await supabase
        .from("trip_itineraries")
        .select("id, title, destination, start_date, end_date, status")
        .eq("user_id", user.id)
        .gte("start_date", new Date().toISOString().split("T")[0])
        .order("start_date", { ascending: true })
        .limit(1);

      if (!itineraries?.[0]) return null;

      const itin = itineraries[0];
      const { data: items } = await supabase
        .from("trip_items")
        .select("id, item_type, title, description, date, status")
        .eq("itinerary_id", itin.id)
        .order("date", { ascending: true });

      return {
        destination: itin.destination || itin.title,
        startDate: itin.start_date,
        daysUntil: differenceInDays(parseISO(itin.start_date), new Date()),
        items: (items || []).map((i: any) => ({
          id: i.id,
          type: (i.item_type as "flight" | "hotel" | "car") || "flight",
          title: i.title || "",
          subtitle: i.description || "",
          date: i.date || itin.start_date,
          status: (i.status as "confirmed" | "pending" | "upcoming") || "upcoming",
        })),
      } as TripGroup;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const trip = tripData;

  // No trip data — show CTA to book
  if (!trip) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg bg-card border border-border p-5 relative"
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <Luggage className="w-4 h-4 text-foreground" strokeWidth={1.8} />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">{t("home.no_trips")}</span>
            <p className="text-[10px] text-muted-foreground">{t("home.plan_adventure")}</p>
          </div>
        </div>
        <button type="button"
          onClick={() => navigate("/flights")}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-foreground py-2.5 rounded-lg bg-primary touch-manipulation active:opacity-80 transition-opacity"
        >
          <Plane className="w-3.5 h-3.5" />
          {t("home.search_flights")}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg bg-card border border-border p-5 relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <Luggage className="w-4 h-4 text-foreground" strokeWidth={1.8} />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">{t("home.upcoming_trip")}</span>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> {trip.destination}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-bold text-foreground border-border bg-muted">
          {trip.daysUntil <= 0 ? "Today!" : `${trip.daysUntil}d away`}
        </Badge>
      </div>

      {/* Timeline */}
      <div className="space-y-0 relative z-10">
        {trip.items.map((item, i) => {
          const cfg = itemConfig[item.type];
          const Icon = cfg.icon;
          const isLast = i === trip.items.length - 1;

          return (
            <div key={item.id} className="flex gap-3">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-foreground" strokeWidth={1.8} />
                </div>
                {!isLast && <div className="w-px flex-1 bg-border my-1" />}
              </div>

              {/* Content */}
              <div className={`flex-1 ${!isLast ? "pb-3" : ""}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                  <Badge
                    variant="outline"
                    className="text-[8px] font-bold text-foreground border-border bg-muted"
                  >
                    {item.status}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{item.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <button type="button"
        onClick={() => navigate("/trips")}
        className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-foreground py-2.5 rounded-lg bg-primary touch-manipulation active:opacity-80 transition-opacity relative z-10"
      >
        <Calendar className="w-3.5 h-3.5" />
        {t("home.view_itinerary")}
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
