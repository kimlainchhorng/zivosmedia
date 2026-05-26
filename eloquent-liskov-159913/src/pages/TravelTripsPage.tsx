 /**
  * Enhanced My Trips Page
  * Unified view of all travel bookings with tabs
  * Premium mobile experience with living timeline
  */
import { useState, useCallback } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { withRedirectParam } from "@/lib/authRedirect";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Plane, Loader2 } from "lucide-react";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTrips, type TripFilter } from "@/hooks/useMyTrips";
import { TripCard } from "@/components/travel/TripCard";
 import MobileBottomNav from "@/components/shared/MobileBottomNav";
 import { useIsMobile } from "@/hooks/use-mobile";
 
 // MobileTripsPremium removed - use standard trips view on mobile

export default function TravelTripsPage() {
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [filter, setFilter] = useState<TripFilter>("upcoming");
   const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  const { data: trips, isLoading } = useMyTrips(filter);

  const handlePullRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["my-trips"] });
  }, [queryClient]);

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    const redirectTarget = `${location.pathname}${location.search ?? ""}`;
    return <Navigate to={withRedirectParam("/login", redirectTarget)} replace />;
  }
 
   // Mobile and desktop use the same trips view

  return (
    <PullToRefresh onRefresh={handlePullRefresh} className="min-h-screen bg-background pb-20">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Go back" asChild>
              <Link to="/app">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold">My Trips</h1>
              <p className="text-sm text-muted-foreground">
                Your travel bookings
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container px-4 py-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as TripFilter)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : trips && trips.length > 0 ? (
              <div className="space-y-3">
                {trips.map((trip, i) => (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <TripCard order={trip} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">
                    {filter === "upcoming"
                      ? "No upcoming trips"
                      : filter === "past"
                      ? "No past trips"
                      : "No cancelled bookings"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {filter === "upcoming"
                      ? "Start planning your next adventure!"
                      : filter === "past"
                      ? "Your completed trips will appear here"
                      : "No cancelled or refunded bookings"}
                  </p>
                  {filter === "upcoming" && (
                    <Button asChild>
                      <Link to="/hotels">
                        <Plane className="w-4 h-4 mr-2" />
                        Browse Hotels
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <MobileBottomNav />
    </motion.div>
    </PullToRefresh>
  );
}
