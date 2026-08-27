import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { flush } from "@/lib/chat/messageOutbox";

/**
 * Drains the persisted message outbox on app boot, on reconnect, and when the
 * tab regains focus. Mounts once at the app root.
 */
export default function OutboxFlusher() {
  const { user } = useAuth();
  const ownerId = user?.id;

  useEffect(() => {
    if (!ownerId) return;

    const drain = () => {
      void flush(ownerId);
    };
    drain();
    const onOnline = () => {
      drain();
    };
    const onFocus = () => {
      drain();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, [ownerId]);
  return null;
}
