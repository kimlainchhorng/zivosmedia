/**
 * Support Chat Hooks
 * Real-time chat functionality for support tickets
 */

import { useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { assessChatMessageRisk, sanitizeOutgoingMessage } from "@/lib/security/chatContentSafety";
import { subscribeToPooledPostgresChanges } from "@/services/chatRealtimePool";

export interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string | null;
  message: string;
  is_admin: boolean;
  created_at: string;
}

// Fetch messages for a ticket
export function useTicketMessages(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from("ticket_replies")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as TicketReply[];
    },
    enabled: !!ticketId,
  });
}

// Send a message to a ticket
export function useSendTicketMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      ticketId,
      message,
      isAdmin = false,
    }: {
      ticketId: string;
      message: string;
      isAdmin?: boolean;
    }) => {
      const cleanMessage = sanitizeOutgoingMessage(message);
      if (!cleanMessage) {
        throw new Error("Message cannot be empty");
      }

      const risk = assessChatMessageRisk(cleanMessage);
      if (risk.blocked) {
        throw new Error("Message blocked for security reasons");
      }

      const { data, error } = await supabase
        .from("ticket_replies")
        .insert({
          ticket_id: ticketId,
          user_id: user?.id || null,
          message: cleanMessage,
          is_admin: isAdmin,
        })
        .select()
        .single();

      if (error) throw error;

      // If admin is responding, update ticket status to in_progress
      if (isAdmin) {
        await supabase
          .from("support_tickets")
          .update({
            status: "in_progress",
            first_response_at: new Date().toISOString(),
          })
          .eq("id", ticketId)
          .is("first_response_at", null);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-details", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["dispatch-tickets"] });
    },
    onError: (error: Error) => {
      console.error("[useSendTicketMessage] Error:", error);
      toast.error(error.message || "Failed to send message");
    },
  });
}

// Real-time subscription for ticket messages
export function useTicketChatRealtime(
  ticketId: string | undefined,
  onNewMessage?: (message: TicketReply) => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ticketId) return;

    const unsubscribe = subscribeToPooledPostgresChanges(
      {
        poolKey: `ticket-chat:${ticketId}`,
        event: "INSERT",
        schema: "public",
        table: "ticket_replies",
        filter: `ticket_id=eq.${ticketId}`,
      },
      (payload) => {
        const newMessage = payload.new as TicketReply;

        // Update the messages cache
        queryClient.setQueryData<TicketReply[]>(
          ["ticket-messages", ticketId],
          (old) => {
            if (!old) return [newMessage];
            // Avoid duplicates
            if (old.some((m) => m.id === newMessage.id)) return old;
            return [...old, newMessage];
          }
        );

        // Callback for notifications
        if (onNewMessage) {
          onNewMessage(newMessage);
        }
      }
    );

    return unsubscribe;
  }, [ticketId, queryClient, onNewMessage]);
}

// Real-time subscription for dispatch inbox
export function useDispatchTicketsRealtime(
  onTicketChange?: (payload: any) => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = subscribeToPooledPostgresChanges(
      {
        poolKey: "dispatch-tickets",
        event: "*",
        schema: "public",
        table: "support_tickets",
      },
      (payload) => {
        // Invalidate the tickets list
        queryClient.invalidateQueries({ queryKey: ["dispatch-tickets"] });

        if (onTicketChange) {
          onTicketChange(payload);
        }
      }
    );

    return unsubscribe;
  }, [queryClient, onTicketChange]);
}

// Fetch tickets for dispatch inbox
export function useDispatchTickets(filters?: {
  status?: string;
  priority?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["dispatch-tickets", filters],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(100);

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.priority && filters.priority !== "all") {
        query = query.eq("priority", filters.priority);
      }
      if (filters?.search) {
        query = query.or(
          `ticket_number.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Fetch single ticket for dispatch
export function useDispatchTicketDetail(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-details", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });
}

// Update ticket (status, priority, assignment)
export function useUpdateDispatchTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      ticketId,
      updates,
    }: {
      ticketId: string;
      updates: {
        status?: string;
        priority?: string;
        assigned_to?: string | null;
        tags?: string[];
      };
    }) => {
      const { data, error } = await supabase
        .from("support_tickets")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticket-details", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["dispatch-tickets"] });
      toast.success("Ticket updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update ticket");
    },
  });
}

// Assign ticket to current user
export function useAssignTicketToMe() {
  const { user } = useAuth();
  const updateTicket = useUpdateDispatchTicket();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      if (!user) throw new Error("Not authenticated");
      
      return updateTicket.mutateAsync({
        ticketId,
        updates: {
          assigned_to: user.id,
          status: "in_progress",
        },
      });
    },
  });
}

// Count tickets by status for badges
export function useTicketStatusCounts() {
  return useQuery({
    queryKey: ["ticket-status-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("status");

      if (error) throw error;

      const counts: Record<string, number> = {
        all: data.length,
        open: 0,
        in_progress: 0,
        pending: 0,
        resolved: 0,
        closed: 0,
      };

      data.forEach((ticket) => {
        const status = ticket.status || "open";
        if (counts[status] !== undefined) {
          counts[status]++;
        }
      });

      return counts;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
