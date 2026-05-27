/**
 * HIZIVO HOTELS - LOCKED COMPLIANCE TEXT
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

export const HOTEL_CTA_TEXT = {
  /** Primary CTA button text - use on all hotel booking buttons */
  primary: "Continue to secure checkout",
  
  /** Secondary/alternative CTA text */
  secondary: "Book with our partner",
  
  /** Mobile sticky CTA */
  mobile: "Continue to checkout",
  
  /** View deal variant (results page) - UPDATED FOR PARTNER CLARITY */
  viewDeal: "View deal on partner site",
  
  /** Select hotel variant */
  select: "Select Hotel",
  
  /** Hero page CTA */
  searchHotels: "Search Hotels",
  
  /** Helper text under CTA */
  helperText: "Final booking completed on partner site.",
} as const;

// ============================================
// LOCKED DISCLAIMERS (PRODUCTION)
// ============================================

export const HOTEL_DISCLAIMERS = {
  /** Main MoR disclaimer - REQUIRED on all hotel pages */
  partnerBooking: "ZIVO is not the merchant of record. Hotel bookings are completed with licensed third-party providers.",
  
  /** Shorter version for inline use */
  partnerBookingShort: "Bookings completed with licensed hotel partners.",
  
  /** Footer disclaimer */
  footer: "ZIVO is not the merchant of record for hotels. All hotel bookings, payments, and confirmations are handled by licensed third-party providers.",
  
  /** Partner redirect notice */
  redirect: "You will be redirected to our trusted booking partner to complete your reservation securely.",
  
  /** Price disclaimer */
  price: "Prices shown are estimates and may change. Final price confirmed on partner checkout.",
  
  /** Price disclaimer - results page */
  indicativePrice: "Indicative prices shown. Final price confirmed on partner site.",
  
  /** Support disclaimer */
  support: "For hotel changes, cancellations, or refunds, please contact the booking partner listed in your confirmation email.",
  
  /** Website support */
  websiteSupport: "For website issues, contact support@hizivo.com.",
  
  /** Payment disclaimer */
  payment: "ZIVO does not collect or process payments for hotels. All payments are handled by the booking partner.",
  
  /** Results trust copy */
  resultsTrust: "Compare hotel deals from licensed travel partners.",
  
  /** Hero headline */
  heroHeadline: "Compare Hotels Worldwide — Book Securely with Partners",
  
  /** Hero subheadline */
  heroSubheadline: "Search real-time hotel prices and complete booking securely with licensed partners.",
} as const;

// ============================================
// LOCKED CONSENT TEXT (PRODUCTION)
// ============================================

export const HOTEL_CONSENT = {
  /** Checkbox label - REQUIRED before partner redirect */
  checkboxLabel: "I agree to share my information with the booking partner.",
  
  /** Full consent description */
  description: "Your details will be securely transmitted to our licensed hotel partner to complete your booking. By proceeding, you agree to the partner's terms and conditions.",
  
  /** Privacy notice */
  privacy: "Your data is encrypted and only shared with the booking partner. ZIVO does not store payment information.",
  
  /** Terms link text */
  termsLink: "View Partner Terms",
} as const;

// ============================================
// TRUST BADGES / SECURITY TEXT
// ============================================

export const HOTEL_TRUST_BADGES = {
  secureCheckout: "Secure partner checkout",
  transparentPricing: "Transparent pricing",
  licensedPartner: "Licensed hotel partner",
  noHiddenFees: "No hidden fees from ZIVO",
  dataEncrypted: "Data encrypted in transit",
} as const;

// ============================================
// ERROR MESSAGES
// ============================================

export const HOTEL_ERROR_MESSAGES = {
  /** Room expired */
  roomExpired: "This room offer has expired. Please search again for current availability.",
  
  /** Price changed */
  priceChanged: "The price has changed since your search. Please review the updated price before continuing.",
  
  /** No availability */
  noAvailability: "This hotel/room is no longer available. Please select another option.",
  
  /** Partner error */
  partnerError: "We're having trouble connecting to our booking partner. Please try again in a moment.",
  
  /** General error */
  generalError: "Something went wrong. Please try again or contact support.",
} as const;

// ============================================
// TRACKING PARAMS
// ============================================

export const HOTEL_TRACKING_PARAMS = {
  utm_source: 'hizivo',
  utm_medium: 'partner',
  utm_campaign: 'hotels',
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the appropriate CTA text based on context
 */
export function getHotelCTAText(context: 'primary' | 'mobile' | 'results' | 'details' = 'primary'): string {
  switch (context) {
    case 'mobile':
      return HOTEL_CTA_TEXT.mobile;
    case 'results':
      return HOTEL_CTA_TEXT.viewDeal;
    case 'details':
      return HOTEL_CTA_TEXT.primary;
    default:
      return HOTEL_CTA_TEXT.primary;
  }
}

/**
 * Get the partner booking disclaimer (required on all hotel pages)
 */
export function getHotelDisclaimer(variant: 'full' | 'short' | 'footer' = 'full'): string {
  switch (variant) {
    case 'short':
      return HOTEL_DISCLAIMERS.partnerBookingShort;
    case 'footer':
      return HOTEL_DISCLAIMERS.footer;
    default:
      return HOTEL_DISCLAIMERS.partnerBooking;
  }
}

/**
 * Build tracking URL with partner-compliant params
 */
export function buildHotelTrackingParams(sessionId: string): URLSearchParams {
  return new URLSearchParams({
    ...HOTEL_TRACKING_PARAMS,
    subid: sessionId,
  });
}
