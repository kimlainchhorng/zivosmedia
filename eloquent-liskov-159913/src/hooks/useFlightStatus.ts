import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface FlightStatusData {
  status: 'scheduled' | 'on-time' | 'delayed' | 'boarding' | 'departed' | 'in-flight' | 'landed' | 'cancelled' | 'diverted';
  delayMinutes?: number;
  gate?: string;
  terminal?: string;
  baggageClaim?: string;
  actualDepartureTime?: string;
  actualArrivalTime?: string;
  estimatedArrivalTime?: string;
  flightProgress?: number;
  altitude?: number;
  speed?: number;
  updatedAt: Date;
}

interface UseFlightStatusParams {
  flightNumber: string;
  departureDate: Date;
  enabled?: boolean;
  pollInterval?: number;
}

// Simulated real-time flight status (in production, this would call an actual flight status API)
const simulateFlightStatus = (
  flightNumber: string,
  departureDate: Date,
  previousStatus?: FlightStatusData
): FlightStatusData => {
  const now = new Date();
  const departureTime = new Date(departureDate);
  
  // Calculate time difference
  const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const hoursSinceDeparture = -hoursUntilDeparture;
  
  let status: FlightStatusData['status'] = 'scheduled';
  let flightProgress = 0;
  let delayMinutes: number | undefined;
  
  // Simulate status based on time
  if (hoursUntilDeparture > 24) {
    status = 'scheduled';
  } else if (hoursUntilDeparture > 2) {
    // Random chance of delay
    if (Math.random() > 0.85) {
      status = 'delayed';
      delayMinutes = Math.floor(Math.random() * 90) + 15;
    } else {
      status = 'on-time';
    }
  } else if (hoursUntilDeparture > 0.5) {
    status = 'boarding';
  } else if (hoursUntilDeparture > 0) {
    status = 'departed';
    flightProgress = 5;
  } else if (hoursSinceDeparture < 8) {
    status = 'in-flight';
    // Assuming 8 hour flight
    flightProgress = Math.min(95, Math.round((hoursSinceDeparture / 8) * 100));
  } else {
    status = 'landed';
    flightProgress = 100;
  }
  
  // Generate realistic gate and terminal
  const terminals = ['1', '2', '3', '4', '5', 'A', 'B', 'C', 'D', 'E'];
  const gates = Array.from({ length: 50 }, (_, i) => `${terminals[Math.floor(i / 10)]}${(i % 10) + 1}`);
  
  return {
    status,
    delayMinutes,
    gate: gates[Math.abs(flightNumber.charCodeAt(3) || 0) % gates.length],
    terminal: terminals[Math.abs(flightNumber.charCodeAt(2) || 0) % terminals.length],
    baggageClaim: status === 'landed' ? `Carousel ${Math.floor(Math.random() * 15) + 1}` : undefined,
    flightProgress,
    altitude: status === 'in-flight' ? Math.floor(30000 + Math.random() * 10000) : undefined,
    speed: status === 'in-flight' ? Math.floor(450 + Math.random() * 100) : undefined,
    updatedAt: now,
  };
};

export function useFlightStatus({
  flightNumber,
  departureDate,
  enabled = true,
  pollInterval = 60000, // 1 minute default
}: UseFlightStatusParams) {
  const [status, setStatus] = useState<FlightStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!enabled || !flightNumber) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newStatus = simulateFlightStatus(flightNumber, departureDate, status || undefined);
      
      // Check for status changes and notify
      if (status && notificationsEnabled && newStatus.status !== status.status) {
        const statusMessages: Record<string, string> = {
          'boarding': `${flightNumber} is now boarding at gate ${newStatus.gate}`,
          'delayed': `${flightNumber} is delayed by ${newStatus.delayMinutes} minutes`,
          'departed': `${flightNumber} has departed`,
          'in-flight': `${flightNumber} is now in flight`,
          'landed': `${flightNumber} has landed`,
          'cancelled': `${flightNumber} has been cancelled`,
          'diverted': `${flightNumber} has been diverted`,
        };
        
        const message = statusMessages[newStatus.status];
        if (message) {
          if (newStatus.status === 'cancelled' || newStatus.status === 'diverted') {
            toast.error(message);
          } else if (newStatus.status === 'delayed') {
            toast.warning(message);
          } else {
            toast.success(message);
          }
        }
      }
      
      setStatus(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch flight status'));
    } finally {
      setIsLoading(false);
    }
  }, [flightNumber, departureDate, enabled, status, notificationsEnabled]);

  // Initial fetch and polling
  useEffect(() => {
    if (!enabled) return;
    
    fetchStatus();
    
    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [enabled, pollInterval, fetchStatus]);

  const refresh = useCallback(() => {
    fetchStatus();
  }, [fetchStatus]);

  const toggleNotifications = useCallback((enabled: boolean) => {
    setNotificationsEnabled(enabled);
    toast.info(enabled ? 'Flight notifications enabled' : 'Flight notifications disabled');
  }, []);

  return {
    status,
    isLoading,
    error,
    refresh,
    notificationsEnabled,
    toggleNotifications,
  };
}
