/**
 * Flight Booking Hook - MoR Model
 * 
 * Handles flight checkout, payment, and ticketing status
 * ZIVO is the merchant of record
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FlightPassenger {
  title: string;
  given_name: string;
  family_name: string;
  gender: 'm' | 'f';
  born_on: string;
  email: string;
  phone_number?: string;
  passport_number?: string;
  passport_expiry?: string;
  passport_country?: string;
  nationality?: string;
}

export interface FlightCheckoutParams {
  offerId: string;
  passengers: FlightPassenger[];
  totalAmount: number;
  baseFare: number;
  taxesFees: number;
  currency: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  cabinClass: string;
}

export interface FlightBooking {
  id: string;
  booking_reference: string;
  pnr?: string;
  ticketing_status: 'pending' | 'processing' | 'issued' | 'failed' | 'cancelled' | 'voided';
  payment_status: string;
  total_amount: number;
  currency: string;
  ticket_numbers?: string[];
  created_at: string;
}

/**
 * Create flight checkout session (Stripe)
 */
export function useCreateFlightCheckout() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: FlightCheckoutParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please log in to book a flight');
      }

      const { data, error } = await supabase.functions.invoke('create-flight-checkout', {
        body: {
          ...params,
          userId: user.id,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Failed to create checkout session');

      return data as { url: string; bookingId: string };
    },
    onError: (error: Error) => {
      toast({
        title: 'Checkout Error',
        description: error.message || 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Fetch user's flight bookings
 */
export function useFlightBookings() {
  return useQuery({
    queryKey: ['flight-bookings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('flight_bookings')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Fetch single flight booking by ID
 */
export function useFlightBooking(bookingId: string | null) {
  return useQuery({
    queryKey: ['flight-booking', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data, error } = await supabase
        .from('flight_bookings')
        .select(`
          *,
          flight_passengers (*)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
    refetchInterval: (query) => {
      // Poll every 3 seconds while ticketing is in progress
      const status = query.state.data?.ticketing_status;
      if (status === 'pending' || status === 'processing') {
        return 3000;
      }
      return false;
    },
  });
}

/**
 * Request flight refund
 */
export function useRequestFlightRefund() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('process-flight-refund', {
        body: { bookingId, reason, action: 'request' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Refund Requested',
        description: 'Your refund request has been submitted. We\'ll notify you once it\'s processed.',
      });
      queryClient.invalidateQueries({ queryKey: ['flight-bookings'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Refund Error',
        description: error.message || 'Failed to request refund. Please contact support.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Check if booking is eligible for refund
 */
export function canRequestRefund(booking: FlightBooking): boolean {
  if (!booking) return false;
  if (booking.ticketing_status !== 'issued') return false;
  if (booking.payment_status !== 'paid') return false;
  return true;
}

/**
 * Get ticketing status display info
 */
export function getTicketingStatusInfo(status: string): { label: string; color: string; description: string } {
  switch (status) {
    case 'pending':
      return {
        label: 'Processing Payment',
        color: 'yellow',
        description: 'Your payment is being processed.',
      };
    case 'processing':
      return {
        label: 'Issuing Ticket',
        color: 'blue',
        description: 'Your ticket is being issued. This usually takes a few minutes.',
      };
    case 'issued':
      return {
        label: 'Ticket Issued',
        color: 'green',
        description: 'Your e-ticket has been issued and sent to your email.',
      };
    case 'failed':
      return {
        label: 'Ticketing Failed',
        color: 'red',
        description: 'There was an issue issuing your ticket. Our team is looking into it.',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        color: 'gray',
        description: 'This booking has been cancelled.',
      };
    case 'voided':
      return {
        label: 'Voided',
        color: 'gray',
        description: 'This ticket has been voided.',
      };
    default:
      return {
        label: 'Unknown',
        color: 'gray',
        description: 'Status unknown.',
      };
  }
}
