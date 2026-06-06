import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(async () => ({
        data: {
          user_id: "user-1",
          domains: [],
          generated_at: "2026-06-06T00:00:00.000Z",
        },
        error: null,
      })),
    },
  },
}));

import { supabase } from "@/integrations/supabase/client";
import { fetchZivoDomainSummary } from "./zivoDomainSummary";

describe("fetchZivoDomainSummary", () => {
  it("calls the zivo-domain-summary Edge Function with requested domains", async () => {
    await expect(fetchZivoDomainSummary({ domains: ["driver", "travel"], limit: 5 })).resolves.toEqual({
      user_id: "user-1",
      domains: [],
      generated_at: "2026-06-06T00:00:00.000Z",
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith("zivo-domain-summary", {
      body: {
        domains: ["driver", "travel"],
        limit: 5,
      },
    });
  });
});
