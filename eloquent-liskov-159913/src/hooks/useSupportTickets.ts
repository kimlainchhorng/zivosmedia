/**
 * Support Tickets Hook
 * Manages support ticket CRUD, SLA tracking, and escalation
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { differenceInMinutes, differenceInHours, addMinutes } from "date-fns";

// Use database types directly and extend as needed
export interface SupportTicket {
  id: string;
  ticket_number: string | null;
  user_id: string | null;
  order_id?: string | null;
  guest_email?: string | null;
  guest_name?: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  subject: string | null;
  description: string | null;
  first_response_at?: string | null;
  resolved_at: string | null;
  sla_response_due_at?: string | null;
  sla_resolution_due_at?: string | null;
  sla_response_breached?: boolean | null;
  sla_resolution_breached?: boolean | null;
  sla_paused_at?: string | null;
  sla_paused_duration_minutes?: number | null;
  assigned_to: string | null;
  assigned_at?: string | null;
  is_escalated?: boolean | null;
  escalated_at?: string | null;
  escalation_reason?: string | null;
  tags?: string[] | null;
  internal_notes?: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Legacy fields
  search_session_id?: string | null;
  booking_ref?: string | null;
  partner_name?: string | null;
  auto_reply_sent?: boolean | null;
  driver_id?: string | null;
  restaurant_id?: string | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: string;
  sender_id: string | null;
  sender_name: string | null;
  message: string;
  is_internal: boolean;
  attachments: any;
  created_at: string;
}

export interface SLADefinition {
  id: string;
  priority: string;
  response_time_hours: number;
  resolution_time_hours: number | null;
  description: string | null;
  is_active: boolean;
}

export interface TicketTemplate {
  id: string;
  name: string;
  category: string | null;
  subject: string | null;
  body: string;
  is_active: boolean;
  usage_count: number;
}

export interface TicketEscalation {
  id: string;
  ticket_id: string;
  escalated_by: string | null;
  escalation_target: 'operations' | 'finance' | 'admin' | 'supplier';
  reason: string;
  notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
}

// SLA time remaining calculation
export function calculateSLATimeRemaining(dueAt: string | null, pausedAt: string | null, pausedMinutes: number): {
  minutes: number;
  hours: number;
  isBreached: boolean;
  isPaused: boolean;
  percentRemaining: number;
} {
  if (!dueAt) {
    return { minutes: 0, hours: 0, isBreached: false, isPaused: false, percentRemaining: 100 };
  }

  const isPaused = !!pausedAt;
  const now = new Date();
  const due = new Date(dueAt);
  
  // Adjust for paused time
  const adjustedDue = addMinutes(due, pausedMinutes);
  const minutesRemaining = differenceInMinutes(adjustedDue, now);
  
  return {
    minutes: Math.max(0, minutesRemaining),
    hours: Math.floor(Math.max(0, minutesRemaining) / 60),
    isBreached: minutesRemaining < 0,
    isPaused,
    percentRemaining: Math.max(0, Math.min(100, (minutesRemaining / 60) * 10)), // Rough estimate
  };
}

// Format SLA countdown display
export function formatSLACountdown(minutes: number): string {
  if (minutes <= 0) return "Breached";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

// Fetch all tickets (admin)
export function useAdminTickets(filters?: {
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['admin-tickets', filters],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }
      if (filters?.search) {
        query = query.or(`ticket_number.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SupportTicket[];
    },
  });
}

// Fetch user's own tickets
export function useMyTickets() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-tickets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!user,
  });
}

// Fetch tickets for a specific order
export function useOrderTickets(orderId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['order-tickets', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!orderId && !!user,
  });
}

// Fetch single ticket with messages
export function useTicketDetails(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['ticket-details', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;

      // Fetch replies from ticket_replies table
      let messages: TicketMessage[] = [];
      const { data: repliesData } = await supabase
        .from('ticket_replies')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      
      if (repliesData) {
        messages = repliesData.map(r => ({
          id: r.id,
          ticket_id: r.ticket_id,
          sender_type: r.is_admin ? 'agent' : 'user',
          sender_id: r.user_id,
          sender_name: null,
          message: r.message,
          is_internal: false,
          attachments: [],
          created_at: r.created_at,
        })) as TicketMessage[];
      }

      return { ticket: ticket as SupportTicket, messages };
    },
    enabled: !!ticketId,
  });
}

// Fetch SLA definitions
export function useSLADefinitions() {
  return useQuery({
    queryKey: ['sla-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_definitions')
        .select('*')
        .eq('is_active', true)
        .order('response_time_hours', { ascending: true });

      if (error) throw error;
      return data as SLADefinition[];
    },
  });
}

// Fetch templates
export function useTicketTemplates() {
  return useQuery({
    queryKey: ['ticket-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data as TicketTemplate[];
    },
  });
}

// Create ticket mutation
export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      subject: string;
      description: string;
      category: string;
      priority?: string;
      order_id?: string;
      guest_email?: string;
      guest_name?: string;
    }) => {
      // Generate ticket number
      const ticketNumber = `ZS-${Date.now().toString().slice(-6)}`;
      
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNumber,
          user_id: user?.id || null,
          order_id: data.order_id || null,
          guest_email: data.guest_email || null,
          guest_name: data.guest_name || null,
          subject: data.subject,
          description: data.description,
          category: data.category,
          priority: data.priority || 'normal',
          status: 'open',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast.success('Support ticket created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create ticket');
    },
  });
}

// Update ticket mutation
export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, updates }: {
      ticketId: string;
      updates: Partial<SupportTicket>;
    }) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-details', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      toast.success('Ticket updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update ticket');
    },
  });
}

// Add message to ticket
export function useAddTicketMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ticketId, message, isInternal = false, senderType = 'agent' }: {
      ticketId: string;
      message: string;
      isInternal?: boolean;
      senderType?: 'user' | 'agent' | 'system';
    }) => {
      // Use ticket_replies table instead of ticket_messages
      const { data, error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: ticketId,
          user_id: user?.id || null,
          message,
          is_admin: senderType === 'agent',
        })
        .select()
        .single();

      if (error) throw error;

      // Mark first response if agent responding
      if (senderType === 'agent') {
        await supabase
          .from('support_tickets')
          .update({ 
            first_response_at: new Date().toISOString(),
            status: 'in_progress',
          })
          .eq('id', ticketId)
          .is('first_response_at', null);
        
        // Send push notification to ticket owner (customer)
        const { data: ticket } = await supabase
          .from('support_tickets')
          .select('user_id, subject')
          .eq('id', ticketId)
          .single();
        
        if (ticket?.user_id) {
          try {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                user_id: ticket.user_id,
                notification_type: 'support_reply',
                title: 'Support Team Replied',
                body: `Re: ${ticket.subject?.substring(0, 50) || 'Your ticket'}`,
                data: { 
                  type: 'support_reply', 
                  ticket_id: ticketId,
                },
              },
            });
            
          } catch (pushErr) {
            console.warn('[useAddTicketMessage] Failed to send push:', pushErr);
          }
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-details', variables.ticketId] });
      toast.success('Message sent');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send message');
    },
  });
}

// Escalate ticket
export function useEscalateTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ticketId, target, reason, notes }: {
      ticketId: string;
      target: 'operations' | 'finance' | 'admin' | 'supplier';
      reason: string;
      notes?: string;
    }) => {
      // Create escalation record
      const { error: escalationError } = await supabase
        .from('ticket_escalations')
        .insert({
          ticket_id: ticketId,
          escalated_by: user?.id,
          escalation_target: target,
          reason,
          notes,
        });

      if (escalationError) throw escalationError;

      // Update ticket
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .update({
          is_escalated: true,
          escalated_at: new Date().toISOString(),
          escalation_reason: reason,
        })
        .eq('id', ticketId);

      if (ticketError) throw ticketError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-details', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast.success('Ticket escalated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to escalate ticket');
    },
  });
}

// Pause/Resume SLA
export function useToggleSLAPause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, pause }: { ticketId: string; pause: boolean }) => {
      const updates: any = {};
      
      if (pause) {
        updates.sla_paused_at = new Date().toISOString();
        updates.status = 'waiting_supplier';
      } else {
        // Calculate paused duration and add to total
        const { data: ticket } = await supabase
          .from('support_tickets')
          .select('sla_paused_at, sla_paused_duration_minutes')
          .eq('id', ticketId)
          .single();

        if (ticket?.sla_paused_at) {
          const pausedMinutes = differenceInMinutes(new Date(), new Date(ticket.sla_paused_at));
          updates.sla_paused_duration_minutes = (ticket.sla_paused_duration_minutes || 0) + pausedMinutes;
        }
        updates.sla_paused_at = null;
        updates.status = 'in_progress';
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-details', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast.success(variables.pause ? 'SLA paused' : 'SLA resumed');
    },
  });
}

// Get support metrics
export function useSupportMetrics() {
  return useQuery({
    queryKey: ['support-metrics'],
    queryFn: async () => {
      // Get ticket counts by status
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('status, priority, sla_response_breached, sla_resolution_breached, first_response_at, resolved_at, created_at');

      if (error) throw error;

      const now = new Date();
      const openTickets = tickets.filter(t => !['resolved', 'closed'].includes(t.status));
      
      // Calculate metrics
      const metrics = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in_progress').length,
        waitingSupplier: tickets.filter(t => t.status === 'waiting_supplier').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        urgent: openTickets.filter(t => t.priority === 'urgent').length,
        high: openTickets.filter(t => t.priority === 'high').length,
        slaBreached: openTickets.filter(t => t.sla_response_breached || t.sla_resolution_breached).length,
        avgFirstResponseMinutes: 0,
        avgResolutionMinutes: 0,
      };

      // Calculate average response time
      const respondedTickets = tickets.filter(t => t.first_response_at);
      if (respondedTickets.length > 0) {
        const totalResponseMinutes = respondedTickets.reduce((sum, t) => {
          return sum + differenceInMinutes(new Date(t.first_response_at!), new Date(t.created_at));
        }, 0);
        metrics.avgFirstResponseMinutes = Math.round(totalResponseMinutes / respondedTickets.length);
      }

      // Calculate average resolution time
      const resolvedTickets = tickets.filter(t => t.resolved_at);
      if (resolvedTickets.length > 0) {
        const totalResolutionMinutes = resolvedTickets.reduce((sum, t) => {
          return sum + differenceInMinutes(new Date(t.resolved_at!), new Date(t.created_at));
        }, 0);
        metrics.avgResolutionMinutes = Math.round(totalResolutionMinutes / resolvedTickets.length);
      }

      return metrics;
    },
  });
}
