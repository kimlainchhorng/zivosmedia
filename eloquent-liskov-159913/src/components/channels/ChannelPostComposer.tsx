import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { stripImageMetadata } from "@/utils/stripImageMetadata";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Send, ImagePlus, X, Loader2, Video as VideoIcon, BarChart3, Plus, MessageSquareOff, Mic, Square, Trash2 } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

interface Props {
  channelId: string;
  onPosted?: () => void;
}

interface MediaItem {
  url: string;
  path: string;
  type: "image" | "video" | "voice";
  /** Voice notes only — duration in ms + downsampled waveform peaks. */
  duration_ms?: number;
  waveform?: number[];
}

export function ChannelPostComposer({ channelId, onPosted }: Props) {
  const [body, setBody] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [when, setWhen] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  // Telegram parity — admins can ship a post with comments locked. The
  // schema already has channel_posts.comments_enabled (rendered conditionally
  // in ChannelPostCard), it just had no UI to set it.
  const [disableComments, setDisableComments] = useState(false);

  // Voice recorder for the channel composer. Tap Voice → inline panel
  // appears with Start/Stop. On stop the blob is uploaded to channel-media
  // and attached to media as { type: "voice", url, duration_ms, waveform }.
  const voice = useVoiceRecorder();
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const VOICE_MAX_MS = 5 * 60 * 1000; // 5 min cap

  const fmtElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  // Auto-stop at the cap so a forgotten recorder can't run forever.
  useEffect(() => {
    if (!voice.isRecording) return;
    if (voice.elapsedMs < VOICE_MAX_MS) return;
    void voice.stop();
  }, [voice]);

  const startVoice = async () => {
    setVoicePanelOpen(true);
    try {
      await voice.start();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't access mic");
      setVoicePanelOpen(false);
    }
  };

  const stopAndAttachVoice = async () => {
    if (!voice.isRecording) return;
    const rec = await voice.stop();
    if (!rec || !rec.blob) {
      setVoicePanelOpen(false);
      return;
    }
    setVoiceUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error("Sign in required");
        return;
      }
      const ext = rec.mimeType?.includes("mp4") ? "m4a" : rec.mimeType?.includes("ogg") ? "ogg" : "webm";
      const path = `${u.user.id}/${channelId}/voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("channel-media").upload(path, rec.blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: rec.mimeType || "audio/webm",
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const { data: pub } = supabase.storage.from("channel-media").getPublicUrl(path);
      setMedia((m) => [
        ...m,
        {
          url: pub.publicUrl,
          path,
          type: "voice" as const,
          duration_ms: rec.durationMs,
          waveform: rec.waveform,
        } satisfies MediaItem,
      ].slice(0, 6));
      setVoicePanelOpen(false);
    } finally {
      setVoiceUploading(false);
    }
  };

  const cancelVoice = async () => {
    if (voice.isRecording) await voice.cancel();
    setVoicePanelOpen(false);
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  // Poll editor — set to null when no poll is attached. Telegram channels
  // allow exactly one poll per post, so we model it as a single optional
  // attachment rather than a list.
  const [poll, setPoll] = useState<{
    question: string;
    options: string[];
    is_anonymous: boolean;
  } | null>(null);
  const setPollOption = (i: number, value: string) => {
    setPoll((p) => {
      if (!p) return p;
      const next = p.options.slice();
      next[i] = value;
      return { ...p, options: next };
    });
  };
  const addPollOption = () => {
    setPoll((p) => (p ? { ...p, options: [...p.options, ""] } : p));
  };
  const removePollOption = (i: number) => {
    setPoll((p) => {
      if (!p) return p;
      if (p.options.length <= 2) return p; // minimum 2
      return { ...p, options: p.options.filter((_, idx) => idx !== i) };
    });
  };

  const PHOTO_MAX = 10 * 1024 * 1024;
  const VIDEO_MAX = 100 * 1024 * 1024;

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Sign in required");
      return;
    }
    setUploading(true);
    const uploaded: MediaItem[] = [];
    for (const original of Array.from(files)) {
      const isImage = original.type.startsWith("image/");
      const isVideo = original.type.startsWith("video/");
      if (!isImage && !isVideo) continue;
      const limit = isImage ? PHOTO_MAX : VIDEO_MAX;
      if (original.size > limit) {
        toast.error(`${original.name} is over ${isImage ? "10MB" : "100MB"}`);
        continue;
      }
      // Strip EXIF only for images; videos go up as-is.
      const f = isImage ? await stripImageMetadata(original) : original;
      const ext = f.name.split(".").pop() || (isImage ? "jpg" : "mp4");
      const path = `${u.user.id}/${channelId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("channel-media").upload(path, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type,
      });
      if (error) {
        toast.error(error.message);
        continue;
      }
      const { data: pub } = supabase.storage.from("channel-media").getPublicUrl(path);
      uploaded.push({ url: pub.publicUrl, path, type: isImage ? "image" : "video" });
    }
    setMedia((m) => [...m, ...uploaded].slice(0, 6));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (videoRef.current) videoRef.current.value = "";
  };

  const removeMedia = async (idx: number) => {
    const item = media[idx];
    setMedia((m) => m.filter((_, i) => i !== idx));
    if (item) {
      await supabase.storage.from("channel-media").remove([item.path]).catch(() => {});
    }
  };

  const submit = async () => {
    if (!body.trim() && media.length === 0 && !poll) {
      toast.error("Write something, add media, or attach a poll");
      return;
    }
    if (poll) {
      if (!poll.question.trim()) { toast.error("Poll needs a question"); return; }
      const validOptions = poll.options.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 2) { toast.error("Poll needs at least 2 options"); return; }
    }
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Sign in required");
      setSubmitting(false);
      return;
    }

    // 1) If there's a poll, create the chat_polls row first so we have an id
    //    to embed in the post media. chat_polls allows null chat_partner_id
    //    AND null group_id, so we just leave both null for channel polls —
    //    ChatPollBubble fetches the poll by id and doesn't care about scope.
    let pollAttachment: { type: "poll"; poll_id: string; question: string; options: { text: string }[]; is_anonymous: boolean; creator_name: string } | null = null;
    if (poll) {
      const validOptions = poll.options.map((o) => o.trim()).filter(Boolean);
      const optionsPayload = validOptions.map((text) => ({ text }));
      const { data: pollRow, error: pollErr } = await (supabase as any)
        .from("chat_polls")
        .insert({
          creator_id: u.user.id,
          question: poll.question.trim(),
          options: optionsPayload,
          is_anonymous: poll.is_anonymous,
          votes: {},
        })
        .select("id")
        .maybeSingle();
      if (pollErr || !pollRow?.id) {
        toast.error("Couldn't create poll");
        setSubmitting(false);
        return;
      }
      pollAttachment = {
        type: "poll",
        poll_id: pollRow.id,
        question: poll.question.trim(),
        options: optionsPayload,
        is_anonymous: !!poll.is_anonymous,
        creator_name: u.user.user_metadata?.full_name || u.user.user_metadata?.name || u.user.email?.split("@")[0] || "Channel",
      };
    }

    const mediaPayload: any[] = [
      ...(pollAttachment ? [pollAttachment] : []),
      ...media.map((m) => {
        if (m.type === "voice") {
          return { url: m.url, type: m.type, duration_ms: m.duration_ms, waveform: m.waveform };
        }
        return { url: m.url, type: m.type };
      }),
    ];

    const { data, error } = await supabase.functions.invoke("channel-broadcast", {
      body: {
        channel_id: channelId,
        body: body.trim() || null,
        media: mediaPayload,
        scheduled_for: scheduled && when ? new Date(when).toISOString() : null,
      },
    });
    if (error || (data as any)?.error) {
      setSubmitting(false);
      toast.error((data as any)?.error ?? error?.message ?? "Couldn't publish");
      return;
    }
    // Apply comments-disabled as a follow-up update (the broadcast fn doesn't
    // accept this field directly). Best-effort; failures don't block the post.
    const newPostId = (data as any)?.post_id;
    if (disableComments && newPostId) {
      await (supabase as any)
        .from("channel_posts")
        .update({ comments_enabled: false })
        .eq("id", newPostId);
    }
    setSubmitting(false);
    setBody("");
    setWhen("");
    setScheduled(false);
    setMedia([]);
    setPoll(null);
    setDisableComments(false);
    const notified = (data as any)?.notified ?? 0;
    toast.success(
      scheduled
        ? "Scheduled"
        : notified
        ? `Posted · ${notified} subscriber${notified > 1 ? "s" : ""} notified`
        : "Posted"
    );
    onPosted?.();
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share an update with your subscribers…"
        rows={3}
      />

      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {media.map((m, i) => (
            <div key={m.path} className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
              {m.type === "video" ? (
                <>
                  <video src={m.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/15 pointer-events-none">
                    <div className="h-8 w-8 rounded-full bg-black/55 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                </>
              ) : m.type === "voice" ? (
                <div className="h-full w-full flex flex-col items-center justify-center gap-1.5 bg-primary/10 text-primary p-2">
                  <Mic className="h-6 w-6" />
                  <span className="text-[10px] font-bold tabular-nums">
                    {fmtElapsed(m.duration_ms ?? 0)}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider opacity-70">Voice</span>
                </div>
              ) : (
	                <img
	                  src={m.url}
	                  alt=""
	                  className="h-full w-full object-cover"
	                  loading="lazy"
	                  decoding="async"
	                />
              )}
              <button type="button"
                onClick={() => removeMedia(i)}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground hover:bg-background"
                aria-label={`Remove ${m.type}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onPickFiles(e.target.files)}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => onPickFiles(e.target.files)}
      />

      {voicePanelOpen && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-center gap-3">
          <button
            type="button"
            onClick={cancelVoice}
            disabled={voiceUploading}
            aria-label="Cancel recording"
            className="h-9 w-9 rounded-full bg-muted text-muted-foreground hover:text-rose-500 flex items-center justify-center disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {voice.isRecording && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            )}
            <span className="text-sm font-mono font-semibold tabular-nums shrink-0">
              {fmtElapsed(voice.elapsedMs)}
            </span>
            <div className="flex-1 flex items-center gap-[2px] h-5 overflow-hidden">
              {Array.from({ length: 28 }).map((_, i) => {
                const sample = voice.levels[Math.max(0, voice.levels.length - 28 + i)] ?? 0;
                const pct = Math.max(14, Math.min(100, 14 + sample * 110));
                return (
                  <div
                    key={i}
                    className="w-[2.5px] rounded-full bg-primary"
                    style={{ height: `${pct}%`, minHeight: 2 }}
                  />
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={voice.isRecording ? stopAndAttachVoice : startVoice}
            disabled={voiceUploading}
            aria-label={voice.isRecording ? "Stop and attach" : "Start recording"}
            className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm active:scale-95 transition disabled:opacity-50"
          >
            {voiceUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : voice.isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
      )}

      {poll && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fuchsia-500">
              <BarChart3 className="h-3.5 w-3.5" /> Poll
            </span>
            <button
              type="button"
              onClick={() => setPoll(null)}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Remove
            </button>
          </div>
          <Input
            value={poll.question}
            onChange={(e) => setPoll((p) => (p ? { ...p, question: e.target.value } : p))}
            placeholder="Ask your subscribers something…"
            maxLength={200}
            className="text-sm"
          />
          <div className="space-y-1.5">
            {poll.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => setPollOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  maxLength={100}
                  className="text-sm"
                />
                {poll.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removePollOption(i)}
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-muted/60 flex items-center justify-center"
                    aria-label={`Remove option ${i + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {poll.options.length < 10 && (
              <button
                type="button"
                onClick={addPollOption}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" /> Add option
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <Switch
              checked={poll.is_anonymous}
              onCheckedChange={(v) => setPoll((p) => (p ? { ...p, is_anonymous: !!v } : p))}
              id="poll-anon"
            />
            <span className="text-xs text-muted-foreground">Anonymous voting</span>
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || media.length >= 6}
            className="gap-1"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => videoRef.current?.click()}
            disabled={uploading || media.length >= 6}
            className="gap-1"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <VideoIcon className="h-4 w-4" />}
            Video
          </Button>
          <Button
            type="button"
            variant={voicePanelOpen ? "secondary" : "outline"}
            size="sm"
            onClick={voicePanelOpen ? cancelVoice : startVoice}
            disabled={uploading || media.length >= 6}
            className="gap-1"
          >
            <Mic className="h-4 w-4" />
            Voice
          </Button>
          <Button
            type="button"
            variant={poll ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              if (poll) {
                setPoll(null);
              } else {
                setPoll({ question: "", options: ["", ""], is_anonymous: false });
              }
            }}
            className="gap-1"
          >
            <BarChart3 className="h-4 w-4" />
            {poll ? "Poll on" : "Poll"}
          </Button>
          <Button
            type="button"
            variant={disableComments ? "secondary" : "outline"}
            size="sm"
            onClick={() => setDisableComments((v) => !v)}
            aria-pressed={disableComments}
            title={disableComments ? "Comments disabled — tap to allow" : "Tap to disable comments"}
            className="gap-1"
          >
            <MessageSquareOff className="h-4 w-4" />
            {disableComments ? "Comments off" : "Comments"}
          </Button>
          <Switch checked={scheduled} onCheckedChange={setScheduled} id="sch" />
          <Label htmlFor="sch" className="text-xs">Schedule</Label>
        </div>
        {scheduled && (
          <Input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-[220px]"
          />
        )}
        <Button onClick={submit} disabled={submitting || uploading} size="sm" className="gap-1">
          <Send className="h-4 w-4" /> {scheduled ? "Schedule" : "Post"}
        </Button>
      </div>
    </div>
  );
}
