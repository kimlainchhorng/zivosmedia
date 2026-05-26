/**
 * usePaymentLocationRestriction — Determines payment methods based on customer IP/country.
 * 
 * Cambodia IP → Cash + Card allowed
 * Other countries → Card only (no cash)
 */
import { useMemo } from "react";
import { useCountry } from "@/hooks/useCountry";

export type AllowedPaymentMethods = "cash_and_card" | "card_only";

export function usePaymentLocationRestriction() {
  const { country, isCambodia } = useCountry();

  const restriction = useMemo(() => {
    if (isCambodia) {
      return {
        allowedMethods: "cash_and_card" as AllowedPaymentMethods,
        cashAllowed: true,
        reason: "Cambodia customers can pay with cash or card",
      };
    }
    return {
      allowedMethods: "card_only" as AllowedPaymentMethods,
      cashAllowed: false,
      reason: "International customers must pay by card",
    };
  }, [isCambodia]);

  return { ...restriction, country };
}
