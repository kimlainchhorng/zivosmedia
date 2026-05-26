/**
 * FileBubble — generic file/document message bubble with thumbnail (if available),
 * filename, size, page count, and download / open actions.
 */
import FileText from "lucide-react/dist/esm/icons/file-text";
import Download from "lucide-react/dist/esm/icons/download";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import Image from "lucide-react/dist/esm/icons/image";
import FileSpreadsheet from "lucide-react/dist/esm/icons/file-spreadsheet";
import FileVideo from "lucide-react/dist/esm/icons/file-video";
import FileAudio from "lucide-react/dist/esm/icons/file-audio";
import File from "lucide-react/dist/esm/icons/file";

export interface FileBubbleData {
  url: string;
  filename: string;
  mime_type: string;
  size?: number;
  page_count?: number | null;
  thumbnail_url?: string | null;
  source?: "upload" | "scan";
  sensitive?: boolean;
  sensitive_reason?: string | null;
}

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return Image;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.startsWith("audio/")) return FileAudio;
  if (mime === "application/pdf") return FileText;
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv")) return FileSpreadsheet;
  return File;
}

function fmtBytes(n?: number) {
  if (!n) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

export default function FileBubble({ file, mine }: { file: FileBubbleData; mine?: boolean }) {
  const Icon = iconFor(file.mime_type);
  const isPdf = file.mime_type === "application/pdf";
  const isScan = file.source === "scan";
  const subtitle = [
    isPdf ? "PDF" : file.mime_type.split("/")[1]?.toUpperCase(),
    file.page_count ? `${file.page_count} page${file.page_count > 1 ? "s" : ""}` : null,
    fmtBytes(file.size),
  ].filter(Boolean).join(" · ");

  return (
    <div className={`max-w-[280px] rounded-2xl overflow-hidden border ${mine ? "border-primary/20 bg-primary/5" : "border-border/40 bg-muted/40"}`}>
      {file.thumbnail_url ? (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="block aspect-[3/4] bg-background relative">
	          <img
	            src={file.thumbnail_url}
	            alt={file.filename}
	            className="w-full h-full object-cover"
	            loading="lazy"
	            decoding="async"
	          />
          {isScan && (
            <div className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-background/80 backdrop-blur font-medium">
              SCAN
            </div>
          )}
        </a>
      ) : null}
      <div className="flex items-center gap-3 p-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isPdf ? "bg-rose-500/15 text-rose-500" : "bg-primary/15 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.filename}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex border-t border-border/30">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-medium hover:bg-muted/50"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </a>
        <div className="w-px bg-border/30" />
        <a
          href={file.url}
          download={file.filename}
          className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-medium hover:bg-muted/50"
        >
          <Download className="h-3.5 w-3.5" /> Save
        </a>
      </div>
    </div>
  );
}
