/**
 * ChatMediaDownloadOverlay — placeholder shown in place of a chat image/video
 * when auto-download is blocked by the user's Data & Storage preferences.
 * Tapping the containing tile triggers a manual load.
 */
import Download from "lucide-react/dist/esm/icons/download";

function formatSize(bytes?: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value < 10 && index > 0 ? 1 : 0)} ${units[index]}`;
}

export function ChatMediaDownloadOverlay({ sizeBytes }: { sizeBytes?: number | null }) {
  const size = formatSize(sizeBytes);
  return (
    <span className="pointer-events-none flex h-full w-full flex-col items-center justify-center gap-1.5 bg-muted text-muted-foreground">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background/85 shadow-sm">
        <Download className="h-4 w-4" />
      </span>
      <span className="text-[10px] font-semibold leading-none">
        Tap to download{size ? ` · ${size}` : ""}
      </span>
    </span>
  );
}
