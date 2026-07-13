/**
 * Ticket Priority Badge
 * Visual indicator for ticket priority levels
 */

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Zap, Clock, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketPriorityBadgeProps {
  priority: string;
  className?: string;
  showLabel?: boolean;
}

const priorityConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bg: string;
}> = {
  urgent: {
    icon: Zap,
    label: "Urgent",
    color: "text-red-500",
    bg: "bg-red-500/10 border-red-500/30",
  },
  high: {
    icon: AlertTriangle,
    label: "High",
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
  normal: {
    icon: Clock,
    label: "Normal",
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/30",
  },
  low: {
    icon: ArrowDown,
    label: "Low",
    color: "text-muted-foreground",
    bg: "bg-muted/50 border-border",
  },
};

export function TicketPriorityBadge({ priority, className, showLabel = true }: TicketPriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.normal;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1", config.bg, config.color, className)}
    >
      <Icon className="w-3 h-3" />
      {showLabel && config.label}
    </Badge>
  );
}

export default TicketPriorityBadge;
