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
import AlertCircle from "lucide-react/dist/esm/icons/circle-alert";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";

const ProfilePreviewSheet = lazy(() => import("@/components/profile/ProfilePreviewSheet"));
import { useNotifications } from "@/hooks/useNotifications";
import { useMutedThreads, MUTE_DURATIONS, formatMuteLabel, type MuteDurationId } from "@/hooks/useMutedThreads";
import { useMessageRequestNotificationPrivacy } from "@/hooks/useAllowMessageRequests";
import { useAuth } from "@/contexts/AuthContext";
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
  const {
    allow: allowMessageRequests,
    shouldHideNotification,
    isPrivacyLoading,
    isPrivacyUnavailable,
    isPrivacyFetching,
    retry: retryPrivacy,
  } = useMessageRequestNotificationPrivacy();

  // Per-row mute menu — `muteOpenFor` is the chat thread id whose dropdown
  // is currently expanded (only one at a time, like the reply panel).
  const [muteOpenFor, setMuteOpenFor] = useState<string | null>(null);

  // Profile preview bottom sheet — `previewUserId` is the sender's id, lifted
  // out of the chat thread URL when the user taps the peek button.
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  // Predicate: non-chat notifications always pass. Chat notifications only
  // pass when alerts are confirmed on or the sender is a confirmed contact.
  // Loading and failed preference/contact reads therefore fail closed.
  // NOTE: must be declared BEFORE effectiveUnreadCount — that memo reads
  // it during initial render, and a `const` declared later trips a TDZ
  // ReferenceError that crashes the chat hub.
  const isHidden = useMemo(() => {
    return (notification: any) =>
      shouldHideNotification(chatThreadIdFromUrl(notification.action_url));
  }, [shouldHideNotification]);

  // The bell badge reflects *active, allowed* unread:
  //   - Muted threads → excluded (so muting feels instant)
  //   - Non-contacts when allowMessageRequests=false → excluded (privacy
  //     toggle is honored everywhere, not just the chat hub row)
  // Re-derived from `notifications` rather than trusting the hook's
  // `unreadCount` so toggling either control feels immediate.
  const effectiveUnreadCount = useMemo(() => {
    const noMutes = mutedSet.size === 0;
    const noPrivacyFilter = allowMessageRequests === true;
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
  }, [notifications, unreadCount, mutedSet, allowMessageRequests, isHidden]);

  const visibleUnreadIds = useMemo(
    () =>
      notifications
        .filter(
          (notification) =>
            !notification.is_read && !isHidden(notification),
        )
        .map((notification) => notification.id),
    [isHidden, notifications],
  );

  const markVisibleAsRead = () => {
    if (allowMessageRequests === true && mutedSet.size === 0) {
      markAllAsRead();
      return;
    }
    if (visibleUnreadIds.length > 0) markAsRead(visibleUnreadIds);
  };

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
  }, [isHidden, notifications, tab]);

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
      // Reject protocol-relative ("//host") and backslash ("/\host") authorities —
      // browsers normalize "\" to "/", so both would navigate off-origin.
      const probe = url.replace(/\\/g, "/");
      if (probe.startsWith("/") && !probe.startsWith("//")) navigate(url);
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
        className="zivo-chat-icon-button relative flex h-9 w-9 items-center justify-center rounded-full active:scale-90 transition-all"
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
            className="zivo-chat-popover-glass fixed z-[10000] flex w-[min(380px,calc(100vw-24px))] max-h-[min(620px,calc(100dvh-148px))] flex-col overflow-hidden rounded-3xl"
            style={{ top: panelPos.top, right: panelPos.right }}
            role="dialog"
            aria-label={dialogLabel}
          >
            {/* Header */}
            <div className="shrink-0 px-4 pt-3 pb-2 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Chat pulse</p>
                <h3 className="text-base font-black text-foreground">Notifications</h3>
              </div>
              {(allowMessageRequests === true && mutedSet.size === 0
                ? unreadCount > 0
                : visibleUnreadIds.length > 0) && (
                <button type="button"
                  onClick={markVisibleAsRead}
                  className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  {allowMessageRequests === true && mutedSet.size === 0
                    ? "Mark all read"
                    : "Mark visible read"}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="shrink-0 px-4 pb-2 flex items-center gap-2">
              {(["all", "unread"] as const).map((t) => (
                <button type="button"
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-black transition-colors",
                    tab === t
                      ? "zivo-chat-chip-active"
                      : "zivo-chat-chip text-foreground"
                  )}
                >
                  {t === "all" ? "All" : "Unread"}
                </button>
              ))}
            </div>

              {isPrivacyUnavailable ? (
                <div
                  role="alert"
                  className="mx-4 mb-2 flex shrink-0 items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-foreground">
                      Some chat alerts are hidden
                    </p>
                    <p className="text-[10px] leading-snug text-muted-foreground">
                      Privacy preferences couldn't be confirmed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void retryPrivacy()}
                    disabled={isPrivacyFetching}
                    className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[10px] font-semibold text-primary disabled:opacity-60"
                  >
                    {isPrivacyFetching ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Retry
                  </button>
                </div>
              ) : isPrivacyLoading ? (
                <div
                  role="status"
                  className="mx-4 mb-2 flex shrink-0 items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-[11px] font-medium text-muted-foreground"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking chat privacy…
                </div>
              ) : null}

            {/* List */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="zivo-chat-card flex items-center gap-2 rounded-full px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs font-bold text-muted-foreground">Loading</span>
                  </div>
                </div>
              ) : list.length === 0 ? (
                isPrivacyLoading || isPrivacyUnavailable ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-xs text-muted-foreground">
                      Chat alerts stay hidden until privacy can be confirmed.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                    <div className="zivo-chat-card w-12 h-12 rounded-2xl flex items-center justify-center mb-3">
                      <Bell className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      You're all caught up
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      New notifications will appear here.
                    </p>
                  </div>
                )
              ) : (
                <ul className="py-1">
                  {list.map((g) => {
                    const n = g.latest;
                    const hasUnread = g.unreadCount > 0;
                    const threadId = chatThreadIdFromUrl(n.action_url);
                    const isReplying = !!threadId && replyOpenFor === threadId;
                    const isRowMuted = !!threadId && isMuted(threadId);
                    return (
                      <li key={n.id} className={cn("px-2 py-1", isReplying && "bg-white/35")}>
                        <div
                          className={cn(
                            "zivo-chat-row w-full text-left px-3 py-2.5 flex gap-3 items-start transition-colors",
                            hasUnread && !isReplying && "zivo-chat-row-unread"
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
                                <span className="zivo-chat-chip shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-primary">
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
                                className="zivo-chat-icon-button h-8 w-8 rounded-full text-primary flex items-center justify-center active:scale-90 transition-all"
                              >
                                <CornerUpLeft className="h-4 w-4" />
                              </button>
                              <button type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewUserId(threadId);
                                }}
                                aria-label="Preview profile"
                                className="zivo-chat-icon-button h-8 w-8 rounded-full text-muted-foreground active:scale-90 transition-all flex items-center justify-center"
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
                                  "zivo-chat-icon-button h-8 w-8 rounded-full flex items-center justify-center active:scale-90 transition-all",
                                  isMuted(threadId) ? "text-foreground" : "text-muted-foreground"
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
                              <div className="px-4 pb-3 pt-1 grid grid-cols-2 gap-1.5">
                                {MUTE_DURATIONS.map((d) => (
                                  <button type="button"
                                    key={d.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      mute(threadId, d.id as MuteDurationId);
                                      setMuteOpenFor(null);
                                      toast.success(`Muted · ${d.label.toLowerCase()}`);
                                    }}
                                    className="zivo-chat-chip h-8 px-3 rounded-full text-foreground text-[12px] font-bold flex items-center justify-center"
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
                              <div className="px-4 pb-3 pt-1 flex items-center gap-2">
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
                                  className="zivo-chat-search flex-1 h-9 px-3 rounded-full text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
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
                                  className="zivo-chat-chip-active shrink-0 h-9 w-9 rounded-full flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"
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
            <div className="shrink-0 border-t border-border/30">
              <button type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/notifications");
                }}
                className="w-full py-3 text-sm font-black text-primary hover:bg-white/45 transition-colors"
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
