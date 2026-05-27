/**
 * ShareToChatSheet — pick a friend to send a ZIVO action card to.
 *
 * Mounted globally; opened by dispatching a window event with a payload, so
 * any product page can share a card without importing chat internals.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import X from "lucide-react/dist/esm/icons/x";
import Search from "lucide-react/dist/esm/icons/search";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Send from "lucide-react/dist/esm/icons/send";
import Check from "lucide-react/dist/esm/icons/check";
import { toast } from "sonner";
import { enqueue as outboxEnqueue } from "@/lib/chat/messageOutbox";
import ZivoActionBubble, { type ZivoCardPayload } from "./ZivoActionBubble";

export const SHARE_TO_CHAT_EVENT = "zivo:share-to-chat";

export interface ShareToChatDetail {
  card: ZivoCardPayload;
}

/** Trigger from anywhere — opens the picker with this payload. */
export function openShareToChat(card: ZivoCardPayload) {
  window.dispatchEvent(
    new CustomEvent<ShareToChatDetail>(SHARE_TO_CHAT_EVENT, { detail: { card } }),
  );
}

interface Friend {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Group {
  id: string;
  name: string;
  avatar_url?: string | null;
  member_count?: number;
}

type Recipient =
  | { kind: "friend"; friend: Friend }
  | { kind: "group"; group: Group };

const dbFrom = (table: string): unknown => (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function ShareToChatSheet() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<ZivoCardPayload | null>(null);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  // Global open API
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ShareToChatDetail>).detail;
      if (!detail?.card) return;
      setCard(detail.card);
      setOpen(true);
    };
    window.addEventListener(SHARE_TO_CHAT_EVENT, handler as EventListener);
    return () => window.removeEventListener(SHARE_TO_CHAT_EVENT, handler as EventListener);
  }, []);

  // Lazy-load friends + groups only when sheet opens. Both lists run in
  // parallel so the picker shows everything as soon as either resolves.
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    const loadFriends = async () => {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");
      const rows = (friendships || []) as { user_id: string; friend_id: string }[];
      if (rows.length === 0) {
        if (!cancelled) setFriends([]);
        return;
      }
      const friendIds = rows.map((r) => (r.user_id === user.id ? r.friend_id : r.user_id));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", friendIds);
      if (cancelled) return;
      setFriends((profiles || []) as Friend[]);
    };
    const loadGroups = async () => {
      const { data: memberships } = await (dbFrom("chat_group_members") as { select: (s: string) => { eq: (k: string, v: string) => Promise<{ data: { group_id: string }[] | null }> } })
        .select("group_id")
        .eq("user_id", user.id);
      const ids = ((memberships as { group_id: string }[] | null) || []).map((m) => m.group_id);
      if (ids.length === 0) {
        if (!cancelled) setGroups([]);
        return;
      }
      const [groupsRes, allMembersRes] = await Promise.all([
        (dbFrom("chat_groups") as { select: (s: string) => { in: (k: string, v: string[]) => Promise<{ data: Group[] | null }> } })
          .select("id, name, avatar_url")
          .in("id", ids),
        // Member counts let users distinguish between two groups with the same
        // name. One round-trip across all groups is cheaper than N counts.
        (dbFrom("chat_group_members") as { select: (s: string) => { in: (k: string, v: string[]) => Promise<{ data: { group_id: string }[] | null }> } })
          .select("group_id")
          .in("group_id", ids),
      ]);
      if (cancelled) return;
      const memberCounts = new Map<string, number>();
      for (const row of ((allMembersRes as { data: { group_id: string }[] | null }).data || [])) {
        memberCounts.set(row.group_id, (memberCounts.get(row.group_id) || 0) + 1);
      }
      const rows = (groupsRes as { data: Group[] | null }).data || [];
      setGroups(rows.map((g) => ({ ...g, member_count: memberCounts.get(g.id) ?? 0 })));
    };
    void loadFriends();
    void loadGroups();
    return () => { cancelled = true; };
  }, [open, user?.id]);

  const filteredGroups = useMemo(() => {
    if (!groups) return null;
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, search]);

  const filteredFriends = useMemo(() => {
    if (!friends) return null;
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => {
      return (
        (f.full_name || "").toLowerCase().includes(q) ||
        (f.username || "").toLowerCase().includes(q)
      );
    });
  }, [friends, search]);

  const handleClose = () => {
    setOpen(false);
    setCard(null);
    setSearch("");
    setFriends(null);
    setGroups(null);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const buildRecipients = (): Recipient[] => {
    const result: Recipient[] = [];
    for (const id of selected) {
      const f = friends?.find((x) => x.user_id === id);
      if (f) { result.push({ kind: "friend", friend: f }); continue; }
      const g = groups?.find((x) => x.id === id);
      if (g) result.push({ kind: "group", group: g });
    }
    return result;
  };

  const sendSelected = async () => {
    if (!user?.id || !card || selected.size === 0) return;
    setSending(true);
    const recipients = buildRecipients();
    let successCount = 0;
    const cardWithForwarder = { ...card, forwardedFrom: user.id === card.forwardedFrom ? undefined : (user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || "Someone" };
    for (const recipient of recipients) {
      const id = recipient.kind === "friend" ? recipient.friend.user_id : recipient.group.id;
      const table = recipient.kind === "friend" ? "direct_messages" : "group_messages";
      const insertData: Record<string, unknown> = recipient.kind === "friend"
        ? { sender_id: user.id, receiver_id: id, message: card.title, message_type: "zivo_card", file_payload: cardWithForwarder as unknown as Record<string, unknown> }
        : { sender_id: user.id, group_id: id, message: card.title, message_type: "zivo_card", file_payload: cardWithForwarder as unknown as Record<string, unknown> };
      try {
        const { error } = await (dbFrom(table) as { insert: (p: unknown) => Promise<{ error: unknown }> }).insert(insertData);
        if (error) throw error;
        successCount++;
      } catch {
        outboxEnqueue({ id: `opt-share-${Date.now()}-${id}`, table: table as "direct_messages" | "group_messages", chatKey: id, payload: insertData, optimistic: insertData });
      }
    }
    setSending(false);
    if (successCount > 0) {
      toast.success(successCount === 1 ? "Card sent!" : `Sent to ${successCount} chats`);
    } else {
      toast.error(navigator.onLine ? "Couldn't send — saved to outbox" : "Offline — will send when back online");
    }
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && card && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-[185] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Share to a chat"
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl pb-[max(1rem,var(--zivo-safe-bottom,0px))] max-h-[85dvh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border/30">
              <div>
                <h3 className="text-base font-bold text-foreground">Share to chat</h3>
                <p className="text-[11px] text-muted-foreground">
                  {selected.size === 0
                    ? "Tap to select — send to multiple at once."
                    : `${selected.size} selected`}
                </p>
              </div>
              <button type="button"
                onClick={handleClose}
                aria-label="Close"
                className="h-9 w-9 -mr-1.5 flex items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Card preview — centered, no time meta */}
            <div className="px-4 py-3 border-b border-border bg-muted/20 flex justify-center [&>div>div]:!max-w-none [&>div>div]:!w-[260px]">
              <ZivoActionBubble payload={card} isMe={false} time="" />
            </div>

            {/* Search */}
            <div className="px-4 pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search friends"
                  type="search"
                  inputMode="search"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 [&::-webkit-search-cancel-button]:appearance-none"
                />
              </div>
            </div>

            {/* Recipients list — Groups first, then Friends */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {(filteredFriends == null && filteredGroups == null) ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : (filteredGroups?.length || 0) === 0 && (filteredFriends?.length || 0) === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">
                  {search ? `No matches for "${search}"` : "No friends or groups yet — add some to share."}
                </p>
              ) : (
                <>
                  {filteredGroups && filteredGroups.length > 0 && (
                    <>
                      <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Groups
                      </p>
                      {filteredGroups.map((g) => (
                        <button type="button"
                          key={`g:${g.id}`}
                          onClick={() => toggleSelect(g.id)}
                          disabled={sending}
                          className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition disabled:opacity-50 ${selected.has(g.id) ? "bg-primary/10" : "hover:bg-muted/40 active:bg-muted/60"}`}
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={g.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                              {g.name.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-semibold text-foreground truncate">{g.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {typeof g.member_count === "number" && g.member_count > 0
                                ? `${g.member_count} member${g.member_count === 1 ? "" : "s"}`
                                : "Group"}
                            </p>
                          </div>
                          <span className={`h-8 w-8 inline-flex items-center justify-center rounded-full transition ${selected.has(g.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground/70 ring-1 ring-border"}`}>
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      ))}
                    </>
                  )}

                  {filteredFriends && filteredFriends.length > 0 && (
                    <>
                      <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Friends
                      </p>
                      {filteredFriends.map((f) => (
                        <button type="button"
                          key={`f:${f.user_id}`}
                          onClick={() => toggleSelect(f.user_id)}
                          disabled={sending}
                          className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition disabled:opacity-50 ${selected.has(f.user_id) ? "bg-primary/10" : "hover:bg-muted/40 active:bg-muted/60"}`}
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={f.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-muted">
                              {(f.full_name || f.username || "?").slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {f.full_name || (f.username ? `@${f.username}` : "User")}
                            </p>
                            {f.username && f.full_name && (
                              <p className="text-[11px] text-muted-foreground truncate">@{f.username}</p>
                            )}
                          </div>
                          <span className={`h-8 w-8 inline-flex items-center justify-center rounded-full transition ${selected.has(f.user_id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground/70 ring-1 ring-border"}`}>
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Sticky send button — appears once at least one recipient selected */}
            {selected.size > 0 && (
              <div className="px-4 pt-2 pb-1 border-t border-border">
                <button type="button"
                  onClick={() => void sendSelected()}
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm active:opacity-80 transition disabled:opacity-60"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send to {selected.size} {selected.size === 1 ? "chat" : "chats"}
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
