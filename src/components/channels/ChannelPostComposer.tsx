import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { stripImageMetadata } from "@/utils/stripImageMetadata";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  BarChart3,
  Clock,
  FileText,
  ImagePlus,
  Loader2,
  MessageSquareOff,
  Mic,
  Music,
  Paperclip,
  Plus,
  Send,
  Smile,
  Square,
  Trash2,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { ILLUSTRATED_PACKS, type IllustratedSticker } from "@/config/illustratedStickers";
import { cn } from "@/lib/utils";

interface Props {
  channelId: string;
  onPosted?: () => void;
}

interface MediaItem {
  url: string;
  path: string;
  type: "image" | "video" | "voice" | "gif" | "file" | "music";
  name?: string;
  size?: number;
  mime_type?: string;
  /** Voice notes only — duration in ms + downsampled waveform peaks. */
  duration_ms?: number;
  waveform?: number[];
}

type UploadKind = "photo" | "video" | "gif" | "file" | "music";
type AttachmentActionId =
  | "photo"
  | "video"
  | "gif"
  | "file"
  | "music"
  | "voice"
  | "poll"
  | "schedule"
  | "comments";
type ComposerPanel = "attachments" | "emoji" | null;
type EmojiMode = "GIFs" | "Stickers" | "Emoji";

const CHANNEL_VOICE_MAX_MS = 5 * 60 * 1000;
const EMOJI_CHOICES = ["😀", "😂", "😍", "👍", "🙏", "🔥", "🎉", "❤️", "😎", "😭", "👏", "💯", "🤝", "✨", "✅", "🚀"];
type ChannelSticker = IllustratedSticker & { packName: string };
const STICKER_CHOICES: ChannelSticker[] = ILLUSTRATED_PACKS.flatMap((pack) =>
  pack.stickers.map((sticker) => ({ ...sticker, packName: pack.name })),
).slice(0, 32);
const GIF_LABELS = ["Wave", "Thanks", "OK", "Laugh", "Fire", "Celebrate", "Done", "Love"];

function getUploadMediaType(file: File, kind: UploadKind): MediaItem["type"] | null {
  if (kind === "gif") return file.type === "image/gif" || /\.gif$/i.test(file.name) ? "gif" : null;
  if (kind === "music") return file.type.startsWith("audio/") ? "music" : null;
  if (kind === "file") return "file";
  if (file.type === "image/gif" || /\.gif$/i.test(file.name)) return "gif";
  if (kind === "photo") return file.type.startsWith("image/") ? "image" : null;
  if (kind === "video") return file.type.startsWith("video/") ? "video" : null;
  return null;
}

function getUploadLimit(
  type: MediaItem["type"],
  limits: { PHOTO_MAX: number; VIDEO_MAX: number; GIF_MAX: number; FILE_MAX: number; AUDIO_MAX: number },
): number {
  if (type === "video") return limits.VIDEO_MAX;
  if (type === "gif") return limits.GIF_MAX;
  if (type === "music") return limits.AUDIO_MAX;
  if (type === "file") return limits.FILE_MAX;
  return limits.PHOTO_MAX;
}

function getSafeExtension(fileName: string, type: MediaItem["type"]): string {
  const ext = fileName.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (ext) return ext;
  if (type === "video") return "mp4";
  if (type === "gif") return "gif";
  if (type === "music") return "mp3";
  if (type === "file") return "bin";
  return "jpg";
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function formatDateTimeLocal(value: Date): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

async function getFunctionErrorMessage(error: unknown, fallback = "Couldn't publish"): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json();
      if (typeof payload?.message === "string") return payload.message;
      if (typeof payload?.error === "string") return payload.error;
    } catch {
      try {
        const text = await context.clone().text();
        if (text.trim()) return text.trim();
      } catch {
        // Fall through to the wrapped error message.
      }
    }
  }
  return (error as { message?: string } | null)?.message || fallback;
}

