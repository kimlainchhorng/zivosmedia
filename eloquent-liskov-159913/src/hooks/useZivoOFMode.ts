import { useCallback, useEffect, useState } from "react";

const ZIVO_OF_MODE_KEY = "zivo-of-mode";
const ZIVO_OF_MODE_EVENT = "zivo-of-mode-change";

function readOFMode() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ZIVO_OF_MODE_KEY) === "1";
}

export function useZivoOFMode() {
  const [isOFMode, setIsOFMode] = useState<boolean>(() => readOFMode());

  useEffect(() => {
    const sync = () => setIsOFMode(readOFMode());

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === ZIVO_OF_MODE_KEY) sync();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(ZIVO_OF_MODE_EVENT, sync as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(ZIVO_OF_MODE_EVENT, sync as EventListener);
    };
  }, []);

  const setOFMode = useCallback((enabled: boolean) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ZIVO_OF_MODE_KEY, enabled ? "1" : "0");

    // Keep profile mode aligned with OF workflow when enabled.
    if (enabled) {
      window.localStorage.setItem("zivo:active_mode", "creator");
    }

    window.dispatchEvent(new Event(ZIVO_OF_MODE_EVENT));
  }, []);

  return { isOFMode, setOFMode };
}
