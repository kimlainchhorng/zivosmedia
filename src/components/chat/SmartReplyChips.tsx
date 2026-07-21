/**
 * SmartReplyChips
 * ---------------
 * Tap-to-send reply suggestions shown above the chat composer. Pulls from
 * the `smart-reply-suggest` edge function whenever the latest visible
 * message is from the other side. Hides when:
 *   - The latest message is from the local user (no reply needed)
 *   - The composer already has draft text (don't fight the user's typing)
 *   - The thread is empty
 */
import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MessagePeek {
  text: string;
  isMe: boolean;
}

interface Props {
  /** Recent message peek list (newest LAST). Pass the last ~12 entries. */
  recent: MessagePeek[];
  /** Current composer content — chips hide when non-empty. */
  composerHasText: boolean;
  /** Called when the user taps a chip. Parent should set composer text. */
  onPick: (text: string) => void;
}

export default function SmartReplyChips({ recent, composerHasText, onPick }: Props) {
  const [chips, setChips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const lastKey = useRef<string | null>(null);

  // Stable cache key: based on the LAST inbound message text only — we don't
  // want to re-call the model just because the user typed something locally.
  const lastInbound = [...recent].reverse().find((m) => !m.isMe);
  const key = lastInbound ? lastInbound.text : null;

  useEffect(() => {
    if (composerHasText) { setChips([]); return; }
    if (!key || recent.length === 0) { setChips([]); return; }
    // If the very last message is from us, no need for a reply suggestion.
    if (recent[recent.length - 1].isMe) { setChips([]); return; }

    if (lastKey.current === key && chips.length > 0) return;
    lastKey.current = key;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("smart-reply-suggest", {
          body: { messages: recent.map((m) => ({ role: m.isMe ? "me" : "them", text: m.text })) },
        });
        if (cancelled) return;
        if (error) throw error;
        const list = ((data as any)?.suggestions ?? []) as string[];
        setChips(list.slice(0, 3));
      } catch {
        if (!cancelled) setChips([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, composerHasText, recent.length]);

  if (composerHasText) return null;
  if (!loading && chips.length === 0) return null;

  return (
    <div className="px-3 pt-1 pb-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
      {loading && chips.length === 0 ? (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Suggestions…
        </span>
      ) : (
        chips.map((c, i) => (
          <button type="button"
            key={`${i}-${c}`}
            onClick={() => onPick(c)}
            className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[12px] font-medium text-foreground hover:bg-primary/10 active:scale-95 transition"
          >
            {c}
          </button>
        ))
      )}
    </div>
  );
}
