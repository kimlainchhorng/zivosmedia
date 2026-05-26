/**
 * useDriverMapState - GPS tracking + map state for the driver map view
 * Adapted from Zivo Driver Connect's useEnhancedMapState
 */
import { useState, useEffect, useRef, useCallback } from "react";

interface Location { lat: number; lng: number }

interface DriverMapState {
  driverLocation: Location;
  heading: number;
  speed: number;
  isFollowing: boolean;
  zoomLevel: number;
  mapStyle: "dark" | "satellite" | "streets";
  locationError: boolean;
}

const DEFAULT_LOCATION: Location = { lat: 40.7128, lng: -74.006 };

export function useDriverMapState() {
  const watchIdRef = useRef<number | null>(null);
  const prevLocationRef = useRef<Location | null>(null);
  const hasRealLocationRef = useRef(false);

  const [state, setState] = useState<DriverMapState>({
    driverLocation: DEFAULT_LOCATION,
    heading: 0,
    speed: 0,
    isFollowing: true,
    zoomLevel: 16,
    mapStyle: "dark",
    locationError: false,
  });

  const calculateHeading = useCallback((from: Location, to: Location): number => {
    const dLon = ((to.lng - from.lng) * Math.PI) / 180;
    const fromLat = (from.lat * Math.PI) / 180;
    const toLat = (to.lat * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(toLat);
    const x = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState(s => ({ ...s, locationError: true }));
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!hasRealLocationRef.current) {
        setState(s => ({ ...s, locationError: true }));
      }
    }, 5000);

    const handlePosition = (position: GeolocationPosition) => {
      hasRealLocationRef.current = true;
      const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
      let newHeading = 0;
      if (prevLocationRef.current) {
        const dist = Math.hypot(newLocation.lat - prevLocationRef.current.lat, newLocation.lng - prevLocationRef.current.lng);
        if (dist > 0.00001) {
          newHeading = calculateHeading(prevLocationRef.current, newLocation);
        }
      }
      prevLocationRef.current = newLocation;
      setState(s => ({
        ...s,
        driverLocation: newLocation,
        heading: position.coords.heading ?? newHeading,
        speed: position.coords.speed ?? 0,
        locationError: false,
      }));
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timeoutId); handlePosition(pos); },
      () => { clearTimeout(timeoutId); setState(s => ({ ...s, locationError: true })); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );

    return () => {
      clearTimeout(timeoutId);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [calculateHeading]);

  const recenter = useCallback(() => {
    setState(s => ({ ...s, isFollowing: false }));
    Promise.resolve().then(() => setState(s => ({ ...s, isFollowing: true })));
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setState(s => ({ ...s, driverLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude } })),
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
      );
    }
  }, []);

  return {
    ...state,
    setIsFollowing: (f: boolean) => setState(s => ({ ...s, isFollowing: f })),
    setMapStyle: (style: "dark" | "satellite" | "streets") => setState(s => ({ ...s, mapStyle: style })),
    recenter,
  };
}
