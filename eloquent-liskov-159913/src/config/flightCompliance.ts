/**
 * ZIVO TRAVEL - AFFILIATE-SAFE COMPLIANCE TEXT
 * 
 * ZIVO compares travel prices from licensed partners.
 * Bookings are completed on partner sites.
 * 
 * Last Updated: February 4, 2026
 * Model: Affiliate / Partner Referral
 */

// ============================================
// SELLER OF TRAVEL REGISTRATION (Re-export)
// ============================================

export { ZIVO_SOT_REGISTRATION } from './flightMoRCompliance';

// ============================================
// HEADER MICROCOPY - All Flight Pages
// ============================================

export const FLIGHT_HEADER_MICROCOPY = {
  /** Standard header subtitle for all flight pages */
  standard: "Compare flights from 500+ airlines worldwide. Bookings completed with licensed travel partners.",
  
  /** Shorter version for mobile/compact areas */
  short: "Compare prices · Book with partners",
} as const;

// ============================================
// OTA RESULTS PAGE COMPLIANCE
// ============================================

export const FLIGHT_RESULTS_COMPLIANCE = {
  /** Results page header - OTA mode */
  header: "Select your itinerary and complete your booking with ZIVO.",
  
  /** Below results small text */
  fareRulesNote: "Fare rules, baggage, and refund policies vary by airline and fare.",
  
  /** Seat selection fallback when not available */
  seatSelectionFallback: "Seat selection available after ticketing with the airline.",
  
  /** Aircraft info fallback when not provided */
  aircraftFallback: "Aircraft info shown at confirmation.",
} as const;

// ============================================
// SUPPORT INFO - My Trips Dashboard
// ============================================

export const FLIGHT_SUPPORT_INFO = {
  /** My Trips support box title */
  title: "Need help with your booking?",
  
  /** Description */
  description: "For changes, cancellations, or refunds, please contact the booking provider directly.",
  
  /** Support email */
  email: "support@hizivo.com",
  
  /** Full message */
  full: "Need help with your booking? For changes, cancellations, or refunds, please contact the booking provider directly. For site issues, contact support@hizivo.com.",
} as const;

// ============================================
// LOCKED CTA TEXT (Affiliate-Safe Model)
// ============================================

export const FLIGHT_CTA_TEXT = {
  /** Primary CTA button text - use on all flight booking buttons */
  primary: "Book with Provider",
  
  /** Secondary/alternative CTA text */
  secondary: "View Deal",
  
  /** Mobile sticky CTA */
  mobile: "View Deal",
  
  /** View deal variant (results page) */
  viewDeal: "Book with Provider",
  
  /** Select flight variant */
  select: "View Deal",
  
  /** Traveler info to checkout */
  proceedToPayment: "Continue to Partner",
  
  /** Checkout page */
  checkout: "Complete on Partner Site",
  
  /** Confirm booking */
  confirm: "Book with Provider",
} as const;

// ============================================
// LOCKED DISCLAIMERS (Affiliate-Safe Model)
// ============================================

export const FLIGHT_DISCLAIMERS = {
  /** Main ticketing disclaimer - REQUIRED on all booking pages */
  ticketing: "Flight bookings are completed with licensed travel partners. Prices may change until booking is completed.",
  
  /** Shorter version for inline use */
  ticketingShort: "Bookings completed with licensed travel partners.",
  
  /** Footer disclaimer */
  footer: "ZIVO compares prices from licensed travel partners. Bookings are completed on partner websites. ZIVO may earn a commission when users book through partner links.",
  
  /** Under CTA notice */
  checkout: "Continue to Partner · Final price confirmed on partner site",
  
  /** Price disclaimer */
  price: "Prices may change until booking is completed with the provider.",
  
  /** Support disclaimer */
  support: "For changes, cancellations, or refunds, please contact the booking provider directly.",
  
  /** Payment disclaimer */
  payment: "Payment is processed securely on the partner's website.",
  
  /** Results page notice */
  liveDeals: "Compare prices from multiple travel providers",
  
  /** Detail page disclosure */
  detailDisclosure: "Complete your booking securely with our trusted travel partner.",
  
  /** Refund policy */
  refund: "Refunds are subject to partner and airline policies. Contact the booking provider for assistance.",
} as const;

