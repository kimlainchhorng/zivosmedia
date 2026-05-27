/**
 * Accepted Payment Methods Component
 * Displays supported payment method icons with security messaging
 */

import { CreditCard, Smartphone, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHECKOUT_PAYMENT } from "@/config/checkoutCompliance";

interface AcceptedPaymentMethodsProps {
  showApplePay?: boolean;
  showGooglePay?: boolean;
  compact?: boolean;
  className?: string;
}

export default function AcceptedPaymentMethods({
  showApplePay = true,
  showGooglePay = true,
  compact = false,
  className,
}: AcceptedPaymentMethodsProps) {
  if (compact) {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <div className="flex items-center gap-1.5">
          <VisaIcon className="w-8 h-5" />
          <MastercardIcon className="w-8 h-5" />
          <AmexIcon className="w-8 h-5" />
          {showApplePay && <ApplePayIcon className="w-10 h-6" />}
          {showGooglePay && <GooglePayIcon className="w-10 h-6" />}
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Your payment will be processed securely by ZIVO.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-medium text-muted-foreground">
        {CHECKOUT_PAYMENT.accepted}
      </p>
      
      {/* Payment Method Icons */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-2 bg-muted/50 rounded-xl border border-border/50">
          <VisaIcon className="w-10 h-6" />
          <MastercardIcon className="w-10 h-6" />
          <AmexIcon className="w-10 h-6" />
        </div>
        
        {showApplePay && (
          <div className="p-2 bg-muted/50 rounded-xl border border-border/50">
            <ApplePayIcon className="w-12 h-6" />
          </div>
        )}
        
        {showGooglePay && (
          <div className="p-2 bg-muted/50 rounded-xl border border-border/50">
            <GooglePayIcon className="w-12 h-6" />
          </div>
        )}
      </div>

      {/* Security Notice */}
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Lock className="w-3 h-3" />
        {CHECKOUT_PAYMENT.noStorage}
      </p>
    </div>
  );
}

// Card Brand Icons (simplified SVG representations)
function VisaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <path d="M19.5 20.5L21 11.5H23.5L22 20.5H19.5Z" fill="white" />
      <path d="M29.5 11.7C29 11.5 28.2 11.3 27.2 11.3C24.7 11.3 23 12.6 23 14.4C23 15.7 24.2 16.4 25.1 16.9C26 17.4 26.3 17.7 26.3 18.1C26.3 18.7 25.6 19 24.9 19C23.9 19 23.4 18.9 22.6 18.5L22.3 18.4L22 20.4C22.6 20.7 23.6 20.9 24.7 20.9C27.4 20.9 29 19.6 29 17.7C29 16.7 28.4 15.9 27 15.2C26.2 14.8 25.7 14.5 25.7 14C25.7 13.6 26.2 13.2 27.1 13.2C27.9 13.2 28.5 13.4 29 13.6L29.2 13.7L29.5 11.7Z" fill="white" />
      <path d="M33.5 11.5H31.5C30.9 11.5 30.4 11.7 30.2 12.3L26.5 20.5H29.2L29.7 19H33L33.3 20.5H35.7L33.5 11.5ZM30.5 17.1L31.7 13.8L32.4 17.1H30.5Z" fill="white" />
      <path d="M17.5 11.5L15 17.5L14.7 16C14.2 14.5 12.8 12.9 11.2 12.1L13.5 20.4H16.2L20.2 11.5H17.5Z" fill="white" />
      <path d="M13 11.5H8.8L8.75 11.7C12 12.5 14.2 14.6 15 17L14.2 12.4C14.1 11.7 13.6 11.5 13 11.5Z" fill="#F9A51A" />
    </svg>
  );
}

function MastercardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#F5F5F5" />
      <circle cx="19" cy="16" r="8" fill="#EB001B" />
      <circle cx="29" cy="16" r="8" fill="#F79E1B" />
      <path d="M24 10.5C25.8 12 27 14.3 27 16.9C27 19.5 25.8 21.7 24 23.3C22.2 21.7 21 19.5 21 16.9C21 14.3 22.2 12 24 10.5Z" fill="#FF5F00" />
    </svg>
  );
}

function AmexIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#006FCF" />
      <path d="M9 20L12 12H15L18 20H15.5L15 18.5H12L11.5 20H9ZM12.5 16.5H14.5L13.5 13.5L12.5 16.5Z" fill="white" />
      <path d="M18 20V12H22L24 17L26 12H30V20H28V14L25.5 20H22.5L20 14V20H18Z" fill="white" />
      <path d="M31 20V12H38V14H33V15H37.5V17H33V18H38V20H31Z" fill="white" />
      <path d="M39 20L42 16L39 12H42L43.5 14.5L45 12H48L45 16L48 20H45L43.5 17.5L42 20H39Z" fill="white" />
    </svg>
  );
}

function ApplePayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 56 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="56" height="24" rx="4" fill="black" />
      <path d="M14.5 7.5C14.9 7 15.2 6.3 15.1 5.6C14.5 5.7 13.8 6 13.3 6.5C12.9 6.9 12.5 7.7 12.6 8.3C13.3 8.4 13.9 8 14.5 7.5ZM15.1 8.5C14.2 8.4 13.4 9 12.9 9C12.4 9 11.7 8.5 11 8.5C10 8.5 9 9.2 8.5 10.2C7.4 12.2 8.2 15.2 9.3 16.9C9.8 17.7 10.5 18.6 11.3 18.6C12 18.6 12.3 18.1 13.2 18.1C14.1 18.1 14.3 18.6 15.1 18.6C15.9 18.6 16.5 17.7 17 16.9C17.6 16 17.9 15.2 17.9 15.1C17.9 15.1 16.4 14.5 16.4 12.8C16.4 11.3 17.6 10.6 17.7 10.6C16.9 9.4 15.7 9.3 15.3 9.2C14.6 8.6 14.2 8.5 15.1 8.5Z" fill="white" />
      <path d="M23 6H26.5C28.5 6 30 7.5 30 9.5C30 11.5 28.5 13 26.5 13H24.5V18H23V6ZM24.5 11.5H26.3C27.5 11.5 28.4 10.6 28.4 9.5C28.4 8.4 27.5 7.5 26.3 7.5H24.5V11.5Z" fill="white" />
      <path d="M31 14.5C31 12.2 32.7 10.5 35 10.5C36.4 10.5 37.5 11.2 38 12.2V10.7H39.5V18H38V16.5C37.5 17.6 36.3 18.3 35 18.3C32.7 18.3 31 16.6 31 14.5ZM35.2 16.8C36.8 16.8 38 15.5 38 14.1C38 12.6 36.8 11.4 35.2 11.4C33.6 11.4 32.5 12.7 32.5 14.1C32.5 15.5 33.6 16.8 35.2 16.8Z" fill="white" />
      <path d="M41 10.7H42.5V18C42.5 20 41.2 21 39 21V19.6C40.2 19.6 41 19 41 18V10.7ZM41.8 9C41.2 9 40.7 8.5 40.7 7.9C40.7 7.3 41.2 6.8 41.8 6.8C42.4 6.8 42.9 7.3 42.9 7.9C42.9 8.5 42.4 9 41.8 9Z" fill="white" />
    </svg>
  );
}

function GooglePayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 56 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="56" height="24" rx="4" fill="#F5F5F5" stroke="#E0E0E0" />
      <path d="M26 12.5V15H24.5V8H27.5C28.3 8 29 8.3 29.5 8.8C30 9.3 30.3 10 30.3 10.7C30.3 11.5 30 12.1 29.5 12.6C29 13.1 28.3 13.3 27.5 13.3L26 12.5ZM26 9.3V11.9H27.6C28 11.9 28.4 11.8 28.6 11.5C28.9 11.2 29 10.9 29 10.6C29 10.3 28.9 10 28.6 9.7C28.4 9.4 28 9.3 27.6 9.3H26Z" fill="#5F6368" />
      <path d="M33.5 10.5C34.5 10.5 35.3 10.8 35.9 11.4C36.5 12 36.8 12.8 36.8 13.8V15H35.4V14.2C35 14.8 34.3 15.1 33.5 15.1C32.7 15.1 32.1 14.9 31.6 14.5C31.1 14.1 30.9 13.6 30.9 13C30.9 12.4 31.1 11.9 31.6 11.5C32.1 11.1 32.7 10.9 33.5 10.9V10.5ZM32.3 12.9C32.3 13.2 32.4 13.4 32.6 13.5C32.8 13.7 33.1 13.8 33.5 13.8C34 13.8 34.4 13.6 34.7 13.3C35 13 35.1 12.6 35.1 12.1C34.8 11.8 34.2 11.6 33.5 11.6C33.1 11.6 32.7 11.7 32.5 11.9C32.3 12.1 32.3 12.5 32.3 12.9Z" fill="#5F6368" />
      <path d="M38 10.7H39.8L41.5 14L43.1 10.7H44.9L41.7 16.8L39.4 16.8L40.4 15L38 10.7Z" fill="#5F6368" />
      <path d="M14.8 12.5C14.8 12.2 14.8 11.9 14.7 11.6H10V13.2H12.7C12.6 13.8 12.3 14.3 11.8 14.6V15.9H13.4C14.3 15 14.8 13.8 14.8 12.5Z" fill="#4285F4" />
      <path d="M10 17C11.2 17 12.2 16.6 12.9 15.9L11.3 14.6C10.9 14.9 10.5 15 10 15C8.9 15 7.9 14.3 7.6 13.3H5.9V14.6C6.7 16.1 8.2 17 10 17Z" fill="#34A853" />
      <path d="M7.6 13.3C7.5 12.9 7.4 12.5 7.4 12C7.4 11.5 7.5 11.1 7.6 10.7V9.4H5.9C5.3 10.5 5 11.7 5 13C5 14.3 5.3 15.5 5.9 16.6L7.6 13.3Z" fill="#FBBC05" />
      <path d="M10 9C10.6 9 11.2 9.2 11.6 9.6L12.9 8.3C12.2 7.7 11.2 7.3 10 7.3C8.2 7.3 6.7 8.2 5.9 9.7L7.6 11C7.9 10 8.9 9 10 9Z" fill="#EA4335" />
    </svg>
  );
}
