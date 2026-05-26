/**
 * Event Tracking Hook
 * Tracks user behavior across the ZIVO platform for analytics
 */

import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Analytics event types
export type TrackingEventName =
  // Search & Discovery
  | 'search_flights'
  | 'search_hotels'
  | 'search_activities'
  | 'search_transfers'
  | 'view_results'
  | 'view_item_details'
  | 'view_hotel'
  | 'view_flight'
  | 'view_activity'
  | 'view_transfer'
  // Booking Funnel
  | 'checkout_started'
  | 'traveler_details_completed'
  | 'payment_started'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'booking_confirmed'
  | 'booking_failed'
  // Post-booking
  | 'view_my_trips'
  | 'resend_confirmation'
  | 'cancellation_requested'
  | 'refund_processed'
  // General
  | 'page_view'
  | 'button_click'
  | 'form_submit'
  | 'error';

export interface TrackingEventMeta {
  product_type?: 'hotel' | 'activity' | 'transfer' | 'flight';
  search_query?: string;
  item_id?: string;
  item_name?: string;
  currency?: string;
  error_message?: string;
  [key: string]: unknown;
}

// Session management
const SESSION_KEY = 'zivo_tracking_session';
const SESSION_EXPIRY = 30 * 60 * 1000; // 30 minutes

const getOrCreateSession = (): string => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const { id, timestamp } = JSON.parse(stored);
      if (Date.now() - timestamp < SESSION_EXPIRY) {
        // Refresh timestamp
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, timestamp: Date.now() }));
        return id;
      }
    }
    const newId = `TS_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: newId, timestamp: Date.now() }));
    return newId;
  } catch {
    return `TS_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
};

// Device detection
const getDeviceType = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Traffic source detection
const getTrafficSource = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  
  const referrer = document.referrer;
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get('utm_source')) {
    return urlParams.get('utm_source') || 'unknown';
  }
  if (urlParams.get('gclid')) return 'google_ads';
  if (urlParams.get('fbclid')) return 'facebook_ads';
  
  if (!referrer) return 'direct';
  
  try {
    const referrerHost = new URL(referrer).hostname;
    if (referrerHost.includes('google')) return 'organic_google';
    if (referrerHost.includes('bing')) return 'organic_bing';
    if (referrerHost.includes('facebook')) return 'social_facebook';
    if (referrerHost.includes('instagram')) return 'social_instagram';
    if (referrerHost.includes('twitter') || referrerHost.includes('x.com')) return 'social_twitter';
  } catch {
    return 'referral';
  }
  
  return 'referral';
};

// Check if new user
const isNewUser = (): boolean => {
  try {
    const key = 'zivo_returning_user';
    const isReturning = localStorage.getItem(key);
    if (!isReturning) {
      localStorage.setItem(key, 'true');
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Hook for tracking analytics events
 */
export function useEventTracking() {
  const sessionId = useRef(getOrCreateSession());
  const trackedEvents = useRef<Set<string>>(new Set());

  // Get user ID if logged in
  const getUserId = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch {
      return null;
    }
  }, []);

  /**
   * Track an analytics event
   */
  const track = useCallback(async (
    eventName: TrackingEventName,
    meta: TrackingEventMeta = {},
    options: { dedupe?: boolean; value?: number; orderId?: string } = {}
  ): Promise<void> => {
    try {
      // Deduplication for certain events
      if (options.dedupe) {
        const dedupeKey = `${eventName}_${JSON.stringify(meta)}_${Date.now().toString().slice(0, -3)}`;
        if (trackedEvents.current.has(dedupeKey)) return;
        trackedEvents.current.add(dedupeKey);
      }

      const userId = await getUserId();
      
      const eventPayload = {
        user_id: userId,
        session_id: sessionId.current,
        event_name: eventName,
        page: typeof window !== 'undefined' ? window.location.pathname : '',
        order_id: options.orderId,
        value: options.value,
        meta,
        device_type: getDeviceType(),
        traffic_source: getTrafficSource(),
        is_new_user: isNewUser(),
      };

      // Fire and forget - don't block UI
      supabase
        .from('analytics_events')
        .insert(eventPayload as any)
        .then(({ error }) => {
          if (error) {
            console.error('[Tracking] Failed to track event:', error.message, error.code, error.details);
          }
        });

    } catch (error) {
      console.error('[Tracking] Error tracking event:', error);
    }
  }, [getUserId]);

  /**
   * Track page view
   */
  const trackPageView = useCallback((page?: string) => {
    track('page_view', { page: page || (typeof window !== 'undefined' ? window.location.pathname : '') }, { dedupe: true });
  }, [track]);

  /**
   * Track search event
   */
  const trackSearch = useCallback((
    productType: 'hotel' | 'activity' | 'transfer' | 'flight',
    searchParams: Record<string, unknown>
  ) => {
    const eventName = `search_${productType}s` as TrackingEventName;
    track(eventName, { product_type: productType, ...searchParams }, { dedupe: true });
  }, [track]);

  /**
   * Track view results
   */
  const trackViewResults = useCallback((
    productType: 'hotel' | 'activity' | 'transfer' | 'flight',
    resultsCount: number
  ) => {
    track('view_results', { product_type: productType, results_count: resultsCount });
  }, [track]);

  /**
   * Track item view
   */
  const trackItemView = useCallback((
    productType: 'hotel' | 'activity' | 'transfer' | 'flight',
    itemId: string,
    itemName?: string
  ) => {
    const eventName = `view_${productType}` as TrackingEventName;
    track(eventName, { product_type: productType, item_id: itemId, item_name: itemName });
  }, [track]);

  /**
   * Track checkout started
   */
  const trackCheckoutStarted = useCallback((
    productType: 'hotel' | 'activity' | 'transfer' | 'flight',
    value: number,
    currency: string = 'USD'
  ) => {
    track('checkout_started', { product_type: productType, currency }, { value });
  }, [track]);

  /**
   * Track payment events
   */
  const trackPayment = useCallback((
    status: 'started' | 'succeeded' | 'failed',
    orderId: string,
    value: number,
    currency: string = 'USD',
    errorMessage?: string
  ) => {
    const eventName = `payment_${status}` as TrackingEventName;
    track(eventName, { currency, error_message: errorMessage }, { value, orderId });
  }, [track]);

  /**
   * Track booking confirmation
   */
  const trackBookingConfirmed = useCallback((
    orderId: string,
    productType: 'hotel' | 'activity' | 'transfer' | 'flight',
    value: number
  ) => {
    track('booking_confirmed', { product_type: productType }, { value, orderId });
  }, [track]);

  /**
   * Track traveler details completion
   */
  const trackTravelerDetailsCompleted = useCallback((
    productType: 'hotel' | 'activity' | 'transfer' | 'flight'
  ) => {
    track('traveler_details_completed', { product_type: productType });
  }, [track]);

  /**
   * Track cancellation request
   */
  const trackCancellationRequested = useCallback((orderId: string) => {
    track('cancellation_requested', {}, { orderId });
  }, [track]);

  /**
   * Track refund processed
   */
  const trackRefundProcessed = useCallback((orderId: string, value: number) => {
    track('refund_processed', {}, { value, orderId });
  }, [track]);

  return {
    track,
    trackPageView,
    trackSearch,
    trackViewResults,
    trackItemView,
    trackCheckoutStarted,
    trackPayment,
    trackBookingConfirmed,
    trackTravelerDetailsCompleted,
    trackCancellationRequested,
    trackRefundProcessed,
    sessionId: sessionId.current,
  };
}

/**
 * Get the current session ID
 */
export { getOrCreateSession as getTrackingSessionId };