// ============================================
// LOCKED CONSENT TEXT (Affiliate-Safe Model)
// ============================================

export const FLIGHT_CONSENT = {
  /** Checkbox label - REQUIRED before redirect */
  checkboxLabel: "I agree to the Terms and Conditions.",
  
  /** Full consent description */
  description: "By proceeding, you agree to ZIVO's Terms of Service and Privacy Policy. You will be redirected to complete your booking with our travel partner.",
  
  /** Privacy notice */
  privacy: "Your data is encrypted and securely stored. ZIVO uses your information to facilitate your booking with our travel partners.",
  
  /** Terms link text */
  termsLink: "View Terms",
} as const;

// ============================================
// TRUST BADGES / SECURITY TEXT
// ============================================

export const FLIGHT_TRUST_BADGES = {
  secureCheckout: "Secure partner checkout",
  transparentPricing: "Transparent pricing",
  licensedPartner: "Licensed travel partners",
  noHiddenFees: "No hidden fees",
  dataEncrypted: "256-bit encryption",
  moneyBackGuarantee: "Partner booking guarantee",
} as const;

// ============================================
// EMAIL SUBJECTS (MoR Model)
// ============================================

export const FLIGHT_EMAIL_SUBJECTS = {
  /** Payment confirmation */
  paymentConfirmation: "Payment Received - Your ZIVO Flight Booking",
  
  /** Ticket issued */
  ticketIssued: "Your E-Ticket is Ready - ZIVO Flight Confirmation",
  
  /** Booking pending */
  bookingPending: "Booking Confirmed - E-Ticket Being Issued",
  
  /** Booking cancelled */
  bookingCancelled: "Your ZIVO Flight Booking Has Been Cancelled",
} as const;

// ============================================
// ERROR MESSAGES
// ============================================

export const FLIGHT_ERROR_MESSAGES = {
  /** Offer expired */
  offerExpired: "This flight offer has expired. Please search again for current availability.",
  
  /** Price changed */
  priceChanged: "The price has changed since your search. Please review the updated price before continuing.",
  
  /** No availability */
  noAvailability: "This flight is no longer available. Please select another option.",
  
  /** Ticketing error */
  ticketingError: "We encountered an issue issuing your ticket. Our team has been notified and will contact you shortly.",
  
  /** Payment error */
  paymentError: "Payment could not be processed. Please check your card details and try again.",
  
  /** General error */
  generalError: "Something went wrong. Please try again or contact support.",
} as const;

// ============================================
// TRACKING PARAMS
// ============================================

export const FLIGHT_TRACKING_PARAMS = {
  utm_source: 'zivo',
  utm_medium: 'direct',
  utm_campaign: 'flights',
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the appropriate CTA text based on context
 */
export function getFlightCTAText(context: 'primary' | 'mobile' | 'results' | 'details' | 'checkout' = 'primary'): string {
  switch (context) {
    case 'mobile':
      return FLIGHT_CTA_TEXT.mobile;
    case 'results':
      return FLIGHT_CTA_TEXT.viewDeal;
    case 'details':
      return FLIGHT_CTA_TEXT.primary;
    case 'checkout':
      return FLIGHT_CTA_TEXT.checkout;
    default:
      return FLIGHT_CTA_TEXT.primary;
  }
}

/**
 * Get the ticketing disclaimer (required on all flight pages)
 */
export function getTicketingDisclaimer(variant: 'full' | 'short' | 'footer' = 'full'): string {
  switch (variant) {
    case 'short':
      return FLIGHT_DISCLAIMERS.ticketingShort;
    case 'footer':
      return FLIGHT_DISCLAIMERS.footer;
    default:
      return FLIGHT_DISCLAIMERS.ticketing;
  }
}

/**
 * Build tracking URL with ZIVO params
 */
export function buildFlightTrackingParams(sessionId: string): URLSearchParams {
  return new URLSearchParams({
    ...FLIGHT_TRACKING_PARAMS,
    session: sessionId,
  });
}
