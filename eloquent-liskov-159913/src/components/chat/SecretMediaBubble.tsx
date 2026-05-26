/**
 * SecretMediaBubble — renders an encrypted attachment from a Secret Chat.
 * Lazily downloads + decrypts when the bubble enters the viewport.
 */
import { useEffect, useRef, useState } from "react";
import { FileLock2, Lock, Download, Loader2, ImageIcon, Video as VideoIcon, Mic } from "lucide-react";
import type { SecretMessage } from "@/hooks/useSecretChat";

interface Props {
  message: SecretMessage;
  decryptMedia: (m: SecretMessage) => Promise<string | null>;
  mine: boolean;
}

export default function SecretMediaBubble({ message, decryptMedia, mine }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tried, setTried] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Auto-decrypt when in view (images + audio); files & videos require tap.
  useEffect(() => {
    if (!message.media || tried) return;
    const auto = message.media.type === "image" || message.media.type === "audio";
    if (!auto) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTried(true);
          setLoading(true);
          decryptMedia(message)
            .then((u) => setUrl(u))
            .finally(() => setLoading(false));
          obs.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [message, decryptMedia, tried]);

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  if (!message.media) return null;
  const { type, mime, file_name, size } = message.media;

  const handleManualLoad = async () => {
    if (loading || url) return;
    setTried(true);
    setLoading(true);
    const u = await decryptMedia(message);
    setUrl(u);
    setLoading(false);
  };

  const wrapper = `relative max-w-[78%] overflow-hidden rounded-2xl shadow-sm ${
    mine ? "bg-indigo-500/10 ring-1 ring-indigo-500/30" : "bg-muted ring-1 ring-border"
  }`;

  return (
    <div ref={ref} className={wrapper}>
      <div className="absolute right-2 top-2 z-10 rounded-full bg-background/70 p-1 backdrop-blur">
        <Lock className="h-3 w-3 text-foreground" />
      </div>

      {type === "image" && (
        <button type="button" onClick={handleManualLoad} className="block w-full">
          {url ? (
	            <img src={url} alt="" className="max-h-80 w-auto" loading="lazy" decoding="async" />
          ) : (
            <Placeholder icon={<ImageIcon className="h-8 w-8" />} loading={loading} label="Encrypted image" />
          )}
        </button>
      )}

      {type === "video" && (
        url ? (
	          <video src={url} controls preload="metadata" className="max-h-96 w-auto" />
        ) : (
          <button type="button" onClick={handleManualLoad} className="block w-full">
            <Placeholder icon={<VideoIcon className="h-8 w-8" />} loading={loading} label="Tap to decrypt video" />
          </button>
        )
      )}

      {type === "audio" && (
        <div className="flex items-center gap-2 px-3 py-2">
          <Mic className="h-4 w-4 text-foreground" />
          {url ? (
            <audio src={url} controls className="h-8 max-w-[220px]" />
          ) : (
            <span className="text-xs text-muted-foreground">
              {loading ? "Decrypting…" : "Voice note"}
            </span>
          )}
        </div>
      )}

      {type === "file" && (
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="rounded-lg bg-secondary p-2 text-foreground">
            <FileLock2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold">{file_name ?? "file"}</div>
            <div className="text-[10px] text-muted-foreground">
              {mime ?? "binary"} · {formatSize(size)}
            </div>
          </div>
          {url ? (
            <a
              href={url}
              download={file_name ?? "secret-file"}
              className="rounded-full bg-foreground p-1.5 text-white hover:bg-foreground"
              aria-label="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          ) : (
            <button type="button"
              onClick={handleManualLoad}
              className="rounded-full bg-foreground p-1.5 text-white hover:bg-foreground"
              aria-label="Decrypt"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Placeholder({ icon, loading, label }: { icon: React.ReactNode; loading: boolean; label: string }) {
  return (
    <div className="flex h-40 w-64 max-w-full flex-col items-center justify-center gap-1.5 bg-secondary text-foreground">
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : icon}
      <div className="text-[11px] text-muted-foreground">{loading ? "Decrypting…" : label}</div>
    </div>
  );
}

function formatSize(b: number | null): string {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
