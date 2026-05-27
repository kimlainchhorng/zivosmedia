/**
 * Checkout Compliance Copy Configuration
 * Centralized copy for OTA checkout experience
 */

export const CHECKOUT_HEADER = {
  title: "Secure Checkout",
  icon: "lock",
  subtitle: "Your booking is processed securely by ZIVO.",
};

export const CHECKOUT_PRICE = {
  noHiddenFees: "No hidden fees. Final price shown before payment.",
  finalPrice: "Final price",
};

export const CHECKOUT_PASSENGER = {
  title: "Passenger Details",
  subtitle: "Please enter passenger information exactly as shown on government-issued ID.",
  warning: "Name changes may not be allowed after booking.",
  helperTooltip: "Enter your name exactly as it appears on your passport or ID",
};

export const CHECKOUT_PAYMENT = {
  title: "Payment Information",
  security: "Payments are processed securely by ZIVO using PCI-compliant systems.",
  noStorage: "Your payment data is encrypted and protected.",
  accepted: "Accepted payment methods:",
  methods: ["Credit / Debit Card", "Apple Pay", "Google Pay"],
};

export const CHECKOUT_NOTICE = {
  title: "Important notice:",
  flights: {
    items: [
      "All fares are subject to airline rules and conditions",
      "Tickets are issued after successful payment",
      "Changes and cancellations follow fare rules",
    ],
    disclaimer: "Ticket rules, baggage, and refund policies vary by fare and airline.",
  },
  hotels: {
    items: [
      "Rates are confirmed at time of booking",
      "Cancellation policies vary by property",
      "Confirmation sent after successful payment",
    ],
    disclaimer: "Hotel reservations are confirmed by ZIVO or its accommodation partners.",
  },
  cars: {
    items: [
      "Rates are confirmed at time of booking",
      "Rental terms set by the rental company",
      "Confirmation sent after successful payment",
    ],
    disclaimer: "Car rentals are fulfilled by rental companies through ZIVO.",
  },
};

export const CHECKOUT_CTA = {
  button: "Complete Booking",
  subtext: "Tickets are issued after successful payment and confirmation.",
  buttonAlt: "Pay Securely",
};

export const CHECKOUT_CONFIRMATION = {
  success: "Thank You for Your Booking",
  icon: "plane",
  received: "Your booking has been confirmed.",
  email: "A confirmation email with your ticket has been sent.",
  buttons: {
    view: "View Booking",
    support: "Contact Support",
    home: "Back to Home",
  },
};

export const CHECKOUT_FOOTER = {
  help: "Need help?",
  contact: "Contact ZIVO support for assistance with your booking.",
  trust: ["Secure payments", "PCI compliant", "24/7 support"],
  final: "ZIVO LLC is a registered Seller of Travel. All travel services are fulfilled by ZIVO or its authorized suppliers. Prices include taxes and fees. Airline fare rules and conditions of carriage apply.",
  supportEmail: "support@hizovo.com",
};

export const CHECKOUT_TRUST_SIGNALS = {
  ssl: "SSL Encrypted",
  pci: "PCI Compliant",
  secure: "256-bit Encryption",
  verified: "ZIVO Secured",
};

// ============================================
// PRICING LEGAL FOOTER
// ============================================

export const CHECKOUT_PRICING_LEGAL = {
  /** Full legal footer for pricing/checkout */
  full: "ZIVO is an online travel agency. Displayed prices include applicable taxes and fees. Service fees may apply and are disclosed before payment. Airline and supplier rules apply to all bookings.",
  
  /** Short version */
  short: "Prices include taxes. Service fees may apply.",
  
  /** Transparent pricing promise */
  transparentPricing: "No hidden fees. What you see is what you pay.",
};

// ============================================
// CHECKOUT TERMS ACCEPTANCE (MANDATORY)
// ============================================

export const CHECKOUT_TERMS = {
  /** Required pre-booking acceptance */
  mainCheckbox: "By completing this booking, you agree to ZIVO's Terms of Service and the airline or supplier's fare rules.",
  
  /** Fare rules acknowledgment */
  fareRulesCheckbox: "I have reviewed the fare rules and cancellation policy.",
  
  /** Terms acknowledgment */
  termsCheckbox: "I accept ZIVO's Terms of Service.",
  
  /** Processor-friendly language */
  processorCompliant: {
    otaStatement: "ZIVO is an online travel agency.",
    paymentDisclosure: "ZIVO processes payments and issues tickets using authorized suppliers.",
    pricingTransparency: [
      "Clear pricing breakdown",
      "No hidden fees", 
      "Service fees disclosed before payment",
    ],
  },
};

// ============================================
// SUPPLIER FOOTER DISCLOSURE
// ============================================

export const SUPPLIER_DISCLOSURE = {
  /** Full footer disclosure for OTA compliance */
  footer: "ZIVO is an online travel agency. ZIVO processes payments and issues travel services using authorized suppliers including Duffel, TravelFusion, and RateHawk. Airline and supplier rules apply to all bookings.",
  
  /** Short supplier attribution */
  attribution: "Powered by ZIVO and authorized travel partners.",
};
