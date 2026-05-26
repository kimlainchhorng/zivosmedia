/**
 * Flight Price Alerts Hook
 * CRUD operations for saved flight searches with price tracking
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface FlightPriceAlert {
  id: string;
  user_id: string;
  origin_iata: string;
  destination_iata: string;
  departure_date: string;
  return_date: string | null;
  passengers: number;
  cabin_class: string;
  target_price: number | null;
  lowest_seen_price: number | null;
  current_price: number | null;
  last_checked_at: string | null;
  alert_triggered: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAlertParams {
  origin_iata: string;
  destination_iata: string;
  departure_date: string;
  return_date?: string;
  passengers: number;
  cabin_class: string;
  target_price?: number;
  current_price?: number;
}

export function useFlightPriceAlerts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["flight-price-alerts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_price_alerts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FlightPriceAlert[];
    },
    enabled: !!user,
  });
}

export function useCreateFlightAlert() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateAlertParams) => {
      if (!user) throw new Error("Must be logged in");

      const { data, error } = await supabase
        .from("flight_price_alerts")
        .insert({
          user_id: user.id,
          origin_iata: params.origin_iata,
          destination_iata: params.destination_iata,
          departure_date: params.departure_date,
          return_date: params.return_date || null,
          passengers: params.passengers,
          cabin_class: params.cabin_class,
          target_price: params.target_price || null,
          lowest_seen_price: params.current_price || null,
          current_price: params.current_price || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flight-price-alerts"] });
      toast({
        title: "Price alert saved!",
        description: "We'll notify you when the price drops.",
      });
    },
    onError: (err) => {
      toast({
        title: "Could not save alert",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteFlightAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("flight_price_alerts")
        .update({ is_active: false })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flight-price-alerts"] });
      toast({ title: "Alert removed" });
    },
  });
}

/** Check if user already has an active alert for this route/date */
export function useHasAlert(origin: string, destination: string, departureDate: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["flight-alert-exists", user?.id, origin, destination, departureDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_price_alerts")
        .select("id")
        .eq("origin_iata", origin)
        .eq("destination_iata", destination)
        .eq("departure_date", departureDate)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data ? data.id : null;
    },
    enabled: !!user && !!origin && !!destination && !!departureDate,
  });
}
