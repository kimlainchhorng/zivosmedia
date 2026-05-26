/**
 * Remote Configuration Service
 * Fetches and caches app configuration from Supabase
 * Allows updates without requiring app store reviews
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppSetting = Database['public']['Tables']['app_settings']['Row'];
type PricingConfig = Database['public']['Tables']['pricing_config']['Row'];

const REMOTE_CONFIG_CACHE_KEY = 'zivo:remote-config:v1';

type RemoteConfigCache = {
  config: RemoteConfig;
  lastFetch: number;
};

export interface RemoteConfig {
  // Pricing & fees
  platformMarkupPercent?: number;
  deliveryBaseFee?: number;
  deliveryPerMile?: number;
  serviceFeePct?: number;
  
  // Feature flags
  featureFlags?: Record<string, boolean>;
  
  // Content
  supportEmail?: string;
  supportPhone?: string;
  terms_version?: string;
  privacy_version?: string;
  
  // App behavior
  minAppVersion?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  
  // Custom config
  [key: string]: any;
}

class RemoteConfigService {
  private static instance: RemoteConfigService;
  private config: RemoteConfig = {};
  private lastFetch: number = 0;
  private cacheDuration: number = 5 * 60 * 1000; // 5 minutes
  private refreshIntervals: NodeJS.Timeout[] = [];

  private constructor() {
    this.hydrateFromStorage();
  }

  static getInstance(): RemoteConfigService {
    if (!RemoteConfigService.instance) {
      RemoteConfigService.instance = new RemoteConfigService();
    }
    return RemoteConfigService.instance;
  }

  /**
   * Initialize the remote config service
   * Fetches config on app startup and sets up auto-refresh
   */
  async initialize(): Promise<void> {
    try {
      await this.fetchConfig();
      // Auto-refresh config every 5 minutes
      const interval = setInterval(() => this.fetchConfig(), this.cacheDuration);
      this.refreshIntervals.push(interval);
    } catch (error) {
      // fetchConfig already handles its own errors gracefully and returns
      // cached config. If we still landed here, it's truly unexpected.
      console.warn('[remoteConfig] initialize fell through:', error);
    }
  }

  /**
   * Fetch all app settings and pricing config from Supabase
   */
  async fetchConfig(): Promise<RemoteConfig> {
    const now = Date.now();
    
    // Skip if already fetched recently (use cache)
    if (now - this.lastFetch < this.cacheDuration) {
      return this.config;
    }

    try {
      const [settingsResult, pricingResult] = await Promise.all([
        supabase
          .from('app_settings')
          .select('*')
          .is('tenant_id', null), // Global settings
        supabase
          .from('pricing_config')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      if (settingsResult.error) throw settingsResult.error;
      if (pricingResult.error) throw pricingResult.error;

      const settings = settingsResult.data;
      const pricingConfigs = pricingResult.data;

      // Build config object from settings
      const config: RemoteConfig = {};
      
      if (settings) {
        for (const setting of settings) {
          config[setting.key] = setting.value;
        }
      }

      // Add pricing config
      if (pricingConfigs && pricingConfigs.length > 0) {
        const pricing = pricingConfigs[0];
        config.pricing = {
          base_fare: pricing.base_fare,
          minimum_fare: pricing.minimum_fare,
          per_mile_rate: pricing.per_mile_rate,
          per_minute_rate: pricing.per_minute_rate,
          service_fee_flat: pricing.service_fee_flat,
          service_fee_percent: pricing.service_fee_percent,
          driver_payout_percent: pricing.driver_payout_percent,
        };
      }

      this.config = config;
      this.lastFetch = now;
      this.persistToStorage();

      return config;
    } catch (error: any) {
      // Network failures (offline, unreachable supabase) and RLS rejections
      // (running on /login before the user has a session) are expected and
      // non-fatal — we always fall back to cached / default config. Log at
      // warn instead of error so this doesn't trip Sentry on every login.
      const msg = String(error?.message || error || '');
      const isExpected =
        msg.includes('Load failed') ||
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        error?.code === 'PGRST301' || // RLS rejection
        error?.code === '42501'; // PostgreSQL permission denied
      const log = isExpected ? console.warn : console.error;
      log('[remoteConfig] fetch failed, using cached config:', msg, error?.code || '');
      return this.config;
    }
  }

  /**
   * Get a specific config value with fallback
   */
  get<T>(key: string, defaultValue: T): T {
    const keys = key.split('.');
    let value: any = this.config;

    for (const k of keys) {
      value = value?.[k];
    }

    return value ?? defaultValue;
  }

  /**
   * Get entire config
   */
  getAll(): RemoteConfig {
    return this.config;
  }

  /**
   * Update a setting in Supabase
   */
  async updateSetting(key: string, value: any, description?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key,
          value,
          description,
          tenant_id: null, // Global setting
        }, {
          onConflict: 'key',
        });

      if (error) throw error;

      // Refresh local config
      await this.fetchConfig();
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  }

  /**
   * Get feature flag status
   */
  isFeatureEnabled(featureName: string): boolean {
    const flags = this.get('featureFlags', {});
    return flags[featureName] ?? false;
  }

  /**
   * Force refresh config (bypasses cache)
   */
  async refresh(): Promise<void> {
    this.lastFetch = 0; // Clear cache timestamp
    await this.fetchConfig();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.refreshIntervals.forEach(interval => clearInterval(interval));
    this.refreshIntervals = [];
  }

  private hydrateFromStorage(): void {
    try {
      const raw = localStorage.getItem(REMOTE_CONFIG_CACHE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as RemoteConfigCache;
      if (!parsed?.config || typeof parsed.lastFetch !== 'number') return;

      this.config = parsed.config;
      this.lastFetch = parsed.lastFetch;
    } catch {
      // Ignore storage failures in private mode or restricted webviews.
    }
  }

  private persistToStorage(): void {
    try {
      localStorage.setItem(
        REMOTE_CONFIG_CACHE_KEY,
        JSON.stringify({ config: this.config, lastFetch: this.lastFetch }),
      );
    } catch {
      // Ignore storage failures in private mode or restricted webviews.
    }
  }
}

export const remoteConfig = RemoteConfigService.getInstance();
