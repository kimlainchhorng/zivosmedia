/**
 * ReactedBySheet — "who reacted" detail view for a single message.
 *
 * Long-press a reaction chip on a bubble to see avatar + name + emoji for
 * everyone who reacted. Mirrors Telegram's reaction-detail sheet.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import X from "lucide-react/dist/esm/icons/x";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

interface Props {
  open: boolean;
  messageId: string | null;
  onClose: () => void;
}

interface Reactor {
  user_id: string;
  emoji: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function ReactedBySheet({ open, messageId, onClose }: Props) {
  const [items, setItems] = useState<Reactor[] | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !messageId) {
      setItems(null);
      setFilter(null);
      return;
    }
    let cancelled = false;

    const loadProfiles = async (rows: { user_id: string; emoji: string; created_at: string }[]): Promise<Reactor[]> => {
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const profMap = new Map(
        ((profiles || []) as { user_id: string; full_name: string | null; avatar_url: string | null }[]).map(
          (p) => [p.user_id, p],
        ),
      );
      return rows.map((r) => ({
        user_id: r.user_id,
        emoji: r.emoji,
        created_at: r.created_at,
        full_name: profMap.get(r.user_id)?.full_name ?? null,
        avatar_url: profMap.get(r.user_id)?.avatar_url ?? null,
      }));
    };

    const load = async () => {
      const { data: rxs } = await supabase
        .from("message_reactions")
        .select("user_id, emoji, created_at")
        .eq("message_id", messageId)
        .order("created_at", { ascending: true });
      const rows = (rxs || []) as { user_id: string; emoji: string; created_at: string }[];
      if (cancelled) return;
      if (rows.length === 0) { setItems([]); return; }
      const mapped = await loadProfiles(rows);
      if (!cancelled) setItems(mapped);
    };
    void load();

    // Live updates while the sheet is open
    const channel = supabase
      .channel(`reactions-sheet-${messageId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "message_reactions",
        filter: `message_id=eq.${messageId}`,
      }, () => { void load(); })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [open, messageId]);

  // Group by emoji for the filter pill row
  const counts = (items || []).reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});
  const emojis = Object.keys(counts);
  const visible = filter ? (items || []).filter((r) => r.emoji === filter) : items || [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Reactions detail"
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl pb-[max(1rem,var(--zivo-safe-bottom,0px))] max-h-[80dvh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h3 className="text-base font-bold text-foreground">Reactions</h3>
              <button type="button"
                onClick={onClose}
                aria-label="Close"
                className="h-9 w-9 -mr-1.5 flex items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Emoji filter pills */}
            {emojis.length > 1 && (
              <div className="flex gap-1.5 px-4 py-2 border-b border-border/20 overflow-x-auto">
                <button type="button"
                  onClick={() => setFilter(null)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    filter == null ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"
                  }`}
                >
                  All · {(items || []).length}
                </button>
                {emojis.map((e) => (
                  <button type="button"
                    key={e}
                    onClick={() => setFilter(e)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      filter === e ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"
                    }`}
                  >
                    <span className="text-sm leading-none">{e}</span>
                    {counts[e]}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-2 py-2">
              {items == null ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : visible.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">No reactions yet</p>
              ) : (
                visible.map((r) => (
                  <div key={`${r.user_id}:${r.emoji}`} className="flex items-center gap-3 px-2 py-2 rounded-xl">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={r.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">
                        {(r.full_name || "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium text-foreground truncate">
                      {r.full_name || "User"}
                    </span>
                    <span className="text-lg leading-none">{r.emoji}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
