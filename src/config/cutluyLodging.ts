/**
 * Public rollout scope for the first lodging CutLuy pilot. This is not a
 * credential: the Edge Function independently enforces its secret store-ID
 * allowlist before it can create a payment.
 */
export const CUTLUY_LODGING_PILOT_STORE_IDS = Object.freeze([
  "51518d9b-8621-4727-8a7e-a94765102f6b",
]);

const enabledStores = new Set(CUTLUY_LODGING_PILOT_STORE_IDS);

export function isCutluyLodgingStoreEnabled(storeId: string): boolean {
  return enabledStores.has(storeId);
}