export function ChannelPostComposer({ channelId, onPosted }: Props) {
  const [body, setBody] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [when, setWhen] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [composerPanel, setComposerPanel] = useState<ComposerPanel>(null);
  const [emojiMode, setEmojiMode] = useState<EmojiMode>("Stickers");
  const [composerInitial, setComposerInitial] = useState("Z");
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
  const panelPointerGuardRef = useRef(0);
  const actionPointerGuardRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const user = data.user;
      const label =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        "Z";
      setComposerInitial(String(label).trim().slice(0, 1).toUpperCase() || "Z");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const attachmentsOpen = composerPanel === "attachments";
  const emojiPanelOpen = composerPanel === "emoji";
  const toggleComposerPanel = (panel: Exclude<ComposerPanel, null>) => {
    setComposerPanel((current) => (current === panel ? null : panel));
  };
  const handlePanelPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    panel: Exclude<ComposerPanel, null>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    panelPointerGuardRef.current = Date.now();
    toggleComposerPanel(panel);
  };
  const handlePanelClick = (panel: Exclude<ComposerPanel, null>) => {
    if (Date.now() - panelPointerGuardRef.current < 350) return;
    toggleComposerPanel(panel);
  };
  const handlePanelKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    panel: Exclude<ComposerPanel, null>,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleComposerPanel(panel);
  };
  const appendDraftText = (value: string) => {
    setBody((current) => `${current}${value}`);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const sendStickerPost = async (sticker: ChannelSticker) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error("Sign in required");
        return;
      }

      const { data, error } = await supabase.functions.invoke("channel-broadcast", {
        body: {
          channel_id: channelId,
          body: null,
          media: [{
            type: "sticker",
            sticker: sticker.id,
            url: sticker.src,
            name: sticker.alt,
            pack: sticker.packName,
          }],
          scheduled_for: null,
          comments_enabled: !disableComments,
        },
      });

      if (error || (data as any)?.error) {
        const message = (data as any)?.message ?? (data as any)?.error ?? await getFunctionErrorMessage(error);
        toast.error(message);
        return;
      }

      setBody("");
      setWhen("");
      setScheduled(false);
      setMedia([]);
      setPoll(null);
      setDisableComments(false);
      setComposerPanel(null);
      toast.success("Sticker posted");
      onPosted?.();
    } finally {
      setSubmitting(false);
    }
  };

  const fmtElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  // Auto-stop at the cap so a forgotten recorder can't run forever.
  useEffect(() => {
    if (!voice.isRecording) return;
    if (voice.elapsedMs < CHANNEL_VOICE_MAX_MS) return;
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
  const gifRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  const GIF_MAX = 25 * 1024 * 1024;
  const FILE_MAX = 50 * 1024 * 1024;
  const AUDIO_MAX = 50 * 1024 * 1024;

  const onPickFiles = async (files: FileList | null, kind: UploadKind) => {
    if (!files || files.length === 0) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Sign in required");
      return;
    }
    setUploading(true);
    const uploaded: MediaItem[] = [];
    for (const original of Array.from(files)) {
      const mediaType = getUploadMediaType(original, kind);
      if (!mediaType) {
        toast.error(`${original.name} is not supported`);
        continue;
      }
      const limit = getUploadLimit(mediaType, { PHOTO_MAX, VIDEO_MAX, GIF_MAX, FILE_MAX, AUDIO_MAX });
      if (original.size > limit) {
        toast.error(`${original.name} is over ${formatFileSize(limit)}`);
        continue;
      }
      // Strip EXIF only for static images; GIF/video/audio/files go up as-is.
      const f = mediaType === "image" ? await stripImageMetadata(original) : original;
      const ext = getSafeExtension(f.name || original.name, mediaType);
      const path = `${u.user.id}/${channelId}/${mediaType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("channel-media").upload(path, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type || original.type || "application/octet-stream",
      });
      if (error) {
        toast.error(error.message);
        continue;
      }
      const { data: pub } = supabase.storage.from("channel-media").getPublicUrl(path);
      uploaded.push({
        url: pub.publicUrl,
        path,
        type: mediaType,
        name: original.name,
        size: original.size,
        mime_type: f.type || original.type,
      });
    }
    setMedia((m) => [...m, ...uploaded].slice(0, 6));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (videoRef.current) videoRef.current.value = "";
    if (gifRef.current) gifRef.current.value = "";
    if (documentRef.current) documentRef.current.value = "";
    if (audioRef.current) audioRef.current.value = "";
  };

  const removeMedia = async (idx: number) => {
    const item = media[idx];
    setMedia((m) => m.filter((_, i) => i !== idx));
    if (item) {
      await supabase.storage.from("channel-media").remove([item.path]).catch(() => {});
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(132, Math.max(42, el.scrollHeight))}px`;
  }, [body]);

  const submit = async () => {
    if (!body.trim() && media.length === 0 && !poll) {
      toast.error("Write something, add media, or attach a poll");
      return;
    }
    if (scheduled) {
      if (!when) {
        toast.error("Choose when to schedule this post");
        return;
      }
      const scheduledAt = new Date(when);
      if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
        toast.error("Schedule time must be in the future");
        return;
      }
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
        const base = {
          url: m.url,
          type: m.type,
          name: m.name,
          size: m.size,
          mime_type: m.mime_type,
        };
        if (m.type === "voice") {
          return { ...base, duration_ms: m.duration_ms, waveform: m.waveform };
        }
        return base;
      }),
    ];

    const { data, error } = await supabase.functions.invoke("channel-broadcast", {
      body: {
        channel_id: channelId,
        body: body.trim() || null,
        media: mediaPayload,
        scheduled_for: scheduled ? new Date(when).toISOString() : null,
        comments_enabled: !disableComments,
      },
    });
    if (error || (data as any)?.error) {
      setSubmitting(false);
      const message = (data as any)?.message ?? (data as any)?.error ?? await getFunctionErrorMessage(error);
      toast.error(message);
      return;
    }
    setSubmitting(false);
    setBody("");
    setWhen("");
    setScheduled(false);
    setMedia([]);
    setPoll(null);
    setDisableComments(false);
    setComposerPanel(null);
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

  const handleAttachmentAction = (id: AttachmentActionId) => {
    switch (id) {
      case "photo":
        fileRef.current?.click();
        setComposerPanel(null);
        break;
      case "video":
        videoRef.current?.click();
        setComposerPanel(null);
        break;
      case "gif":
        gifRef.current?.click();
        setComposerPanel(null);
        break;
      case "file":
        documentRef.current?.click();
        setComposerPanel(null);
        break;
      case "music":
        audioRef.current?.click();
        setComposerPanel(null);
        break;
      case "voice":
        void (voicePanelOpen ? cancelVoice() : startVoice());
        setComposerPanel(null);
        break;
      case "poll":
        if (poll) {
          setPoll(null);
        } else {
          setPoll({ question: "", options: ["", ""], is_anonymous: false });
        }
        setComposerPanel(null);
        break;
      case "schedule":
        if (scheduled) {
          setScheduled(false);
          setWhen("");
        } else {
          setWhen((current) => current || formatDateTimeLocal(new Date(Date.now() + 5 * 60 * 1000)));
          setScheduled(true);
        }
        setComposerPanel(null);
        break;
      case "comments":
        setDisableComments((v) => !v);
        setComposerPanel(null);
        break;
    }
  };
  const handleActionPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    id: AttachmentActionId,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    actionPointerGuardRef.current[id] = Date.now();
    handleAttachmentAction(id);
  };
  const handleActionClick = (id: AttachmentActionId) => {
    if (Date.now() - (actionPointerGuardRef.current[id] ?? 0) < 350) return;
    handleAttachmentAction(id);
  };
  const handleActionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    id: AttachmentActionId,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleAttachmentAction(id);
  };

  const attachmentActions: Array<{
    id: AttachmentActionId;
    label: string;
    ariaLabel: string;
    icon: typeof ImagePlus;
    tone: string;
    disabled: boolean;
    active?: boolean;
  }> = [
    {
      id: "photo",
      label: "Photo",
      ariaLabel: "Attach photo",
      icon: ImagePlus,
      tone: "text-sky-600 bg-sky-50",
      disabled: uploading || media.length >= 6,
    },
    {
      id: "video",
      label: "Video",
      ariaLabel: "Attach video",
      icon: VideoIcon,
      tone: "text-violet-600 bg-violet-50",
      disabled: uploading || media.length >= 6,
    },
    {
      id: "gif",
      label: "GIF",
      ariaLabel: "Attach GIF",
      icon: ImagePlus,
      tone: "text-fuchsia-600 bg-fuchsia-50",
      disabled: uploading || media.length >= 6,
    },
    {
      id: "file",
      label: "File",
      ariaLabel: "Attach file",
      icon: FileText,
      tone: "text-amber-600 bg-amber-50",
      disabled: uploading || media.length >= 6,
    },
    {
      id: "music",
      label: "Music",
      ariaLabel: "Attach music",
      icon: Music,
      tone: "text-emerald-600 bg-emerald-50",
      disabled: uploading || media.length >= 6,
    },
    {
      id: "voice",
      label: voicePanelOpen ? "Cancel" : "Voice",
      ariaLabel: "Record voice",
      icon: Mic,
      tone: "text-rose-600 bg-rose-50",
      disabled: uploading || media.length >= 6,
    },
    {
      id: "poll",
      label: poll ? "Poll on" : "Poll",
      ariaLabel: poll ? "Remove poll" : "Create poll",
      icon: BarChart3,
      tone: "text-indigo-600 bg-indigo-50",
      disabled: false,
    },
    {
      id: "schedule",
      label: scheduled ? "Scheduled" : "Schedule",
      ariaLabel: scheduled ? "Unschedule post" : "Schedule post",
      icon: Clock,
      tone: "text-sky-600 bg-sky-50",
      disabled: false,
      active: scheduled,
    },
    {
      id: "comments",
      label: disableComments ? "Comments off" : "Comments",
      ariaLabel: disableComments ? "Allow comments" : "Disable comments",
      icon: MessageSquareOff,
      tone: "text-slate-600 bg-slate-100",
      disabled: false,
      active: disableComments,
    },
  ];
  const hasDraft = body.trim().length > 0 || media.length > 0 || !!poll;

  return (
    <div className="space-y-2">
      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-2 rounded-[22px] bg-white/90 p-2 shadow-lg shadow-slate-900/10 ring-1 ring-white/80 backdrop-blur">
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
              ) : m.type === "music" || m.type === "file" ? (
                <div className="h-full w-full flex flex-col items-center justify-center gap-1.5 bg-muted/60 p-2 text-center text-muted-foreground">
                  {m.type === "music" ? <Music className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                  <span className="line-clamp-2 break-all text-[10px] font-semibold text-foreground">{m.name || m.type}</span>
                  {m.size ? <span className="text-[9px] uppercase tracking-wider opacity-70">{formatFileSize(m.size)}</span> : null}
                </div>
              ) : (
                <>
                  <img
                    src={m.url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  {m.type === "gif" && (
                    <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      GIF
                    </span>
                  )}
                </>
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
        onChange={(e) => onPickFiles(e.target.files, "photo")}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => onPickFiles(e.target.files, "video")}
      />
      <input
        ref={gifRef}
        type="file"
        accept="image/gif,.gif"
        multiple
        className="hidden"
        onChange={(e) => onPickFiles(e.target.files, "gif")}
      />
      <input
        ref={documentRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.rar,.7z,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,text/plain,text/csv"
        multiple
        className="hidden"
        onChange={(e) => onPickFiles(e.target.files, "file")}
      />
      <input
        ref={audioRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => onPickFiles(e.target.files, "music")}
      />

      {voicePanelOpen && (
        <div className="flex items-center gap-3 rounded-[22px] bg-white/90 p-3 shadow-lg shadow-slate-900/10 ring-1 ring-white/80 backdrop-blur">
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
        <div className="space-y-2 rounded-[22px] bg-white/90 p-3 shadow-lg shadow-slate-900/10 ring-1 ring-white/80 backdrop-blur">
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

      <div className="space-y-2">
        {attachmentsOpen && (
          <div className="grid grid-cols-4 gap-1.5 rounded-[22px] bg-white/95 px-2 py-2 shadow-lg shadow-slate-900/10 ring-1 ring-white/80 backdrop-blur">
            {attachmentActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.ariaLabel}
                  type="button"
                  onPointerDown={(event) => handleActionPointerDown(event, action.id)}
                  onClick={() => handleActionClick(action.id)}
                  onKeyDown={(event) => handleActionKeyDown(event, action.id)}
                  disabled={action.disabled}
                  aria-label={action.ariaLabel}
                  aria-pressed={action.active}
                  className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-sky-600 disabled:opacity-40"
                  title={action.label}
                >
                  <span className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-full shadow-sm ring-1 ring-white/80",
                    action.active ? "bg-rose-50 text-rose-500" : action.tone,
                  )}>
                    {uploading && ["Attach photo", "Attach video", "Attach GIF", "Attach file", "Attach music"].includes(action.ariaLabel) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <span className="w-full truncate">{action.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {emojiPanelOpen && (
          <div className="overflow-hidden rounded-[28px] bg-white/95 shadow-xl shadow-slate-900/10 ring-1 ring-white/80 backdrop-blur">
            <div className="flex gap-1 overflow-x-auto px-3 py-2 scrollbar-hide">
              {STICKER_CHOICES.slice(0, 10).map((item) => (
                <button
                  key={`top-${item.id}`}
                  type="button"
                  onClick={() => void sendStickerPost(item)}
                  disabled={submitting}
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime-50 p-1.5 transition hover:bg-lime-100 active:scale-95 disabled:opacity-50"
                  aria-label={`Send ${item.alt}`}
                >
                  <img src={item.src} alt="" className="h-full w-full object-contain" draggable={false} />
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-emerald-600 shadow-sm">
                    +
                  </span>
                </button>
              ))}
            </div>
            <div className="px-3 pb-2">
              <div className="flex h-10 items-center gap-2 rounded-full bg-lime-50/80 px-3 text-slate-500">
                <Smile className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 text-sm">Search</span>
                <button
                  type="button"
                  onClick={() => setComposerPanel(null)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-white"
                  aria-label="Close emoji panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto px-3 pb-3 scrollbar-hide">
              {emojiMode === "GIFs" && (
                <div className="grid grid-cols-4 gap-2">
                  {GIF_LABELS.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => gifRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-fuchsia-100 text-xs font-bold text-slate-700 shadow-sm transition active:scale-95"
                      aria-label={`Attach ${label} GIF`}
                    >
                      <span className="text-xl">GIF</span>
                      <span className="mt-1 max-w-full truncate px-1">{label}</span>
                    </button>
                  ))}
                </div>
              )}
              {emojiMode === "Stickers" && (
                <>
                  <p className="px-1 pb-2 text-center text-xs font-bold uppercase tracking-wide text-lime-600">Trending Premium Stickers</p>
                  <div className="grid grid-cols-4 gap-2">
                    {STICKER_CHOICES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void sendStickerPost(item)}
                        disabled={submitting}
                        className="flex aspect-square items-center justify-center rounded-2xl bg-lime-50 p-3 shadow-sm transition hover:bg-lime-100 active:scale-95 disabled:opacity-50"
                        aria-label={`Send ${item.alt}`}
                      >
                        <img src={item.src} alt="" className="h-full w-full object-contain drop-shadow-sm" draggable={false} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {emojiMode === "Emoji" && (
                <div className="grid grid-cols-8 gap-1.5">
                  {EMOJI_CHOICES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => appendDraftText(item)}
                      className="flex h-9 items-center justify-center rounded-xl text-2xl transition hover:bg-lime-50 active:scale-95"
                      aria-label={`Add emoji ${item}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-center border-t border-lime-100/80 px-3 py-2">
              <div className="inline-flex rounded-full bg-white/90 p-0.5 shadow-sm ring-1 ring-lime-100">
                {(["GIFs", "Stickers", "Emoji"] as EmojiMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEmojiMode(mode)}
                    className={cn(
                      "h-9 rounded-full px-4 text-sm font-semibold transition",
                      emojiMode === mode ? "bg-lime-100 text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950",
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {(media.length > 0 || poll) && (
          <div className="flex flex-wrap gap-1.5 px-2">
            {media.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {media.length}/6 attached
              </span>
            )}
            {poll && <span className="rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-600">Poll attached</span>}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onPointerDown={(event) => handlePanelPointerDown(event, "attachments")}
            onClick={() => handlePanelClick("attachments")}
            onKeyDown={(event) => handlePanelKeyDown(event, "attachments")}
            className={cn(
              "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg shadow-slate-900/10 ring-1 ring-white/80 outline-none backdrop-blur transition focus:outline-none focus-visible:outline-none focus-visible:ring-0",
              attachmentsOpen ? "text-sky-600" : "hover:text-sky-600",
            )}
            style={{ outline: "none" }}
            aria-expanded={attachmentsOpen}
            aria-label="Open attachments"
            title="Attach"
          >
            {attachmentsOpen ? <X className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
          </button>
          <div className="flex min-h-12 min-w-0 flex-1 items-end gap-2 rounded-full bg-white/95 py-1.5 pl-1.5 pr-2 shadow-lg shadow-slate-900/10 ring-1 ring-white/80 backdrop-blur">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-sm font-bold text-white shadow-sm ring-2 ring-white/80">
              {composerInitial}
            </span>
            <Textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder="Message"
              rows={1}
              className="max-h-[96px] min-h-9 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-1.5 text-[16px] leading-6 shadow-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
              style={{ outline: "none", boxShadow: "none" }}
            />
            <button
              type="button"
              onPointerDown={(event) => handlePanelPointerDown(event, "emoji")}
              onClick={() => handlePanelClick("emoji")}
              onKeyDown={(event) => handlePanelKeyDown(event, "emoji")}
              aria-expanded={emojiPanelOpen}
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-slate-100 hover:text-sky-600",
                emojiPanelOpen ? "bg-sky-50 text-sky-600" : "text-slate-500",
              )}
              aria-label="Open emoji and stickers"
              title="Emoji and stickers"
            >
              <Smile className="h-5 w-5" />
            </button>
          </div>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={hasDraft ? submit : startVoice}
              disabled={submitting || uploading || (!hasDraft && media.length >= 6)}
              aria-label={hasDraft ? scheduled ? "Schedule post" : "Post" : "Record voice"}
              className={cn(
                "inline-flex h-12 w-12 items-center justify-center rounded-full shadow-lg shadow-slate-900/10 transition active:scale-95 disabled:cursor-default disabled:opacity-45",
                hasDraft ? "bg-sky-500 text-white hover:bg-sky-600" : "bg-white/95 text-slate-950 ring-1 ring-white/80 hover:bg-white",
              )}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : hasDraft ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
