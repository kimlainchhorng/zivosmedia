/**
 * StoryForwardSheet — Instagram-style "Send to" sheet.
 *
 * Lists the current user's accepted friends, lets them select one or more,
 * adds an optional note, and sends a chat message containing the canonical
 * `/stories/:id` deep link. Tracks `story_share` analytics with method=copy_link
 * or method=forward.
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import Search from "lucide-react/dist/esm/icons/search";
import Send from "lucide-react/dist/esm/icons/send";
import Check from "lucide-react/dist/esm/icons/check";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

interface Friend {
  id: string;
  name: string;
  avatar?: string;
}

export type StoryShareSource = "profile" | "feed" | "chat" | "shared-link";

interface Props {
  open: boolean;
  onClose: () => void;
  storyId: string;
  storyOwnerName?: string;
  source: StoryShareSource;
}

export default function StoryForwardSheet({
  open,
  onClose,
  storyId,
  storyOwnerName,
  source,
}: Props) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const deepLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/stories/${storyId}`
      : `/stories/${storyId}`;

  // Reset on close
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setSelected(new Set());
        setQuery("");
        setNote("");
        setSending(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Load accepted friends (same pattern as CreateGroupModal)
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (!friendships?.length) {
        if (!cancelled) {
          setFriends([]);
          setLoading(false);
        }
        return;
      }

      const friendIds = (friendships as any[]).map((f) =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", friendIds);

      if (cancelled) return;
      setFriends(
        ((profiles as any[]) || []).map((p) => ({
          id: p.user_id,
          name: p.full_name || "User",
          avatar: p.avatar_url || undefined,
        }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.name.toLowerCase().includes(q));
  }, [friends, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(deepLink);
      toast.success("Story link copied");
      track("story_share", {
        story_id: storyId,
        source,
        method: "copy_link",
      });
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleSend = async () => {
    if (!user || selected.size === 0 || sending) return;
    setSending(true);
    try {
      const recipients = Array.from(selected);
      const messageBody = note.trim()
        ? `${note.trim()}\n${deepLink}`
        : `Check out ${storyOwnerName ? `${storyOwnerName}'s` : "this"} story 👀\n${deepLink}`;

      const rows = recipients.map((rid) => ({
        sender_id: user.id,
        receiver_id: rid,
        message: messageBody,
        message_type: "text",
      }));

      const { error } = await (supabase as any).from("direct_messages").insert(rows);
      if (error) throw error;

      track("story_share", {
        story_id: storyId,
        source,
        method: "forward",
        recipient_count: recipients.length,
      });

      toast.success(
        recipients.length === 1
          ? "Story sent"
          : `Story sent to ${recipients.length} people`
      );
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Could not send story");
    } finally {
      setSending(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1700] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="w-full max-w-md bg-card rounded-t-3xl flex flex-col max-h-[85vh] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-border/40">
              <div>
                <h3 className="text-base font-bold text-foreground">Send to</h3>
                <p className="text-[11px] text-muted-foreground">
                  Forward this story or copy its link
                </p>
              </div>
              <button type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Quick action: Copy link */}
            <div className="px-4 py-3 border-b border-border/40">
              <button type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted/60 hover:bg-muted transition active:scale-[0.99]"
              >
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-foreground">Copy link</p>
                  <p className="text-[11px] text-muted-foreground truncate">{deepLink}</p>
                </div>
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search friends"
                  className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Friend list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-[200px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {friends.length === 0 ? "No friends yet" : "No matches"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {friends.length === 0
                      ? "Add friends to forward stories to them. You can still copy the link above."
                      : "Try a different name."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/30">
                  {filtered.map((f) => {
                    const isSelected = selected.has(f.id);
                    return (
                      <li key={f.id}>
                        <button type="button"
                          onClick={() => toggle(f.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={f.avatar} />
                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                              {f.name[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1 text-left text-sm font-medium text-foreground truncate">
                            {f.name}
                          </span>
                          <span
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition",
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-muted-foreground/40"
                            )}
                          >
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-primary-foreground" />
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Compose + send */}
            {selected.size > 0 && (
              <div className="border-t border-border/40 p-3 pb-[calc(var(--zivo-safe-bottom,12px)+12px)] space-y-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Write a message…"
                  className="w-full bg-muted rounded-full px-4 py-2.5 text-sm outline-none text-foreground placeholder:text-muted-foreground"
                />
                <button type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full py-3 font-semibold text-sm disabled:opacity-60 active:scale-[0.99] transition"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send to {selected.size} {selected.size === 1 ? "person" : "people"}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
