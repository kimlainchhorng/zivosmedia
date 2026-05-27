/**
 * HIZIVO CAR RENTALS - LOCKED COMPLIANCE TEXT
 * 
 * DO NOT MODIFY WITHOUT LEGAL APPROVAL
 * These texts are required for partner compliance
 * 
 * Last Updated: February 2, 2026
 * Approved By: Legal/Compliance Team
 */

// ============================================
// LOCKED CTA TEXT (PRODUCTION)
// ============================================

export const CAR_CTA_TEXT = {
  /** Primary CTA button text - use on all car rental booking buttons */
  primary: "Continue to secure checkout",
  
  /** Secondary/alternative CTA text */
  secondary: "Book with our partner",
  
  /** Mobile sticky CTA */
  mobile: "Continue to checkout",
  
  /** View deal variant (results page) */
  viewDeal: "View Deal",
  
  /** Select car variant */
  select: "Select Car",
} as const;

// ============================================
// LOCKED DISCLAIMERS (PRODUCTION)
// ============================================

export const CAR_DISCLAIMERS = {
  /** Main MoR disclaimer - REQUIRED on all car rental pages */
  partnerBooking: "ZIVO is not the merchant of record. Car rentals are fulfilled by licensed third-party providers.",
  
  /** Shorter version for inline use */
  partnerBookingShort: "Rentals fulfilled by licensed car rental partners.",
  
  /** Footer disclaimer */
  footer: "ZIVO is not the merchant of record for car rentals. All car rental bookings, payments, and confirmations are handled by licensed third-party providers.",
  
  /** Partner redirect notice */
  redirect: "You will be redirected to our trusted rental partner to complete your reservation securely.",
  
  /** Price disclaimer */
  price: "Prices shown are estimates and may change. Final price confirmed on partner checkout.",
  
  /** Support disclaimer */
  support: "For rental changes, cancellations, or refunds, please contact the rental partner listed in your confirmation email.",
  
  /** Payment disclaimer */
  payment: "ZIVO does not collect or process payments for car rentals. All payments are handled by the rental partner.",
  
  /** Insurance disclaimer - NON-ADVICE */
  insurance: "Insurance options shown are for informational purposes only. ZIVO does not provide insurance advice. Review coverage details with the rental provider.",
} as const;

// ============================================
// LOCKED CONSENT TEXT (PRODUCTION)
// ============================================

export const CAR_CONSENT = {
  /** Checkbox label - REQUIRED before partner redirect */
  checkboxLabel: "I agree to share my information with the booking partner.",
  
  /** Full consent description */
  description: "Your details will be securely transmitted to our licensed car rental partner to complete your booking. By proceeding, you agree to the partner's terms and conditions.",
  
  /** Privacy notice */
  privacy: "Your data is encrypted and only shared with the rental partner. ZIVO does not store payment information.",
  
  /** Terms link text */
  termsLink: "View Partner Terms",
} as const;

// ============================================
// TRUST BADGES / SECURITY TEXT
// ============================================

export const CAR_TRUST_BADGES = {
  secureCheckout: "Secure partner checkout",
  transparentPricing: "Transparent pricing",
  licensedPartner: "Licensed rental partner",
  noHiddenFees: "No hidden fees from ZIVO",
  dataEncrypted: "Data encrypted in transit",
} as const;

// ============================================
// ERROR MESSAGES
// ============================================

export const CAR_ERROR_MESSAGES = {
  /** Offer expired */
  offerExpired: "This car rental offer has expired. Please search again for current availability.",
  
  /** Price changed */
  priceChanged: "The price has changed since your search. Please review the updated price before continuing.",
  
  /** No availability */
  noAvailability: "This vehicle is no longer available. Please select another option.",
  
  /** Partner error */
  partnerError: "We're having trouble connecting to our rental partner. Please try again in a moment.",
  
  /** General error */
  generalError: "Something went wrong. Please try again or contact support.",
} as const;

// ============================================
// TRACKING PARAMS
// ============================================

export const CAR_TRACKING_PARAMS = {
  utm_source: 'hizivo',
  utm_medium: 'partner',
  utm_campaign: 'cars',
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the appropriate CTA text based on context
 */
export function getCarCTAText(context: 'primary' | 'mobile' | 'results' | 'details' = 'primary'): string {
  switch (context) {
    case 'mobile':
      return CAR_CTA_TEXT.mobile;
    case 'results':
      return CAR_CTA_TEXT.viewDeal;
    case 'details':
      return CAR_CTA_TEXT.primary;
    default:
      return CAR_CTA_TEXT.primary;
  }
}

/**
 * Get the partner booking disclaimer (required on all car rental pages)
 */
export function getCarDisclaimer(variant: 'full' | 'short' | 'footer' = 'full'): string {
  switch (variant) {
    case 'short':
      return CAR_DISCLAIMERS.partnerBookingShort;
    case 'footer':
      return CAR_DISCLAIMERS.footer;
    default:
      return CAR_DISCLAIMERS.partnerBooking;
  }
}

/**
 * Build tracking URL with partner-compliant params
 */
export function buildCarTrackingParams(sessionId: string): URLSearchParams {
  return new URLSearchParams({
    ...CAR_TRACKING_PARAMS,
    subid: sessionId,
  });
}
