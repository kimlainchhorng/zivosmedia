/**
 * RecordingsPage
 * --------------
 * Lists all call recordings the signed-in user is allowed to read (host of
 * the originating session). RLS on `video_call_recordings` already restricts
 * SELECT to host_id, so we just query directly.
 *
 * Each row resolves a signed playback URL on demand from the
 * `livekit-recordings` storage bucket. Tap to play, long-press to copy URL.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Video as VideoIcon,
  Download,
  Trash2,
  Play,
  Mic,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const STORAGE_BUCKET = "livekit-recordings";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

interface RecordingRow {
  id: string;
  session_id: string;
  storage_path: string;
  duration_seconds: number | null;
  size_bytes: number | null;
  created_at: string;
  // Joined via session_id:
  room_name?: string;
  call_type?: "audio" | "video";
}

function formatBytes(b: number | null): string {
  if (!b || b <= 0) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1_048_576).toFixed(1)} MB`;
  return `${(b / 1_073_741_824).toFixed(2)} GB`;
}

function formatDuration(s: number | null): string {
  if (!s || s <= 0) return "—";
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return mm >= 60
    ? `${Math.floor(mm / 60)}:${String(mm % 60).padStart(2, "0")}:${ss}`
    : `${mm}:${ss}`;
}

export default function RecordingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RecordingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [playingType, setPlayingType] = useState<"audio" | "video">("video");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        // RLS on video_call_recordings already filters to host. Join the
        // session row via a manual second query (Supabase JS PostgREST nesting
        // requires a defined FK relationship — keeping this explicit for
        // robustness across schema rev).
        const { data: recs, error } = await (supabase as any)
          .from("video_call_recordings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        const list = (recs ?? []) as RecordingRow[];
        const sessionIds = Array.from(new Set(list.map((r) => r.session_id)));
        if (sessionIds.length > 0) {
          const { data: sessions } = await (supabase as any)
            .from("video_call_sessions")
            .select("id, room_name, call_type")
            .in("id", sessionIds);
          const map = new Map<string, any>(
            (sessions ?? []).map((s: any) => [s.id, s])
          );
          for (const r of list) {
            const s = map.get(r.session_id);
            if (s) {
              r.room_name = s.room_name;
              r.call_type = s.call_type;
            }
          }
        }
        if (!cancelled) setRows(list);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || "Could not load recordings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function play(rec: RecordingRow) {
    setBusyId(rec.id);
    try {
      const { data, error } = await (supabase as any).storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(rec.storage_path, SIGNED_URL_TTL);
      if (error || !data?.signedUrl) throw error || new Error("no url");
      setPlayingType(rec.call_type === "audio" ? "audio" : "video");
      setPlayingUrl(data.signedUrl);
    } catch (e: any) {
      toast.error(e?.message || "Could not load recording");
    } finally {
      setBusyId(null);
    }
  }

  async function download(rec: RecordingRow) {
    try {
      const { data, error } = await (supabase as any).storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(rec.storage_path, SIGNED_URL_TTL, { download: true });
      if (error || !data?.signedUrl) throw error || new Error("no url");
      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "Could not download");
    }
  }

  async function remove(rec: RecordingRow) {
    if (!confirm("Delete this recording? This cannot be undone.")) return;
    setBusyId(rec.id);
    try {
      // Storage delete is best-effort — RLS on storage bucket policies the
      // path. The DB row delete is RLS-gated to host_id.
      await (supabase as any).storage
        .from(STORAGE_BUCKET)
        .remove([rec.storage_path]);
      const { error: dbErr } = await (supabase as any)
        .from("video_call_recordings")
        .delete()
        .eq("id", rec.id);
      if (dbErr) throw dbErr;
      setRows((prev) => prev.filter((r) => r.id !== rec.id));
      toast.success("Recording deleted");
    } catch (e: any) {
      toast.error(e?.message || "Could not delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background pt-safe">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 px-3 py-2 flex items-center gap-2">
        <button type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/chat"))}
          className="p-2 -ml-2 rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Recordings</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            No recordings yet. Start recording during a call to save it here.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const isAudio = r.call_type === "audio";
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-border bg-card p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    {isAudio ? (
                      <Mic className="w-5 h-5 text-primary" />
                    ) : (
                      <VideoIcon className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {r.room_name ?? r.session_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })} ·{" "}
                      {formatDuration(r.duration_seconds)} · {formatBytes(r.size_bytes)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => play(r)}
                    disabled={busyId === r.id}
                    className="p-2 rounded-full hover:bg-muted disabled:opacity-50"
                    aria-label="Play"
                  >
                    {busyId === r.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => download(r)}
                    className="p-2 rounded-full hover:bg-muted"
                    aria-label="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(r)}
                    className="p-2 rounded-full hover:bg-destructive/10 text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Inline player overlay */}
      {playingUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setPlayingUrl(null)}
        >
          {playingType === "audio" ? (
            <audio
              src={playingUrl}
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            />
          ) : (
            <video
              src={playingUrl}
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] max-w-[92vw] rounded-lg"
            />
          )}
        </div>
      )}
    </div>
  );
}
