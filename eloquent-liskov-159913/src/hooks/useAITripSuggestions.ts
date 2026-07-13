import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIDestination {
  id: string;
  city: string;
  country: string;
  airportCode: string;
  price: number;
  rating: number;
  tags: string[];
  weather: string;
  bestFor: string[];
  matchScore: number;
  flightTime: string;
  description: string;
}

interface TripPreferences {
  budget?: 'budget' | 'mid' | 'luxury';
  activities?: string[];
  travelers?: number;
  origin?: string;
  likedDestinations?: string[];
  dislikedDestinations?: string[];
}

export function useAITripSuggestions() {
  const [destinations, setDestinations] = useState<AIDestination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async (preferences: TripPreferences) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-trip-suggestions', {
        body: { preferences },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to get suggestions');
      }

      setDestinations(data.destinations);
      return data.destinations;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch suggestions';
      setError(message);
      
      // Show user-friendly error
      if (message.includes('Rate limit')) {
        toast.error('Too many requests. Please wait a moment.');
      } else if (message.includes('credits')) {
        toast.error('AI service temporarily unavailable.');
      } else {
        toast.error('Could not get AI suggestions. Using fallback.');
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    destinations,
    isLoading,
    error,
    fetchSuggestions,
    setDestinations,
  };
}
