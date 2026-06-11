import { useState, useCallback } from 'react';
import { completeZivoAiChat } from '@/lib/zivoAiChat';
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

const parseDestinationSuggestions = (content: string): AIDestination[] => {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
    content.match(/```\s*([\s\S]*?)\s*```/);
  const parsed = JSON.parse(jsonMatch?.[1] || content);
  const destinations = Array.isArray(parsed) ? parsed : parsed?.destinations;

  if (!Array.isArray(destinations)) {
    throw new Error('Invalid AI response format');
  }

  return destinations.slice(0, 4).map((destination, index) => ({
    id: String(destination.id || `deepseek-destination-${index + 1}`),
    city: String(destination.city || ''),
    country: String(destination.country || ''),
    airportCode: String(destination.airportCode || '').slice(0, 3).toUpperCase(),
    price: Number(destination.price || 0),
    rating: Number(destination.rating || 4.5),
    tags: Array.isArray(destination.tags) ? destination.tags.map(String).slice(0, 3) : [],
    weather: String(destination.weather || 'Seasonal weather varies'),
    bestFor: Array.isArray(destination.bestFor) ? destination.bestFor.map(String).slice(0, 2) : [],
    matchScore: Number(destination.matchScore || 80),
    flightTime: String(destination.flightTime || 'Varies by route'),
    description: String(destination.description || ''),
  })).filter((destination) => destination.city && destination.country && destination.airportCode);
};

export function useAITripSuggestions() {
  const [destinations, setDestinations] = useState<AIDestination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async (preferences: TripPreferences) => {
    setIsLoading(true);
    setError(null);

    try {
      const systemPrompt = `Suggest exactly 4 travel destinations as JSON for the Zivo Travel trip planner.
Each item must include id, city, country, airportCode, price, rating, tags, weather, bestFor, matchScore, flightTime, and description.
Return only a valid JSON array. No markdown, no extra text.`;

      const userPrompt = `Traveler preferences:
- Budget: ${preferences.budget || 'mid'}
- Interests: ${preferences.activities?.join(', ') || 'general travel'}
- Number of travelers: ${preferences.travelers || 2}
- Departing from: ${preferences.origin || 'New York'}
${preferences.likedDestinations?.length ? `- Previously liked: ${preferences.likedDestinations.join(', ')}` : ''}
${preferences.dislikedDestinations?.length ? `- Previously disliked: ${preferences.dislikedDestinations.join(', ')}` : ''}`;

      const content = await completeZivoAiChat({
        mode: 'travel',
        provider: 'auto',
        maxTokens: 1100,
        temperature: 0.55,
        messages: [
          { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` },
        ],
      });

      const suggestions = parseDestinationSuggestions(content);
      if (suggestions.length === 0) {
        throw new Error('No usable destination suggestions returned');
      }

      setDestinations(suggestions);
      return suggestions;
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
