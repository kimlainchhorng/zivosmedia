/**
 * User Ticket Detail Page
 * Customer/Driver/Merchant view of their support ticket with chat
 */

import { useParams, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Clock, Tag, MessageSquare } from "lucide-react";
import { useTicketDetails } from "@/hooks/useSupportTickets";
import { TicketChat } from "@/components/support/TicketChat";
import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { TicketPriorityBadge } from "@/components/support/TicketPriorityBadge";

const TicketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useTicketDetails(id);
  const ticket = data?.ticket;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background safe-area-top flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <MessageSquare className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Ticket not found</p>
        <Button variant="link" onClick={() => navigate("/support/tickets")}>
          Back to My Tickets
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm text-muted-foreground">
                  {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
                </span>
                <TicketStatusBadge status={ticket.status || "open"} />
              </div>
              <h1 className="text-lg font-semibold truncate mt-1">
                {ticket.subject || "Support Ticket"}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Section */}
          <Card className="lg:col-span-2 flex flex-col h-[500px] lg:h-[600px]">
            <CardHeader className="pb-2 border-b shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversation
              </CardTitle>
            </CardHeader>
            <TicketChat
              ticketId={ticket.id}
              isAdmin={false}
              ticketStatus={ticket.status || "open"}
            />
          </Card>

          {/* Ticket Info Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ticket Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    Created
                  </div>
                  <p className="text-sm">
                    {format(new Date(ticket.created_at!), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    Status
                  </div>
                  <TicketStatusBadge status={ticket.status || "open"} />
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    Priority
                  </div>
                  <TicketPriorityBadge priority={ticket.priority || "normal"} />
                </div>

                {ticket.category && (
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Tag className="h-3 w-3" />
                      Category
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {ticket.category.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}

                {ticket.updated_at && (
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Last updated{" "}
                    {formatDistanceToNow(new Date(ticket.updated_at), {
                      addSuffix: true,
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Initial Description */}
            {ticket.description && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Your Request</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Help Text */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">
                  Our support team typically responds within 24 hours. You can
                  add additional information by sending a message in the chat.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;
