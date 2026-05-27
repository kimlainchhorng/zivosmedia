import { format } from 'date-fns';
import { toast } from 'sonner';

interface FlightData {
  confirmationNumber: string;
  airline: string;
  flightNumber: string;
  departure: {
    code: string;
    city: string;
    time: string;
    date: Date;
    terminal?: string;
    gate?: string;
  };
  arrival: {
    code: string;
    city: string;
    time: string;
  };
  duration: string;
  passengers: Array<{
    firstName: string;
    lastName: string;
  }>;
  seat?: string;
  fareClass?: string;
  totalAmount?: number;
}

export function useItineraryExport() {
  // Generate ICS calendar file content
  const generateICS = (flight: FlightData): string => {
    const formatICSDate = (date: Date, time: string): string => {
      const [hours, minutes] = time.replace(/[^\d:]/g, '').split(':').map(Number);
      const d = new Date(date);
      d.setHours(hours || 0, minutes || 0, 0, 0);
      return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const startDate = formatICSDate(flight.departure.date, flight.departure.time);
    
    // Calculate end time based on duration
    const durationMatch = flight.duration.match(/(\d+)h\s*(\d+)?m?/);
    const durationHours = parseInt(durationMatch?.[1] || '0');
    const durationMinutes = parseInt(durationMatch?.[2] || '0');
    
    const endDate = new Date(flight.departure.date);
    const [startHours, startMinutes] = flight.departure.time.replace(/[^\d:]/g, '').split(':').map(Number);
    endDate.setHours((startHours || 0) + durationHours, (startMinutes || 0) + durationMinutes);
    const endDateStr = endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const passengerNames = flight.passengers.map(p => `${p.firstName} ${p.lastName}`).join(', ');
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ZIVO Travel//Flight Booking//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDateStr}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}
UID:${flight.confirmationNumber}@zivo.travel
SUMMARY:${flight.airline} ${flight.flightNumber} - ${flight.departure.code} → ${flight.arrival.code}
DESCRIPTION:Flight: ${flight.flightNumber}\\nConfirmation: ${flight.confirmationNumber}\\nPassengers: ${passengerNames}\\nTerminal: ${flight.departure.terminal || 'TBD'}\\nGate: ${flight.departure.gate || 'TBD'}${flight.seat ? `\\nSeat: ${flight.seat}` : ''}
LOCATION:${flight.departure.city} (${flight.departure.code}) - Terminal ${flight.departure.terminal || 'TBD'}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT3H
ACTION:DISPLAY
DESCRIPTION:Flight ${flight.flightNumber} departs in 3 hours!
END:VALARM
BEGIN:VALARM
TRIGGER:-PT24H
ACTION:DISPLAY
DESCRIPTION:Flight ${flight.flightNumber} departs tomorrow
END:VALARM
END:VEVENT
END:VCALENDAR`;
  };

  // Generate Google Calendar URL
  const generateGoogleCalendarURL = (flight: FlightData): string => {
    const formatGoogleDate = (date: Date, time: string): string => {
      const [hours, minutes] = time.replace(/[^\d:]/g, '').split(':').map(Number);
      const d = new Date(date);
      d.setHours(hours || 0, minutes || 0, 0, 0);
      return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
    };

    const startDate = formatGoogleDate(flight.departure.date, flight.departure.time);
    
    const durationMatch = flight.duration.match(/(\d+)h\s*(\d+)?m?/);
    const durationHours = parseInt(durationMatch?.[1] || '0');
    const durationMinutes = parseInt(durationMatch?.[2] || '0');
    
    const endDate = new Date(flight.departure.date);
    const [startHours, startMinutes] = flight.departure.time.replace(/[^\d:]/g, '').split(':').map(Number);
    endDate.setHours((startHours || 0) + durationHours, (startMinutes || 0) + durationMinutes);
    const endDateStr = endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');

    const passengerNames = flight.passengers.map(p => `${p.firstName} ${p.lastName}`).join(', ');
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${flight.airline} ${flight.flightNumber} - ${flight.departure.code} → ${flight.arrival.code}`,
      dates: `${startDate}/${endDateStr}`,
      details: `Flight: ${flight.flightNumber}\nConfirmation: ${flight.confirmationNumber}\nPassengers: ${passengerNames}\nTerminal: ${flight.departure.terminal || 'TBD'}\nGate: ${flight.departure.gate || 'TBD'}${flight.seat ? `\nSeat: ${flight.seat}` : ''}`,
      location: `${flight.departure.city} (${flight.departure.code}) - Terminal ${flight.departure.terminal || 'TBD'}`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Generate PDF content (returns HTML for printing)
  const generatePDFContent = (flight: FlightData): string => {
    const passengersList = flight.passengers.map(p => `${p.firstName} ${p.lastName}`).join('<br/>');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Flight Itinerary - ${flight.confirmationNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0ea5e9, #8b5cf6); color: white; padding: 32px; text-align: center; }
    .logo { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
    .confirmation { font-size: 14px; opacity: 0.9; }
    .confirmation strong { font-size: 20px; letter-spacing: 2px; }
    .route-section { padding: 32px; border-bottom: 1px dashed #e5e7eb; }
    .route { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .airport { text-align: center; }
    .airport-code { font-size: 48px; font-weight: bold; color: #0ea5e9; }
    .airport-city { font-size: 14px; color: #6b7280; margin-top: 4px; }
    .airport-time { font-size: 18px; font-weight: 600; margin-top: 8px; }
    .flight-line { flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 24px; }
    .flight-line-inner { position: relative; width: 100%; height: 2px; background: linear-gradient(90deg, #0ea5e9, #8b5cf6); }
    .plane-icon { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(90deg); font-size: 24px; }
    .flight-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; background: #f9fafb; padding: 24px; border-radius: 12px; }
    .info-item { text-align: center; }
    .info-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .info-value { font-size: 16px; font-weight: 600; color: #1f2937; }
    .details-section { padding: 32px; }
    .section-title { font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
    .passenger-list { background: #f9fafb; padding: 16px 24px; border-radius: 12px; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
    .footer a { color: #0ea5e9; text-decoration: none; }
    @media print { body { padding: 0; background: white; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ZIVO Travel</div>
      <div class="confirmation">Confirmation Number<br/><strong>${flight.confirmationNumber}</strong></div>
    </div>
    
    <div class="route-section">
      <div class="route">
        <div class="airport">
          <div class="airport-code">${flight.departure.code}</div>
          <div class="airport-city">${flight.departure.city}</div>
          <div class="airport-time">${flight.departure.time}</div>
        </div>
        <div class="flight-line">
          <div class="flight-line-inner">
            <span class="plane-icon">—</span>
          </div>
        </div>
        <div class="airport">
          <div class="airport-code">${flight.arrival.code}</div>
          <div class="airport-city">${flight.arrival.city}</div>
          <div class="airport-time">${flight.arrival.time}</div>
        </div>
      </div>
      
      <div class="flight-info">
        <div class="info-item">
          <div class="info-label">Date</div>
          <div class="info-value">${format(flight.departure.date, 'MMM d, yyyy')}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Flight</div>
          <div class="info-value">${flight.flightNumber}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Duration</div>
          <div class="info-value">${flight.duration}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Terminal</div>
          <div class="info-value">${flight.departure.terminal || 'TBD'}</div>
        </div>
      </div>
    </div>
    
    <div class="details-section">
      <div class="section-title">Passengers</div>
      <div class="passenger-list">${passengersList}</div>
    </div>
    
    <div class="footer">
      <p>Thank you for booking with <a href="https://zivo.travel">ZIVO Travel</a></p>
      <p style="margin-top: 8px;">Please arrive at the airport at least 2 hours before departure.</p>
    </div>
  </div>
</body>
</html>`;
  };

  // Export to ICS file (for Apple Calendar, Outlook, etc.)
  const exportToICS = (flight: FlightData) => {
    try {
      const icsContent = generateICS(flight);
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `flight-${flight.confirmationNumber}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Calendar file downloaded!');
    } catch (error) {
      toast.error('Failed to export calendar');
    }
  };

  // Open Google Calendar
  const exportToGoogleCalendar = (flight: FlightData) => {
    try {
      const url = generateGoogleCalendarURL(flight);
      import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(url));
      toast.success('Opening Google Calendar...');
    } catch (error) {
      toast.error('Failed to open Google Calendar');
    }
  };

  // Export to PDF (using print dialog)
  const exportToPDF = (flight: FlightData) => {
    try {
      const htmlContent = generatePDFContent(flight);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ZIVO-Itinerary-${flight.departure.code}-${flight.arrival.code}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Itinerary downloaded!');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  // Share via Web Share API
  const shareItinerary = async (flight: FlightData) => {
    const shareData = {
      title: `Flight ${flight.flightNumber} - ${flight.departure.code} → ${flight.arrival.code}`,
      text: `${flight.airline} ${flight.flightNumber}\n${format(flight.departure.date, 'MMM d, yyyy')}\n${flight.departure.code} ${flight.departure.time} → ${flight.arrival.code} ${flight.arrival.time}\nConfirmation: ${flight.confirmationNumber}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Shared successfully!');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.text);
        toast.success('Itinerary copied to clipboard!');
      } catch {
        toast.error('Failed to copy');
      }
    }
  };

  return {
    exportToICS,
    exportToGoogleCalendar,
    exportToPDF,
    shareItinerary,
    generateICS,
    generateGoogleCalendarURL,
    generatePDFContent,
  };
}

export type { FlightData };
