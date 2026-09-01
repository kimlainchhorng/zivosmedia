export type ProviderMode = "sandbox" | "live";
export type EatsExternalPaymentProvider = "paypal" | "square";

/**
 * Payment-provider environments are release authority, not a development
 * default. A missing or misspelled value must never silently route a
 * production checkout to a sandbox account.
 */
export function requireExplicitProviderMode(envName: string): ProviderMode {
  const mode = Deno.env.get(envName)?.trim().toLowerCase();
  if (mode === "sandbox" || mode === "live") return mode;
  throw new Error(`${envName} is not explicitly configured`);
}

const eatsProviderConfiguration: Record<
  EatsExternalPaymentProvider,
  {
    enabledEnv: string;
    modeEnv: string;
    requiredEnv: readonly string[];
    merchantPayoutsImplemented: boolean;
  }
> = {
  paypal: {
    enabledEnv: "EATS_PAYPAL_ENABLED",
    modeEnv: "PAYPAL_MODE",
    merchantPayoutsImplemented: false,
    requiredEnv: [
      "PAYPAL_CLIENT_ID",
      "PAYPAL_CLIENT_SECRET",
      "PAYPAL_EATS_WEBHOOK_ID",
    ],
  },
  square: {
    enabledEnv: "EATS_SQUARE_ENABLED",
    modeEnv: "SQUARE_MODE",
    merchantPayoutsImplemented: false,
    requiredEnv: [
      "SQUARE_ACCESS_TOKEN",
      "SQUARE_LOCATION_ID",
      "SQUARE_EATS_WEBHOOK_SIGNATURE_KEY",
      "SQUARE_EATS_WEBHOOK_NOTIFICATION_URL",
    ],
  },
};

/**
 * New external Eats charges require an independent backend release switch as
 * well as complete provider and signed-webhook configuration. Frontend flags
 * are presentation only and must never be payment authority.
 *
 * Refunds and webhook reconciliation deliberately do not use this gate: an
 * operator must be able to disable new charges without stranding an existing
 * payment that still needs to settle or be refunded.
 */
export function requireEatsProviderCheckoutEnabled(
  provider: EatsExternalPaymentProvider,
): ProviderMode {
  const config = eatsProviderConfiguration[provider];
  if (Deno.env.get(config.enabledEnv)?.trim().toLowerCase() !== "true") {
    throw new Error(`${config.enabledEnv} is not enabled`);
  }
  if (!config.merchantPayoutsImplemented) {
    throw new Error(`${provider} merchant payouts are not implemented`);
  }

  const mode = requireExplicitProviderMode(config.modeEnv);
  const missing = config.requiredEnv.filter(
    (envName) => !Deno.env.get(envName)?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(`${provider} checkout configuration is incomplete`);
  }

  if (provider === "square") {
    const notificationUrl = Deno.env.get(
      "SQUARE_EATS_WEBHOOK_NOTIFICATION_URL",
    )!;
    try {
      if (new URL(notificationUrl).protocol !== "https:") {
        throw new Error("not https");
      }
    } catch {
      throw new Error("square webhook notification URL must use https");
    }
  }

  return mode;
}
