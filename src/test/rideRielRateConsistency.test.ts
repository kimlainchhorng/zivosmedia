import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KHR_PER_USD } from "@/lib/currency";
import { usdToKhrString } from "@/lib/khqr";

const root = process.cwd();
const staleRate = "4062" + ".5";

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

const browserConsumers = [
  "src/hooks/useAnalytics.ts",
  "src/hooks/useDriverDashboardData.ts",
  "src/lib/khqr.ts",
  "src/pages/admin/AdminRefundsPage.tsx",
  "src/pages/admin/AdminFinanceSummaryPage.tsx",
  "src/pages/admin/AdminAnalyticsDashboard.tsx",
] as const;

const edgeConsumers = [
  "supabase/functions/cancel-ride-request/index.ts",
  "supabase/functions/create-bakong-ride/index.ts",
  "supabase/functions/resolve-bakong-ride-refund/index.ts",
] as const;

describe("Ride and KHQR riel-rate consistency", () => {
  it("uses the one browser-side ecosystem rate for display and reporting", () => {
    expect(KHR_PER_USD).toBe(4100);
    expect(usdToKhrString(2).replace(/[^0-9]/g, "")).toBe("8200");

    for (const file of browserConsumers) {
      const text = source(file);
      expect(text, `${file} must import the shared browser rate`).toContain(
        'import { KHR_PER_USD } from "@/lib/currency";',
      );
      expect(text, `${file} must not carry the retired rate`).not.toContain(staleRate);
    }
  });

  it("uses one Edge-function rate for Ride payment and refund calculations", () => {
    const shared = source("supabase/functions/_shared/rideMoney.ts");
    expect(shared).toContain("export const KHR_PER_USD = 4100;");

    for (const file of edgeConsumers) {
      const text = source(file);
      expect(text, `${file} must import the shared Edge rate`).toContain(
        'import { KHR_PER_USD } from "../_shared/rideMoney.ts";',
      );
      expect(text, `${file} must not carry the retired rate`).not.toContain(staleRate);
    }

    expect(source("supabase/functions/complete-ride-request/index.ts")).not.toContain(staleRate);
  });
});
