import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const failedDownloads = new Set<symbol>();
const recoveryListeners = new Set<() => void>();

function setDownloadFailed(key: symbol, failed: boolean) {
  const previousSize = failedDownloads.size;
  if (failed) failedDownloads.add(key);
  else failedDownloads.delete(key);
  if (previousSize !== failedDownloads.size) {
    recoveryListeners.forEach((listener) => listener());
  }
}

function subscribeToRecovery(listener: () => void) {
  recoveryListeners.add(listener);
  return () => {
    recoveryListeners.delete(listener);
  };
}

export function useBackgroundToolsUnavailable() {
  return useSyncExternalStore(
    subscribeToRecovery,
    () => failedDownloads.size > 0,
    () => false,
  );
}

function isModuleDownloadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading (?:CSS )?chunk|Unable to preload CSS/i.test(
    message,
  );
}

/**
 * Load incidental UI without letting a lost module download reload the route.
 * Successful modules stay mounted through disconnections. A failed download
 * can be attempted again on reconnect instead of retaining React.lazy's
 * rejected component type. Runtime/programming failures still reach the normal
 * error boundary. Do not use this for authentication or payment enforcement.
 */
export function connectionDeferred<Props extends object>(
  load: () => Promise<{ default: ComponentType<Props> }>,
) {
  return function ConnectionDeferred(props: Props) {
    const online = useOnlineStatus();
    const recoveryKey = useRef(Symbol("background-module"));
    const [Loaded, setLoaded] = useState<ComponentType<Props> | null>(null);
    const [unexpectedError, setUnexpectedError] = useState<{
      error: unknown;
    } | null>(null);

    useEffect(() => {
      const key = recoveryKey.current;
      return () => {
        setDownloadFailed(key, false);
      };
    }, []);

    useEffect(() => {
      if (!online || Loaded) return;
      let disposed = false;

      void Promise.resolve()
        .then(load)
        .then(({ default: Component }) => {
          if (!disposed) {
            setDownloadFailed(recoveryKey.current, false);
            setLoaded(() => Component);
          }
        })
        .catch((error: unknown) => {
          if (!disposed) {
            if (isModuleDownloadError(error))
              setDownloadFailed(recoveryKey.current, true);
            else setUnexpectedError({ error });
          }
        });

      return () => {
        disposed = true;
      };
    }, [online, Loaded]);

    if (unexpectedError) throw unexpectedError.error;
    return Loaded ? <Loaded {...props} /> : null;
  };
}
