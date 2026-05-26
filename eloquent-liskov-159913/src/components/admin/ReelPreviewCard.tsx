import { Trash2 } from "lucide-react";

interface ReelPreviewCardProps {
  url: string;
  isVideo: boolean;
  onRemove: () => void;
}

export default function ReelPreviewCard({ url, isVideo, onRemove }: ReelPreviewCardProps) {
  return (
    <div className="relative group">
      {isVideo ? (
        <video
          src={url}
          controls
          playsInline
          preload="auto"
          className="w-full rounded-lg bg-muted"
          style={{ maxHeight: 320 }}
        />
      ) : (
	        <img
	          src={url}
	          alt="Post preview"
	          className="w-full rounded-lg object-cover border border-border"
	          loading="lazy"
	          decoding="async"
	          style={{ aspectRatio: "1 / 1" }}
	        />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 z-10 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Remove media"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
