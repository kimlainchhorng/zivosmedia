import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const paypalFunctions = [
  "supabase/functions/create-eats-paypal-order/index.ts",
  "supabase/functions/capture-eats-paypal-order/index.ts",
  "supabase/functions/paypal-eats-webhook/index.ts",
];

const squareFunctions = [
  "supabase/functions/create-eats-square-checkout/index.ts",
  "supabase/functions/square-eats-webhook/index.ts",
];

describe("Eats payment provider release capabilities", () => {
  it("keeps PayPal and Square hidden unless an explicit frontend release flag is enabled", () => {
    const capabilities = source("src/lib/eatsPaymentCapabilities.ts");
    const landing = source("src/pages/EatsLanding.tsx");
    const orderHook = source("src/hooks/useEatsOrder.ts");
    const envTemplate = source(".env.example");
    const deployEnvTemplate = source(".env.deploy.example");

    expect(capabilities).toContain("VITE_EATS_ORDERING_ENABLED");
    expect(capabilities).toContain("EATS_ORDERING_ENABLED");
    expect(capabilities).toContain("VITE_EATS_PAYPAL_ENABLED");
    expect(capabilities).toContain("VITE_EATS_SQUARE_ENABLED");
    expect(capabilities).toContain('if (rail === "paypal")');
    expect(capabilities).toContain('if (rail === "square")');
    expect(landing).toContain(".filter((p) => isEatsPaymentRailEnabled(p.id))");
    expect(orderHook).toContain(
      "if (!isEatsPaymentRailEnabled(params.paymentType))",
    );
    expect(orderHook).toContain("This payment method is not available yet");
    expect(orderHook).toContain("if (!EATS_ORDERING_ENABLED)");
    expect(landing).toContain("Ordering unavailable");
    expect(landing).toContain("restaurant delivery locations are verified");
    expect(envTemplate).toContain("VITE_EATS_ORDERING_ENABLED=false");
    expect(deployEnvTemplate).toContain("VITE_EATS_ORDERING_ENABLED=false");
    expect(envTemplate).toContain("VITE_EATS_PAYPAL_ENABLED=false");
    expect(envTemplate).toContain("VITE_EATS_SQUARE_ENABLED=false");
    expect(envTemplate).toContain("EATS_PAYPAL_ENABLED=false");
    expect(envTemplate).toContain("EATS_SQUARE_ENABLED=false");
    expect(deployEnvTemplate).toContain("EATS_PAYPAL_ENABLED=false");
    expect(deployEnvTemplate).toContain("EATS_SQUARE_ENABLED=false");
  });

  it("requires an explicit backend gate, complete webhook config, and allowlisted mode", () => {
    const helper = source("supabase/functions/_shared/providerMode.ts");
    expect(helper).toContain('mode === "sandbox" || mode === "live"');
    expect(helper).toContain("is not explicitly configured");
    expect(helper).toContain("requireEatsProviderCheckoutEnabled");
    expect(helper).toContain('enabledEnv: "EATS_PAYPAL_ENABLED"');
    expect(helper).toContain('enabledEnv: "EATS_SQUARE_ENABLED"');
    expect(helper.match(/merchantPayoutsImplemented: false/g)).toHaveLength(2);
    expect(helper).toContain("merchant payouts are not implemented");
    expect(helper).toContain('"PAYPAL_EATS_WEBHOOK_ID"');
    expect(helper).toContain('"SQUARE_EATS_WEBHOOK_SIGNATURE_KEY"');
    expect(helper).toContain('"SQUARE_EATS_WEBHOOK_NOTIFICATION_URL"');

    for (const file of [...paypalFunctions, ...squareFunctions]) {
      const code = source(file);
      expect(code).toMatch(
        /require(?:ExplicitProviderMode|EatsProviderCheckoutEnabled)/,
      );
      expect(code).not.toMatch(/MODE"\)\s*\?\?\s*"sandbox"/);
    }

    const paypalCreate = source(paypalFunctions[0]);
    const squareCreate = source(squareFunctions[0]);
    expect(paypalCreate).toContain(
      'requireEatsProviderCheckoutEnabled("paypal")',
    );
    expect(squareCreate).toContain(
      'requireEatsProviderCheckoutEnabled("square")',
    );
    expect(paypalCreate).toContain("status: 503");
    expect(squareCreate).toContain("status: 503");
  });

  it("cannot enable external Eats collection by configuration before merchant payouts exist", () => {
    const helper = source("supabase/functions/_shared/providerMode.ts");
    const envTemplate = source(".env.example");
    const deployEnvTemplate = source(".env.deploy.example");

    expect(helper).toContain("if (!config.merchantPayoutsImplemented)");
    expect(envTemplate).toContain(
      "merchant payout settlement is not implemented",
    );
    expect(envTemplate).toContain("PayPal manual-");
    expect(deployEnvTemplate).toContain("Source currently hard-");
    expect(deployEnvTemplate).toContain("blocks PayPal and Square");
  });

  it("returns retryable failure when signed webhook order resolution cannot read the database", () => {
    const paypal = source("supabase/functions/paypal-eats-webhook/index.ts");
    const square = source("supabase/functions/square-eats-webhook/index.ts");

    expect(paypal).toContain("orderLookupError");
    expect(paypal).toContain("captureLookupError");
    expect(paypal).toContain("customIdLookupError");
    expect(paypal.match(/order_lookup_failed/g)?.length).toBeGreaterThanOrEqual(
      3,
    );
    expect(square).toContain("paymentLookupError");
    expect(square).toContain("noteLookupError");
    expect(square.match(/order_lookup_failed/g)?.length).toBeGreaterThanOrEqual(
      2,
    );
    expect(paypal).toContain("status: 503");
    expect(square).toContain("status: 503");
  });
});
