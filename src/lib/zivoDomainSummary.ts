import { supabase } from "@/integrations/supabase/client";

export type ZivoDomainSummaryKey = "driver" | "travel" | "software";

export type ZivoDomainSummaryStatus =
  | "ok"
  | "missing_publishable_key"
  | "pending_summary_rpc"
  | "summary_rpc_error";

export type ZivoDomainSummary = {
  key: ZivoDomainSummaryKey;
  label: string;
  status: ZivoDomainSummaryStatus;
  summary?: unknown;
  message?: string;
  project_url?: string;
  expected_secret?: string;
};

export type ZivoDomainSummaryResponse = {
  user_id: string;
  domains: ZivoDomainSummary[];
  generated_at: string;
};

type FetchDomainSummaryOptions = {
  domains?: ZivoDomainSummaryKey[];
  limit?: number;
};

export async function fetchZivoDomainSummary(options: FetchDomainSummaryOptions = {}) {
  const { data, error } = await supabase.functions.invoke<ZivoDomainSummaryResponse>(
    "zivo-domain-summary",
    {
      body: {
        domains: options.domains,
        limit: options.limit,
      },
    },
  );

  if (error) {
    throw error;
  }

  return data;
}
