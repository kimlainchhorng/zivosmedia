/**
 * User Support Tickets Page
 * View all support tickets for the logged-in user
 */

import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { withRedirectParam } from "@/lib/authRedirect";
import { ArrowLeft, MessageSquare, Plus, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTickets, type SupportTicket } from "@/hooks/useSupportTickets";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import TicketStatusBadge from "@/components/support/TicketStatusBadge";
import TicketPriorityBadge from "@/components/support/TicketPriorityBadge";
import SupportRequestForm from "@/components/support/SupportRequestForm";
import MobileBottomNav from "@/components/shared/MobileBottomNav";

type TicketFilter = 'active' | 'resolved' | 'all';

export default function UserSupportTicketsPage() {
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [filter, setFilter] = useState<TicketFilter>('active');
  
  const { data: tickets, isLoading } = useMyTickets();

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    const redirectTarget = `${location.pathname}${location.search ?? ""}`;
    return <Navigate to={withRedirectParam("/login", redirectTarget)} replace />;
  }

  const filteredTickets = tickets?.filter(ticket => {
    if (filter === 'active') {
      return !['resolved', 'closed'].includes(ticket.status || '');
    }
    if (filter === 'resolved') {
      return ['resolved', 'closed'].includes(ticket.status || '');
    }
    return true;
  }) || [];

  const activeCount = tickets?.filter(t => !['resolved', 'closed'].includes(t.status || '')).length || 0;
  const resolvedCount = tickets?.filter(t => ['resolved', 'closed'].includes(t.status || '')).length || 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild aria-label="Go back">
                <Link to="/app">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold">Support Tickets</h1>
                <p className="text-sm text-muted-foreground">
                  Your help requests
                </p>
              </div>
            </div>
            <SupportRequestForm 
              triggerButton={
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Request
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container px-4 py-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as TicketFilter)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">
              Active {activeCount > 0 && `(${activeCount})`}
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved {resolvedCount > 0 && `(${resolvedCount})`}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTickets.length > 0 ? (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">
                    {filter === 'active'
                      ? "No active tickets"
                      : filter === 'resolved'
                      ? "No resolved tickets"
                      : "No tickets yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Need help with something? Create a support request.
                  </p>
                  <SupportRequestForm 
                    triggerButton={
                      <Button>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Contact Support
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Response Time Expectation */}
        <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
          <p className="text-sm text-muted-foreground">
            We typically respond within <strong className="text-foreground">24 hours</strong>. 
            Urgent payment issues are prioritized.
          </p>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const getCategoryLabel = (category: string | null) => {
    const labels: Record<string, string> = {
      booking_issue: 'Booking Issue',
      payment_issue: 'Payment Issue',
      cancellation_refund: 'Cancellation / Refund',
      change_request: 'Change Request',
      technical_issue: 'Technical Issue',
      general_inquiry: 'General Inquiry',
      eats: 'Eats Order',
    };
    return labels[category || ''] || category || 'General';
  };

  return (
    <Link to={`/support/tickets/${ticket.id}`}>
      <Card className="overflow-hidden hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-sm text-muted-foreground">{ticket.ticket_number}</span>
                <TicketStatusBadge status={ticket.status || 'open'} />
                {ticket.priority === 'urgent' || ticket.priority === 'high' ? (
                  <TicketPriorityBadge priority={ticket.priority} showLabel={false} />
                ) : null}
              </div>
              <h3 className="font-medium mb-1 truncate">{ticket.subject}</h3>
              <p className="text-sm text-muted-foreground">{getCategoryLabel(ticket.category)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">
                {ticket.created_at && formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </p>
              {ticket.first_response_at && (
                <p className="text-xs text-emerald-500 mt-1">Responded</p>
              )}
            </div>
          </div>

          {ticket.description && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {ticket.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
