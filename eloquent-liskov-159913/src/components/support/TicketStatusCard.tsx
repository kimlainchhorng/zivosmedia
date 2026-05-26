/**
 * User Ticket Status Card
 * Shows ticket status for users in My Trips
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, Clock, CheckCircle, AlertCircle, 
  ChevronRight, Inbox 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useOrderTickets, type SupportTicket } from "@/hooks/useSupportTickets";
import { Link } from "react-router-dom";

interface TicketStatusCardProps {
  orderId: string;
  className?: string;
}

const statusConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bg: string;
  message: string;
}> = {
  open: {
    icon: Inbox,
    label: "Open",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    message: "We've received your request and will respond shortly.",
  },
  in_progress: {
    icon: MessageSquare,
    label: "In Progress",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    message: "Our team is working on your request.",
  },
  waiting_supplier: {
    icon: Clock,
    label: "Waiting",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    message: "We're waiting for a response from our partner.",
  },
  waiting_response: {
    icon: MessageSquare,
    label: "Awaiting Reply",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    message: "We've responded - please check your email.",
  },
  resolved: {
    icon: CheckCircle,
    label: "Resolved",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    message: "Your request has been resolved.",
  },
  closed: {
    icon: CheckCircle,
    label: "Closed",
    color: "text-muted-foreground",
    bg: "bg-muted/50",
    message: "This ticket is closed.",
  },
};

function TicketItem({ ticket }: { ticket: SupportTicket }) {
  const config = statusConfig[ticket.status || 'open'] || statusConfig.open;
  const Icon = config.icon;

  return (
    <div className="p-4 rounded-2xl border border-border/50 bg-card/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200 active:scale-[0.99] touch-manipulation">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-xl", config.bg)}>
            <Icon className={cn("w-4 h-4", config.color)} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm">{ticket.ticket_number}</span>
              <Badge variant="outline" className={cn("text-xs", config.bg, config.color)}>
                {config.label}
              </Badge>
            </div>
            <p className="font-medium text-sm">{ticket.subject}</p>
            <p className="text-xs text-muted-foreground mt-1">{config.message}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">
            {ticket.updated_at && formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TicketStatusCard({ orderId, className }: TicketStatusCardProps) {
  const { data: tickets, isLoading } = useOrderTickets(orderId);

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-4">
          <div className="h-16 bg-muted/30 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!tickets || tickets.length === 0) {
    return null;
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Support Tickets
          </h3>
          <Link to="/support/tickets">
            <Button variant="ghost" size="sm" className="text-xs rounded-xl hover:bg-primary/10 transition-all duration-200 active:scale-[0.95]">
              View All
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="space-y-2">
          {tickets.slice(0, 2).map(ticket => (
            <TicketItem key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default TicketStatusCard;
