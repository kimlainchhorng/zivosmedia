import { supabase } from "@/integrations/supabase/client";

export type OwnPayoutMethodScope =
  "all" | "account" | "store" | "store_or_account";

export interface OwnerSafePayoutMethod {
  id: string;
  user_id: string;
  store_id: string | null;
  method_type: string;
  rail: string | null;
  label: string | null;
  bank_name: string | null;
  account_holder_name: string | null;
  destination_last4: string | null;
  country_code: string | null;
  is_default: boolean;
  is_verified: boolean;
  verification_status: string | null;
  verification_note: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancePayoutMethod extends OwnerSafePayoutMethod {
  account_number: string | null;
  aba_account_id: string | null;
}

/**
 * Read only the authenticated requester's masked payout destinations.
 * Complete bank and ABA identifiers never cross this browser read boundary.
 */
export async function loadOwnPayoutMethods(
  scope: OwnPayoutMethodScope,
  storeId: string | null = null,
): Promise<OwnerSafePayoutMethod[]> {
  const { data, error } = await (supabase as any).rpc(
    "list_own_customer_payout_methods",
    {
      p_scope: scope,
      p_store_id: storeId,
    },
  );
  if (error) throw error;
  return (data || []) as OwnerSafePayoutMethod[];
}

/** AAL2 finance-only full destination reader. The database rechecks role/MFA. */
export async function loadAllFinancePayoutMethods(): Promise<
  FinancePayoutMethod[]
> {
  const pageSize = 250;
  const maxPages = 80;
  const rows: FinancePayoutMethod[] = [];
  for (let page = 0; page < maxPages; page += 1) {
    const { data, error } = await (supabase as any).rpc(
      "list_finance_customer_payout_methods",
      {
        p_offset: page * pageSize,
        p_limit: pageSize,
      },
    );
    if (error) throw error;
    const next = (data || []) as FinancePayoutMethod[];
    rows.push(...next);
    if (next.length < pageSize) return rows;
  }
  throw new Error("The payout destination queue is too large to load safely");
}

export function maskedPayoutDestination(
  method: Pick<
    OwnerSafePayoutMethod,
    "bank_name" | "destination_last4" | "method_type"
  >,
): string {
  const last4 = method.destination_last4
    ? `•••• ${method.destination_last4}`
    : "ending unavailable";
  if (method.method_type === "aba") return `ABA ${last4}`;
  if (method.method_type === "paypal") return `PayPal ${last4}`;
  return `${method.bank_name || "Bank"} ${last4}`;
}
