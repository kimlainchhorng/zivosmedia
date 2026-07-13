import { Smartphone, Monitor, MapPin, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import type { ActiveSession } from "@/hooks/useSessions";

interface Props {
  session: ActiveSession;
  isCurrent: boolean;
  onRevoke: () => void;
}

export default function SessionRow({ session, isCurrent, onRevoke }: Props) {
  const Icon = session.device_type === "mobile" ? Smartphone : Monitor;
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border">
      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-foreground truncate">
            {session.device_info ?? "Unknown device"}
          </div>
          {isCurrent && (
            <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">
              This device
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(session.last_active_at), { addSuffix: true })}
          </span>
          {session.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {session.location}
            </span>
          )}
          {session.ip_address && <span>{session.ip_address}</span>}
        </div>
      </div>
      {!isCurrent && (
        <Button variant="ghost" size="icon" onClick={onRevoke} aria-label="Terminate session" className="text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
