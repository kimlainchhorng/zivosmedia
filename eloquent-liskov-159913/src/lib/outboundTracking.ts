/**
 * Hizovo Outbound Click Tracking
 * 
 * Handles logging affiliate clicks to the database
 * and generating tracked redirect URLs
 * 
 * STANDARDIZED TRACKING PARAMS:
 * utm_source=hizovo
 * utm_medium=affiliate
 * utm_campaign=travel
 * subid={searchSessionId}
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  generateSubID, 
  appendSubIDToURL, 
  getPersistedUTMParams,
  type UTMParams, 
  type SubIDComponents 
} from './subidGenerator';
import { getDeviceType, getSessionId } from './affiliateTracking';
import { HIZOVO_TRACKING_PARAMS, getSearchSessionId } from '@/config/trackingParams';

export interface OutboundClickData {
  partnerId: string;
  partnerName: string;
  product: string;
  pageSource: string;
  destinationUrl: string;
}

export interface ClickLogEntry {
  id?: string;
  session_id: string;
  user_id?: string;
  partner_id: string;
  partner_name: string;
  product: string;
  page_source: string;
  subid: string;
  subid_components: SubIDComponents;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  creator?: string;
  destination_url: string;
  final_url: string;
  device_type?: string;
  user_agent?: string;
  referrer?: string;
}

/**
 * Log an outbound click to the database
 */
export async function logOutboundClick(data: OutboundClickData): Promise<{
  success: boolean;
  finalUrl: string;
  subid: string;
  logId?: string;
  error?: string;
}> {
  const utmParams = getPersistedUTMParams();
  // Use standardized search session ID as subid
  const searchSessionId = getSearchSessionId();
  const { subid, components } = generateSubID(data.product, data.pageSource, utmParams, data.partnerId);
  
  // Build final URL with standardized Hizovo tracking params
  const urlObj = new URL(data.destinationUrl);
  urlObj.searchParams.set('utm_source', HIZOVO_TRACKING_PARAMS.utm_source);
  urlObj.searchParams.set('utm_medium', HIZOVO_TRACKING_PARAMS.utm_medium);
  urlObj.searchParams.set('utm_campaign', HIZOVO_TRACKING_PARAMS.utm_campaign);
  urlObj.searchParams.set('subid', searchSessionId);
  const finalUrl = urlObj.toString();
  
  const logEntry: ClickLogEntry = {
    session_id: getSessionId(),
    partner_id: data.partnerId,
    partner_name: data.partnerName,
    product: data.product,
    page_source: data.pageSource,
    subid: searchSessionId, // Use standardized format
    subid_components: components,
    utm_source: HIZOVO_TRACKING_PARAMS.utm_source,
    utm_medium: HIZOVO_TRACKING_PARAMS.utm_medium,
    utm_campaign: HIZOVO_TRACKING_PARAMS.utm_campaign,
    utm_content: utmParams.utm_content || undefined,
    utm_term: utmParams.utm_term || undefined,
    creator: utmParams.creator || undefined,
    destination_url: data.destinationUrl,
    final_url: finalUrl,
    device_type: getDeviceType(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    referrer: typeof document !== 'undefined' ? document.referrer : undefined,
  };
  
  // Get current user if authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    (logEntry as any).user_id = user.id;
  }
  
  // Log to database
  const { data: insertedLog, error } = await supabase
    .from('affiliate_click_logs')
    .insert(logEntry as any)
    .select('id')
    .single();
  
  if (error) {
    console.warn('[OutboundTracking] Failed to log click:', error);
    // Still return the URL even if logging fails
    return { success: false, finalUrl, subid, error: error.message };
  }
  
  
  return { 
    success: true, 
    finalUrl, 
    subid: searchSessionId,
    logId: insertedLog?.id 
  };
}

/**
 * Build the /out redirect URL for a partner
 */
export function buildOutboundURL(
  partnerId: string,
  partnerName: string,
  product: string,
  pageSource: string,
  destinationUrl: string
): string {
  const params = new URLSearchParams({
    partner: partnerId,
    name: partnerName,
    product,
    page: pageSource,
    url: destinationUrl,
  });
  
  return `/out?${params.toString()}`;
}

/**
 * Get click logs for admin dashboard
 */
export async function getClickLogs(filters: {
  startDate?: string;
  endDate?: string;
  partnerId?: string;
  product?: string;
  utmSource?: string;
  creator?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: ClickLogEntry[]; count: number }> {
  let query = supabase
    .from('affiliate_click_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters.partnerId) {
    query = query.eq('partner_id', filters.partnerId);
  }
  if (filters.product) {
    query = query.eq('product', filters.product);
  }
  if (filters.utmSource) {
    query = query.eq('utm_source', filters.utmSource);
  }
  if (filters.creator) {
    query = query.eq('creator', filters.creator);
  }
  
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);
  
  const { data, error, count } = await query;
  
  if (error) {
    console.error('[OutboundTracking] Failed to get logs:', error);
    return { logs: [], count: 0 };
  }
  
  return { logs: data as unknown as ClickLogEntry[], count: count || 0 };
}

/**
 * Export click logs to CSV format
 */
export function exportLogsToCSV(logs: ClickLogEntry[]): string {
  const headers = [
    'Timestamp',
    'Partner ID',
    'Partner Name',
    'Product',
    'Page Source',
    'SubID',
    'UTM Source',
    'UTM Campaign',
    'Creator',
    'Device',
    'Destination URL',
  ];
  
  const rows = logs.map(log => [
    (log as any).created_at || '',
    log.partner_id,
    log.partner_name,
    log.product,
    log.page_source,
    log.subid,
    log.utm_source || '',
    log.utm_campaign || '',
    log.creator || '',
    log.device_type || '',
    log.destination_url,
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  
  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
