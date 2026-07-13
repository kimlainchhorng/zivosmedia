// ServiceOrderProgressBar
// Horizontal status timeline for a service order.

import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { flowFor, STATUS_LABEL, type ServiceOrderKind, type ServiceOrderStatus } from "@/types/serviceOrder";

interface Props {
  kind: ServiceOrderKind;
  status: ServiceOrderStatus;
  className?: string;
}

export default function ServiceOrderProgressBar({ kind, status, className }: Props) {
  const flow = flowFor(kind);
  const cancelled = status === "cancelled" || status === "shop_rejected";
  const idx = cancelled ? -1 : flow.indexOf(status);

  return (
    <div className={cn("w-full", className)}>
      <ol className="flex items-start gap-2 overflow-x-auto py-2">
        {flow.map((step, i) => {
          const done    = !cancelled && i < idx;
          const current = !cancelled && i === idx;
          const Icon    = done ? CheckCircle2 : Circle;
          return (
            <li key={step} className="flex flex-col items-center min-w-[72px]">
              <Icon className={cn(
                "h-5 w-5 transition-colors",
                done   && "text-primary",
                current && "text-primary animate-pulse",
                !done && !current && "text-muted-foreground/40",
              )} />
              <span className={cn(
                "mt-1 text-[10px] text-center leading-tight",
                done   && "text-foreground",
                current && "text-primary font-medium",
                !done && !current && "text-muted-foreground/60",
              )}>
                {STATUS_LABEL[step]}
              </span>
            </li>
          );
        })}
      </ol>
      {cancelled && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{STATUS_LABEL[status]}</span>
        </div>
      )}
    </div>
  );
}
