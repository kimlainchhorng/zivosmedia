/**
 * Flight Data Export Utilities
 * CSV exports for bookings, revenue reports, and failed transactions
 * Privacy-compliant: No PII (names, emails, passports) in exports
 */

import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface ExportFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string;
}

/**
 * Convert array of objects to CSV string
 */
function objectsToCSV<T extends Record<string, unknown>>(data: T[], columns: string[]): string {
  if (data.length === 0) return '';

  const header = columns.join(',');
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Trigger download of CSV file
 */
function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export flight bookings to CSV
 * Excludes passenger PII - only contains booking IDs and aggregate data
 */
export async function exportBookingsCSV(filters: ExportFilters = {}): Promise<void> {
  const { startDate = subDays(new Date(), 30), endDate = new Date(), status } = filters;

  let query = supabase
    .from('flight_bookings')
    .select(`
      id,
      booking_reference,
      pnr,
      origin,
      destination,
      departure_date,
      return_date,
      passengers,
      cabin_class,
      total_amount,
      base_fare,
      taxes_fees,
      zivo_markup,
      currency,
      payment_status,
      ticketing_status,
      created_at,
      ticketed_at
    `)
    .gte('created_at', startOfDay(startDate).toISOString())
    .lte('created_at', endOfDay(endDate).toISOString())
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('ticketing_status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No bookings found for the selected date range');
  }

  // Format data for export
  const exportData = data.map((b: any) => ({
    booking_reference: b.booking_reference || '',
    pnr: b.pnr || '',
    route: `${b.origin || ''}-${b.destination || ''}`,
    departure_date: b.departure_date || '',
    return_date: b.return_date || '',
    passengers: b.passengers || 0,
    cabin_class: b.cabin_class || '',
    base_fare: b.base_fare || 0,
    taxes_fees: b.taxes_fees || 0,
    zivo_markup: b.zivo_markup || 0,
    total_amount: b.total_amount || 0,
    currency: b.currency || 'USD',
    payment_status: b.payment_status || '',
    ticketing_status: b.ticketing_status || '',
    booked_at: b.created_at ? format(new Date(b.created_at), 'yyyy-MM-dd HH:mm') : '',
    ticketed_at: b.ticketed_at ? format(new Date(b.ticketed_at), 'yyyy-MM-dd HH:mm') : '',
  }));

  const columns = [
    'booking_reference', 'pnr', 'route', 'departure_date', 'return_date',
    'passengers', 'cabin_class', 'base_fare', 'taxes_fees', 'zivo_markup',
    'total_amount', 'currency', 'payment_status', 'ticketing_status',
    'booked_at', 'ticketed_at'
  ];

  const csv = objectsToCSV(exportData, columns);
  const filename = `zivo-flight-bookings-${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Export revenue report to CSV
 * Aggregated by day for accounting purposes
 */
export async function exportRevenueReportCSV(filters: ExportFilters = {}): Promise<void> {
  const { startDate = subDays(new Date(), 30), endDate = new Date() } = filters;

  const { data, error } = await supabase
    .from('flight_bookings')
    .select('created_at, total_amount, base_fare, taxes_fees, zivo_markup, currency')
    .eq('ticketing_status', 'issued')
    .gte('created_at', startOfDay(startDate).toISOString())
    .lte('created_at', endOfDay(endDate).toISOString());

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No completed bookings found for the selected date range');
  }

  // Aggregate by date
  const dailyRevenue = new Map<string, {
    date: string;
    bookings: number;
    base_fare: number;
    taxes_fees: number;
    zivo_markup: number;
    total_revenue: number;
  }>();

  data.forEach(b => {
    const date = format(new Date(b.created_at), 'yyyy-MM-dd');
    const existing = dailyRevenue.get(date) || {
      date,
      bookings: 0,
      base_fare: 0,
      taxes_fees: 0,
      zivo_markup: 0,
      total_revenue: 0,
    };

    dailyRevenue.set(date, {
      date,
      bookings: existing.bookings + 1,
      base_fare: existing.base_fare + (b.base_fare || 0),
      taxes_fees: existing.taxes_fees + (b.taxes_fees || 0),
      zivo_markup: existing.zivo_markup + (b.zivo_markup || 0),
      total_revenue: existing.total_revenue + (b.total_amount || 0),
    });
  });

  const exportData = Array.from(dailyRevenue.values())
    .sort((a, b) => a.date.localeCompare(b.date));

  // Add totals row
  const totals = {
    date: 'TOTAL',
    bookings: exportData.reduce((sum, d) => sum + d.bookings, 0),
    base_fare: exportData.reduce((sum, d) => sum + d.base_fare, 0),
    taxes_fees: exportData.reduce((sum, d) => sum + d.taxes_fees, 0),
    zivo_markup: exportData.reduce((sum, d) => sum + d.zivo_markup, 0),
    total_revenue: exportData.reduce((sum, d) => sum + d.total_revenue, 0),
  };
  exportData.push(totals);

  const columns = ['date', 'bookings', 'base_fare', 'taxes_fees', 'zivo_markup', 'total_revenue'];
  const csv = objectsToCSV(exportData, columns);
  const filename = `zivo-flight-revenue-${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Export failed transactions for reconciliation
 */
export async function exportFailedTransactionsCSV(filters: ExportFilters = {}): Promise<void> {
  const { startDate = subDays(new Date(), 30), endDate = new Date() } = filters;

  const { data, error } = await supabase
    .from('flight_bookings')
    .select(`
      id,
      booking_reference,
      origin,
      destination,
      total_amount,
      currency,
      payment_status,
      ticketing_status,
      ticketing_error,
      created_at
    `)
    .or('ticketing_status.eq.failed,payment_status.eq.failed,payment_status.eq.refunded')
    .gte('created_at', startOfDay(startDate).toISOString())
    .lte('created_at', endOfDay(endDate).toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No failed transactions found for the selected date range');
  }

  const exportData = data.map((b: any) => ({
    booking_reference: b.booking_reference || b.id?.slice(0, 8) || '',
    route: `${b.origin || ''}-${b.destination || ''}`,
    amount: b.total_amount || 0,
    currency: b.currency || 'USD',
    payment_status: b.payment_status || '',
    ticketing_status: b.ticketing_status || '',
    error: b.ticketing_error || '',
    date: b.created_at ? format(new Date(b.created_at), 'yyyy-MM-dd HH:mm') : '',
  }));

  const columns = ['booking_reference', 'route', 'amount', 'currency', 'payment_status', 'ticketing_status', 'error', 'date'];
  const csv = objectsToCSV(exportData, columns);
  const filename = `zivo-flight-failures-${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}.csv`;
  downloadCSV(csv, filename);
}
