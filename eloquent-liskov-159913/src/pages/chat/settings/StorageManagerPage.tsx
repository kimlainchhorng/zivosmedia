/**
 * StorageManagerPage - Telegram-style data and storage controls.
 * Preferences are device-local today and exposed through useChatStoragePrefs so
 * chat media surfaces can share one policy.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSmartBack } from "@/lib/smartBack";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  ArrowDownToLine,
  ChevronLeft,
  Database,
  FileText,
  HardDrive,
  Image,
  Music2,
  RotateCcw,
  Trash2,
  Video,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_CHAT_STORAGE_PREFS,
  inferChatStorageConnection,
  type ChatStorageConnection,
  type ChatStorageMediaKind,
  type ChatKeepMedia,
  useChatStoragePrefs,
} from "@/hooks/useChatStoragePrefs";

type CacheBucket = ChatStorageMediaKind | "other";

type CacheStats = Record<CacheBucket, { bytes: number; entries: number }>;

const EMPTY_STATS: CacheStats = {
  photos: { bytes: 0, entries: 0 },
  videos: { bytes: 0, entries: 0 },
  files: { bytes: 0, entries: 0 },
  audio: { bytes: 0, entries: 0 },
  other: { bytes: 0, entries: 0 },
};

const MEDIA_META: Record<CacheBucket, { label: string; icon: typeof Image; color: string }> = {
  photos: { label: "Photos", icon: Image, color: "bg-sky-500" },
  videos: { label: "Videos", icon: Video, color: "bg-violet-500" },
  files: { label: "Files", icon: FileText, color: "bg-amber-500" },
  audio: { label: "Audio", icon: Music2, color: "bg-emerald-500" },
  other: { label: "Other cache", icon: Database, color: "bg-zinc-500" },
};

const KEEP_MEDIA_OPTIONS: { value: ChatKeepMedia; label: string; hint: string }[] = [
  { value: "3d", label: "3 days", hint: "Smallest" },
  { value: "1w", label: "1 week", hint: "Light" },
  { value: "1m", label: "1 month", hint: "Balanced" },
  { value: "forever", label: "Forever", hint: "Manual" },
];

const CONNECTIONS: { value: ChatStorageConnection; label: string }[] = [
  { value: "wifi", label: "Wi-Fi" },
  { value: "cellular", label: "Cellular" },
  { value: "roaming", label: "Roaming" },
];

const CHAT_TEMP_KEY_PATTERNS = [
  "zivo:chat-draft",
  "zivo:chat-search",
  "zivo:chat-last-seen",
  "pendingForwardPrefill",
  "pendingChatWith",
];

function formatBytes(bytes: number | null | undefined) {
  if (bytes == null) return "Calculating";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[index]}`;
}

function storageAreaBytes(storage: Storage | undefined) {
  if (!storage) return 0;
  let total = 0;
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index) || "";
      const value = storage.getItem(key) || "";
      total += new Blob([key, value]).size;
    }
  } catch {
    return 0;
  }
  return total;
}

function classifyCacheUrl(url: string): CacheBucket {
  const lower = url.toLowerCase();
  if (/\.(png|jpe?g|webp|gif|avif|heic)(\?|$)/.test(lower) || lower.includes("image/")) return "photos";
  if (/\.(mp4|mov|webm|m4v|m3u8)(\?|$)/.test(lower) || lower.includes("video/")) return "videos";
  if (/\.(mp3|m4a|ogg|wav|aac|opus)(\?|$)/.test(lower) || lower.includes("audio/") || lower.includes("voice")) return "audio";
  if (/\.(pdf|docx?|xlsx?|pptx?|csv|txt|zip|rar)(\?|$)/.test(lower) || lower.includes("application/")) return "files";
  return "other";
}

async function scanCacheStats(): Promise<CacheStats> {
  const next: CacheStats = {
    photos: { bytes: 0, entries: 0 },
    videos: { bytes: 0, entries: 0 },
    files: { bytes: 0, entries: 0 },
    audio: { bytes: 0, entries: 0 },
    other: { bytes: 0, entries: 0 },
  };

  if (!("caches" in window)) return next;
  const names = await caches.keys();
  for (const name of names) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    for (const request of requests) {
      const bucket = classifyCacheUrl(request.url);
      next[bucket].entries += 1;
      try {
        const response = await cache.match(request);
        if (response) next[bucket].bytes += (await response.clone().blob()).size;
      } catch {
        // Opaque responses may not expose a body size.
      }
    }
  }
  return next;
}

async function clearCacheBuckets(selected: Set<CacheBucket>) {
  if (!("caches" in window)) return 0;
  let removed = 0;
  const names = await caches.keys();
  for (const name of names) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    await Promise.all(requests.map(async (request) => {
      if (!selected.has(classifyCacheUrl(request.url))) return;
      const deleted = await cache.delete(request);
      if (deleted) removed += 1;
    }));
  }
  return removed;
}

function clearTemporaryChatKeys() {
  let removed = 0;
  const clearFrom = (storage: Storage | undefined) => {
    if (!storage) return;
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && CHAT_TEMP_KEY_PATTERNS.some((pattern) => key.includes(pattern))) keys.push(key);
    }
    keys.forEach((key) => {
      storage.removeItem(key);
      removed += 1;
    });
  };
  try {
    clearFrom(window.localStorage);
    clearFrom(window.sessionStorage);
  } catch {
    // Storage can be unavailable in private mode.
  }
  return removed;
}

export default function StorageManagerPage() {
  const goBack = useSmartBack("/chat");
  const { user } = useAuth();
  const { prefs, setPrefs } = useChatStoragePrefs(user?.id);
  const [stats, setStats] = useState<CacheStats>(EMPTY_STATS);
  const [usageBytes, setUsageBytes] = useState<number | null>(null);
  const [quotaBytes, setQuotaBytes] = useState<number | null>(null);
  const [localBytes, setLocalBytes] = useState(0);
  const [sessionBytes, setSessionBytes] = useState(0);
  const [selectedConnection, setSelectedConnection] = useState<ChatStorageConnection>(() => inferChatStorageConnection());
  const [selectedBuckets, setSelectedBuckets] = useState<Set<CacheBucket>>(() => new Set(["photos", "videos", "files", "audio"]));
  const [refreshing, setRefreshing] = useState(true);
  const [clearing, setClearing] = useState(false);

  const refreshStats = useCallback(async () => {
    setRefreshing(true);
    try {
      const [estimate, cacheStats] = await Promise.all([
        navigator.storage?.estimate?.().catch(() => undefined),
        scanCacheStats().catch(() => EMPTY_STATS),
      ]);
      setUsageBytes(typeof estimate?.usage === "number" ? estimate.usage : 0);
      setQuotaBytes(typeof estimate?.quota === "number" ? estimate.quota : null);
      setStats(cacheStats);
      setLocalBytes(storageAreaBytes(window.localStorage));
      setSessionBytes(storageAreaBytes(window.sessionStorage));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const cacheTotal = useMemo(
    () => Object.values(stats).reduce((total, item) => total + item.bytes, 0),
    [stats]
  );
  const effectiveUsageBytes = usageBytes && usageBytes > 0 ? usageBytes : cacheTotal + localBytes + sessionBytes;
  const selectedTotal = useMemo(
    () => Array.from(selectedBuckets).reduce((total, bucket) => total + stats[bucket].bytes, 0),
    [selectedBuckets, stats]
  );
  const quotaPercent = quotaBytes ? Math.min(100, Math.round((effectiveUsageBytes / quotaBytes) * 100)) : 0;

  const updateAuto = (kind: ChatStorageMediaKind, value: boolean) => {
    setPrefs((current) => ({
      ...current,
      autoDownload: {
        ...current.autoDownload,
        [selectedConnection]: {
          ...current.autoDownload[selectedConnection],
          [kind]: value,
        },
      },
    }));
  };

  const clearSelected = async () => {
    if (selectedBuckets.size === 0) {
      toast.error("Choose at least one cache type");
      return;
    }
    setClearing(true);
    try {
      const removedEntries = await clearCacheBuckets(selectedBuckets);
      const removedKeys = selectedBuckets.has("other") ? clearTemporaryChatKeys() : 0;
      await refreshStats();
      toast.success(`Cleared ${removedEntries + removedKeys} cached item${removedEntries + removedKeys === 1 ? "" : "s"}`);
    } catch {
      toast.error("Could not clear cache");
    } finally {
      setClearing(false);
    }
  };

  const toggleBucket = (bucket: CacheBucket) => {
    setSelectedBuckets((current) => {
      const next = new Set(current);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next;
    });
  };

  const resetPrefs = () => {
    setPrefs(DEFAULT_CHAT_STORAGE_PREFS);
    setSelectedConnection("wifi");
    toast.success("Storage settings reset");
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mt-5">
      <h2 className="px-5 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="divide-y divide-border/40 border-y border-border/50 bg-card">{children}</div>
    </section>
  );

  const ToggleRow = ({
    title,
    subtitle,
    checked,
    onCheckedChange,
  }: {
    title: string;
    subtitle?: string;
    checked: boolean;
    onCheckedChange: (value: boolean) => void;
  }) => (
    <div className="flex min-h-[58px] items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/90 px-3 py-3 pt-safe backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button type="button" onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted/70" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight">Data and Storage</h1>
            <p className="text-xs text-muted-foreground">{refreshing ? "Refreshing cache" : `${formatBytes(effectiveUsageBytes)} used on this device`}</p>
          </div>
          <button type="button" onClick={resetPrefs} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted/70" aria-label="Reset storage settings">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-xl">
        <section className="px-5 pt-5">
          <div className="rounded-[8px] border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <HardDrive className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold">Device cache</p>
                  <p className="text-sm font-bold">{formatBytes(effectiveUsageBytes)}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${quotaPercent}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>{formatBytes(cacheTotal)} media cache</span>
                  <span>{quotaBytes ? `${quotaPercent}% of device quota` : "Quota unavailable"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Section title="Clear cache">
          <div className="px-5 py-3">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(MEDIA_META) as CacheBucket[]).map((bucket) => {
                const Icon = MEDIA_META[bucket].icon;
                const selected = selectedBuckets.has(bucket);
                return (
                  <button
                    key={bucket}
                    type="button"
                    onClick={() => toggleBucket(bucket)}
                    className={`min-h-[82px] rounded-[8px] border px-3 py-3 text-left transition ${
                      selected ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${MEDIA_META[bucket].color}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{MEDIA_META[bucket].label}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatBytes(stats[bucket].bytes)} · {stats[bucket].entries} item{stats[bucket].entries === 1 ? "" : "s"}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedBuckets(new Set(Object.keys(MEDIA_META) as CacheBucket[]))}
                className="h-10 rounded-full border border-border px-4 text-sm font-semibold"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearSelected}
                disabled={clearing || selectedBuckets.size === 0}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-destructive px-4 text-sm font-bold text-destructive-foreground disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {clearing ? "Clearing" : `Clear ${formatBytes(selectedTotal)}`}
              </button>
            </div>
          </div>
        </Section>

        <Section title="Keep media">
          <div className="grid grid-cols-4 gap-2 px-5 py-3">
            {KEEP_MEDIA_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPrefs((current) => ({ ...current, keepMedia: option.value }))}
                className={`min-h-[64px] rounded-[8px] border px-2 py-2 text-center transition ${
                  prefs.keepMedia === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                }`}
              >
                <span className="block text-xs font-bold">{option.label}</span>
                <span className={`mt-1 block text-[10px] ${prefs.keepMedia === option.value ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Auto-download media">
          <div className="px-5 py-3">
            <div className="grid grid-cols-3 gap-2 rounded-[8px] bg-muted p-1">
              {CONNECTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSelectedConnection(item.value)}
                  className={`h-9 rounded-[7px] text-sm font-bold transition ${
                    selectedConnection === item.value ? "bg-background shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-[8px] border border-border/60">
              <ToggleRow title="Photos" subtitle="Images and camera uploads" checked={prefs.autoDownload[selectedConnection].photos} onCheckedChange={(v) => updateAuto("photos", v)} />
              <div className="border-t border-border/40" />
              <ToggleRow title="Videos" subtitle={`Up to ${prefs.maxVideoMB} MB`} checked={prefs.autoDownload[selectedConnection].videos} onCheckedChange={(v) => updateAuto("videos", v)} />
              <div className="border-t border-border/40" />
              <ToggleRow title="Files" subtitle={`Documents up to ${prefs.maxFileMB} MB`} checked={prefs.autoDownload[selectedConnection].files} onCheckedChange={(v) => updateAuto("files", v)} />
              <div className="border-t border-border/40" />
              <ToggleRow title="Voice messages" checked={prefs.autoDownload[selectedConnection].audio} onCheckedChange={(v) => updateAuto("audio", v)} />
            </div>
          </div>
        </Section>

        <Section title="Download limits">
          <div className="space-y-5 px-5 py-4">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Video limit</span>
                <span className="text-xs font-semibold text-muted-foreground">{prefs.maxVideoMB} MB</span>
              </div>
              <Slider value={[prefs.maxVideoMB]} min={5} max={200} step={5} onValueChange={([value]) => setPrefs((current) => ({ ...current, maxVideoMB: value }))} />
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">File limit</span>
                <span className="text-xs font-semibold text-muted-foreground">{prefs.maxFileMB} MB</span>
              </div>
              <Slider value={[prefs.maxFileMB]} min={5} max={100} step={5} onValueChange={([value]) => setPrefs((current) => ({ ...current, maxFileMB: value }))} />
            </div>
          </div>
        </Section>

        <Section title="Network and playback">
          <ToggleRow title="Data saver" subtitle="Pause large downloads on cellular" checked={prefs.dataSaver} onCheckedChange={(v) => setPrefs((current) => ({ ...current, dataSaver: v }))} />
          <ToggleRow title="Stream videos first" subtitle="Play before saving the full file" checked={prefs.streamVideos} onCheckedChange={(v) => setPrefs((current) => ({ ...current, streamVideos: v }))} />
          <ToggleRow title="Background downloads" subtitle="Finish queued downloads when ZIVO stays open" checked={prefs.backgroundDownloads} onCheckedChange={(v) => setPrefs((current) => ({ ...current, backgroundDownloads: v }))} />
          <ToggleRow title="Save edited media" subtitle="Keep edited photos and videos on this device" checked={prefs.saveEditedMedia} onCheckedChange={(v) => setPrefs((current) => ({ ...current, saveEditedMedia: v }))} />
        </Section>

        <Section title="Local data">
          <div className="grid grid-cols-2 gap-2 px-5 py-3">
            <div className="rounded-[8px] border border-border/60 bg-background p-3">
              <ArrowDownToLine className="mb-2 h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold">Local settings</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatBytes(localBytes)}</p>
            </div>
            <div className="rounded-[8px] border border-border/60 bg-background p-3">
              <Wifi className="mb-2 h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold">Session queue</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatBytes(sessionBytes)}</p>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
