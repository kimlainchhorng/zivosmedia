/**
 * useTravelerStats Hook
 * Calculates aggregated traveler statistics from booking history
 */
import { useMemo } from "react";
import { useMyTrips } from "./useMyTrips";
import { useLoyaltyPoints } from "./useLoyaltyPoints";
import { useUserProfile } from "./useUserProfile";

interface TravelerStats {
  countriesVisited: number;
  milesFlown: number;
  zivoRank: string;
  rankPercentile: number;
  lifetimeTrips: number;
  memberSince: string;
  isVerified: boolean;
}

// Rough distance lookup (miles) for common routes
const ROUTE_DISTANCES: Record<string, number> = {
  "JFK-LHR": 3459,
  "LAX-LHR": 5456,
  "JFK-CDG": 3635,
  "LAX-NRT": 5478,
  "SFO-HND": 5147,
  "ORD-FRA": 4339,
  "MIA-MAD": 4416,
  "DFW-DXB": 8047,
  "SEA-ICN": 5217,
  "BOS-DUB": 2988,
};

// Average flight distance when route is unknown
const DEFAULT_FLIGHT_DISTANCE = 1500;

export function useTravelerStats(): TravelerStats & { isLoading: boolean } {
  const { data: allTrips, isLoading: tripsLoading } = useMyTrips("all");
  const { points, isLoading: pointsLoading } = useLoyaltyPoints();
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();

  const stats = useMemo(() => {
    // Extract unique destinations from all trips
    const destinations = new Set<string>();
    let totalMiles = 0;
    let lifetimeTrips = 0;

    if (allTrips) {
      allTrips.forEach((order) => {
        if (order.status === "confirmed" || order.status === "completed") {
          lifetimeTrips++;

          order.travel_order_items?.forEach((item) => {
            // Extract destination from meta or title
            const meta = item.meta as Record<string, unknown>;
            const destination = meta?.destination || meta?.city || meta?.location;
            const origin = meta?.origin;
            
            if (destination && typeof destination === "string") {
              // Try to extract country code or city
              destinations.add(destination.slice(0, 3).toUpperCase());
            }

            // Calculate flight miles
            if (item.type === "hotel" && meta?.city) {
              // Hotel implies a destination
              destinations.add(String(meta.city).slice(0, 3).toUpperCase());
            }

            // Estimate miles for flights
            if (typeof origin === "string" && typeof destination === "string") {
              const routeKey = `${origin}-${destination}`;
              const reverseKey = `${destination}-${origin}`;
              totalMiles += ROUTE_DISTANCES[routeKey] || ROUTE_DISTANCES[reverseKey] || DEFAULT_FLIGHT_DISTANCE;
            }
          });
        }
      });
    }

    // If no real data, provide reasonable defaults for demo
    const countriesVisited = destinations.size || 0;
    const milesFlown = totalMiles || 0;

    // Calculate ZIVO rank based on tier and lifetime points
    let zivoRank = "Explorer";
    let rankPercentile = 50;

    if (points) {
      switch (points.tier) {
        case "gold":
          zivoRank = "Top 1%";
          rankPercentile = 99;
          break;
        case "silver":
          zivoRank = "Top 5%";
          rankPercentile = 95;
          break;
        case "bronze":
          zivoRank = "Top 15%";
          rankPercentile = 85;
          break;
        default:
          zivoRank = "Explorer";
          rankPercentile = 50;
      }
    }

    // Member since date
    const memberSince = userProfile?.created_at 
      ? new Date(userProfile.created_at).getFullYear().toString()
      : new Date().getFullYear().toString();

    // Verification status
    const isVerified = userProfile?.status === "verified";

    return {
      countriesVisited,
      milesFlown,
      zivoRank,
      rankPercentile,
      lifetimeTrips,
      memberSince,
      isVerified,
    };
  }, [allTrips, points, userProfile]);

  return {
    ...stats,
    isLoading: tripsLoading || pointsLoading || profileLoading,
  };
}