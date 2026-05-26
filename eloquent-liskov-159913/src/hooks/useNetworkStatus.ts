import { useState, useEffect, useCallback, useRef } from 'react';
import { Network } from '@capacitor/network';
import type { ConnectionStatus } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface QueuedAction {
  id: string;
  action: () => Promise<void>;
  description: string;
  retryCount: number;
}

const MAX_RETRIES = 3;

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>([]);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const initNetworkStatus = async () => {
      if (Capacitor.isNativePlatform()) {
        const status: ConnectionStatus = await Network.getStatus();
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);
      } else {
        // Web fallback
        setIsOnline(navigator.onLine);
      }
    };

    initNetworkStatus();

    // Listen for network changes
    if (Capacitor.isNativePlatform()) {
      let listenerHandle: { remove: () => void } | null = null;

      const setupListener = async () => {
        listenerHandle = await Network.addListener('networkStatusChange', (status) => {
          setIsOnline(prev => {
            if (!prev && status.connected) {
              toast.success('Back online', { description: 'Syncing pending actions...' });
            } else if (prev && !status.connected) {
              wasOfflineRef.current = true;
              toast.warning('No internet connection', { 
                description: 'Actions will be synced when connection is restored' 
              });
            }
            return status.connected;
          });
          setConnectionType(status.connectionType);
        });
      };

      setupListener();

      return () => {
        listenerHandle?.remove();
      };
    } else {
      // Web fallback listeners
      const handleOnline = () => {
        setIsOnline(true);
        if (wasOfflineRef.current) {
          toast.success('Back online');
          wasOfflineRef.current = false;
        }
      };
      
      const handleOffline = () => {
        setIsOnline(false);
        wasOfflineRef.current = true;
        toast.warning('No internet connection');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [isOnline]);

  // Process pending actions when coming back online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      processPendingActions();
    }
  }, [isOnline, pendingActions.length]);

  const processPendingActions = useCallback(async () => {
    if (pendingActions.length === 0) return;

    const actionsToProcess = [...pendingActions];
    setPendingActions([]);

    for (const action of actionsToProcess) {
      try {
        await action.action();
        toast.success(`Synced: ${action.description}`);
      } catch (error) {
        console.error(`Failed to sync action: ${action.description}`, error);
        
        if (action.retryCount < MAX_RETRIES) {
          // Re-queue with incremented retry count
          setPendingActions(prev => [...prev, { ...action, retryCount: action.retryCount + 1 }]);
        } else {
          toast.error(`Failed to sync: ${action.description}`);
        }
      }
    }
  }, [pendingActions]);

  // Queue an action to be executed when online
  const queueAction = useCallback((action: () => Promise<void>, description: string): string => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (isOnline) {
      // Execute immediately if online
      action().catch(error => {
        console.error(`Action failed: ${description}`, error);
        toast.error(`Failed: ${description}`);
      });
    } else {
      // Queue for later
      setPendingActions(prev => [...prev, { id, action, description, retryCount: 0 }]);
      toast.info('Action queued', { description: `Will sync when online: ${description}` });
    }

    return id;
  }, [isOnline]);

  // Execute action with offline fallback
  const executeWithFallback = useCallback(async <T,>(
    action: () => Promise<T>,
    fallback: T,
    description: string
  ): Promise<T> => {
    if (!isOnline) {
      toast.warning('Offline', { description: `Cannot perform: ${description}` });
      return fallback;
    }

    try {
      return await action();
    } catch (error) {
      console.error(`Action failed: ${description}`, error);
      throw error;
    }
  }, [isOnline]);

  // Remove a queued action
  const removeQueuedAction = useCallback((id: string) => {
    setPendingActions(prev => prev.filter(action => action.id !== id));
  }, []);

  // Clear all queued actions
  const clearQueue = useCallback(() => {
    setPendingActions([]);
  }, []);

  return {
    isOnline,
    connectionType,
    pendingActionsCount: pendingActions.length,
    queueAction,
    executeWithFallback,
    removeQueuedAction,
    clearQueue,
  };
};
