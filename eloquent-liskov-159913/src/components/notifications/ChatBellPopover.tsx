/**
 * Facebook-style Notifications popover for the Chat header bell.
 * Shows All / Unread tabs, empty "You're all caught up" state,
 * and a footer link to the full notifications page.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Bell from "lucide-react/dist/esm/icons/bell";
import BellOff from "lucide-react/dist/esm/icons/bell-off";
import CheckCheck from "lucide-react/dist/esm/icons/check-check";
import CornerUpLeft from "lucide-react/dist/esm/icons/corner-up-left";
import UserCircle from "lucide-react/dist/esm/icons/user-circle-2";
import Send from "lucide-react/dist/esm/icons/send";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

const ProfilePreviewSheet = lazy(() => import("@/components/profile/ProfilePreviewSheet"));
import { useNotifications } from "@/hooks/useNotifications";
import { useMutedThreads, MUTE_DURATIONS, formatMuteLabel, type MuteDurationId } from "@/hooks/useMutedThreads";
import { useAllowMessageRequests } from "@/hooks/useAllowMessageRequests";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

// Pull the receiver id out of a chat notification's action_url. Returns null
// for non-chat notifications (e.g. orders, payouts) so the reply UI hides.
function chatThreadIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/[?&]with=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

interface ChatBellPopoverProps {
  className?: string;
  buttonLabel?: string;
  dialogLabel?: string;
}

export function ChatBellPopover({
  className,
  buttonLabel = "Notifications",
  dialogLabel = "Notifications",
}: ChatBellPopoverProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const navigate = useNavigate();
  const { user } = useAuth();
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 72, right: 16 });

  // Inline-reply state. `replyOpenFor` is the group's chat-thread id (the
  // recipient's user_id) — null when no reply panel is open. Only one reply
  // can be open at a time so the popover stays compact.
  const [replyOpenFor, setReplyOpenFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications(20);
  const { mutedSet, isMuted, mute, unmute, getMuteEntry } = useMutedThreads();
  const { allow: allowMessageRequests } = useAllowMessageRequests();

  // When the user has turned off "Allow message requests", chat-type
  // notifications from senders not in their contacts shouldn't surface in
  // the bell either — otherwise the toggle is half-enforced (chat list
  // hides them, bell still rings). We only fetch the contact set when the
  // toggle is off so the common-case bell stays a single query.
  const { data: contactSet } = useQuery({
    queryKey: ["bell-contact-set", user?.id],
    enabled: !!user && allowMessageRequests === false,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("user_contacts")
        .select("contact_user_id")
        .eq("owner_id", user!.id);
      return new Set<string>(((data || []) as any[]).map((c) => c.contact_user_id));
    },
  });

  // Per-row mute menu — `muteOpenFor` is the chat thread id whose dropdown
  // is currently expanded (only one at a time, like the reply panel).
  const [muteOpenFor, setMuteOpenFor] = useState<string | null>(null);

  // Profile preview bottom sheet — `previewUserId` is the sender's id, lifted
  // out of the chat thread URL when the user taps the peek button.
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  // Predicate: should this notification be hidden from the user entirely?
  // True when the user has "Allow message requests" off AND the notification
  // is a chat from someone who isn't in their contacts. Used by both the
  // visible list and the bell badge so the toggle stays in sync.
  // NOTE: must be declared BEFORE effectiveUnreadCount — that memo reads
  // it during initial render, and a `const` declared later trips a TDZ
  // ReferenceError that crashes the chat hub.
  const isHidden = useMemo(() => {
    if (allowMessageRequests !== false || !contactSet) return (_n: any) => false;
    return (n: any) => {
      const tid = chatThreadIdFromUrl(n.action_url);
      if (!tid) return false; // non-chat notifs always visible
      return !contactSet.has(tid);
    };
  }, [allowMessageRequests, contactSet]);

  // The bell badge reflects *active, allowed* unread:
  //   - Muted threads → excluded (so muting feels instant)
  //   - Non-contacts when allowMessageRequests=false → excluded (privacy
  //     toggle is honored everywhere, not just the chat hub row)
  // Re-derived from `notifications` rather than trusting the hook's
  // `unreadCount` so toggling either control feels immediate.
  const effectiveUnreadCount = useMemo(() => {
    const noMutes = mutedSet.size === 0;
    const noPrivacyFilter = allowMessageRequests !== false || !contactSet;
    if (noMutes && noPrivacyFilter) return unreadCount;
    let n = 0;
    for (const x of notifications) {
      if (x.is_read) continue;
      const tid = chatThreadIdFromUrl(x.action_url);
      if (tid && mutedSet.has(tid)) continue;
      if (isHidden(x)) continue;
      n += 1;
    }
    return n;
  }, [notifications, unreadCount, mutedSet, allowMessageRequests, contactSet, isHidden]);

  // Collapse multiple notifications from the same chat thread into a single
  // row showing the latest message + a "+N" pill (Messenger-style). The
  // grouping key is the `?with=<id>` param from `action_url` (chat notifs) or
  // the bare action_url (other categories) — non-chat notifs without an
  // action_url fall back to their own id so they stay ungrouped.
  const list = useMemo(() => {
    const filtered = notifications.filter((n) => !isHidden(n));
    const source = tab === "unread" ? filtered.filter((n) => !n.is_read) : filtered;
    const groupKey = (n: any): string => {
      const url: string | null = n.action_url;
      if (!url) return `id:${n.id}`;
      const m = url.match(/[?&]with=([^&]+)/);
      if (m) return `chat:${m[1]}`;
      return `url:${url}`;
    };
    const groups = new Map<string, { latest: any; ids: string[]; count: number; unreadCount: number }>();
    // `source` is already sorted newest-first by useNotifications.
    for (const n of source) {
      const k = groupKey(n);
      const g = groups.get(k);
      if (!g) {
        groups.set(k, { latest: n, ids: [n.id], count: 1, unreadCount: n.is_read ? 0 : 1 });
      } else {
        g.ids.push(n.id);
        g.count += 1;
        if (!n.is_read) g.unreadCount += 1;
      }
    }
    return Array.from(groups.values());
  }, [notifications, tab]);

  // Outside click + ESC
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPanelPos({
        top: Math.max(8, rect.bottom + 8),
        right: Math.max(12, window.innerWidth - rect.right),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  // Closing the popover also resets any open reply / mute menu — otherwise
  // reopening would show a stale half-typed message or a hanging dropdown.
  useEffect(() => {
    if (!open) {
      if (replyOpenFor) {
        setReplyOpenFor(null);
        setReplyText("");
      }
      if (muteOpenFor) setMuteOpenFor(null);
    }
  }, [open, replyOpenFor, muteOpenFor]);

  const handleClick = (g: { latest: any; ids: string[]; unreadCount: number }) => {
    // Mark every notification in the group as read so the badge clears in one
    // tap, not just the most recent one shown in the popover.
    if (g.unreadCount > 0) markAsRead(g.ids);
    const n = g.latest;
    if (n.action_url) {
      let url = n.action_url as string;
      const m = url.match(/^\/dispatch\/support\/(.+)$/);
      if (m) url = `/support/tickets/${m[1]}`;
      if (url.startsWith("/")) navigate(url);
    }
    setOpen(false);
  };

  const openReply = (threadId: string, groupIds: string[]) => {
    setReplyOpenFor(threadId);
    setReplyText("");
    // Mark this group as read the moment the reply panel opens — opening
    // implies the user has seen it; no need to wait for send.
    if (groupIds.length) markAsRead(groupIds);
    // Autofocus next paint so the keyboard pops up on iOS without an extra tap.
    requestAnimationFrame(() => replyInputRef.current?.focus());
  };

  const cancelReply = () => {
    setReplyOpenFor(null);
    setReplyText("");
  };

  const sendReply = async () => {
    if (!user?.id || !replyOpenFor) return;
    const text = replyText.trim();
    if (!text || replySending) return;
    setReplySending(true);
    const { error } = await (supabase as any).from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: replyOpenFor,
      message: text,
      message_type: "text",
    });
    setReplySending(false);
    if (error) {
      toast.error("Couldn't send reply");
      return;
    }
    toast.success("Reply sent");
    setReplyOpenFor(null);
    setReplyText("");
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-all"
        aria-label={buttonLabel}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {effectiveUnreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {effectiveUnreadCount > 9 ? "9+" : effectiveUnreadCount}
          </span>
        )}
      </button>

      {createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed z-[10000] flex w-[min(380px,calc(100vw-24px))] max-h-[min(620px,calc(100dvh-148px))] flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            style={{ top: panelPos.top, right: panelPos.right }}
            role="dialog"
            aria-label={dialogLabel}
          >
            {/* Header */}
            <div className="shrink-0 px-4 pt-3 pb-2 flex items-center justify-between bg-card">
              <h3 className="text-base font-bold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button type="button"
                  onClick={() => markAllAsRead()}
                  className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="shrink-0 px-4 pb-2 flex items-center gap-2 bg-card">
              {(["all", "unread"] as const).map((t) => (
                <button type="button"
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                    tab === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/70"
                  )}
                >
                  {t === "all" ? "All" : "Unread"}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                </div>
              ) : list.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    You're all caught up
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    New notifications will appear here.
                  </p>
                </div>
              ) : (
                <ul className="py-1">
                  {list.map((g) => {
                    const n = g.latest;
                    const hasUnread = g.unreadCount > 0;
                    const threadId = chatThreadIdFromUrl(n.action_url);
                    const isReplying = !!threadId && replyOpenFor === threadId;
                    const isRowMuted = !!threadId && isMuted(threadId);
                    return (
                      <li key={n.id} className={cn(isReplying && "bg-muted/40")}>
                        <div
                          className={cn(
                            "w-full text-left px-4 py-2.5 flex gap-3 items-start transition-colors",
                            hasUnread && !isReplying && "bg-primary/5",
                            !isReplying && "hover:bg-muted/60"
                          )}
                        >
                          <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0 bg-primary"
                               style={{ opacity: hasUnread ? 1 : 0 }} />
                          <button type="button"
                            onClick={() => handleClick(g)}
                            className={cn("flex-1 min-w-0 text-left", isRowMuted && "opacity-60")}
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-semibold text-foreground line-clamp-1 flex-1">
                                {n.title}
                              </p>
                              {isRowMuted && (
                                <BellOff className="h-3 w-3 text-muted-foreground shrink-0" aria-label="Muted" />
                              )}
                              {g.count > 1 && (
                                <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                                  {g.count} new
                                </span>
                              )}
                            </div>
                            {n.body && (
                              <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">
                                {n.body}
                              </p>
                            )}
                            <div className="mt-1 flex items-center gap-2">
                              <p className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                              </p>
                              {isRowMuted && threadId && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                                  <BellOff className="h-2.5 w-2.5" />
                                  {formatMuteLabel(getMuteEntry(threadId)) || "muted"}
                                </span>
                              )}
                            </div>
                          </button>
                          {threadId && !isReplying && (
                            <div className="shrink-0 self-center flex items-center gap-1">
                              <button type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openReply(threadId, g.ids);
                                }}
                                aria-label="Reply"
                                className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-90 transition-all"
                              >
                                <CornerUpLeft className="h-4 w-4" />
                              </button>
                              <button type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewUserId(threadId);
                                }}
                                aria-label="Preview profile"
                                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all flex items-center justify-center"
                              >
                                <UserCircle className="h-4 w-4" />
                              </button>
                              <button type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // If already muted, single tap unmutes
                                  // immediately — fast escape hatch.
                                  if (isMuted(threadId)) {
                                    unmute(threadId);
                                    toast.success("Unmuted");
                                    return;
                                  }
                                  setMuteOpenFor((cur) => (cur === threadId ? null : threadId));
                                }}
                                aria-label={isMuted(threadId) ? "Unmute conversation" : "Mute conversation"}
                                className={cn(
                                  "h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all",
                                  isMuted(threadId) ? "bg-muted text-foreground" : "text-muted-foreground"
                                )}
                              >
                                <BellOff className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Mute dropdown — duration choices for snoozing this
                            thread's notifications. */}
                        <AnimatePresence initial={false}>
                          {threadId && muteOpenFor === threadId && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-3 pt-0 grid grid-cols-2 gap-1.5">
                                {MUTE_DURATIONS.map((d) => (
                                  <button type="button"
                                    key={d.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      mute(threadId, d.id as MuteDurationId);
                                      setMuteOpenFor(null);
                                      toast.success(`Muted · ${d.label.toLowerCase()}`);
                                    }}
                                    className="h-8 px-3 rounded-full bg-muted/70 hover:bg-muted text-foreground text-[12px] font-medium flex items-center justify-center"
                                  >
                                    {d.label}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Inline reply panel — animates open below the row,
                            sends via direct_messages, then collapses. */}
                        <AnimatePresence initial={false}>
                          {isReplying && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-3 pt-0 flex items-center gap-2">
                                <input
                                  ref={replyInputRef}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      void sendReply();
                                    } else if (e.key === "Escape") {
                                      e.preventDefault();
                                      cancelReply();
                                    }
                                  }}
                                  placeholder={`Reply to ${n.title}…`}
                                  disabled={replySending}
                                  className="flex-1 h-9 px-3 rounded-full bg-background border border-border text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                                />
                                <button type="button"
                                  onClick={cancelReply}
                                  disabled={replySending}
                                  aria-label="Cancel reply"
                                  className="shrink-0 h-9 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                                >
                                  Cancel
                                </button>
                                <button type="button"
                                  onClick={() => void sendReply()}
                                  disabled={!replyText.trim() || replySending}
                                  aria-label="Send reply"
                                  className="shrink-0 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"
                                >
                                  {replySending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-card">
              <button type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/notifications");
                }}
                className="w-full py-3 text-sm font-semibold text-primary hover:bg-muted/50 transition-colors"
              >
                See all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* Profile preview bottom sheet — opened by the UserCircle action on
          chat-type rows. Lives outside <AnimatePresence> so it stays mounted
          when the popover closes (otherwise dismissing the popover would
          also kill the sheet mid-animation). */}
      {previewUserId && (
        <Suspense fallback={null}>
          <ProfilePreviewSheet
            userId={previewUserId}
            onClose={() => setPreviewUserId(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default ChatBellPopover;
