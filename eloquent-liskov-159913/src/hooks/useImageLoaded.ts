import { useState, useCallback, useEffect } from "react";

export function useImageLoaded(src?: string) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setLoaded(false); }, [src]);

  const onLoad = useCallback(() => setLoaded(true), []);

  return { loaded, onLoad };
}
