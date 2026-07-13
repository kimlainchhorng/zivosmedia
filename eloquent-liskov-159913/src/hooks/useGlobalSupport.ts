/**
 * Global Support Hook — reads from support_tickets table
 * Returns any-typed data for backward compat with consumer pages
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CreateTicketInput {
  subject: string;
  description: string;
  category: string;
  service: string;
  service_type?: string;
  priority?: string;
}

export const SUPPORT_CATEGORIES = [
  { value: "general", label: "General", categories: ["account", "app", "other"] },
  { value: "billing", label: "Billing", categories: ["payment", "refund", "charge"] },
  { value: "technical", label: "Technical", categories: ["bug", "performance", "feature"] },
  { value: "order", label: "Order", categories: ["delivery", "quality", "missing"] },
];

export function getCategoryLabel(value: string) {
  return SUPPORT_CATEGORIES.find(c => c.value === value)?.label ?? value;
}

export function useSupportTickets(statusFilter?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["support-tickets", user?.id, statusFilter],
    queryFn: async (): Promise<any[]> => {
      if (!user) return [];
      let query = supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      // Map to include service_type alias
      return (data || []).map(t => ({
        ...t,
        service_type: t.ticket_type || t.category,
      })) as any[];
    },
    enabled: !!user,
  });
}

export function useCreateSupportTicket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      if (!user) throw new Error("Not authenticated");
      const ticketNumber = `ZT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject: input.subject,
          description: input.description,
          category: input.category,
          ticket_type: input.service_type || input.service,
          priority: input.priority || "medium",
          ticket_number: ticketNumber,
          status: "open",
        })
        .select("id, ticket_number")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Support ticket created");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create ticket");
    },
  });
}
