export const P2P_TRANSFER_EVENT = "zivo:p2p-transfer-open";

export interface P2PTransferDetail {
  receiverId: string;
  receiverName: string;
  /** "send" creates a transfer; "request" flips it into an ask. */
  mode?: "send" | "request";
}

let pendingOpen: P2PTransferDetail | null = null;
const liveSubscribers = new Set<(detail: P2PTransferDetail) => void>();
const mountSubscribers = new Set<() => void>();

export function openP2PTransfer(detail: P2PTransferDetail) {
  if (liveSubscribers.size > 0) {
    for (const cb of liveSubscribers) cb(detail);
  } else {
    pendingOpen = detail;
    for (const cb of mountSubscribers) cb();
  }

  try {
    window.dispatchEvent(new CustomEvent<P2PTransferDetail>(P2P_TRANSFER_EVENT, { detail }));
  } catch {
    // No DOM in tests/server-like runtimes.
  }
}

export function hasPendingP2PTransfer() {
  return pendingOpen !== null;
}

export function subscribeP2PTransferMount(cb: () => void) {
  mountSubscribers.add(cb);
  return () => {
    mountSubscribers.delete(cb);
  };
}

export function subscribeP2PTransfer(cb: (detail: P2PTransferDetail) => void) {
  liveSubscribers.add(cb);

  if (pendingOpen) {
    const queued = pendingOpen;
    pendingOpen = null;
    queueMicrotask(() => cb(queued));
  }

  return () => {
    liveSubscribers.delete(cb);
  };
}
