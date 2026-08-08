import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  parseSoftwarePricingCatalog,
  SoftwarePricingCatalogError,
  type SoftwarePricingCatalogPlan,
} from "@/lib/software/publicPricingCatalog";

// The dedicated Software project and the newer shared catalog view do not
// expose the same optional columns during the migration window. This is a
// curated public view (never the pricing table), so selecting its public shape
// keeps the browser compatible with both versions without requesting a column
// that may not exist yet.
const PUBLIC_PRICING_COLUMNS = "*";

type PublicCatalogQueryResult = {
  data: unknown;
  error: unknown;
};

type PublicCatalogClient = {
  from: (relation: string) => {
    select: (columns: string) => {
      order: (
        column: string,
        options: { ascending: boolean },
      ) => PromiseLike<PublicCatalogQueryResult>;
    };
  };
};

/**
 * Reads the public catalog view backed by active server pricing records. The
 * subscription endpoint independently resolves the selected plan again before
 * creating a Stripe object; this hook is only a display and selection boundary.
 */
export function useSoftwarePricingCatalog() {
  return useQuery<SoftwarePricingCatalogPlan[]>({
    queryKey: ["software-public-pricing-catalog"],
    queryFn: async () => {
      const catalogClient = supabase as unknown as PublicCatalogClient;
      const { data, error } = await catalogClient
        .from("software_public_pricing_catalog")
        .select(PUBLIC_PRICING_COLUMNS)
        .order("sort_order", { ascending: true });

      if (error) {
        throw new SoftwarePricingCatalogError("Current plan availability could not be loaded.");
      }

      return parseSoftwarePricingCatalog(data);
    },
    staleTime: 60_000,
    retry: 1,
  });
}
