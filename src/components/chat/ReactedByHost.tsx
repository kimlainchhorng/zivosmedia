import { useEffect, useState } from "react";
import { REACTIONS_DETAIL_EVENT } from "./MessageReactionsBar";
import ReactedBySheet from "./ReactedBySheet";

/**
 * App-level host that opens the "who reacted" sheet on demand. Any reaction
 * chip can fire `zivo:reactions-detail-open` with a messageId; this listens
 * and shows the sheet — no per-chat plumbing needed.
 */
export default function ReactedByHost() {
  const [openFor, setOpenFor] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (typeof id === "string" && id.length > 0) setOpenFor(id);
    };
    window.addEventListener(REACTIONS_DETAIL_EVENT, onOpen as EventListener);
    return () => window.removeEventListener(REACTIONS_DETAIL_EVENT, onOpen as EventListener);
  }, []);

  return (
    <ReactedBySheet
      open={openFor != null}
      messageId={openFor}
      onClose={() => setOpenFor(null)}
    />
  );
}
