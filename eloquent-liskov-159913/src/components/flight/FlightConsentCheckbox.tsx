/**
 * Flight Consent Checkbox Component
 * 
 * REQUIRED before partner checkout redirect
 * Uses locked compliance text from flightCompliance.ts
 */

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Shield, Lock, ExternalLink } from "lucide-react";
import { FLIGHT_CONSENT, FLIGHT_DISCLAIMERS } from "@/config/flightCompliance";

interface FlightConsentCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  variant?: 'default' | 'compact';
}

export default function FlightConsentCheckbox({
  checked,
  onCheckedChange,
  disabled = false,
  variant = 'default',
}: FlightConsentCheckboxProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-start gap-3">
        <Checkbox
          id="flight-consent"
          checked={checked}
          onCheckedChange={(val) => onCheckedChange(val === true)}
          disabled={disabled}
        />
        <Label htmlFor="flight-consent" className="text-sm leading-tight cursor-pointer">
          {FLIGHT_CONSENT.checkboxLabel}{" "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy</Link>
        </Label>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      {/* Consent Checkbox */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="flight-consent"
          checked={checked}
          onCheckedChange={(val) => onCheckedChange(val === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <Label 
            htmlFor="flight-consent" 
            className="text-sm font-medium leading-tight cursor-pointer flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4 text-foreground" />
            {FLIGHT_CONSENT.checkboxLabel}
          </Label>
          <p className="text-xs text-muted-foreground">
            {FLIGHT_CONSENT.description}{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            {" "}·{" "}
            <Link to="/partner-disclosure" className="text-primary hover:underline">Partner Disclosure</Link>
          </p>
        </div>
      </div>
      
      {/* Security Notice */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 rounded-lg p-2">
        <Lock className="w-3.5 h-3.5 text-emerald-500" />
        <span>{FLIGHT_CONSENT.privacy}</span>
      </div>

      {/* Ticketing Disclaimer */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
        <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
        <span>{FLIGHT_DISCLAIMERS.ticketing}</span>
      </div>
    </div>
  );
}
