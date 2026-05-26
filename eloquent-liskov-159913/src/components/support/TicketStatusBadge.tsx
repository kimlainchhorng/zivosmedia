/**
 * Ticket Status Badge
 * Visual indicator for ticket status
 */

import { Badge } from "@/components/ui/badge";
import { 
  Inbox, Clock, MessageSquare, CheckCircle, XCircle, 
  PauseCircle, AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bg: string;
}> = {
  open: {
    icon: Inbox,
    label: "Open",
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/30",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
  in_progress: {
    icon: MessageSquare,
    label: "In Progress",
    color: "text-sky-500",
    bg: "bg-sky-500/10 border-sky-500/30",
  },
  waiting_supplier: {
    icon: PauseCircle,
    label: "Waiting Supplier",
    color: "text-purple-500",
    bg: "bg-purple-500/10 border-purple-500/30",
  },
  waiting_response: {
    icon: Clock,
    label: "Waiting Response",
    color: "text-purple-500",
    bg: "bg-purple-500/10 border-purple-500/30",
  },
  resolved: {
    icon: CheckCircle,
    label: "Resolved",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  },
  closed: {
    icon: XCircle,
    label: "Closed",
    color: "text-muted-foreground",
    bg: "bg-muted/50 border-border",
  },
};

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.open;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1", config.bg, config.color, className)}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

export default TicketStatusBadge;
