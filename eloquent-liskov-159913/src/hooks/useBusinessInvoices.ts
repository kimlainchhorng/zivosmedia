/**
 * useBusinessInvoices Hook
 * Fetch invoices from the database for the user's business account
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessMembership } from "./useBusinessMembership";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "overdue";
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
  description: string | null;
}

export interface UseBusinessInvoicesReturn {
  invoices: Invoice[];
  isLoading: boolean;
  error: Error | null;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  refetch: () => void;
}

export function useBusinessInvoices(): UseBusinessInvoicesReturn {
  const { data: membership } = useBusinessMembership();

  const query = useQuery({
    queryKey: ["business-invoices", membership?.company?.id],
    queryFn: async (): Promise<Invoice[]> => {
      if (!membership?.company?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("business_id", membership.company.id)
        .order("issued_at", { ascending: false });

      if (error) {
        console.error("Error fetching invoices:", error);
        throw error;
      }

      if (!data) return [];

      const now = new Date();

      return data.map((invoice) => {
        // Determine status: paid, pending, or overdue
        let status: "paid" | "pending" | "overdue" = "pending";
        
        if (invoice.status === "paid") {
          status = "paid";
        } else if (invoice.due_at && new Date(invoice.due_at) < now) {
          status = "overdue";
        } else {
          status = "pending";
        }

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`,
          amount: Number(invoice.amount) || 0,
          currency: "USD", // Default to USD
          status,
          issuedAt: invoice.issued_at,
          dueAt: invoice.due_at,
          paidAt: null, // Not in current schema
          description: null, // Not in current schema
        };
      });
    },
    enabled: !!membership?.company?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const invoices = query.data || [];
  
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  
  const totalPending = invoices
    .filter((i) => i.status === "pending")
    .reduce((sum, i) => sum + i.amount, 0);
  
  const totalOverdue = invoices
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0);

  return {
    invoices,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    totalPaid,
    totalPending,
    totalOverdue,
    refetch: query.refetch,
  };
}
