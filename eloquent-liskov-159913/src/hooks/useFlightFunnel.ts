/**
 * Flight Funnel Tracking Hook
 * Tracks user journey through the flight booking funnel for analytics
 * Events are stored in flight_funnel_events table
 */

import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Event types for the flight booking funnel
export type FlightFunnelEventType =
  | 'search_started'
  | 'results_loaded'
  | 'offer_selected'
  | 'checkout_started'
  | 'payment_success'
  | 'ticket_issued'
  | 'booking_failed';

export interface FlightFunnelEventData {
  origin?: string;
  destination?: string;
  departure_date?: string;
  return_date?: string;
  passengers?: number;
  cabin_class?: string;
  offer_id?: string;
  offers_count?: number;
  amount?: number;
  currency?: string;
  booking_id?: string;
  error_type?: string;
  error_message?: string;
}

// Generate or retrieve session ID for attribution
const getSessionId = (): string => {
  const key = 'zivo_flight_session';
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `FS_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Get user ID if logged in
const getUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

/**
 * Hook for tracking flight funnel events
 */
export function useFlightFunnel() {
  // Track which events have been logged this session to prevent duplicates
  const loggedEvents = useRef<Set<string>>(new Set());

  /**
   * Track a funnel event
   */
  const trackEvent = useCallback(async (
    eventType: FlightFunnelEventType,
    data: FlightFunnelEventData = {}
  ): Promise<void> => {
    try {
      // Create unique key for deduplication
      const eventKey = `${eventType}_${data.offer_id || data.origin || ''}_${Date.now().toString().slice(0, -3)}`;
      
      // Prevent duplicate events within same second
      if (loggedEvents.current.has(eventKey)) {
        return;
      }
      loggedEvents.current.add(eventKey);

      const userId = await getUserId();
      const sessionId = getSessionId();
      const deviceType = getDeviceType();

      const eventPayload = {
        event_type: eventType,
        session_id: sessionId,
        user_id: userId,
        device_type: deviceType,
        origin: data.origin?.toUpperCase(),
        destination: data.destination?.toUpperCase(),
        departure_date: data.departure_date,
        return_date: data.return_date,
        passengers: data.passengers,
        cabin_class: data.cabin_class,
        offer_id: data.offer_id,
        offers_count: data.offers_count,
        amount: data.amount,
        currency: data.currency,
        booking_id: data.booking_id,
        error_type: data.error_type,
        error_message: data.error_message?.slice(0, 500), // Limit error message length
      };

      // Fire and forget - don't await to avoid blocking UI
      supabase
        .from('flight_funnel_events')
        .insert(eventPayload)
        .then(({ error }) => {
          if (error) {
            console.error('[FlightFunnel] Failed to log event:', error);
          }
        });

    } catch (error) {
      console.error('[FlightFunnel] Error tracking event:', error);
    }
  }, []);

  /**
   * Track search started event
   */
  const trackSearchStarted = useCallback((params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    cabinClass: string;
  }) => {
    trackEvent('search_started', {
      origin: params.origin,
      destination: params.destination,
      departure_date: params.departureDate,
      return_date: params.returnDate,
      passengers: params.passengers,
      cabin_class: params.cabinClass,
    });
  }, [trackEvent]);

  /**
   * Track results loaded event
   */
  const trackResultsLoaded = useCallback((params: {
    origin: string;
    destination: string;
    offersCount: number;
    departureDate: string;
  }) => {
    trackEvent('results_loaded', {
      origin: params.origin,
      destination: params.destination,
      offers_count: params.offersCount,
      departure_date: params.departureDate,
    });
  }, [trackEvent]);

  /**
   * Track offer selected event
   */
  const trackOfferSelected = useCallback((params: {
    offerId: string;
    origin: string;
    destination: string;
    amount: number;
    currency: string;
  }) => {
    trackEvent('offer_selected', {
      offer_id: params.offerId,
      origin: params.origin,
      destination: params.destination,
      amount: params.amount,
      currency: params.currency,
    });
  }, [trackEvent]);

  /**
   * Track checkout started event
   */
  const trackCheckoutStarted = useCallback((params: {
    offerId: string;
    amount: number;
    currency: string;
    passengers: number;
  }) => {
    trackEvent('checkout_started', {
      offer_id: params.offerId,
      amount: params.amount,
      currency: params.currency,
      passengers: params.passengers,
    });
  }, [trackEvent]);

  /**
   * Track booking failed event
   */
  const trackBookingFailed = useCallback((params: {
    bookingId?: string;
    errorType: string;
    errorMessage: string;
  }) => {
    trackEvent('booking_failed', {
      booking_id: params.bookingId,
      error_type: params.errorType,
      error_message: params.errorMessage,
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackSearchStarted,
    trackResultsLoaded,
    trackOfferSelected,
    trackCheckoutStarted,
    trackBookingFailed,
  };
}

/**
 * Get the current session ID (for correlation)
 */
export { getSessionId };
