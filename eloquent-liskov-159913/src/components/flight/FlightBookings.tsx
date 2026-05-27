import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, Calendar, Users, MoreVertical, Download, Eye, X, Sparkles, AlertCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FlightBookings = () => {
  const { user } = useAuth();

  // Fetch user's flight bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["user-flight-bookings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("flight_bookings")
        .select(`
          id,
          booking_reference,
          status,
          total_amount,
          total_passengers,
          cabin_class,
          created_at,
          passengers,
          flights (
            id,
            flight_number,
            departure_city,
            arrival_city,
            departure_time,
            arrival_time,
            departure_airport,
            arrival_airport,
            duration_minutes,
            airlines (
              name,
              code
            )
          )
        `)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "confirmed": return { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20", dot: "bg-emerald-500" };
      case "pending": return { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20", dot: "bg-amber-500" };
      case "completed": return { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20", dot: "bg-blue-500" };
      case "cancelled": return { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/20", dot: "bg-red-500" };
      default: return { bg: "bg-muted", text: "text-muted-foreground", border: "border-muted", dot: "bg-muted-foreground" };
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            My Bookings
          </h1>
          <p className="text-muted-foreground">View and manage your flight bookings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-0 bg-card/50 backdrop-blur-xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 flex-1">
                    <Skeleton className="h-16 w-16 rounded-2xl" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-64" />
                      <div className="flex gap-3">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-8 w-32" />
                      </div>
                    </div>
                  </div>
                  <Skeleton className="h-10 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bookings && bookings.length > 0 ? (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {bookings.map((booking: any) => {
            const statusConfig = getStatusConfig(booking.status);
            const flight = booking.flights;
            
            return (
              <motion.div key={booking.id} variants={item}>
                <Card className="relative border-0 bg-gradient-to-br from-card/80 to-card backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusConfig.dot}`} />
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex gap-3 sm:gap-4 flex-1">
                        <div className="p-3 sm:p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300 bg-secondary">
                          <Plane className="h-5 w-5 sm:h-7 sm:w-7 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                            <span className="font-bold text-base sm:text-xl">
                              {flight?.departure_city} → {flight?.arrival_city}
                            </span>
                            <Badge className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} mr-1.5 ${booking.status === 'pending' ? 'animate-pulse' : ''}`} />
                              {booking.status}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3 truncate">
                            {flight?.airlines?.name} • {flight?.flight_number} • {booking.cabin_class} • Ref: <span className="font-mono font-medium text-foreground">{booking.booking_reference}</span>
                          </p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                            <span className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-muted/50">
                              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {flight?.departure_time ? format(new Date(flight.departure_time), "MMM d, yyyy • HH:mm") : "TBD"}
                              </span>
                            </span>
                            <span className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-muted/50">
                              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              <span className="font-medium">{flight?.duration_minutes ? formatDuration(flight.duration_minutes) : "TBD"}</span>
                            </span>
                            <span className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-muted/50">
                              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              <span className="font-medium">{booking.total_passengers} pax</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30">
                        <p className="font-bold text-xl sm:text-2xl">${booking.total_amount?.toFixed(2) || "0.00"}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="gap-1.5">
                            <Eye className="h-4 w-4" />
                            Details
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download Ticket
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Calendar className="h-4 w-4 mr-2" />
                                Reschedule
                              </DropdownMenuItem>
                              {booking.status === "confirmed" && (
                                <DropdownMenuItem className="text-destructive">
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel Booking
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 bg-card/50 backdrop-blur-xl">
            <CardContent className="p-12 text-center">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <AlertCircle className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-1">No Bookings Yet</p>
              <p className="text-muted-foreground">Start exploring flights to book your next adventure.</p>
              <Button className="mt-4 gap-2 bg-secondary">
                <Plane className="h-4 w-4" />
                Search Flights
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default FlightBookings;
