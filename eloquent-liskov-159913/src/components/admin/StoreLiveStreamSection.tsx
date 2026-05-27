/**
 * StoreLiveStreamSection — Live streaming hub for store owners.
 * Shows stream stats and a "Go Live" entry point that opens /go-live in a new tab.
 */
import { useState, lazy, Suspense, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Radio, Eye, Heart, Gift, Play, Video, X, Maximize2, QrCode, Smartphone, Copy, Check, ShieldCheck, Loader2, RefreshCw } from "lucide-react";
import { createPairSession, revokePairSession } from "@/lib/livePairing";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const GoLivePage = lazy(() => import("@/pages/GoLivePage"));
const PairedStreamViewer = lazy(() => import("@/components/live/PairedStreamViewer"));
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Props {
  storeId: string;
  storeName?: string;
}

interface StreamRow {
  id: string;
  title: string | null;
  status: string | null;
  viewer_count: number | null;
  like_count: number | null;
  gifts_received: number | null;
  started_at: string | null;
  ended_at: string | null;
  thumbnail_url: string | null;
}

export default function StoreLiveStreamSection({ storeId, storeName }: Props) {
  const navigate = useNavigate();
  const [showLivePanel, setShowLivePanel] = useState(false);
  // Once the studio has been opened, keep it mounted so hiding the panel
  // does NOT end an in-progress live stream.
  const [studioMounted, setStudioMounted] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  // Pairing state — token is generated when dialog opens; status flips to "confirmed" via realtime
  const [pairToken, setPairToken] = useState<string | null>(null);
  const [pairSessionId, setPairSessionId] = useState<string | null>(null);
  const [pairExpiresAt, setPairExpiresAt] = useState<string | null>(null);
  const [pairStatus, setPairStatus] = useState<"idle" | "loading" | "pending" | "confirmed" | "expired" | "error">("idle");
  const [pairPhoneUA, setPairPhoneUA] = useState<string | null>(null);
  const [pairError, setPairError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const queryClient = useQueryClient();
  const hadLiveStreamRef = useRef(false);

  const goLiveUrl = pairToken
    ? (typeof window !== "undefined" ? `${window.location.origin}/pair/${pairToken}` : `/pair/${pairToken}`)
    : (typeof window !== "undefined" ? `${window.location.origin}/go-live` : "/go-live");

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(goLiveUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); toast.success("Link copied"); } catch { toast.error("Copy failed"); }
  };
  const openStudio = () => { setStudioMounted(true); setShowLivePanel(true); };

  const hasActivePhoneSession = !!pairSessionId && (pairStatus === "pending" || pairStatus === "confirmed");

  // Generate a pairing session only when there isn't already an active paired/live session
  const startPairing = async () => {
    setPairStatus("loading");
    setPairError(null);
    setPairPhoneUA(null);
    try {
      const { session_id, token, expires_at } = await createPairSession(storeId);
      setPairToken(token);
      setPairSessionId(session_id);
      setPairExpiresAt(expires_at);
      setPairStatus("pending");
    } catch (e: any) {
      setPairError(e?.message ?? "Couldn't start pairing");
      setPairStatus("error");
    }
  };

  const refreshPairing = async () => {
    if (pairToken && hasActivePhoneSession) {
      try {
        await revokePairSession(pairToken);
      } catch (e) {
        console.warn("[StoreLiveStreamSection] revoke previous pair failed", e);
      }
    }
    await startPairing();
  };

  // Keep the current paired/live session stable; only mint a new QR when there
  // is no active pair yet.
  useEffect(() => {
    if (showQrDialog && !hasActivePhoneSession && !pairToken) {
      startPairing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQrDialog, hasActivePhoneSession, pairToken]);

  // Realtime: watch this specific session for status flip → "confirmed"
  useEffect(() => {
    if (!pairSessionId) return;
    const ch = supabase
      .channel(`pair-${pairSessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_pair_sessions", filter: `id=eq.${pairSessionId}` },
        (payload: any) => {
          const next = payload?.new;
          if (!next) return;
          if (next.status === "confirmed") {
            setPairStatus("confirmed");
            setPairPhoneUA(next.phone_user_agent ?? null);
            // Auto-open the studio so the user immediately sees the phone's feed
            setStudioMounted(true);
            setShowLivePanel(true);
          } else if (next.status === "expired" || next.status === "cancelled") {
            setPairStatus("expired");
            setPairSessionId(null);
            setPairToken(null);
            setPairPhoneUA(null);
          }
        },
      )
      .subscribe();
    channelRef.current = ch;
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [pairSessionId]);

  // Always-on watcher: ANY pair session for this store flipping to confirmed
  // (covers cross-tab pairings or when the dialog has been closed).
  useEffect(() => {
    if (!storeId) return;
    const ch = supabase
      .channel(`store-pair-${storeId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_pair_sessions", filter: `store_id=eq.${storeId}` },
        (payload: any) => {
          const next = payload?.new;
          if (next?.status === "confirmed") {
            setPairStatus("confirmed");
            setPairSessionId(next.id);
            setPairPhoneUA(next.phone_user_agent ?? null);
            setStudioMounted(true);
            setShowLivePanel(true);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_pair_sessions", filter: `store_id=eq.${storeId}` },
        (payload: any) => {
          const next = payload?.new;
          if (next?.status === "confirmed") {
            setPairStatus("confirmed");
            setPairSessionId(next.id);
            setStudioMounted(true);
            setShowLivePanel(true);
          }
        },
      )
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [storeId]);

  // Auto-expire on TTL
  useEffect(() => {
    if (!pairExpiresAt || pairStatus !== "pending") return;
    const ms = new Date(pairExpiresAt).getTime() - Date.now();
    if (ms <= 0) { setPairStatus("expired"); return; }
    const t = setTimeout(() => setPairStatus("expired"), ms);
    return () => clearTimeout(t);
  }, [pairExpiresAt, pairStatus]);

  const { data: storeMeta } = useQuery({
    queryKey: ["store-live-stream-owner", storeId],
    queryFn: async (): Promise<{ owner_id: string | null; avatar_url: string | null; name: string | null }> => {
      const { data, error } = await supabase
        .from("store_profiles")
        .select("owner_id, logo_url, name")
        .eq("id", storeId)
        .maybeSingle();
      if (error) {
        console.warn("[StoreLiveStreamSection] owner fetch error", error);
        return { owner_id: null, avatar_url: null, name: null };
      }
      return {
        owner_id: (data as any)?.owner_id ?? null,
        avatar_url: (data as any)?.logo_url ?? null,
        name: (data as any)?.name ?? null,
      };
    },
  });
  const storeOwnerId = storeMeta?.owner_id ?? null;

  // On mount: only restore a confirmed pairing if the store is actively live.
  // This prevents stale confirmed sessions from showing "Phone paired" before
  // anyone scans a fresh QR in a new live cycle.
  useEffect(() => {
    if (!storeId || !storeOwnerId) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ data: pairData, error: pairError }, { data: liveData, error: liveError }] = await Promise.all([
          (supabase as any).rpc("get_active_pair_session_for_store", { p_store_id: storeId }),
          (supabase as any)
            .from("live_streams")
            .select("id")
            .eq("user_id", storeOwnerId)
            .eq("status", "live")
            .is("ended_at", null)
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        if (cancelled) return;
        if (pairError) {
          console.error("[StoreLiveStreamSection] get_active_pair_session_for_store RPC error:", pairError.message ?? pairError, pairError);
          return;
        }
        if (liveError) {
          console.error("[StoreLiveStreamSection] active live check error:", liveError.message ?? liveError, liveError);
          return;
        }
        const row = Array.isArray(pairData) ? pairData[0] : pairData;
        if (row?.session_id && liveData?.id) {
          setPairSessionId(row.session_id);
          setPairStatus("confirmed");
          setPairExpiresAt(row.device_expires_at ?? null);
          setStudioMounted(true);
          setShowLivePanel(true);
        } else {
          setPairStatus((prev) => (prev === "confirmed" ? "idle" : prev));
          setPairSessionId(null);
          setPairToken(null);
          setPairPhoneUA(null);
        }
      } catch (e) {
        console.error("[StoreLiveStreamSection] active pair check threw", e);
      }
    })();
    return () => { cancelled = true; };
  }, [storeId, storeOwnerId]);

  // Fallback auto-detect: if there's an active live_stream for this store owner,
  // treat it as confirmed and mount the viewer — and reset back to idle once
  // a previously-live phone has ended the stream.
  useEffect(() => {
    if (!storeOwnerId) return;
    let cancelled = false;

    const invalidateStreams = () => {
      queryClient.invalidateQueries({ queryKey: ["store-live-streams", storeId, storeOwnerId] });
    };

    const resetAfterLiveEnded = () => {
      if (!hadLiveStreamRef.current) return;
      setPairStatus((prev) => (prev === "confirmed" ? "idle" : prev));
      setPairSessionId(null);
        setPairToken(null);
      setPairPhoneUA(null);
    };

    const syncLiveState = async () => {
      // Auto-end any stream whose publisher hasn't pinged in >30s, so a
      // closed phone doesn't keep the desktop stuck in "live".
      try {
        await (supabase as any).rpc("expire_stale_live_streams_for_user", {
          p_user_id: storeOwnerId,
        });
      } catch (e) {
        console.warn("[StoreLiveStreamSection] expire stale streams failed", e);
      }
      const { data, error } = await (supabase as any)
        .from("live_streams")
        .select("id, status, ended_at")
        .eq("user_id", storeOwnerId)
        .eq("status", "live")
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[StoreLiveStreamSection] live_streams fallback error:", error.message ?? error);
        return;
      }
      invalidateStreams();
      if (data?.id) {
        hadLiveStreamRef.current = true;
        setPairStatus("confirmed");
        setStudioMounted(true);
        setShowLivePanel(true);
      } else {
        resetAfterLiveEnded();
      }
    };

    syncLiveState();

    // Re-check every 15s so a closed phone flips to "ended" within ~45s.
    const staleTimer = setInterval(syncLiveState, 15000);

    const ch = supabase
      .channel(`store-live-auto-${storeOwnerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_streams", filter: `user_id=eq.${storeOwnerId}` },
        (payload: any) => {
          invalidateStreams();
          if (payload.new?.status === "live" && !payload.new?.ended_at) {
            hadLiveStreamRef.current = true;
            setPairStatus("confirmed");
            setStudioMounted(true);
            setShowLivePanel(true);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_streams", filter: `user_id=eq.${storeOwnerId}` },
        (payload: any) => {
          invalidateStreams();
          if (payload.new?.status === "live" && !payload.new?.ended_at) {
            hadLiveStreamRef.current = true;
            setPairStatus("confirmed");
            setStudioMounted(true);
            setShowLivePanel(true);
            return;
          }
          if (payload.new?.ended_at || payload.new?.status === "ended" || payload.new?.status === "cancelled") {
            resetAfterLiveEnded();
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(staleTimer);
      try { supabase.removeChannel(ch); } catch {}
    };
  }, [queryClient, storeId, storeOwnerId]);
  const { data: streams, isLoading } = useQuery({
    queryKey: ["store-live-streams", storeId, storeOwnerId],
    queryFn: async (): Promise<StreamRow[]> => {
      const { data, error } = await (supabase as any)
        .from("live_streams")
        .select("id, title, status, viewer_count, like_count, gifts_received, started_at, ended_at")
        .eq("user_id", storeOwnerId)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) {
        console.warn("[StoreLiveStreamSection] fetch error", error);
        return [];
      }
      return (data ?? []) as StreamRow[];
    },
    enabled: !!storeId && !!storeOwnerId,
  });

  const liveNow = streams?.filter((s) => s.status === "live") ?? [];
  const activeLiveStreamId = liveNow[0]?.id ?? null;
  const past = streams?.filter((s) => s.status !== "live") ?? [];

  useEffect(() => {
    if (activeLiveStreamId) {
      hadLiveStreamRef.current = true;
      return;
    }
    if (hadLiveStreamRef.current) {
      setPairStatus((prev) => (prev === "confirmed" ? "idle" : prev));
      setPairSessionId(null);
      setPairToken(null);
      setPairPhoneUA(null);
    }
  }, [activeLiveStreamId]);

  const totalViews = streams?.reduce((sum, s) => sum + (s.viewer_count ?? 0), 0) ?? 0;
  const totalLikes = streams?.reduce((sum, s) => sum + (s.like_count ?? 0), 0) ?? 0;
  const totalGifts = streams?.reduce((sum, s) => sum + (s.gifts_received ?? 0), 0) ?? 0;
  const showPairedViewer = !!storeOwnerId && (pairStatus === "confirmed" || !!activeLiveStreamId);

  return (
    <div className={cn("flex gap-4 sm:gap-6", showLivePanel ? "flex-col lg:flex-row" : "flex-col")}>
      {/* Main column */}
      <div className={cn("space-y-4 sm:space-y-6 min-w-0", showLivePanel ? "flex-1" : "w-full")}>
        {/* Hero / Go Live */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-foreground">Live Streaming</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug">
                  Broadcast live to your customers — showcase products, host Q&amp;A, or run flash sales.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowQrDialog(true)}
                className="gap-2 h-12 sm:h-10 rounded-xl text-sm font-semibold touch-manipulation active:scale-[0.98]"
                title="Continue on phone"
              >
                <Smartphone className="w-4 h-4" />
                Continue on Phone
              </Button>
              <Button
                onClick={() => (showLivePanel ? setShowLivePanel(false) : openStudio())}
                className="gap-2 h-12 sm:h-10 rounded-xl text-sm font-semibold touch-manipulation active:scale-[0.98]"
              >
                <Video className="w-4 h-4" />
                {showLivePanel ? "Hide Studio" : studioMounted ? "Show Studio" : "Go Live Now"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className={cn("grid gap-2.5 sm:gap-3", showLivePanel ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4")}>
          <StatCard icon={Radio} label="Streams" value={streams?.length ?? 0} color="text-primary" />
          <StatCard icon={Eye} label="Total Views" value={totalViews} color="text-blue-500" />
          <StatCard icon={Heart} label="Total Likes" value={totalLikes} color="text-red-500" />
          <StatCard icon={Gift} label="Gifts Received" value={totalGifts} color="text-amber-500" />
        </div>

        {/* Live now */}
        {liveNow.length > 0 && (
          <Card>
            <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Now
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 sm:px-6 pb-4 sm:pb-6">
              {liveNow.map((s) => (
                <StreamRowCard key={s.id} stream={s} live />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Past streams */}
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-sm sm:text-base">Recent Streams</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
            ) : past.length === 0 ? (
              <div className="py-8 sm:py-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center">
                  <Play className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No streams yet for {storeName || "this store"}.</p>
                <p className="text-xs text-muted-foreground">Tap "Go Live Now" to start your first broadcast.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {past.map((s) => (
                  <StreamRowCard key={s.id} stream={s} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right-side docked phone studio — kept mounted once opened so hiding doesn't end the live stream */}
      {studioMounted && (
        <aside className={cn("w-full lg:w-[420px] shrink-0", !showLivePanel && "hidden")}>
          <div className="lg:sticky lg:top-20">
            <Card className="overflow-hidden border-primary/30">
              <CardHeader className="pb-3 px-4 pt-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Go Live Studio
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowQrDialog(true)}
                    title="Continue on phone"
                    className="h-8 w-8"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/go-live")}
                    title="Open full screen"
                    className="h-8 w-8"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowLivePanel(false)}
                    title="Hide (stream keeps running)"
                    className="h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-4">
                <div className="flex justify-center">
                  <div
                    className="relative w-full max-w-[400px] aspect-[9/19.5] rounded-[2.25rem] overflow-hidden border-[8px] border-foreground/85 bg-black shadow-2xl"
                    style={{ transform: "translateZ(0)", contain: "layout paint" }}
                  >
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full bg-foreground/85 z-20 pointer-events-none" />
                    <div className="absolute inset-0 overflow-hidden bg-background">
                      <Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading studio…</div>}>
                        <div className="w-full h-full" style={{ containerType: "size" }}>
                          {showPairedViewer ? (
                            <PairedStreamViewer
                              key={activeLiveStreamId ?? pairSessionId ?? "paired-stream-viewer"}
                              storeOwnerId={storeOwnerId}
                              storeName={storeMeta?.name ?? storeName ?? null}
                              storeAvatarUrl={storeMeta?.avatar_url ?? null}
                              streamIdHint={activeLiveStreamId}
                            />
                          ) : (
                            <GoLivePage />
                          )}
                        </div>
                      </Suspense>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Hiding keeps your stream running. Tap maximize for full screen.
                </p>
              </CardContent>
            </Card>
          </div>
        </aside>
      )}

      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-[360px] p-0 gap-0 overflow-hidden border-primary/30 rounded-2xl shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.35)]">
          {/* Hero header with decorative gradient */}
          <div className="relative pl-5 pr-12 pt-4 pb-3 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border-b border-primary/10 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-primary/15 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
            <div className="relative flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-md shadow-primary/30">
                <Smartphone className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-sm font-bold text-foreground leading-tight tracking-tight">Continue on your phone</DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                  {liveNow.length > 0 ? "You're live — take it mobile." : "Open the studio anywhere."}
                </DialogDescription>
              </div>
              {liveNow.length > 0 && (
                <div className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/40 px-1.5 py-0.5 shrink-0 shadow-sm">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-red-500" />
                  </span>
                  <span className="text-[9px] font-bold tracking-wider text-red-600 dark:text-red-400">LIVE</span>
                </div>
              )}
            </div>
          </div>

              {/* Body — swaps between QR (pending) and Confirmed views */}
          <div className="relative px-4 pt-5 pb-4 bg-gradient-to-b from-transparent to-muted/20 min-h-[420px]">
            <div className="relative w-full">
              {/* FRONT — QR + steps */}
                  <div className={cn((pairStatus === "confirmed" && pairSessionId) ? "hidden" : "block")}>
                <div className="mx-auto flex w-full max-w-[292px] flex-col items-center">
                  {/* QR with brackets */}
                  <div className="relative mb-4 w-fit self-center">
                    <span className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-md" />
                    <span className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-md" />
                    <span className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-md" />
                    <span className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-md" />
                    <div className="relative p-3 bg-white rounded-xl shadow-lg ring-1 ring-border/50">
                      {pairStatus === "loading" || pairStatus === "idle" ? (
                        <div className="w-[148px] h-[148px] flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : pairStatus === "expired" || pairStatus === "error" ? (
                        <div className="w-[148px] h-[148px] flex flex-col items-center justify-center gap-2 text-center px-2">
                          <p className="text-[11px] font-semibold text-foreground">
                            {pairStatus === "expired" ? "QR expired" : "Couldn't start"}
                          </p>
                           <Button size="sm" variant="outline" onClick={refreshPairing} className="h-7 gap-1 text-[11px]">
                            <RefreshCw className="w-3 h-3" /> Refresh
                          </Button>
                        </div>
                      ) : (
                        <>
                          <QRCodeSVG value={goLiveUrl} size={148} level="M" includeMargin={false} />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center ring-[3px] ring-white shadow-lg">
                              <Radio className="w-4 h-4 text-primary-foreground" />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="w-full pb-4">
                    <ol className="space-y-1.5">
                      {[
                        "Open Camera / QR scanner",
                        "Tap the link that appears",
                        "Confirm on your phone",
                      ].map((step, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="shrink-0 w-4 h-4 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-[9px] font-bold flex items-center justify-center shadow-sm">{i + 1}</span>
                          <span className="text-[11px] text-foreground leading-tight">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* URL + copy */}
                  <div className="w-full space-y-2">
                    <Button
                      onClick={copyUrl}
                      variant="default"
                      disabled={!pairToken}
                      className="w-full h-11 gap-2 rounded-xl font-semibold shadow-md shadow-primary/20"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Link copied!" : "Copy link"}
                    </Button>
                    <div className="w-full rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                      <code className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted-foreground font-mono" title={goLiveUrl}>{goLiveUrl}</code>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 pt-0.5">
                      <span className="w-1 h-1 rounded-full bg-primary/60" />
                      <p className="text-[10px] text-muted-foreground leading-snug text-center">
                        {pairStatus === "pending"
                          ? "Waiting for your phone to scan…"
                          : hasActivePhoneSession
                            ? "This phone session stays linked until the live ends"
                            : "One-time secure pairing"}
                      </p>
                      <span className="w-1 h-1 rounded-full bg-primary/60" />
                    </div>
                  </div>
                </div>
              </div>

              {/* BACK — Confirmed */}
                  <div className={cn((pairStatus === "confirmed" && pairSessionId) ? "block" : "hidden")}>
                <div className="mx-auto flex w-full max-w-[292px] flex-col items-center text-center pt-4">
                  <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl shadow-primary/40">
                      <Check className="w-12 h-12 text-primary-foreground" strokeWidth={3} />
                    </div>
                    <span className="absolute -inset-2 rounded-full border-2 border-primary/30 animate-ping pointer-events-none" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Phone paired!</h3>
                  <p className="text-xs text-muted-foreground mt-1 px-2 leading-relaxed">
                    Your phone is already paired to <span className="font-semibold text-foreground">{storeName ?? "your shop"}</span> and will stay linked until this live stream ends.
                  </p>

                  {pairPhoneUA && (
                    <div className="mt-4 w-full rounded-xl border border-border/60 bg-muted/40 px-3 py-2 flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-[10px] text-muted-foreground truncate text-left flex-1" title={pairPhoneUA}>
                        {pairPhoneUA}
                      </span>
                    </div>
                  )}

                  <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary">Secure session active</span>
                  </div>

                  <Button
                    onClick={() => setShowQrDialog(false)}
                    variant="outline"
                    className="mt-5 w-full h-10 rounded-xl text-xs font-medium"
                  >
                    Done
                  </Button>
                  <Button
                    onClick={refreshPairing}
                    variant="ghost"
                    className="mt-2 w-full h-9 rounded-xl text-[11px] font-medium"
                  >
                    Generate new QR instead
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-3.5 pb-3.5 px-3 sm:pt-5 sm:pb-5 sm:px-6">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
          <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${color}`} />
          <span className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">{label}</span>
        </div>
        <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function StreamRowCard({ stream, live }: { stream: StreamRow; live?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to like");
      const { error } = await (supabase as any)
        .from("live_likes")
        .insert({ stream_id: stream.id, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-live-streams"] });
      toast.success("Liked ❤️");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openWatcher = () => window.open(`/live/${stream.id}`, "_blank");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openWatcher}
      onKeyDown={(e) => { if (e.key === "Enter") openWatcher(); }}
      className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-muted/40 active:scale-[0.99] transition-all cursor-pointer touch-manipulation min-h-[64px]"
    >
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted overflow-hidden shrink-0 relative">
        {stream.thumbnail_url ? (
	          <img
	            src={stream.thumbnail_url}
	            alt=""
	            className="w-full h-full object-cover"
	            loading="lazy"
	            decoding="async"
	          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        {live && (
          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive text-destructive-foreground">LIVE</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-sm font-semibold text-foreground truncate flex-1">
            {stream.title || "Untitled stream"}
          </p>
          {live ? (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] shrink-0">Live</Badge>
          ) : (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] shrink-0">Ended</Badge>
          )}
        </div>
        <div className="flex items-center gap-2.5 text-[11px] sm:text-xs text-muted-foreground">
          <span className="flex items-center gap-1 tabular-nums"><Eye className="w-3 h-3" />{stream.viewer_count ?? 0}</span>
          <span className="flex items-center gap-1 tabular-nums"><Heart className="w-3 h-3" />{stream.like_count ?? 0}</span>
          <span className="flex items-center gap-1 tabular-nums"><Gift className="w-3 h-3" />{stream.gifts_received ?? 0}</span>
          {stream.started_at && (
            <span className="truncate hidden xs:inline">{formatDistanceToNow(new Date(stream.started_at), { addSuffix: true })}</span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => { e.stopPropagation(); likeMutation.mutate(); }}
        disabled={likeMutation.isPending}
        title="Like this stream"
        aria-label="Like stream"
        className="shrink-0 h-11 w-11 rounded-full active:scale-90 touch-manipulation"
      >
        <Heart className={cn("w-5 h-5", likeMutation.isPending ? "text-muted-foreground" : "text-red-500 fill-red-500/20")} />
      </Button>
    </div>
  );
}
