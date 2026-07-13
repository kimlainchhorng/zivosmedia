/**
 * Travel Bookings Hook
 * CRUD operations for travel search sessions, offers, and bookings
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

// Types
export type TravelServiceType = 'flights' | 'hotels' | 'cars';
export type TravelBookingStatus = 'pending' | 'redirected' | 'completed' | 'failed' | 'cancelled';
export type CheckoutMode = 'redirect' | 'iframe';

export interface TravelerInfo {
  fullName: string;
  email: string;
  phone: string;
  consentSharing: true;
}

export interface SearchParams {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
  cabinClass?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: number;
  guests?: number;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupDate?: string;
  dropoffDate?: string;
  driverAge?: number;
}

export interface TravelOffer {
  id: string;
  search_session_id: string | null;
  service_type: TravelServiceType;
  partner_id: string;
  partner_name: string | null;
  offer_data: Json;
  price_amount: number | null;
  price_currency: string | null;
  is_selected: boolean | null;
  created_at: string;
}

export interface TravelBooking {
  id: string;
  user_id: string | null;
  email: string;
  offer_id: string | null;
  service_type: TravelServiceType;
  traveler_info: Json;
  partner_booking_ref: string | null;
  status: TravelBookingStatus;
  partner_redirect_url: string | null;
  created_at: string;
  updated_at: string;
  offer?: TravelOffer | null;
}

export interface PartnerConfig {
  id: string;
  service_type: TravelServiceType;
  partner_id: string;
  partner_name: string;
  checkout_url_template: string;
  checkout_mode: CheckoutMode;
  is_active: boolean;
  priority: number;
  logo_url: string | null;
}

// Generate a session ID for anonymous users
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('zivo_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem('zivo_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Create a search session
 */
export const useCreateSearchSession = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceType,
      searchParams,
    }: {
      serviceType: TravelServiceType;
      searchParams: SearchParams;
    }) => {
      const { data, error } = await supabase
        .from('travel_search_sessions')
        .insert({
          user_id: user?.id || null,
          session_id: getSessionId(),
          service_type: serviceType,
          search_params: searchParams as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-sessions'] });
    },
    onError: (error) => {
      console.error('Failed to create search session:', error);
    },
  });
};

/**
 * Save an offer selection
 */
export const useSaveOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      searchSessionId,
      serviceType,
      partnerId,
      partnerName,
      offerData,
      priceAmount,
      priceCurrency = 'USD',
    }: {
      searchSessionId: string;
      serviceType: TravelServiceType;
      partnerId: string;
      partnerName?: string;
      offerData: Record<string, unknown>;
      priceAmount?: number;
      priceCurrency?: string;
    }) => {
      // First, unselect any previously selected offers
      await supabase
        .from('travel_offers')
        .update({ is_selected: false })
        .eq('search_session_id', searchSessionId);

      // Insert new selected offer
      const { data, error } = await supabase
        .from('travel_offers')
        .insert({
          search_session_id: searchSessionId,
          service_type: serviceType,
          partner_id: partnerId,
          partner_name: partnerName,
          offer_data: offerData as unknown as Json,
          price_amount: priceAmount,
          price_currency: priceCurrency,
          is_selected: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-offers'] });
    },
    onError: (error) => {
      console.error('Failed to save offer:', error);
    },
  });
};

/**
 * Create a booking with traveler info
 */
export const useCreateBooking = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      offerId,
      serviceType,
      travelerInfo,
      partnerRedirectUrl,
    }: {
      offerId: string;
      serviceType: TravelServiceType;
      travelerInfo: TravelerInfo;
      partnerRedirectUrl: string;
    }) => {
      const { data, error } = await supabase
        .from('travel_bookings')
        .insert({
          user_id: user?.id || null,
          email: travelerInfo.email,
          offer_id: offerId,
          service_type: serviceType,
          traveler_info: travelerInfo as unknown as Json,
          partner_redirect_url: partnerRedirectUrl,
          status: 'pending' as const,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-bookings'] });
      toast.success('Booking created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create booking');
      console.error('Booking error:', error);
    },
  });
};

/**
 * Update booking status
 */
