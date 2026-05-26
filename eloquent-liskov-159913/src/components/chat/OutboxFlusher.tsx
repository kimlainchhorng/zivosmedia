import { useEffect } from "react";
import { flush } from "@/lib/chat/messageOutbox";

/**
 * Drains the persisted message outbox on app boot, on reconnect, and when the
 * tab regains focus. Mounts once at the app root.
 */
export default function OutboxFlusher() {
  useEffect(() => {
    void flush();
    const onOnline = () => { void flush(); };
    const onFocus = () => { void flush(); };
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  return null;
}
