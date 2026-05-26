import { useState, useCallback, useRef } from "react";
import { reverseGeocode as mapsReverseGeocode } from "@/services/mapsApi";

export type CurrentLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

export const useCurrentLocation = () => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const getCurrentLocation = useCallback((): Promise<CurrentLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = "Geolocation is not supported by your browser";
        setError(error);
        reject(new Error(error));
        return;
      }

      setIsGettingLocation(true);
      setError(null);

      // Try fast (cached/network) first, then high-accuracy fallback
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result: CurrentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          // If accuracy is poor (>500m), retry with high accuracy
          if (position.coords.accuracy > 500) {
            navigator.geolocation.getCurrentPosition(
              (hiPos) => {
                setIsGettingLocation(false);
                resolve({
                  lat: hiPos.coords.latitude,
                  lng: hiPos.coords.longitude,
                  accuracy: hiPos.coords.accuracy,
                });
              },
              () => {
                // High-accuracy failed, return the fast result
                setIsGettingLocation(false);
                resolve(result);
              },
              { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
            );
          } else {
            setIsGettingLocation(false);
            resolve(result);
          }
        },
        (err) => {
          setIsGettingLocation(false);
          let errorMessage = "Failed to get location";
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = "Location permission denied. Please enable location access in your browser settings.";
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = "Location unavailable. Please check your device's location services.";
              break;
            case err.TIMEOUT:
              errorMessage = "Location request timed out. Please try again.";
              break;
          }
          
          setError(errorMessage);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000,
        }
      );
    });
  }, []);

  /** Watch position continuously — returns cleanup function */
  const watchPosition = useCallback((
    onUpdate: (loc: CurrentLocation) => void,
    onError?: (err: string) => void
  ): (() => void) => {
    if (!navigator.geolocation) {
      onError?.("Geolocation is not supported");
      return () => {};
    }

    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        onUpdate({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (err) => {
        let msg = "Location tracking error";
        if (err.code === err.PERMISSION_DENIED) msg = "Location permission denied";
        else if (err.code === err.POSITION_UNAVAILABLE) msg = "Location unavailable";
        onError?.(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    return mapsReverseGeocode(lat, lng);
  }, []);

  return {
    getCurrentLocation,
    watchPosition,
    reverseGeocode,
    isGettingLocation,
    error,
  };
};
