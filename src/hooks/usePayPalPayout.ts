/**
 * usePayPalPayout — Send wallet balance to a PayPal email via PayPal Payouts API.
 * Works globally including Cambodia, Vietnam, and other regions Stripe doesn't cover.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeSensitive } from "@/lib/security/sensitiveInvoke";
import { toast } from "sonner";

/**
 * Both edge functions below are enforceAal2-gated: they answer
 * 403 {"code":"mfa_required"} to any session below AAL2, and a normal
 * password-only session is aal1. Called plainly, that 403 reaches the user as
 * supabase-js's "Edge Function returned a non-2xx status code" and the payout
 * button simply does not work.
 *
 * These hooks take `ensureAal2` rather than calling useStepUpMfa() themselves,
 * because the challenge needs a dialog rendered in the component's own tree —
 * a hook cannot put it there. The caller does:
 *
 *   const { ensureAal2, dialog } = useStepUpMfa();
 *   const payout = usePayPalPayout(ensureAal2);
 *   return <>{dialog}...</>;
 *
 * It stays optional so an existing caller keeps compiling; without it the call
 * behaves exactly as it does today.
 */
type EnsureAal2 = (label?: string) => Promise<boolean>;

async function invokeMaybeSensitive(
  fn: string,
  opts: { body?: unknown; headers?: Record<string, string> },
  ensureAal2: EnsureAal2 | undefined,
  label: string,
) {
  return ensureAal2
    ? await invokeSensitive<{ error?: string }>(fn, opts, ensureAal2, label)
    : await supabase.functions.invoke(fn, opts);
}

export function usePayPalPayout(ensureAal2?: EnsureAal2) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { amount_cents: number; paypal_email: string }) => {
      const idempotencyKey = `paypal-payout-${crypto.randomUUID()}`;
      const { data, error } = await invokeMaybeSensitive("paypal-payout", {
        headers: { "Idempotency-Key": idempotencyKey },
        body: params,
      }, ensureAal2, "Authorize PayPal payout");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      toast.success("PayPal payout sent! 💸", {
        description: "Funds typically arrive in your PayPal account within minutes.",
      });
    },
    onError: (e: any) => toast.error(e?.message || "PayPal payout failed"),
  });
}

export function useSavePayPalEmail(ensureAal2?: EnsureAal2) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { userId?: string; paypal_email: string }) => {
      const idempotencyKey = `creator-paypal-method-${crypto.randomUUID()}`;
      const { data, error } = await invokeMaybeSensitive("creator-payout-method-record", {
        headers: { "Idempotency-Key": idempotencyKey },
        body: { method: "paypal", paypal_email: params.paypal_email },
      }, ensureAal2, "Confirm PayPal email");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-profile"] });
      queryClient.invalidateQueries({ queryKey: ["creator-profile-setup"] });
      toast.success("PayPal email saved");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save PayPal email"),
  });
}
