import LockKeyhole from "lucide-react/dist/esm/icons/lock-keyhole";
import { cn } from "@/lib/utils";

interface NativeDigitalPurchaseNoticeProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function NativeDigitalPurchaseNotice({
  title = "Available features stay accessible",
  description = "Digital purchases are not available in the installed app. Sign in to use memberships and content already linked to your account.",
  className,
}: NativeDigitalPurchaseNoticeProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-left",
        className,
      )}
      role="status"
      data-testid="native-digital-purchase-notice"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