export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      status,
      partnerBookingRef,
    }: {
      bookingId: string;
      status: TravelBookingStatus;
      partnerBookingRef?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (partnerBookingRef) {
        updateData.partner_booking_ref = partnerBookingRef;
      }

      const { data, error } = await supabase
        .from('travel_bookings')
        .update(updateData as any)
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-bookings'] });
    },
  });
};

/**
 * Get user's travel bookings
 */
export const useTravelBookings = (status?: TravelBookingStatus) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['travel-bookings', user?.id, status],
    queryFn: async () => {
      let query = supabase
        .from('travel_bookings')
        .select(`
          *,
          offer:travel_offers(*)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TravelBooking[];
    },
    enabled: !!user,
  });
};

/**
 * Get partner checkout configurations
 */
export const usePartnerConfigs = (serviceType?: TravelServiceType) => {
  return useQuery({
    queryKey: ['partner-configs', serviceType],
    queryFn: async () => {
      let query = supabase
        .from('partner_checkout_config')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (serviceType) {
        query = query.eq('service_type', serviceType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PartnerConfig[];
    },
  });
};

/**
 * Log partner redirect
 */
export const useLogPartnerRedirect = () => {
  return useMutation({
    mutationFn: async ({
      offerId,
      partnerId,
      partnerName,
      searchType,
      redirectUrl,
      checkoutMode = 'redirect',
      sessionId,
      searchParams,
    }: {
      offerId?: string;
      partnerId: string;
      partnerName: string;
      searchType: TravelServiceType;
      redirectUrl: string;
      checkoutMode?: CheckoutMode;
      sessionId?: string;
      searchParams?: Record<string, unknown>;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      // Using type assertion as types may be stale after migration
      const insertData = {
        offer_id: offerId || null,
        partner_id: partnerId,
        partner_name: partnerName,
        search_type: searchType,
        redirect_url: redirectUrl,
        checkout_mode: checkoutMode,
        session_id: sessionId || null,
        search_params: searchParams || null,
        user_id: userData?.user?.id || null,
        metadata: {
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
        },
      };
      const { error } = await supabase
        .from('partner_redirect_logs')
        .insert([insertData] as never);

      if (error) throw error;
    },
  });
};

/**
 * Admin: Get all partner configs
 */
export const useAdminPartnerConfigs = () => {
  return useQuery({
    queryKey: ['admin-partner-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_checkout_config')
        .select('*')
        .order('service_type')
        .order('priority', { ascending: true });

      if (error) throw error;
      return data as unknown as PartnerConfig[];
    },
  });
};

/**
 * Admin: Update partner config
 */
export const useUpdatePartnerConfig = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<PartnerConfig, 'id'>>;
    }) => {
      const { data, error } = await supabase
        .from('partner_checkout_config')
        .update({
          ...updates,
          updated_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-configs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-partner-configs'] });
      toast.success('Partner configuration updated');
    },
    onError: (error) => {
      toast.error('Failed to update configuration');
      console.error(error);
    },
  });
};

/**
 * Admin: Create partner config
 */
export const useCreatePartnerConfig = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Omit<PartnerConfig, 'id'>) => {
      const { data, error } = await supabase
        .from('partner_checkout_config')
        .insert({
          ...config,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-configs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-partner-configs'] });
      toast.success('Partner configuration created');
    },
    onError: (error) => {
      toast.error('Failed to create configuration');
      console.error(error);
    },
  });
};

/**
 * Admin: Get partner redirect logs
 */
export const usePartnerRedirectLogs = (limit = 100) => {
  return useQuery({
    queryKey: ['partner-redirect-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_redirect_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
};

// Helper to extract traveler info from Json
export const parseTravelerInfo = (json: Json): TravelerInfo | null => {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const obj = json as Record<string, unknown>;
  if (!obj.consentSharing) return null;
  return {
    fullName: String(obj.fullName || ''),
    email: String(obj.email || ''),
    phone: String(obj.phone || ''),
    consentSharing: true,
  };
};

// Helper to extract offer data
export const parseOfferData = (json: Json): Record<string, unknown> => {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {};
  return json as Record<string, unknown>;
};
