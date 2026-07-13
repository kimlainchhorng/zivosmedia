import { Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface TimelineItem {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  title: string;
  subtitle: string;
  timestamp: Date;
  status: "active" | "completed" | "pending";
}

interface ActivityTimelineProps {
  items: TimelineItem[];
  maxHeight?: string;
  emptyMessage?: string;
  className?: string;
}

const statusDot: Record<TimelineItem["status"], string> = {
  active: "bg-primary ring-primary/20",
  completed: "bg-muted-foreground/50 ring-muted/30",
  pending: "bg-amber-500 ring-amber-500/20",
};

const ActivityTimeline = ({
  items,
  maxHeight = "400px",
  emptyMessage = "No recent activity",
  className,
}: ActivityTimelineProps) => {
  if (items.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-10 gap-3 text-center", className)}>
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
          <Activity className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className={className} style={{ maxHeight }}>
      <div className="space-y-1 pr-2">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-2xl border border-border/50 bg-card shadow-sm card-interactive hover:border-primary/20 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-left-3"
              style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
            >
              {/* Icon */}
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", `bg-${item.iconColor}/10`)}>
                <Icon className={cn("w-4 h-4", `text-${item.iconColor}`)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full ring-2 shrink-0", statusDot[item.status])} />
                  <span className="text-sm font-semibold text-foreground truncate">{item.title}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
              </div>

              {/* Time */}
              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                {formatDistanceToNow(item.timestamp, { addSuffix: false })}
              </span>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default ActivityTimeline;
