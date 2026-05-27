/**
 * Checkout Terms Acceptance Component
 * Mandatory checkboxes for fare rules and ToS — links open inline
 */

import { useState, useEffect } from "react";
import { AlertCircle, FileText, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CHECKOUT_TERMS } from "@/config/pricing";
import InlineLegalSheet, { useLegalSheet } from "@/components/checkout/InlineLegalSheet";

export interface TermsState {
  fareRules: boolean;
  termsOfService: boolean;
  marketing: boolean;
}

interface CheckoutTermsAcceptanceProps {
  onStateChange: (state: TermsState, isValid: boolean) => void;
  showFareRulesLink?: boolean;
  fareRulesUrl?: string;
  productType?: "flights" | "hotels" | "cars";
  className?: string;
  disabled?: boolean;
}

export function CheckoutTermsAcceptance({
  onStateChange,
  showFareRulesLink = true,
  fareRulesUrl,
  productType = "flights",
  className,
  disabled = false,
}: CheckoutTermsAcceptanceProps) {
  const [state, setState] = useState<TermsState>({
    fareRules: false,
    termsOfService: false,
    marketing: false,
  });
  const [showError, setShowError] = useState(false);
  const { sheet, openSheet, setOpen } = useLegalSheet();

  const isValid = state.fareRules && state.termsOfService;

  useEffect(() => {
    onStateChange(state, isValid);
    if (isValid) setShowError(false);
  }, [state, isValid, onStateChange]);

  const handleChange = (key: keyof TermsState, checked: boolean) => {
    setState(prev => ({ ...prev, [key]: checked }));
  };

  const getFareRulesLabel = () => {
    switch (productType) {
      case "hotels":
        return "I have reviewed the cancellation policy and room conditions";
      case "cars":
        return "I have reviewed the rental terms and conditions";
      default:
        return "I have reviewed fare rules and cancellation policy";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">Review & Accept Terms</span>
      </div>

      {/* Fare Rules / Cancellation Policy */}
      <div className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
        <Checkbox
          id="fare-rules"
          checked={state.fareRules}
          onCheckedChange={(checked) => handleChange("fareRules", checked === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <div className="flex-1 space-y-1">
          <Label
            htmlFor="fare-rules"
            className={cn(
              "text-sm font-medium cursor-pointer flex items-center gap-2",
              !state.fareRules && showError && "text-destructive"
            )}
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
            {getFareRulesLabel()}
            <span className="text-destructive">*</span>
          </Label>
          {showFareRulesLink && fareRulesUrl && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); openSheet("Fare Rules", fareRulesUrl); }}
              className="text-xs text-primary hover:underline"
            >
              View full policy
            </button>
          )}
        </div>
      </div>

      {/* Terms of Service */}
      <div className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
        <Checkbox
          id="terms-of-service"
          checked={state.termsOfService}
          onCheckedChange={(checked) => handleChange("termsOfService", checked === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <div className="flex-1 space-y-1">
          <Label
            htmlFor="terms-of-service"
            className={cn(
              "text-sm font-medium cursor-pointer",
              !state.termsOfService && showError && "text-destructive"
            )}
          >
            I accept ZIVO's{" "}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSheet("Terms of Service", "/terms"); }}
              className="text-primary hover:underline inline"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSheet("Privacy Policy", "/privacy"); }}
              className="text-primary hover:underline inline"
            >
              Privacy Policy
            </button>
            <span className="text-destructive">*</span>
          </Label>
        </div>
      </div>

      {/* Marketing (optional) */}
      <div className="flex items-start gap-3 p-3 rounded-xl border border-border/30 bg-transparent">
        <Checkbox
          id="marketing"
          checked={state.marketing}
          onCheckedChange={(checked) => handleChange("marketing", checked === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <Label
          htmlFor="marketing"
          className="text-sm text-muted-foreground cursor-pointer"
        >
          Send me deals and travel inspiration (optional)
        </Label>
      </div>

      {/* Error message */}
      {showError && !isValid && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{CHECKOUT_TERMS.errorMessage}</span>
        </div>
      )}

      {/* Confirmation copy */}
      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
        {CHECKOUT_TERMS.confirmationCopy}
      </p>

      {/* Inline legal sheet */}
      <InlineLegalSheet
        open={sheet.open}
        onOpenChange={setOpen}
        title={sheet.title}
        url={sheet.url}
      />
    </div>
  );
}

// Inline validation trigger
interface ValidateTermsProps {
  isValid: boolean;
  onValidationFail: () => void;
}

export function useTermsValidation(): [
  boolean,
  (state: TermsState, isValid: boolean) => void,
  () => boolean
] {
  const [termsValid, setTermsValid] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleStateChange = (_state: TermsState, isValid: boolean) => {
    setTermsValid(isValid);
    if (isValid) setShowError(false);
  };

  const triggerValidation = (): boolean => {
    if (!termsValid) {
      setShowError(true);
      return false;
    }
    return true;
  };

  return [termsValid, handleStateChange, triggerValidation];
}

export default CheckoutTermsAcceptance;
