/** Promotion validation — validates against promo_codes table */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppliedPromo {
  code: string;
  description: string;
  valid: boolean;
  discount_amount?: number;
  discount_type?: string;
  discount_value?: number;
  max_discount?: number;
}

export function usePromotionValidation(..._args: any[]) {
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [discount, setDiscount] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateCode = useCallback(async (code: string, orderTotal?: number) => {
    setIsValidating(true);
    setError(null);
    try {
      const { data: promo, error: fetchError } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", code.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!promo) {
        setError("Invalid promo code");
        setIsValidating(false);
        return { valid: false, error: "Invalid promo code", code, description: "" } as AppliedPromo;
      }

      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        setError("Promo code expired");
        setIsValidating(false);
        return { valid: false, error: "Expired", code, description: "" } as AppliedPromo;
      }

      if (promo.max_uses && (promo.usage_count || 0) >= promo.max_uses) {
        setError("Promo code usage limit reached");
        setIsValidating(false);
        return { valid: false, error: "Usage limit reached", code, description: "" } as AppliedPromo;
      }

      if (promo.min_fare && orderTotal && orderTotal < promo.min_fare) {
        setError(`Minimum order $${promo.min_fare.toFixed(2)} required`);
        setIsValidating(false);
        return { valid: false, error: "Below minimum", code, description: "" } as AppliedPromo;
      }

      // Calculate discount
      let discountAmt = 0;
      if (promo.discount_type === "percentage") {
        discountAmt = (orderTotal || 0) * (promo.discount_value / 100);
        if (promo.max_discount) discountAmt = Math.min(discountAmt, promo.max_discount);
      } else {
        discountAmt = promo.discount_value;
      }

      const applied: AppliedPromo = {
        code: promo.code,
        description: `${promo.discount_type === "percentage" ? `${promo.discount_value}%` : `$${promo.discount_value}`} off`,
        valid: true,
        discount_amount: discountAmt,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        max_discount: promo.max_discount || undefined,
      };

      setAppliedPromo(applied);
      setDiscount(discountAmt);
      setIsValidating(false);
      return applied;
    } catch (err: any) {
      setError(err.message || "Validation failed");
      setIsValidating(false);
      return { valid: false, error: err.message, code, description: "" } as AppliedPromo;
    }
  }, []);

  const removePromo = useCallback(() => {
    setAppliedPromo(null);
    setDiscount(0);
    setError(null);
  }, []);

  return {
    appliedPromo,
    promoCode: appliedPromo?.code || null,
    discount,
    isValidating,
    error,
    validateCode,
    validatePromo: validateCode,
    removePromo,
    clearPromo: removePromo,
  };
}
