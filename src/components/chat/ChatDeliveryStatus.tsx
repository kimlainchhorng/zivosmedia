import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import Check from "lucide-react/dist/esm/icons/check";
import Clock from "lucide-react/dist/esm/icons/clock";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

export type ChatDeliveryUploadStatus = "uploading" | "sent" | "failed";

interface ChatDeliveryStatusProps {
  status?: ChatDeliveryUploadStatus;
  isQueued?: boolean;
  onResend?: () => void;
  onDiscard?: () => void;
}

export default function ChatDeliveryStatus({
  status,
  isQueued = false,
  onResend,
  onDiscard,
}: ChatDeliveryStatusProps) {
  if (!status) return null;

  if (status === "uploading") {
    return (
      <div
        className="self-end mt-0.5 mr-1 inline-flex items-center gap-1 rounded-full border border-border/30 bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground"
        aria-label="Message delivery status: Sending"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Sending
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div
        className="self-end mt-0.5 mr-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
        aria-label="Message delivery status: Sent"
      >
        <Check className="h-3 w-3" />
        Sent
      </div>
    );
  }

  const label = isQueued ? "Queued" : "Failed";
  const detail = isQueued ? "Will retry" : "Not sent";

  return (
    <div
      className="self-end mt-0.5 mr-1 inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/5 px-1.5 py-1 text-[11px] font-medium text-destructive"
      aria-label={`Message delivery status: ${label}`}
    >
      {isQueued ? <Clock className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      <span className="px-1">{label}</span>
      <span className="hidden text-destructive/70 sm:inline">{detail}</span>
      {onResend && (
        <button
          type="button"
          onClick={onResend}
          className="inline-flex h-6 items-center gap-1 rounded-full px-2 hover:bg-destructive/10"
          aria-label="Resend failed message"
          title="Resend"
        >
          <RefreshCw className="h-3 w-3" />
          Resend
        </button>
      )}
      {onDiscard && (
        <button
          type="button"
          onClick={onDiscard}
          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-destructive/10"
          aria-label="Discard failed message"
          title="Discard"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
