/**
 * MessageRequestsPage — Facebook/Messenger-style message requests inbox.
 *
 * Lists chats from senders who aren't in the user's contacts AND whom the
 * user has never replied to. Each row offers Accept (add to contacts +
 * open chat), Delete (dismiss locally — neither accept nor block), and
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

export default function MessageRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat");
  const queryClient = useQueryClient();
  const { add: addContact } = useContacts();
  const { allow: allowMessageRequests, setValue: setAllowMessageRequests } = useAllowMessageRequests();

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

  const { data: requests = [], isLoading } = useQuery<MessageRequest[]>({
    queryKey: ["message-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: msgs } = await (supabase as any)
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!msgs?.length) return [];

      const grouped = new Map<string, { lastMsg: any; unread: number; iHaveSent: boolean }>();
      for (const msg of msgs as any[]) {
        const otherId = msg.sender_id === user!.id ? msg.receiver_id : msg.sender_id;
        if (!grouped.has(otherId)) {
          grouped.set(otherId, { lastMsg: msg, unread: 0, iHaveSent: false });
        }
        const entry = grouped.get(otherId)!;
        if (msg.sender_id === user!.id) entry.iHaveSent = true;
        if (msg.receiver_id === user!.id && !msg.is_read) entry.unread += 1;
      }

      const otherIds = Array.from(grouped.keys());
      if (!otherIds.length) return [];

      const [{ data: contactsRows }, { data: profiles }, { data: blocks }] = await Promise.all([
        (supabase as any).from("user_contacts").select("contact_user_id").eq("owner_id", user!.id),
        supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", otherIds),
        (supabase as any).from("blocked_users").select("blocked_id").eq("blocker_id", user!.id),
      ]);
      const contactSet = new Set<string>(((contactsRows || []) as any[]).map((c) => c.contact_user_id));
      const blockedSet = new Set<string>(((blocks || []) as any[]).map((b) => b.blocked_id));
      const profMap = new Map<string, any>();
      for (const p of (profiles || []) as any[]) profMap.set(p.user_id, p);

      const out: MessageRequest[] = [];
      for (const otherId of otherIds) {
        const e = grouped.get(otherId)!;
        if (contactSet.has(otherId) || e.iHaveSent || blockedSet.has(otherId)) continue;
        const p = profMap.get(otherId);
        out.push({
          otherUserId: otherId,
          name: p?.full_name || "User",
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
      return out;
    },
  });

  // Active = senders not in the dismissed Set. Dismissed = the recovery view
  // showing exactly the senders the user soft-deleted, so they can restore.
  // A new message from a dismissed sender refetches and re-enters the list —
  // that's intentional: dismissing isn't permanent like blocking.
  const activeRequests = useMemo(
    () => requests.filter((r) => !dismissed.has(r.otherUserId)),
    [requests, dismissed]
  );
  const dismissedRequests = useMemo(
    () => requests.filter((r) => dismissed.has(r.otherUserId)),
    [requests, dismissed]
  );
  const visibleRequests = view === "active" ? activeRequests : dismissedRequests;

  // If all dismissed entries get restored (or expire from data), flip back to
  // the active view so the user isn't stuck staring at an empty Dismissed tab.
  useEffect(() => {
    if (view === "dismissed" && dismissedRequests.length === 0) setView("active");
  }, [view, dismissedRequests.length]);
  const totalUnread = useMemo(
    () => activeRequests.reduce((s, r) => s + r.unread, 0),
    [activeRequests]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["message-requests", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["chat-hub-personal", user?.id] });
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user || totalUnread === 0) return;
    const senderIds = visibleRequests.filter((r) => r.unread > 0).map((r) => r.otherUserId);
    if (!senderIds.length) return;
    const { error } = await (supabase as any)
      .from("direct_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("receiver_id", user.id)
      .in("sender_id", senderIds)
      .eq("is_read", false);
    if (error) {
      toast.error("Couldn't mark as read");
      return;
    }
    invalidate();
  }, [user, totalUnread, visibleRequests]);

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
    const { error } = await (supabase as any)
      .from("blocked_users")
      .insert({ blocker_id: user.id, blocked_id: r.otherUserId });
    if (error) {
      toast.error("Couldn't block user");
      return;
    }
    toast.success(`${r.name} blocked`);
    invalidate();
  };

  // Bulk actions — Block all selected, Delete (dismiss) all selected. Both
  // exit select mode after running so the UI returns to normal state.
  const handleBulkBlock = useCallback(async () => {
    if (!user || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const rows = ids.map((id) => ({ blocker_id: user.id, blocked_id: id }));
    const { error } = await (supabase as any).from("blocked_users").insert(rows);
    if (error) {
      toast.error("Couldn't block selected");
      return;
    }
    toast.success(`${ids.length} blocked`);
    invalidate();
    exitSelectMode();
  }, [user, selectedIds, exitSelectMode]);

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header
        className="zivo-pt-safe-sticky flex items-center gap-3 px-4 h-14 border-b border-border/30 sticky top-0 bg-background/95 backdrop-blur z-10"
      >
        {selectMode ? (
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
              {totalUnread > 0 && (
                <p className="text-[11px] text-muted-foreground">{totalUnread} unread</p>
              )}
            </div>
            {totalUnread > 0 && (
              <button type="button"
                onClick={handleMarkAllRead}
                className="text-[12px] font-semibold text-primary flex items-center gap-1 px-2 py-1 rounded-full hover:bg-muted/50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </>
        )}
      </header>

      {/* Active / Dismissed tabs — only visible when not in select mode and
          there's at least one dismissed entry to recover. */}
      {!selectMode && dismissedRequests.length > 0 && (
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
                    ? "bg-primary text-primary-foreground"
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
        {selectMode
          ? "Tap rows to select. Block all stops them; Delete all just dismisses."
          : view === "dismissed"
            ? "Requests you dismissed. Restore to bring them back to the active list."
            : "These messages are from people who aren't in your contacts. Long-press a row to select multiple."}
      </div>

      {/* Privacy quick-toggle — when off, the chat hub hides this row entirely
          and incoming non-contact DMs no longer surface as requests. Mirrors
          Privacy Settings → "Message requests" but right where the user is. */}
      {!selectMode && (
        <div className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">Allow message requests</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {allowMessageRequests
                ? "People not in your contacts can reach you here."
                : "Off — the requests row is hidden from your inbox."}
            </p>
          </div>
          <button type="button"
            aria-label="Allow message requests"
            title="Allow message requests"
            onClick={() => {
              const next = !allowMessageRequests;
              void setAllowMessageRequests(next);
              toast.success(
                next ? "Message requests allowed" : "Message requests blocked"
              );
            }}
            className={cn(
              "shrink-0 relative h-7 w-12 rounded-full transition-colors",
              allowMessageRequests ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform",
                allowMessageRequests ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      )}

      <div className={cn("flex-1 overflow-y-auto px-3 space-y-2", selectMode ? "pb-28" : "pb-8")}>
        {isLoading && (
          <p className="text-center text-sm text-muted-foreground py-12">Loading…</p>
        )}
        {!isLoading && visibleRequests.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mx-auto opacity-30 mb-2" />
            <p className="text-sm">
              {view === "dismissed" ? "Nothing dismissed." : "No message requests."}
            </p>
          </div>
        )}
        {visibleRequests.map((r) => {
          const isSelected = selectedIds.has(r.otherUserId);
          return (
            <div
              key={r.otherUserId}
              tabIndex={selectMode ? 0 : undefined}
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
                if (selectMode) toggleSelected(r.otherUserId);
              }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border transition-colors",
                isSelected
                  ? "bg-primary/10 border-primary/50"
                  : "bg-card border-border/30"
              )}
            >
              {selectMode ? (
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
                  if (selectMode) {
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
                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {r.unread > 9 ? "9+" : r.unread}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{r.lastMessage}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  {formatDistanceToNow(new Date(r.lastTime), { addSuffix: true })}
                </p>
              </button>
              {!selectMode && view === "active" && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); handleAccept(r); }}
                    aria-label={`Accept ${r.name}`}
                    className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); handleDismiss(r); }}
                    aria-label={`Delete ${r.name}'s request`}
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
              {!selectMode && view === "dismissed" && (
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
      {selectMode && selectedIds.size > 0 && (
        <div
          className="zivo-pb-safe-action fixed inset-x-0 bottom-0 z-20 bg-background/95 backdrop-blur border-t border-border/40 px-4 py-3 flex items-center gap-2"
        >
          <button type="button"
            onClick={handleBulkDismiss}
            className="flex-1 h-11 rounded-full bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <X className="h-4 w-4" />
            Delete {selectedIds.size}
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
