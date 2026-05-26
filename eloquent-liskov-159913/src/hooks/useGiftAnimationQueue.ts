import { useState, useCallback, useRef } from "react";

export interface QueuedGift {
  name: string;
  coins: number;
  senderName?: string;
  combo?: number;
}

/**
 * Sequential gift animation queue — plays gifts one by one,
 * preventing overlapping playback and video loading failures.
 */
export function useGiftAnimationQueue() {
  const [activeGift, setActiveGift] = useState<QueuedGift | null>(null);
  const [comboCount, setComboCount] = useState(0);
  const queueRef = useRef<QueuedGift[]>([]);
  const playingRef = useRef(false);

  const playNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      playingRef.current = false;
      setActiveGift(null);
      setComboCount(0);
      return;
    }
    playingRef.current = true;
    const next = queueRef.current.shift()!;
    setActiveGift(next);
    setComboCount(next.combo ?? 1);
  }, []);

  const enqueue = useCallback((gift: QueuedGift) => {
    if (!playingRef.current) {
      // Nothing playing — start immediately
      playingRef.current = true;
      setActiveGift(gift);
      setComboCount(gift.combo ?? 1);
    } else {
      // Already playing — add to queue (limit queue to 5 to prevent memory bloat)
      if (queueRef.current.length < 5) {
        queueRef.current.push(gift);
      }
    }
  }, []);

  const onComplete = useCallback(() => {
    // Current animation finished — play next in queue
    playNext();
  }, [playNext]);

  return { activeGift, comboCount, enqueue, onComplete };
}
