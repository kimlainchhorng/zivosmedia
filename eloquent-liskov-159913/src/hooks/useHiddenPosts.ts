/**
 * useHiddenPosts — local-only "Not interested" hide list.
 * No backend / no schema change: we just keep an id set in localStorage and
 * filter feed queries on read. Survives reloads, doesn't sync across devices.
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "zivo:hidden-posts-v1";
const STORAGE_EVENT = "zivo:hidden-posts-changed";

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {
    // localStorage may be full or disabled
  }
}

export function useHiddenPosts() {
  const [hidden, setHidden] = useState<Set<string>>(() => readSet());

  useEffect(() => {
    const sync = () => setHidden(readSet());
    window.addEventListener(STORAGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORAGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const hide = useCallback((id: string) => {
    const next = new Set(readSet());
    next.add(id);
    writeSet(next);
    setHidden(next);
  }, []);

  const unhide = useCallback((id: string) => {
    const next = new Set(readSet());
    next.delete(id);
    writeSet(next);
    setHidden(next);
  }, []);

  const isHidden = useCallback((id: string) => hidden.has(id), [hidden]);

  return { hidden, hide, unhide, isHidden };
}
