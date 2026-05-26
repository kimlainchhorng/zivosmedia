/**
 * Download Itinerary Button
 * Generates a printable e-ticket / itinerary and triggers download
 */

import { useCallback, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ItineraryData {
  booking_reference: string;
  pnr?: string | null;
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string | null;
  cabin_class?: string | null;
  passengers: number;
  total_amount: number;
  currency?: string;
  ticket_numbers?: string[] | null;
  payment_status?: string;
  flight_passengers?: Array<{
    given_name: string;
    family_name: string;
    email?: string;
  }>;
}

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function generateItineraryHTML(data: ItineraryData): string {
  const passengers = data.flight_passengers || [];
  const tickets = data.ticket_numbers || [];

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>E-Ticket — ${data.booking_reference}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
  .logo span { color: #0ea5e9; }
  .doc-type { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 2px; }
  .route-box { background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 1px solid #bae6fd; border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 24px; }
  .route { display: flex; align-items: center; justify-content: center; gap: 24px; }
  .airport-code { font-size: 42px; font-weight: 800; color: #0c4a6e; }
  .route-arrow { font-size: 24px; color: #0ea5e9; }
  .ref-row { display: flex; justify-content: center; gap: 40px; margin-top: 16px; }
  .ref-item { text-align: center; }
  .ref-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
  .ref-value { font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; margin-top: 2px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #0ea5e9; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .info-item { padding: 12px; background: #f8fafc; border-radius: 8px; }
  .info-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-value { font-size: 15px; font-weight: 600; margin-top: 2px; }
  .passenger-row { display: flex; justify-content: space-between; padding: 10px 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 6px; }
  .total-row { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #0c4a6e; color: white; border-radius: 12px; margin-bottom: 24px; }
  .total-label { font-size: 14px; font-weight: 600; }
  .total-value { font-size: 28px; font-weight: 800; }
  .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0; }
  .footer p { font-size: 11px; color: #94a3b8; line-height: 1.6; }
  .ticket-number { font-family: 'Courier New', monospace; font-size: 13px; color: #334155; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">ZI<span>V</span>O</div>
      <div class="doc-type">Electronic Ticket / Itinerary Receipt</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#666">Generated</div>
      <div style="font-size:13px;font-weight:600">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
  </div>

  <div class="route-box">
    <div class="route">
      <div class="airport-code">${data.origin}</div>
      <div class="route-arrow">✈ →</div>
      <div class="airport-code">${data.destination}</div>
    </div>
    <div class="ref-row">
      <div class="ref-item">
        <div class="ref-label">Booking Reference</div>
        <div class="ref-value">${data.booking_reference}</div>
      </div>
      ${data.pnr ? `<div class="ref-item"><div class="ref-label">PNR</div><div class="ref-value">${data.pnr}</div></div>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Flight Details</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Departure</div>
        <div class="info-value">${data.departure_date}</div>
      </div>
      ${data.return_date ? `<div class="info-item"><div class="info-label">Return</div><div class="info-value">${data.return_date}</div></div>` : ''}
      <div class="info-item">
        <div class="info-label">Cabin</div>
        <div class="info-value" style="text-transform:capitalize">${(data.cabin_class || 'economy').replace('_', ' ')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Status</div>
        <div class="info-value" style="color:#16a34a">${data.payment_status === 'paid' ? '✓ Confirmed' : data.payment_status || 'Confirmed'}</div>
      </div>
    </div>
  </div>

  ${passengers.length > 0 ? `
  <div class="section">
    <div class="section-title">Passengers</div>
    ${passengers.map((p, i) => `
      <div class="passenger-row">
        <div>
          <div style="font-weight:600;font-size:14px">${p.given_name} ${p.family_name}</div>
          ${p.email ? `<div style="font-size:11px;color:#64748b">${p.email}</div>` : ''}
        </div>
        ${tickets[i] ? `<div class="ticket-number">${tickets[i]}</div>` : ''}
      </div>
    `).join('')}
  </div>` : ''}

  ${tickets.length > 0 && passengers.length === 0 ? `
  <div class="section">
    <div class="section-title">E-Ticket Numbers</div>
    ${tickets.map(t => `<div class="ticket-number" style="margin-bottom:4px">${t}</div>`).join('')}
  </div>` : ''}

  <div class="total-row">
    <div class="total-label">Total Paid</div>
    <div class="total-value">${formatCurrency(data.total_amount * data.passengers, data.currency)}</div>
  </div>

  <div class="footer">
    <p><strong>ZIVO</strong> — hizovo.com</p>
    <p>This is your electronic ticket receipt. Present your booking reference at check-in.</p>
    <p>Booking support is provided by the issuing travel partner. For website help, visit hizovo.com/help</p>
    <p style="margin-top:8px;font-size:10px;color:#cbd5e1">Prices shown include all taxes and fees at time of booking. Final terms confirmed by partner.</p>
  </div>
</body>
</html>`;
}

export default function DownloadItinerary({ booking }: { booking: ItineraryData }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = useCallback(() => {
    setIsGenerating(true);

    try {
      const html = generateItineraryHTML(booking);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // Download as HTML file (works on native + web)
      const a = document.createElement('a');
      a.href = url;
      a.download = `ZIVO-Itinerary-${booking.booking_reference}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
      toast.success('Itinerary opened — use Print > Save as PDF to download');
    } catch {
      toast.error('Failed to generate itinerary');
    } finally {
      setIsGenerating(false);
    }
  }, [booking]);

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      disabled={isGenerating}
      className="flex-1 rounded-xl border-border/40 gap-2"
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      E-Ticket
    </Button>
  );
}
