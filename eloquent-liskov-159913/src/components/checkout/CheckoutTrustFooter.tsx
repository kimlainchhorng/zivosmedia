/**
 * Checkout Trust Footer Component
 * Support contact, trust signals, and legal compliance for checkout pages
 */

import { Lock, Users, DollarSign, Shield, Mail, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHECKOUT_FOOTER } from "@/config/checkoutCompliance";
import { ZIVO_SOT_REGISTRATION } from "@/config/flightMoRCompliance";
import { Link } from "react-router-dom";

interface CheckoutTrustFooterProps {
  className?: string;
  showFinalNote?: boolean;
  compact?: boolean;
}

const trustIcons = {
  "Secure payments": Lock,
  "Trusted partners": Users,
  "Transparent pricing": DollarSign,
};

export default function CheckoutTrustFooter({
  className,
  showFinalNote = true,
  compact = false,
}: CheckoutTrustFooterProps) {
  if (compact) {
    return (
      <div className={cn("text-center text-xs text-muted-foreground", className)}>
        <div className="flex items-center justify-center gap-3 flex-wrap mb-2">
          {CHECKOUT_FOOTER.trust.map((item, i) => {
            const Icon = trustIcons[item as keyof typeof trustIcons] || Shield;
            return (
              <span key={i} className="flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {item}
              </span>
            );
          })}
        </div>
        <p className="mb-2">
          {CHECKOUT_FOOTER.help}{" "}
          <a 
            href={`mailto:${CHECKOUT_FOOTER.supportEmail}`}
            className="text-primary hover:underline"
          >
            Contact Support
          </a>
        </p>
        {/* Legal links */}
        <div className="flex items-center justify-center gap-2 flex-wrap text-[10px] text-muted-foreground/60 mb-2">
          <Link to="/terms" className="hover:text-primary hover:underline">Terms</Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-primary hover:underline">Privacy</Link>
          <span>·</span>
          <Link to="/legal/flight-terms" className="hover:text-primary hover:underline">Flight Terms</Link>
          <span>·</span>
          <Link to="/legal/partner-disclosure" className="hover:text-primary hover:underline">Partner Disclosure</Link>
        </div>
        {/* SOT + final */}
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          {CHECKOUT_FOOTER.final}
        </p>
        <p className="text-[10px] text-muted-foreground/50 mt-1">
          {ZIVO_SOT_REGISTRATION.footerShort}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Trust Signals */}
      <div className="flex items-center justify-center gap-4 md:gap-6 flex-wrap py-4 border-t border-b border-border/50 rounded-xl">
        {CHECKOUT_FOOTER.trust.map((item, i) => {
          const Icon = trustIcons[item as keyof typeof trustIcons] || Shield;
          return (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="w-4 h-4 text-emerald-500" />
              <span>{item}</span>
            </div>
          );
        })}
      </div>

      {/* Support Section */}
      <div className="text-center">
        <p className="font-medium text-sm mb-1 flex items-center justify-center gap-1.5">
          <HelpCircle className="w-4 h-4" />
          {CHECKOUT_FOOTER.help}
        </p>
        <p className="text-sm text-muted-foreground mb-2">
          {CHECKOUT_FOOTER.contact}
        </p>
        <a 
          href={`mailto:${CHECKOUT_FOOTER.supportEmail}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Mail className="w-4 h-4" />
          {CHECKOUT_FOOTER.supportEmail}
        </a>
      </div>

      {/* Legal Links */}
      <div className="flex items-center justify-center gap-3 flex-wrap text-xs text-muted-foreground">
        <Link to="/terms" className="hover:text-primary hover:underline">Terms of Service</Link>
        <span className="text-border">·</span>
        <Link to="/privacy" className="hover:text-primary hover:underline">Privacy Policy</Link>
        <span className="text-border">·</span>
        <Link to="/legal/flight-terms" className="hover:text-primary hover:underline">Flight Terms</Link>
        <span className="text-border">·</span>
        <Link to="/legal/partner-disclosure" className="hover:text-primary hover:underline">Partner Disclosure</Link>
      </div>

      {/* Final Disclaimer + SOT */}
      {showFinalNote && (
        <div className="text-center pt-2 space-y-1">
          <p className="text-xs text-muted-foreground/70">
            {CHECKOUT_FOOTER.final}
          </p>
          <p className="text-[11px] text-muted-foreground/50">
            {ZIVO_SOT_REGISTRATION.footerShort}
          </p>
        </div>
      )}
    </div>
  );
}