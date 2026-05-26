/**
 * Seller of Travel Disclosure Checkbox
 * REQUIRED before payment on flights checkout
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { Shield, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SoTDisclosureCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

const SOT_DISCLOSURE_TEXT = "ZIVO is registered or registration pending as a Seller of Travel where required. Tickets are issued by licensed airline ticketing partners.";

export default function SoTDisclosureCheckbox({
  checked,
  onCheckedChange,
  disabled = false,
  variant = 'default',
  className,
}: SoTDisclosureCheckboxProps) {
  if (variant === 'compact') {
    return (
      <div className={cn("flex items-start gap-3", className)}>
        <Checkbox
          id="sot-disclosure"
          checked={checked}
          onCheckedChange={(val) => onCheckedChange(val === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <Label htmlFor="sot-disclosure" className="text-xs leading-snug cursor-pointer text-muted-foreground">
          I acknowledge the{' '}
          <Link to="/legal/seller-of-travel" className="text-primary hover:underline">
            Seller of Travel
          </Link>{' '}
          disclosure.
        </Label>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border border-amber-500/30 bg-amber-500/5 p-4",
      className
    )}>
      <div className="flex items-start gap-3">
        <Checkbox
          id="sot-disclosure"
          checked={checked}
          onCheckedChange={(val) => onCheckedChange(val === true)}
          disabled={disabled}
          className="mt-1"
        />
        <div className="space-y-2 flex-1">
          <Label 
            htmlFor="sot-disclosure" 
            className="text-sm font-medium leading-snug cursor-pointer flex items-center gap-2"
          >
            <Shield className="w-4 h-4 text-amber-500 shrink-0" />
            I acknowledge the Seller of Travel disclosure *
          </Label>
          
          {/* Disclosure Text */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {SOT_DISCLOSURE_TEXT}
          </p>
          
          {/* Link to full page */}
          <Link 
            to="/legal/seller-of-travel" 
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View full Seller of Travel disclosure
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
