/**
 * useAppSettings Hook
 * 
 * Fetches and caches app settings from the database.
 * Provides typed access to configuration values.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AppSettingsRow {
  id: string;
  tenant_id: string | null;
  key: string;
  value: unknown;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface AppSettings {
  locationUpdateInterval: number;
  pushEnabled: boolean;
  offlineModeEnabled: boolean;
  minLocationDistance: number;
  minLocationTime: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  locationUpdateInterval: 15000,
  pushEnabled: true,
  offlineModeEnabled: true,
  minLocationDistance: 20,
  minLocationTime: 10,
};

const parseValue = <T>(value: unknown, defaultValue: T): T => {
  if (value === null || value === undefined) return defaultValue;
  
  // Handle string-wrapped JSON values
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof defaultValue === 'number') {
        return (typeof parsed === 'number' ? parsed : parseInt(parsed, 10)) as T;
      }
      if (typeof defaultValue === 'boolean') {
        return (parsed === true || parsed === 'true') as unknown as T;
      }
      return parsed as T;
    } catch {
      if (typeof defaultValue === 'number') {
        return parseInt(value, 10) as unknown as T;
      }
      if (typeof defaultValue === 'boolean') {
        return (value === 'true') as unknown as T;
      }
      return value as unknown as T;
    }
  }
  
  return value as T;
};

export const useAppSettings = (tenantId?: string | null) => {
  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ['app-settings', tenantId],
    queryFn: async (): Promise<AppSettings> => {
      // Fetch global settings (tenant_id IS NULL)
      let query = supabase
        .from('app_settings')
        .select('*');

      // If tenant specified, get tenant-specific settings too
      if (tenantId) {
        query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
      } else {
        query = query.is('tenant_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useAppSettings] Error fetching settings:', error);
        return DEFAULT_SETTINGS;
      }

      if (!data || data.length === 0) {
        return DEFAULT_SETTINGS;
      }

      // Convert array to key-value map
      // Tenant-specific settings override global settings
      const settingsMap = new Map<string, unknown>();
      
      // First add global settings
      (data as AppSettingsRow[])
        .filter(s => s.tenant_id === null)
        .forEach(s => settingsMap.set(s.key, s.value));
      
      // Then override with tenant-specific
      if (tenantId) {
        (data as AppSettingsRow[])
          .filter(s => s.tenant_id === tenantId)
          .forEach(s => settingsMap.set(s.key, s.value));
      }

      return {
        locationUpdateInterval: parseValue(
          settingsMap.get('location_update_interval'),
          DEFAULT_SETTINGS.locationUpdateInterval
        ),
        pushEnabled: parseValue(
          settingsMap.get('push_enabled'),
          DEFAULT_SETTINGS.pushEnabled
        ),
        offlineModeEnabled: parseValue(
          settingsMap.get('offline_mode_enabled'),
          DEFAULT_SETTINGS.offlineModeEnabled
        ),
        minLocationDistance: parseValue(
          settingsMap.get('min_location_distance'),
          DEFAULT_SETTINGS.minLocationDistance
        ),
        minLocationTime: parseValue(
          settingsMap.get('min_location_time'),
          DEFAULT_SETTINGS.minLocationTime
        ),
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    isLoading,
    error,
    refetch,
  };
};

export default useAppSettings;
