/**
 * Partner Redirect Logging
 * 
 * Logs outbound clicks to partner_redirect_logs table
 * Links to search_sessions via session_id (subid) for conversion tracking
 */

import { supabase } from '@/integrations/supabase/client';
import { getSearchSessionId } from '@/config/trackingParams';

export interface PartnerRedirectData {
  partnerId?: string;
  partnerName: string;
  searchType: 'flights' | 'hotels' | 'cars';
  offerId?: string;
  redirectUrl: string;
  checkoutMode?: 'redirect' | 'iframe';
  searchParams?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface LoggedRedirect {
  id: string;
  sessionId: string;
  partnerName: string;
  redirectUrl: string;
  createdAt: string;
}

/**
 * Log a partner redirect for tracking
 * Call this before redirecting user to partner checkout
 */
export async function logPartnerRedirect(data: PartnerRedirectData): Promise<LoggedRedirect | null> {
  const searchSessionId = getSearchSessionId();

  // Get current user if authenticated
  const { data: { user } } = await supabase.auth.getUser();

  try {
    // Use type assertion to work around complex generated types
    const insertResult = await (supabase
      .from('partner_redirect_logs') as unknown as {
        insert: (data: Record<string, unknown>) => {
          select: (cols: string) => {
            single: () => Promise<{
              data: { id: string; session_id: string; partner_name: string; redirect_url: string; created_at: string } | null;
              error: Error | null;
            }>;
          };
        };
      })
      .insert({
        session_id: searchSessionId,
        partner_name: data.partnerName,
        search_type: data.searchType,
        offer_id: data.offerId || null,
        redirect_url: data.redirectUrl,
        checkout_mode: data.checkoutMode || 'redirect',
        status: 'pending',
        user_id: user?.id || null,
        search_params: data.searchParams || null,
        metadata: data.metadata || null,
      })
      .select('id, session_id, partner_name, redirect_url, created_at')
      .single();

    if (insertResult.error) {
      console.error('[PartnerRedirect] Failed to log redirect:', insertResult.error);
      return null;
    }

    const result = insertResult.data;
    if (!result) return null;

    return {
      id: result.id,
      sessionId: result.session_id,
      partnerName: result.partner_name,
      redirectUrl: result.redirect_url,
      createdAt: result.created_at,
    };
  } catch (e) {
    console.error('[PartnerRedirect] Exception logging redirect:', e);
    return null;
  }
}

/**
 * Log a search session before user starts browsing results
 * Call this when user performs a search
 */
export async function logSearchSession(data: {
  type: 'flights' | 'hotels' | 'cars';
  origin?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  passengers?: number;
  rooms?: number;
  guests?: number;
  cabinClass?: string;
  searchParams?: Record<string, unknown>;
  userEmail?: string;
}): Promise<string> {
  const searchSessionId = getSearchSessionId();
  
  // Get current user if authenticated
  const { data: { user } } = await supabase.auth.getUser();

  try {
    // Use type assertion to work around complex generated types
    const insertResult = await (supabase
      .from('search_sessions') as unknown as {
        upsert: (data: Record<string, unknown>, options: { onConflict: string }) => Promise<{
          error: Error | null;
        }>;
      })
      .upsert({
        session_id: searchSessionId,
        type: data.type,
        origin: data.origin || null,
        destination: data.destination || null,
        depart_date: data.departDate || null,
        return_date: data.returnDate || null,
        passengers: data.passengers || 1,
        rooms: data.rooms || 1,
        guests: data.guests || 1,
        cabin_class: data.cabinClass || null,
        search_params: data.searchParams || null,
        user_id: user?.id || null,
        user_email: data.userEmail || user?.email || null,
        device_type: getDeviceType(),
        user_agent: navigator.userAgent,
      }, { onConflict: 'session_id' });

    if (insertResult.error) {
      console.error('[SearchSession] Failed to log session:', insertResult.error);
    }
  } catch (e) {
    console.error('[SearchSession] Exception logging session:', e);
  }

  return searchSessionId;
}

/**
 * Get device type for tracking
 */
function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}
