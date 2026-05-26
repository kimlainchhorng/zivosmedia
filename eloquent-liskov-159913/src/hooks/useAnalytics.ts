import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAnalyticsStats = () => {
  return useQuery({
    queryKey: ["analytics-stats"],
    queryFn: async () => {
      // Get user count
      const { count: userCount, error: userError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (userError) throw userError;

      // Get driver stats
      const { data: drivers, error: driverError } = await supabase
        .from("drivers")
        .select("status, is_online");

      if (driverError) throw driverError;

      // Get trip stats
      const { data: trips, error: tripError } = await supabase
        .from("trips")
        .select("status, fare_amount, payment_status, created_at");

      if (tripError) throw tripError;

      const verifiedDrivers = drivers?.filter(d => d.status === "verified").length || 0;
      const onlineDrivers = drivers?.filter(d => d.is_online).length || 0;
      const totalTrips = trips?.length || 0;
      const totalRevenue = trips
        ?.filter(t => t.payment_status === "paid")
        .reduce((sum, t) => sum + (t.fare_amount || 0), 0) || 0;

      return {
        totalUsers: userCount || 0,
        activeDrivers: verifiedDrivers,
        onlineDrivers,
        totalTrips,
        totalRevenue,
      };
    },
  });
};

export const useRevenueData = () => {
  return useQuery({
    queryKey: ["revenue-data"],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabase
        .from("trips")
        .select("fare_amount, payment_status, created_at")
        .gte("created_at", sixMonthsAgo.toISOString())
        .eq("payment_status", "paid");

      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, { revenue: number; trips: number }> = {};
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      data?.forEach(trip => {
        const date = new Date(trip.created_at);
        const monthKey = months[date.getMonth()];
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, trips: 0 };
        }
        monthlyData[monthKey].revenue += trip.fare_amount || 0;
        monthlyData[monthKey].trips += 1;
      });

      // Convert to array format for charts
      return Object.entries(monthlyData).map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue * 100) / 100,
        trips: data.trips,
      }));
    },
  });
};

export const useTripsByType = () => {
  return useQuery({
    queryKey: ["trips-by-type"],
    queryFn: async () => {
      const { data: trips, error } = await supabase
        .from("trips")
        .select("driver_id");

      if (error) throw error;

      // Get driver vehicle types for completed trips
      const driverIds = trips?.map(t => t.driver_id).filter(Boolean) as string[];
      
      if (driverIds.length === 0) {
        return [
          { name: "Economy", value: 25, color: "hsl(var(--primary))" },
          { name: "Comfort", value: 25, color: "hsl(var(--chart-2))" },
          { name: "Premium", value: 25, color: "hsl(var(--chart-3))" },
          { name: "XL", value: 25, color: "hsl(var(--chart-4))" },
        ];
      }

      const { data: drivers, error: driverError } = await supabase
        .from("drivers")
        .select("id, vehicle_type")
        .in("id", driverIds);

      if (driverError) throw driverError;

      // Count trips by vehicle type
      const typeCounts: Record<string, number> = {};
      trips?.forEach(trip => {
        const driver = drivers?.find(d => d.id === trip.driver_id);
        if (driver) {
          const type = driver.vehicle_type;
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        }
      });

      const total = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);
      const colors: Record<string, string> = {
        economy: "hsl(var(--primary))",
        comfort: "hsl(var(--chart-2))",
        premium: "hsl(var(--chart-3))",
        xl: "hsl(var(--chart-4))",
      };

      return Object.entries(typeCounts).map(([type, count]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: total > 0 ? Math.round((count / total) * 100) : 0,
        color: colors[type] || "hsl(var(--muted))",
      }));
    },
  });
};

export const useDailyTrips = () => {
  return useQuery({
    queryKey: ["daily-trips"],
    queryFn: async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("trips")
        .select("created_at")
        .gte("created_at", oneWeekAgo.toISOString());

      if (error) throw error;

      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayCounts: Record<string, number> = {};
      days.forEach(day => dayCounts[day] = 0);

      data?.forEach(trip => {
        const day = days[new Date(trip.created_at).getDay()];
        dayCounts[day] += 1;
      });

      // Reorder to start from Monday
      const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return orderedDays.map(day => ({
        day,
        trips: dayCounts[day],
      }));
    },
  });
};

export const useDriverActivity = () => {
  return useQuery({
    queryKey: ["driver-activity"],
    queryFn: async () => {
      const { data: drivers, error } = await supabase
        .from("drivers")
        .select("is_online, status");

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayTrips } = await supabase
        .from("trips")
        .select("created_at, status")
        .gte("created_at", today.toISOString());

      const hourSlots = [6, 9, 12, 15, 18, 21];
      const hourLabels = ["6am", "9am", "12pm", "3pm", "6pm", "9pm"];

      const onlineCounts = hourSlots.map(() => 0);
      const busyCounts = hourSlots.map(() => 0);

      todayTrips?.forEach(trip => {
        const h = new Date(trip.created_at).getHours();
        const slot = hourSlots.findIndex((s, i) => h >= s && (i === hourSlots.length - 1 || h < hourSlots[i + 1]));
        if (slot >= 0) {
          onlineCounts[slot] += 1;
          if (trip.status === "in_progress") busyCounts[slot] += 1;
        }
      });

      return hourLabels.map((hour, i) => ({
        hour,
        online: onlineCounts[i],
        busy: busyCounts[i],
      }));
    },
  });
};
