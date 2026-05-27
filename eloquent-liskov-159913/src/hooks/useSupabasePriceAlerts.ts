/**
 * Price Alerts Hook — Supabase Backend
 * Manages flight price alerts persisted in the database
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PriceAlertRow {
  id: string;
  user_id: string | null;
  email: string;
  origin_code: string;
  origin_name: string | null;
  destination_code: string;
  destination_name: string | null;
  target_price: number;
  current_price: number | null;
  historical_low: number | null;
  departure_date: string | null;
  return_date: string | null;
  flexible_dates: boolean;
  cabin_class: string;
  passengers: number;
  notify_email: boolean;
  notify_push: boolean;
  notify_sms: boolean;
  is_active: boolean;
  triggered: boolean;
  triggered_price: number | null;
  triggered_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAlertInput {
  email: string;
  origin_code: string;
  origin_name?: string;
  destination_code: string;
  destination_name?: string;
  target_price: number;
  current_price?: number;
  historical_low?: number;
  departure_date?: string;
  return_date?: string;
  flexible_dates?: boolean;
  cabin_class?: string;
  passengers?: number;
  notify_email?: boolean;
  notify_push?: boolean;
  notify_sms?: boolean;
}

export function useSupabasePriceAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['price-alerts', user?.id],
    queryFn: async () => {
      const query = supabase
        .from('price_alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (user?.id) {
        query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PriceAlertRow[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateAlertInput) => {
      const { data, error } = await supabase
        .from('price_alerts')
        .insert({
          user_id: user?.id || null,
          email: input.email,
          origin_code: input.origin_code,
          origin_name: input.origin_name || null,
          destination_code: input.destination_code,
          destination_name: input.destination_name || null,
          target_price: input.target_price,
          current_price: input.current_price || null,
          historical_low: input.historical_low || null,
          departure_date: input.departure_date || null,
          return_date: input.return_date || null,
          flexible_dates: input.flexible_dates ?? false,
          cabin_class: input.cabin_class || 'economy',
          passengers: input.passengers || 1,
          notify_email: input.notify_email ?? true,
          notify_push: input.notify_push ?? false,
          notify_sms: input.notify_sms ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PriceAlertRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
      toast.success(
        `Price alert created for ${data.origin_code} → ${data.destination_code}. We'll notify you when prices drop below $${data.target_price}.`
      );
    },
    onError: () => {
      toast.error('Failed to create price alert. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('price_alerts')
        .update({ is_active: false })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
      toast.info('Price alert removed');
    },
  });

  const hasAlertForRoute = useCallback(
    (fromCode: string, toCode: string): boolean => {
      return alerts.some(
        (a) =>
          a.origin_code === fromCode &&
          a.destination_code === toCode &&
          a.is_active &&
          !a.triggered
      );
    },
    [alerts]
  );

  const getAlertForRoute = useCallback(
    (fromCode: string, toCode: string): PriceAlertRow | undefined => {
      return alerts.find(
        (a) =>
          a.origin_code === fromCode &&
          a.destination_code === toCode &&
          a.is_active &&
          !a.triggered
      );
    },
    [alerts]
  );

  return {
    alerts,
    isLoading,
    createAlert: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    removeAlert: deleteMutation.mutate,
    hasAlertForRoute,
    getAlertForRoute,
    activeAlertsCount: alerts.filter((a) => !a.triggered).length,
  };
}
