/**
 * Remote Config Context Provider
 * Makes remote configuration available to all React components
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { remoteConfig } from '@/services/remoteConfigService';
import type { RemoteConfig } from '@/services/remoteConfigService';

interface RemoteConfigContextType {
  config: RemoteConfig;
  loading: boolean;
  error: Error | null;
  get: <T,>(key: string, defaultValue: T) => T;
  updateSetting: (key: string, value: any, description?: string) => Promise<void>;
  isFeatureEnabled: (featureName: string) => boolean;
  refresh: () => Promise<void>;
}

const RemoteConfigContext = createContext<RemoteConfigContextType | undefined>(undefined);

export function RemoteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<RemoteConfig>(remoteConfig.getAll());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeConfig = async () => {
      try {
        setLoading(true);
        await remoteConfig.initialize();
        setConfig(remoteConfig.getAll());
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load config'));
      } finally {
        setLoading(false);
      }
    };

    initializeConfig();

    return () => {
      remoteConfig.destroy();
    };
  }, []);

  const refresh = async () => {
    try {
      setError(null);
      await remoteConfig.refresh();
      setConfig(remoteConfig.getAll());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh config'));
    }
  };

  const updateSetting = async (key: string, value: any, description?: string) => {
    try {
      setError(null);
      await remoteConfig.updateSetting(key, value, description);
      setConfig(remoteConfig.getAll());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update setting'));
      throw err;
    }
  };

  const value: RemoteConfigContextType = {
    config,
    loading,
    error,
    get: remoteConfig.get.bind(remoteConfig),
    updateSetting,
    isFeatureEnabled: remoteConfig.isFeatureEnabled.bind(remoteConfig),
    refresh,
  };

  return (
    <RemoteConfigContext.Provider value={value}>
      {children}
    </RemoteConfigContext.Provider>
  );
}

/**
 * Hook to use remote config in components
 */
export function useRemoteConfig() {
  const context = useContext(RemoteConfigContext);
  if (context === undefined) {
    throw new Error('useRemoteConfig must be used within RemoteConfigProvider');
  }
  return context;
}
