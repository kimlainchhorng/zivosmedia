/**
 * MessageRequestsPage — Facebook/Messenger-style message requests inbox.
 *
 * Lists chats from senders who aren't in the user's contacts AND whom the
 * user has never replied to. Each row offers Accept (add to contacts +
 * open chat), Dismiss (device-local recovery — neither accept nor block), and
 * Block (drops the sender into blocked_users). Tapping the avatar opens
 * the sender's public profile; tapping the body opens the chat read-only.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSmartBack } from "@/lib/smartBack";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Check from "lucide-react/dist/esm/icons/check";
import Ban from "lucide-react/dist/esm/icons/ban";
import X from "lucide-react/dist/esm/icons/x";
import CheckCheck from "lucide-react/dist/esm/icons/check-check";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import AlertCircle from "lucide-react/dist/esm/icons/circle-alert";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useContacts } from "@/hooks/useContacts";
import { useAllowMessageRequests } from "@/hooks/useAllowMessageRequests";
import ProfilePreviewSheet from "@/components/profile/ProfilePreviewSheet";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { subscribeToPooledPostgresChanges } from "@/services/chatRealtimePool";

const LONG_PRESS_MS = 450;
const MESSAGE_REQUEST_HISTORY_LIMIT = 200;

class MessageRequestHistoryIncompleteError extends Error {}

// Dismissed (soft-deleted) requests are tracked per-user in localStorage so
// the request list doesn't permanently drop messages — if the sender writes
// again they reappear. Stored as a JSON array of user IDs.
const dismissedKey = (uid: string) => `zivo:dismissed-message-requests:${uid}`;
function readDismissed(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(dismissedKey(uid));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}
function writeDismissed(uid: string, set: Set<string>) {
  try {
    localStorage.setItem(dismissedKey(uid), JSON.stringify([...set]));
  } catch {
    // localStorage may be unavailable (private mode etc.) — just no-op.
  }
}

interface MessageRequest {
  otherUserId: string;
  name: string;
  avatar: string | null;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

const EMPTY_MESSAGE_REQUESTS: MessageRequest[] = [];

export default function MessageRequestsPage() {
  const { user } = useAuth();

  // A keyed owner boundary synchronously drops account-local recovery,
  // selection, preview, and request-query state during A → B → A switches.
  return <MessageRequestsPageContent key={user?.id ?? "signed-out"} />;
}

function MessageRequestsPageContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat");
  const queryClient = useQueryClient();
  const { add: addContact } = useContacts();
  const {
    allow: allowMessageRequests,
    isLoading: isPreferenceLoading,
    isFetching: isPreferenceFetching,
    isError: isPreferenceError,
    isUpdating: isPreferenceUpdating,
    refetch: refetchPreference,
    setValue: setAllowMessageRequests,
  } = useAllowMessageRequests();

  // `dismissed` is kept as state so toggling it re-renders the list without
  // refetching. The Set is also persisted to localStorage on every write.
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    user ? readDismissed(user.id) : new Set()
  );

  // ID of the user whose preview sheet is currently open (null = closed).
  // Tapping an avatar pops the bottom sheet so users can vet a sender
  // without leaving the inbox.
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  // Active vs Dismissed sub-views. Dismissed view is the recovery surface for
  // requests the user soft-deleted from the active list.
  const [view, setView] = useState<"active" | "dismissed">("active");

  // Bulk-select mode: long-press a row to enter, tap rows to toggle their
  // selection, then act on the whole set from the bottom action bar.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const startLongPress = useCallback(
    (id: string) => {
      longPressFiredRef.current = false;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        setSelectMode(true);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        // Light haptic if available — keeps the gesture feeling native.
        try {
          if ("vibrate" in navigator) navigator.vibrate?.(10);
        } catch {
          /* no-op */
        }
      }, LONG_PRESS_MS);
    },
    []
  );

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const requestQuery = useQuery<MessageRequest[]>({
    queryKey: ["message-requests", user?.id],
    enabled: !!user?.id,
    queryFn: async ({ queryKey, signal }) => {
      const ownerId = queryKey[1];
      if (typeof ownerId !== "string") throw new Error("Not signed in");

      const requireActiveOwner = async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error || data.user?.id !== ownerId || signal.aborted) {
          throw new Error("Message request owner changed");
        }
      };

      await requireActiveOwner();

      const { data: msgs, error: messagesError, count } = await (supabase as any)
        .from("direct_messages")
        .select(
          "id,sender_id,receiver_id,message,message_type,image_url,video_url,is_read,created_at,hidden_at,expires_at",
          { count: "exact" },
        )
        .or(`sender_id.eq.${ownerId},receiver_id.eq.${ownerId}`)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(MESSAGE_REQUEST_HISTORY_LIMIT + 1)
        .abortSignal(signal);
      if (messagesError) throw messagesError;
      if (
        count === null ||
        count > MESSAGE_REQUEST_HISTORY_LIMIT ||
        (msgs?.length ?? 0) !== count
      ) {
        throw new MessageRequestHistoryIncompleteError(
          "Message request history exceeds the supported window",
        );
      }
      if (!msgs?.length) {
        await requireActiveOwner();
        return [];
      }

      const repliedTo = new Set<string>();
      const grouped = new Map<string, { lastMsg: any; unread: number }>();
      const loadedAt = Date.now();
      for (const msg of msgs as any[]) {
        if (msg.sender_id === ownerId) {
          repliedTo.add(msg.receiver_id);
          continue;
        }
        if (msg.receiver_id !== ownerId) continue;
        if (msg.hidden_at) continue;
        if (
          msg.expires_at &&
          new Date(msg.expires_at).getTime() <= loadedAt
        ) {
          continue;
        }

        const otherId = msg.sender_id;
        if (!grouped.has(otherId)) {
          grouped.set(otherId, { lastMsg: msg, unread: 0 });
        }
        const entry = grouped.get(otherId)!;
        if (!msg.is_read) entry.unread += 1;
      }

      const otherIds = Array.from(grouped.keys());
      if (!otherIds.length) {
        await requireActiveOwner();
        return [];
      }

      const [contactsResult, profilesResult, blocksResult] = await Promise.all([
        (supabase as any)
          .from("user_contacts")
          .select("contact_user_id")
          .eq("owner_id", ownerId)
          .in("contact_user_id", otherIds)
          .abortSignal(signal),
        (supabase as any)
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", otherIds)
          .abortSignal(signal),
        (supabase as any)
          .from("blocked_users")
          .select("blocked_id")
          .eq("blocker_id", ownerId)
          .in("blocked_id", otherIds)
          .abortSignal(signal),
      ]);
      if (contactsResult.error) throw contactsResult.error;
      if (profilesResult.error) throw profilesResult.error;
      if (blocksResult.error) throw blocksResult.error;

      const contactsRows = contactsResult.data;
      const profiles = profilesResult.data;
      const blocks = blocksResult.data;
      const contactSet = new Set<string>(((contactsRows || []) as any[]).map((c) => c.contact_user_id));
      const blockedSet = new Set<string>(((blocks || []) as any[]).map((b) => b.blocked_id));
      const profMap = new Map<string, any>();
      for (const p of (profiles || []) as any[]) profMap.set(p.user_id, p);

      const out: MessageRequest[] = [];
      for (const otherId of otherIds) {
        const e = grouped.get(otherId)!;
        if (contactSet.has(otherId) || repliedTo.has(otherId) || blockedSet.has(otherId)) continue;
        const p = profMap.get(otherId);
        out.push({
          otherUserId: otherId,
          name: p?.full_name || "Profile unavailable",
          avatar: p?.avatar_url || null,
          lastMessage:
            e.lastMsg.message_type === "voice"
              ? "🎤 Voice message"
              : e.lastMsg.message_type === "file"
                ? "📎 File"
                : e.lastMsg.message ||
                  (e.lastMsg.image_url ? "📷 Image" : e.lastMsg.video_url ? "🎥 Video" : ""),
          lastTime: e.lastMsg.created_at,
          unread: e.unread,
        });
      }
      out.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
      await requireActiveOwner();
      return out;
    },
  });

  // React Query can retain previous data after a failed refetch. Request rows,
  // counts, and actions are privacy-sensitive, so an error hides that cache
  // until every dependency is confirmed again.
  const isInboxUnavailable = requestQuery.isError;
  const isInboxLoading = !user?.id || requestQuery.isPending;
  const isHistoryWindowIncomplete =
    requestQuery.error instanceof MessageRequestHistoryIncompleteError;
  const requests = isInboxUnavailable
    ? EMPTY_MESSAGE_REQUESTS
    : (requestQuery.data ?? EMPTY_MESSAGE_REQUESTS);

  // Active = senders not in the dismissed Set. Dismissed = the recovery view
  // showing exactly the senders the user dismissed until they restore them.
  // Dismiss is device-local and reversible; it is not delete or block.
  const activeRequests = useMemo(
    () => requests.filter((r) => !dismissed.has(r.otherUserId)),
    [requests, dismissed]
  );
  const dismissedRequests = useMemo(
    () => requests.filter((r) => dismissed.has(r.otherUserId)),
    [requests, dismissed]
  );
  const visibleRequests = view === "active" ? activeRequests : dismissedRequests;

  useEffect(() => {
    if (!isInboxUnavailable) return;
    cancelLongPress();
    exitSelectMode();
    setPreviewUserId(null);
  }, [cancelLongPress, exitSelectMode, isInboxUnavailable]);

  const isSelecting = selectMode && !isInboxUnavailable;

  // If all dismissed entries get restored (or expire from data), flip back to
  // the active view so the user isn't stuck staring at an empty Dismissed tab.
  useEffect(() => {
    if (view === "dismissed" && dismissedRequests.length === 0) setView("active");
  }, [view, dismissedRequests.length]);
  const visibleUnread = useMemo(
    () => visibleRequests.reduce((sum, request) => sum + request.unread, 0),
    [visibleRequests]
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["message-requests", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["chat-hub-personal", user?.id] });
  }, [queryClient, user?.id]);

  const handleDismiss = useCallback(
    (r: MessageRequest) => {
      if (!user) return;
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(r.otherUserId);
        writeDismissed(user.id, next);
        return next;
      });
      toast.success(`Dismissed ${r.name}`, {
        action: {
          label: "Undo",
          onClick: () => {
            setDismissed((prev) => {
              const next = new Set(prev);
              next.delete(r.otherUserId);
              writeDismissed(user.id, next);
              return next;
            });
          },
        },
      });
    },
    [user]
  );

  // Realtime: a new incoming DM might be a fresh request — invalidate so
  // the list updates without leaving the page.
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToPooledPostgresChanges(
      {
        poolKey: `msg-req:${user.id}`,
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
        filter: `receiver_id=eq.${user.id}`,
      },
      () => invalidate(),
    );
    return unsubscribe;
  }, [invalidate, user?.id]);

  const handleMarkVisibleRead = useCallback(async () => {
    if (!user || isInboxUnavailable || visibleUnread === 0) return;
    const senderIds = visibleRequests.filter((r) => r.unread > 0).map((r) => r.otherUserId);
    if (!senderIds.length) return;
    const { error } = await (supabase as any)
      .from("direct_messages")
      .update({ is_read: true })
      .eq("receiver_id", user.id)
      .in("sender_id", senderIds)
      .eq("is_read", false);
    if (error) {
      toast.error("Couldn't mark as read");
      return;
    }
    invalidate();
  }, [user, isInboxUnavailable, visibleUnread, visibleRequests, invalidate]);

  const handleAccept = async (r: MessageRequest) => {
    const res = await addContact(r.otherUserId, { via: "message-request" as any });
    if (!res.ok) {
      toast.error(res.error || "Couldn't accept");
      return;
    }
    toast.success(`${r.name} added to contacts`);
    invalidate();
    navigate(`/chat?with=${r.otherUserId}`);
  };

  const handleBlock = async (r: MessageRequest) => {
    if (!user) return;
    const { error } = await supabase.functions.invoke("block-user-manage", {
      body: { action: "block", blocked_id: r.otherUserId },
    });
    if (error) {
      toast.error("Couldn't block user");
      return;
    }
    toast.success(`${r.name} blocked`);
    invalidate();
  };

  // Bulk actions — Block all selected, Dismiss all selected. Both
  // exit select mode after running so the UI returns to normal state.
  const handleBulkBlock = useCallback(async () => {
    if (!user || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.functions.invoke("block-user-manage", {
      body: { action: "block", blocked_ids: ids },
    });
    if (error) {
      toast.error("Couldn't block selected");
      return;
    }
    toast.success(`${ids.length} blocked`);
    invalidate();
    exitSelectMode();
  }, [user, selectedIds, exitSelectMode, invalidate]);

  const handleBulkDismiss = useCallback(() => {
    if (!user || selectedIds.size === 0) return;
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) next.add(id);
      writeDismissed(user.id, next);
      return next;
    });
    toast.success(`${selectedIds.size} dismissed`);
    exitSelectMode();
  }, [user, selectedIds, exitSelectMode]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(visibleRequests.map((r) => r.otherUserId)));
  }, [visibleRequests]);

  const handleRestore = useCallback(
    (r: MessageRequest) => {
      if (!user) return;
      setDismissed((prev) => {
        const next = new Set(prev);
        next.delete(r.otherUserId);
        writeDismissed(user.id, next);
        return next;
      });
      toast.success(`${r.name} restored`);
    },
    [user]
  );

  const handleClearDismissed = useCallback(() => {
    if (!user) return;
    const snapshot = new Set(dismissed);
    setDismissed(new Set());
    writeDismissed(user.id, new Set());
    toast.success("All dismissed restored", {
      action: {
        label: "Undo",
        onClick: () => {
          setDismissed(snapshot);
          writeDismissed(user.id, snapshot);
        },
      },
    });
    // Switch back to Active so the restored entries are visible.
    setView("active");
  }, [user, dismissed]);

  const handlePreferenceChange = useCallback(async () => {
    if (allowMessageRequests === null || isPreferenceUpdating) return;
    const next = !allowMessageRequests;

    try {
      const confirmed = await setAllowMessageRequests(next);
      if (!confirmed) return;
      toast.success(
        next
          ? "Non-contact chat alerts shown"
          : "Non-contact chat alerts hidden",
      );
    } catch {
      toast.error("Couldn't update non-contact chat alerts");
    }
  }, [allowMessageRequests, isPreferenceUpdating, setAllowMessageRequests]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header
        className="zivo-pt-safe-sticky flex items-center gap-3 px-4 h-14 border-b border-border/30 sticky top-0 bg-background/95 backdrop-blur z-10"
      >
        {isSelecting ? (
          <>
            <button type="button"
              onClick={exitSelectMode}
              aria-label="Exit selection"
              className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-lg leading-tight">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select"}
              </h1>
            </div>
            <button type="button"
              onClick={handleSelectAll}
              className="text-[12px] font-semibold text-primary px-2 py-1 rounded-full hover:bg-muted/50"
            >
              Select all
            </button>
          </>
        ) : (
          <>
            <button type="button"
              onClick={goBack}
              aria-label="Back"
              className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-lg leading-tight">Message Requests</h1>
              {visibleUnread > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {visibleUnread} unread in this view
                </p>
              )}
            </div>
            {visibleUnread > 0 && !isInboxUnavailable && (
              <button type="button"
                onClick={handleMarkVisibleRead}
                className="min-h-11 text-[12px] font-semibold text-primary flex items-center gap-1 px-2 rounded-full hover:bg-muted/50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark visible read
              </button>
            )}
          </>
        )}
      </header>

      {/* Active / Dismissed tabs — only visible when not in select mode and
          there's at least one dismissed entry to recover. */}
      {!isSelecting && dismissedRequests.length > 0 && (
        <div className="px-4 pt-3 flex items-center gap-2">
          {(["active", "dismissed"] as const).map((v) => {
            const count = v === "active" ? activeRequests.length : dismissedRequests.length;
            const selected = view === v;
            return (
              <button type="button"
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5",
                  selected
                    ? "bg-ig-gradient text-white"
                    : "bg-muted text-foreground hover:bg-muted/70"
                )}
              >
                {v === "active" ? "Active" : "Dismissed"}
                {count > 0 && (
                  <span
                    className={cn(
                      "min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                      selected ? "bg-primary-foreground/20" : "bg-background/60"
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            );
          })}
          {view === "dismissed" && (
            <button type="button"
              onClick={handleClearDismissed}
              className="ml-auto text-[12px] font-semibold text-primary flex items-center gap-1 px-2 py-1 rounded-full hover:bg-muted/50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore all
            </button>
          )}
        </div>
      )}

      <div className="px-4 py-3 text-[12px] text-muted-foreground">
        {isInboxUnavailable
          ? "Requests and actions are hidden until the inbox can be confirmed safely."
          : isSelecting
          ? "Tap rows to select. Block stops them; Dismiss only hides them here."
          : view === "dismissed"
            ? "Requests you dismissed. Restore to bring them back to the active list."
            : "These messages are from people who aren't in your contacts. Long-press a row to select multiple."}
      </div>

      {/* Privacy quick-toggle — this controls non-contact chat alerts only.
          Messages remain visible on this requests page and are not blocked. */}
      {!isSelecting &&
        (isPreferenceLoading ? (
          <div
            role="status"
            className="mx-4 mb-3 flex items-center gap-2 rounded-2xl border border-border/50 bg-card px-3 py-3 text-xs font-medium text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking non-contact chat alerts…
          </div>
        ) : isPreferenceError || allowMessageRequests === null ? (
          <div
            role="alert"
            className="mx-4 mb-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-3"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground">
                  Chat alert preference unavailable
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  We couldn't confirm whether non-contact chat alerts are shown.
                  Nothing has been assumed.
                </p>
                <button
                  type="button"
                  onClick={() => void refetchPreference()}
                  disabled={isPreferenceFetching}
                  className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Retry chat alert preference"
                >
                  {isPreferenceFetching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card px-3 py-2.5"
            aria-busy={isPreferenceUpdating}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">
                Show non-contact chat alerts
              </p>
              <p
                id="message-request-alert-description"
                className="text-[11px] leading-snug text-muted-foreground"
              >
                Hide or show their notifications. This does not block messages
                or remove them from this requests page.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isPreferenceUpdating && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <button
                type="button"
                role="switch"
                aria-label="Show non-contact chat alerts"
                aria-describedby="message-request-alert-description"
                aria-checked={allowMessageRequests}
                disabled={isPreferenceUpdating}
                onClick={() => void handlePreferenceChange()}
                className="flex h-11 w-14 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative h-7 w-12 rounded-full transition-colors",
                    allowMessageRequests ? "bg-primary" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform",
                      allowMessageRequests
                        ? "translate-x-5"
                        : "translate-x-0.5",
                    )}
                  />
                </span>
              </button>
            </div>
          </div>
        ))}

      <div className={cn("flex-1 overflow-y-auto px-3 space-y-2", isSelecting ? "pb-28" : "pb-8")}>
        {isInboxLoading && (
          <p role="status" className="text-center text-sm text-muted-foreground py-12">
            Loading message requests…
          </p>
        )}
        {!isInboxLoading && isInboxUnavailable && (
          <div
            role="alert"
            className="mx-1 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Message requests unavailable
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {isHistoryWindowIncomplete
                    ? "Your message history is larger than this page can classify safely. Nothing is shown as a complete request list."
                    : "We couldn't confirm messages, contacts, blocked senders, and profiles safely. No request, unread count, or action has been assumed."}
                </p>
                <button
                  type="button"
                  onClick={() => void requestQuery.refetch()}
                  disabled={requestQuery.isFetching}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Retry message requests"
                >
                  {requestQuery.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
        {!isInboxLoading && !isInboxUnavailable && visibleRequests.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mx-auto opacity-30 mb-2" />
            <p className="text-sm">
              {view === "dismissed" ? "Nothing dismissed." : "No message requests."}
            </p>
          </div>
        )}
        {!isInboxUnavailable && visibleRequests.map((r) => {
          const isSelected = selectedIds.has(r.otherUserId);
          return (
            <div
              key={r.otherUserId}
              tabIndex={isSelecting ? 0 : undefined}
              onPointerDown={() => startLongPress(r.otherUserId)}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onClick={() => {
                // If long-press fired, the click is suppressed because the
                // user's intent was to enter select mode, not navigate.
                if (longPressFiredRef.current) {
                  longPressFiredRef.current = false;
                  return;
                }
                if (isSelecting) toggleSelected(r.otherUserId);
              }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border transition-colors",
                isSelected
                  ? "bg-primary/10 border-primary/50"
                  : "bg-card border-border/30"
              )}
            >
              {isSelecting ? (
                <div
                  aria-hidden
                  className={cn(
                    "shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </div>
              ) : (
                <button type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewUserId(r.otherUserId);
                  }}
                  aria-label={`Preview ${r.name}'s profile`}
                  className="shrink-0 active:scale-95 transition-transform"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={r.avatar ?? undefined} />
                    <AvatarFallback>{r.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </button>
              )}
              <button type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSelecting) {
                    toggleSelected(r.otherUserId);
                    return;
                  }
                  navigate(`/chat?with=${r.otherUserId}`);
                }}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate flex-1">{r.name}</p>
                  {r.unread > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-ig-gradient text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {r.unread > 9 ? "9+" : r.unread}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{r.lastMessage}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  {formatDistanceToNow(new Date(r.lastTime), { addSuffix: true })}
                </p>
              </button>
              {!isSelecting && view === "active" && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); handleAccept(r); }}
                    aria-label={`Accept ${r.name}`}
                    className="h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); handleDismiss(r); }}
                    aria-label={`Dismiss ${r.name}'s request`}
                    className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); handleBlock(r); }}
                    aria-label={`Block ${r.name}`}
                    className="h-8 w-8 rounded-full bg-destructive/15 text-destructive flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Ban className="h-4 w-4" />
                  </button>
                </div>
              )}
              {!isSelecting && view === "dismissed" && (
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); handleRestore(r); }}
                  className="shrink-0 h-9 px-3 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bulk action bar — fixed at bottom of the viewport when in select mode
          with at least one row selected. Sits above the safe-area inset so
          the buttons clear the iOS home indicator. */}
      {isSelecting && selectedIds.size > 0 && (
        <div
          className="zivo-pb-safe-action fixed inset-x-0 bottom-0 z-20 bg-background/95 backdrop-blur border-t border-border/40 px-4 py-3 flex items-center gap-2"
        >
          <button type="button"
            onClick={handleBulkDismiss}
            className="flex-1 h-11 rounded-full bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <X className="h-4 w-4" />
            Dismiss {selectedIds.size}
          </button>
          <button type="button"
            onClick={handleBulkBlock}
            className="flex-1 h-11 rounded-full bg-destructive text-destructive-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Ban className="h-4 w-4" />
            Block {selectedIds.size}
          </button>
        </div>
      )}

      <ProfilePreviewSheet
        userId={previewUserId}
        onClose={() => setPreviewUserId(null)}
        onAdded={() => {
          setPreviewUserId(null);
          invalidate();
        }}
        onBlocked={() => {
          setPreviewUserId(null);
          invalidate();
        }}
      />
    </div>
  );
}
