import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Ticket } from "lucide-react";
import { useDispatchTicketDetail } from "@/hooks/useSupportChat";
import TicketChat from "@/components/support/TicketChat";

type SupportTicketChatSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  in_progress: "secondary",
  waiting_customer: "outline",
  resolved: "secondary",
  closed: "outline",
};

export default function SupportTicketChatSheet({ open, onOpenChange, ticketId }: SupportTicketChatSheetProps) {
  const { data: ticket } = useDispatchTicketDetail(ticketId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[82vh] p-0 flex flex-col">
        <SheetHeader className="border-b border-border/30 px-4 py-3 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2 truncate text-sm font-semibold text-foreground">
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">{ticket?.subject || "Support conversation"}</span>
              </SheetTitle>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {ticket?.ticket_number && (
                  <Badge variant="outline" className="gap-1">
                    <Ticket className="h-3 w-3" />
                    {ticket.ticket_number}
                  </Badge>
                )}
                {ticket?.status && (
                  <Badge variant={statusVariant[ticket.status] || "outline"}>
                    {ticket.status.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0">
          <TicketChat ticketId={ticketId} ticketStatus={ticket?.status || "open"} />
        </div>
      </SheetContent>
    </Sheet>
  );
}