/**
 * IncomingCallListener — Global listener for incoming WebRTC calls
 * Shows a banner when another user calls, allowing accept/decline
 * Plays a ringtone sound while ringing
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BellRing, Lock, MessageCircle, Phone, PhoneOff, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import CallScreen from "./CallScreen";
import CallPiP from "./CallPiP";
import { playIncomingRingtone, primeCallAudio, registerCallAudioUnlock } from "@/lib/callAudio";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { toast } from "sonner";

interface IncomingCall {
  id: string;
  caller_id: string;
  call_type: "voice" | "video";
  caller_name: string;
  caller_avatar: string | null;
}

interface IncomingCallPushDetail {
  call_id?: string;
  caller_id?: string;
  call_type?: "voice" | "video";
  caller_name?: string;
  caller_avatar?: string;
}

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
};

type CallSignalStatus = "ringing" | "answered" | "declined" | "missed" | "ended";

type CallSignalRow = {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: "voice" | "video";
  status: CallSignalStatus;
  created_at?: string;
};

type CallStatusRow = {
  status: CallSignalStatus;
};

type RealtimePayload<T> = {
  new: T;
};

const dbFrom = (table: string): any => (supabase as any).from(table);

export default function IncomingCallListener() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [answeredCall, setAnsweredCall] = useState<IncomingCall | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [pipMode, setPipMode] = useState(false);
  const [pipData, setPipData] = useState<{ remoteStream: MediaStream | null; duration: number; isMuted: boolean; callType: "voice" | "video"; isCameraOff: boolean } | null>(null);
  const [pipControls, setPipControls] = useState<{ toggleMute: () => void; endCall: () => void; toggleCamera: () => void } | null>(null);
  const lastIncomingCallIdRef = useRef<string | null>(null);
  const originalTitleRef = useRef<string>(typeof document !== "undefined" ? document.title : "Zivo");
  const titleFlashTimerRef = useRef<number | null>(null);
  const browserCallNotificationRef = useRef<Notification | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission;
  });

  const mapIncomingCall = useCallback(async (call: { id: string; caller_id: string; call_type: "voice" | "video" }) => {
    const { data } = await dbFrom("profiles")
      .select("full_name, avatar_url")
      .or(`id.eq.${call.caller_id},user_id.eq.${call.caller_id}`)
      .limit(1)
      .maybeSingle();
    const profile = data as ProfileRow | null;

    return {
      id: call.id,
      caller_id: call.caller_id,
      call_type: call.call_type,
      caller_name: profile?.full_name || "Unknown",
      caller_avatar: profile?.avatar_url || null,
    } as IncomingCall;
  }, []);

  const hydratePendingIncomingCall = useCallback(async (preferredCallId?: string) => {
    if (!user?.id || incoming || answeredCall) return;

    let pendingCall: Pick<CallSignalRow, "id" | "caller_id" | "call_type"> | null = null;

    if (preferredCallId) {
      const { data } = await dbFrom("call_signals")
        .select("id, caller_id, call_type, status")
        .eq("id", preferredCallId)
        .eq("callee_id", user.id)
        .maybeSingle();
      const preferredCall = data as Pick<CallSignalRow, "id" | "caller_id" | "call_type" | "status"> | null;

      if (preferredCall?.status === "ringing") {
        pendingCall = preferredCall;
      }
    }

    if (!pendingCall) {
      const nowIso = new Date().toISOString();
      const freshWindowStart = new Date(Date.now() - 90 * 1000).toISOString();

      // Cleanup stale local ringing records first so hydration cannot pick
      // an outdated call ID when a newer call is ringing.
      await dbFrom("call_signals")
        .update({ status: "missed", ended_at: nowIso })
        .eq("callee_id", user.id)
        .eq("status", "ringing")
        .lt("created_at", freshWindowStart);

      const { data } = await dbFrom("call_signals")
        .select("id, caller_id, call_type, created_at")
        .eq("callee_id", user.id)
        .eq("status", "ringing")
        .gte("created_at", freshWindowStart)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const recentCall = data as Pick<CallSignalRow, "id" | "caller_id" | "call_type"> | null;

      pendingCall = recentCall || null;
    }

    if (!pendingCall?.id) return;
    const mapped = await mapIncomingCall(pendingCall);
    setIncoming(mapped);
  }, [answeredCall, incoming, mapIncomingCall, user?.id]);

  useEffect(() => registerCallAudioUnlock(), []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }

    setNotificationPermission(Notification.permission);
  }, []);

  const closeBrowserCallNotification = useCallback(() => {
    browserCallNotificationRef.current?.close();
    browserCallNotificationRef.current = null;
  }, []);

  const showBrowserCallNotification = useCallback((call: IncomingCall) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    closeBrowserCallNotification();

    try {
      const notification = new Notification(`${call.caller_name}`, {
        body: `${call.call_type === "video" ? "Video" : "Voice"} calling you on ZIVO`,
        icon: call.caller_avatar || "/pwa-icons/icon-192x192.png",
        badge: "/pwa-icons/icon-192x192.png",
        tag: `incoming-call-${call.id}`,
        renotify: true,
        silent: false,
        requireInteraction: true,
        vibrate: [260, 120, 260, 640, 260],
        data: {
          type: "incoming_call",
          call_id: call.id,
          caller_id: call.caller_id,
          sender_id: call.caller_id,
          call_type: call.call_type,
        },
      } as NotificationOptions);

      notification.onclick = () => {
        window.focus();
        notification.close();
        window.dispatchEvent(new CustomEvent("incoming-call-push", {
          detail: {
            call_id: call.id,
            caller_id: call.caller_id,
            call_type: call.call_type,
            caller_name: call.caller_name,
            caller_avatar: call.caller_avatar || undefined,
          },
        }));
      };

      browserCallNotificationRef.current = notification;
      window.setTimeout(() => {
        if (browserCallNotificationRef.current === notification) {
          closeBrowserCallNotification();
        }
      }, 45_000);
    } catch {
      // Browser notification APIs may be unavailable inside some embedded views.
    }
  }, [closeBrowserCallNotification]);

  const handleEnableCallAlerts = useCallback(async () => {
    try {
      await primeCallAudio();
    } catch {
      // Audio unlock is best effort; permission is the important part here.
    }

    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      toast.info("System call alerts are not available in this browser");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      window.dispatchEvent(new Event("zivo-register-push"));
      if (incoming) showBrowserCallNotification(incoming);
      toast.success("Call alerts are on", {
        description: "ZIVO can ring on screen and from the lock screen when the app is installed.",
      });
    } else {
      toast.info("Call alerts are still off", {
        description: "Enable notifications in browser settings to receive lock-screen calls.",
      });
    }
  }, [incoming, showBrowserCallNotification]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pendingIncomingCallPush");
      if (!raw) return;

      sessionStorage.removeItem("pendingIncomingCallPush");
      const parsed = JSON.parse(raw) as IncomingCallPushDetail & { ts?: number };

      if (!parsed || typeof parsed !== "object") return;

      // Ignore stale pending payloads.
      if (parsed.ts && Date.now() - parsed.ts > 90_000) return;

      window.dispatchEvent(new CustomEvent("incoming-call-push", {
        detail: {
          call_id: parsed.call_id,
          caller_id: parsed.caller_id,
          call_type: parsed.call_type,
          caller_name: parsed.caller_name,
          caller_avatar: parsed.caller_avatar,
        },
      }));
    } catch {
      sessionStorage.removeItem("pendingIncomingCallPush");
    }
  }, []);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const linkedCallId = params.get("incomingCall") || params.get("call_id");
    if (!linkedCallId) return;

    void hydratePendingIncomingCall(linkedCallId);
  }, [hydratePendingIncomingCall, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const onSignal = async (payload: RealtimePayload<CallSignalRow>) => {
      const call = payload.new;
      if (!call || call.status !== "ringing") return;

      if (answeredCall) {
        // If this update belongs to the active call we already accepted,
        // ignore it instead of force-declining the same call.
        if (answeredCall.id === call.id) {
          return;
        }

        await dbFrom("call_signals")
          .update({ status: "declined", ended_at: new Date().toISOString() })
          .eq("id", call.id)
          .eq("status", "ringing");
        return;
      }

      const mapped = await mapIncomingCall(call);
      setIncoming(mapped);
    };

    const channel = supabase
      .channel(`incoming-calls-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "call_signals",
        filter: `callee_id=eq.${user.id}`,
      }, onSignal)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "call_signals",
        filter: `callee_id=eq.${user.id}`,
      }, onSignal)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [answeredCall, mapIncomingCall, user?.id]);

  useEffect(() => {
    void hydratePendingIncomingCall();
  }, [hydratePendingIncomingCall]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void hydratePendingIncomingCall();
      }
    };

    const onFocus = () => {
      void hydratePendingIncomingCall();
    };

    const onOnline = () => {
      void hydratePendingIncomingCall();
    };

    const onPageShow = () => {
      void hydratePendingIncomingCall();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [hydratePendingIncomingCall]);

  // Realtime is the primary delivery channel; this poll is just a safety
  // fallback for missed websocket events. 30s + skip-when-hidden cuts ~720
  // requests/hour per logged-in user (was 4s = ~900/hr) and stops draining
  // mobile battery / Postgres CPU during idle tabs.
  useEffect(() => {
    if (!user?.id) return;
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void hydratePendingIncomingCall();
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [hydratePendingIncomingCall, user?.id]);

  useEffect(() => {
    const onIncomingCallPush = (event: Event) => {
      const customEvent = event as CustomEvent<IncomingCallPushDetail>;
      const detail = customEvent.detail || {};
      const pushedCallId = detail.call_id || null;

      if (pushedCallId && lastIncomingCallIdRef.current === pushedCallId) return;

      if (pushedCallId && detail.caller_id && detail.call_type) {
        lastIncomingCallIdRef.current = pushedCallId;
        setIncoming((prev) => {
          if (prev?.id === pushedCallId) return prev;
          return {
            id: pushedCallId,
            caller_id: detail.caller_id!,
            call_type: detail.call_type!,
            caller_name: detail.caller_name || "Incoming call",
            caller_avatar: detail.caller_avatar || null,
          };
        });
      }

      void hydratePendingIncomingCall(pushedCallId || undefined);
    };

    window.addEventListener("incoming-call-push", onIncomingCallPush as EventListener);
    return () => {
      window.removeEventListener("incoming-call-push", onIncomingCallPush as EventListener);
    };
  }, [hydratePendingIncomingCall]);

  useEffect(() => {
    if (!incoming) return;
    const stopRing = playIncomingRingtone();
    showBrowserCallNotification(incoming);
    return () => {
      stopRing();
      closeBrowserCallNotification();
    };
  }, [closeBrowserCallNotification, incoming, showBrowserCallNotification]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!incoming) {
      if (titleFlashTimerRef.current) {
        clearInterval(titleFlashTimerRef.current);
        titleFlashTimerRef.current = null;
      }
      document.title = originalTitleRef.current;
      return;
    }

    originalTitleRef.current = document.title;
    let toggle = false;

    const applyTitle = () => {
      document.title = toggle
        ? `${incoming.call_type === "video" ? "Video" : "Voice"} call from ${incoming.caller_name}`
        : `Incoming ${incoming.call_type} call`;
      toggle = !toggle;
    };

    applyTitle();
    titleFlashTimerRef.current = window.setInterval(applyTitle, 1200);

    return () => {
      if (titleFlashTimerRef.current) {
        clearInterval(titleFlashTimerRef.current);
        titleFlashTimerRef.current = null;
      }
      document.title = originalTitleRef.current;
    };
  }, [closeBrowserCallNotification, incoming]);

  useEffect(() => {
    if (!incoming || Capacitor.isNativePlatform() || typeof navigator === "undefined" || !("vibrate" in navigator)) return;

    navigator.vibrate?.([250, 150, 250, 900]);
    const intervalId = window.setInterval(() => {
      navigator.vibrate?.([250, 150, 250, 900]);
    }, 2200);

    return () => {
      window.clearInterval(intervalId);
      navigator.vibrate?.(0);
    };
  }, [closeBrowserCallNotification, incoming]);

  useEffect(() => {
    if (!incoming || !Capacitor.isNativePlatform()) return;

    const intervalId = window.setInterval(() => {
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, [incoming]);

  useEffect(() => {
    if (!incoming) return;

    // Auto-mark unanswered calls as missed after 45 seconds.
    const timeout = window.setTimeout(() => {
      (async () => {
        await dbFrom("call_signals")
          .update({ status: "missed", ended_at: new Date().toISOString() })
          .eq("id", incoming.id)
          .eq("status", "ringing");
        closeBrowserCallNotification();
        setIncoming(null);
      })();
    }, 45000);

    return () => window.clearTimeout(timeout);
  }, [closeBrowserCallNotification, incoming]);

  useEffect(() => {
    if (!incoming) return;

    const channel = supabase
      .channel(`incoming-status-${incoming.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "call_signals",
        filter: `id=eq.${incoming.id}`,
      }, (payload: RealtimePayload<CallStatusRow>) => {
        const data = payload.new;
        if (data.status === "ended" || data.status === "declined") {
          closeBrowserCallNotification();
          setIncoming(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [closeBrowserCallNotification, incoming]);

  const handleAccept = useCallback(async () => {
    if (!incoming || isAccepting) return;
    setIsAccepting(true);

    try {
      await primeCallAudio();
    } catch {
      // Continue anyway. Audio unlock failure should not block call accept.
    }

    const { error: updateError } = await dbFrom("call_signals")
      .update({ status: "answered" })
      .eq("id", incoming.id)
      .eq("callee_id", user?.id)
      .in("status", ["ringing", "answered"]);

    if (updateError) {
      console.error("[Call] Failed to accept incoming call:", updateError);
      toast.error("Could not answer call", { description: "Please try again." });
      setIsAccepting(false);
      return;
    }

    let confirmedStatus: string | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { data } = await dbFrom("call_signals")
        .select("status")
        .eq("id", incoming.id)
        .eq("callee_id", user?.id)
        .maybeSingle();
      const statusCheck = data as CallStatusRow | null;

      const nextStatus = statusCheck?.status ?? null;
      if (nextStatus === "answered") {
        confirmedStatus = nextStatus;
        break;
      }

      if (nextStatus === "declined" || nextStatus === "missed" || nextStatus === "ended") {
        confirmedStatus = nextStatus;
        break;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 220));
    }

    if (confirmedStatus === "answered") {
      lastIncomingCallIdRef.current = incoming.id;
      setAnsweredCall(incoming);
      closeBrowserCallNotification();
      setIncoming(null);
      setIsAccepting(false);
      return;
    }

    if (confirmedStatus === "declined" || confirmedStatus === "missed" || confirmedStatus === "ended") {
      setIncoming(null);
      closeBrowserCallNotification();
      setIsAccepting(false);
      return;
    }

    toast.error("Call answer did not sync", {
      description: "Please answer again. Network may be unstable.",
    });
    setIsAccepting(false);
  }, [closeBrowserCallNotification, incoming, isAccepting, user?.id]);

  const handleDecline = useCallback(async () => {
    if (!incoming) return;
    await dbFrom("call_signals")
      .update({ status: "declined", ended_at: new Date().toISOString() })
      .eq("id", incoming.id);
    closeBrowserCallNotification();
    setIncoming(null);
  }, [closeBrowserCallNotification, incoming]);

  const handleMessageCaller = useCallback(() => {
    if (!incoming) return;
    try {
      sessionStorage.setItem("pendingChatWith", incoming.caller_id);
    } catch {
      // Ignore storage errors; the URL still opens the chat.
    }
    window.location.href = `/chat?with=${encodeURIComponent(incoming.caller_id)}`;
  }, [incoming]);

  const handleCallEnd = useCallback(() => {
    setAnsweredCall(null);
    setPipMode(false);
    setPipData(null);
    setPipControls(null);
  }, []);

  const initials = incoming
    ? (incoming.caller_name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "";

  const incomingOverlay = (
    <AnimatePresence>
      {incoming && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-xl flex items-end sm:items-center justify-center px-4 pb-[max(calc(var(--zivo-safe-bottom,0px)+1rem),1rem)] sm:pb-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/25 bg-background/96 p-5 shadow-2xl"
            initial={{ y: 28, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 24, scale: 0.96 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/12 via-transparent to-transparent pointer-events-none" />

            <div className="relative flex flex-col items-center text-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                <BellRing className="h-3.5 w-3.5 text-primary" />
                <span>Ringing now</span>
              </div>

              <div className="relative">
                <motion.div
                  className="absolute -inset-4 rounded-full border-2 border-primary/25"
                  animate={{ scale: [1, 1.28, 1], opacity: [0.75, 0.15, 0.75] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute -inset-8 rounded-full border border-primary/15"
                  animate={{ scale: [1, 1.22, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.25, ease: "easeInOut" }}
                />
                <Avatar className="h-20 w-20 border-2 border-primary/30 shadow-md">
                  <AvatarImage src={incoming.caller_avatar || undefined} />
                  <AvatarFallback className="text-xl font-bold bg-muted text-muted-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div>
                <p className="text-2xl font-bold text-foreground leading-tight">
                  {incoming.caller_name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Incoming {incoming.call_type} call
                </p>
              </div>

              <div className="grid w-full grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleMessageCaller}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-muted/70 text-xs font-semibold text-foreground active:scale-[0.98] transition-transform"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </button>
                {notificationPermission === "granted" ? (
                  <div className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <Lock className="h-4 w-4" />
                    Alerts on
                  </div>
                ) : notificationPermission === "unsupported" ? (
                  <div className="flex h-11 items-center justify-center rounded-2xl bg-muted/70 px-2 text-xs font-semibold text-muted-foreground">
                    In-app only
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnableCallAlerts}
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary/10 px-2 text-xs font-semibold text-primary active:scale-[0.98] transition-transform"
                  >
                    <Lock className="h-4 w-4" />
                    Lock alerts
                  </button>
                )}
              </div>

              <div className="w-full mt-2 flex items-center justify-center gap-8">
                <button type="button"
                  onClick={handleDecline}
                  aria-label="Decline incoming call"
                  title="Decline"
                  className="h-16 w-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-destructive/25"
                >
                  <PhoneOff className="h-7 w-7" />
                </button>
                <button type="button"
                  onClick={handleAccept}
                  disabled={isAccepting}
                  aria-label="Accept incoming call"
                  title="Accept"
                  className="h-16 w-16 rounded-full bg-green-500 text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-green-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {incoming.call_type === "video" ? (
                    <Video className="h-7 w-7" />
                  ) : (
                    <Phone className="h-7 w-7" />
                  )}
                </button>
              </div>

              <div className="w-full flex items-center justify-between px-2 text-xs font-medium text-muted-foreground">
                <span>Decline</span>
                <span>Answer</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const activeCallOverlay = (
    <AnimatePresence>
      {answeredCall && (
        <CallScreen
          recipientName={answeredCall.caller_name}
          recipientAvatar={answeredCall.caller_avatar}
          recipientId={answeredCall.caller_id}
          callType={answeredCall.call_type}
          existingCallId={answeredCall.id}
          minimized={pipMode}
          onEnd={handleCallEnd}
          onMinimize={(data) => {
            setPipData(data);
            setPipMode(true);
          }}
          onPipStateChange={(data) => {
            setPipData(data);
          }}
          onPipControlsChange={(controls) => {
            setPipControls(controls);
          }}
        />
      )}
    </AnimatePresence>
  );

  const pipOverlay = (
    <AnimatePresence>
      {answeredCall && pipMode && (
        <CallPiP
          remoteStream={pipData?.remoteStream || null}
          recipientName={answeredCall.caller_name}
          recipientAvatar={answeredCall.caller_avatar}
          isMuted={pipData?.isMuted || false}
          duration={pipData?.duration || 0}
          callType={pipData?.callType || answeredCall.call_type}
          isCameraOff={pipData?.isCameraOff}
          onExpand={() => setPipMode(false)}
          onEndCall={() => {
            if (pipControls) {
              pipControls.endCall();
              return;
            }

            handleCallEnd();
          }}
          onToggleMute={() => {
            pipControls?.toggleMute();
          }}
          onToggleCamera={() => {
            if ((pipData?.callType || answeredCall.call_type) === "video") {
              pipControls?.toggleCamera();
            }
          }}
        />
      )}
    </AnimatePresence>
  );

  if (!portalRoot) {
    return (
      <>
        {incomingOverlay}
        {activeCallOverlay}
        {pipOverlay}
      </>
    );
  }

  return (
    <>
      {createPortal(incomingOverlay, portalRoot)}
      {createPortal(activeCallOverlay, portalRoot)}
      {createPortal(pipOverlay, portalRoot)}
    </>
  );
}
