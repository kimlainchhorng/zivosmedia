/**
 * Checkout Upsells Configuration
 * Products available as add-ons during checkout
 */

export interface UpsellProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  badge?: "popular" | "best-value" | "recommended";
  icon: string;
  disclaimer?: string;
  partnerProvided?: boolean;
}

export const FLIGHT_UPSELLS: UpsellProduct[] = [
  {
    id: "travel-insurance-standard",
    name: "Travel Insurance",
    description: "Flight cancellation, medical emergencies, trip interruption",
    price: 59,
    currency: "USD",
    badge: "popular",
    icon: "Shield",
    disclaimer: "Insurance is provided by third-party partners. ZIVO is not an insurer.",
    partnerProvided: true,
  },
  {
    id: "extra-baggage",
    name: "Extra Baggage",
    description: "Add a 23kg checked bag to your booking",
    price: 35,
    currency: "USD",
    icon: "Luggage",
    partnerProvided: true,
  },
  {
    id: "seat-selection",
    name: "Seat Selection",
    description: "Choose your preferred seat (via partner site)",
    price: 15,
    currency: "USD",
    icon: "Armchair",
    partnerProvided: true,
  },
  {
    id: "flexible-ticket",
    name: "Flexible Ticket",
    description: "Change dates with reduced fees",
    price: 45,
    currency: "USD",
    badge: "best-value",
    icon: "RefreshCw",
    partnerProvided: true,
  },
];

export const HOTEL_UPSELLS: UpsellProduct[] = [
  {
    id: "travel-insurance-hotel",
    name: "Trip Protection",
    description: "Cancellation coverage, medical emergencies",
    price: 39,
    currency: "USD",
    badge: "popular",
    icon: "Shield",
    disclaimer: "Insurance is provided by third-party partners. ZIVO is not an insurer.",
    partnerProvided: true,
  },
  {
    id: "airport-transfer",
    name: "Airport Transfer",
    description: "Private transfer to/from airport",
    price: 49,
    currency: "USD",
    icon: "Car",
    partnerProvided: true,
  },
  {
    id: "early-checkin",
    name: "Early Check-in",
    description: "Guaranteed early check-in (subject to availability)",
    price: 25,
    currency: "USD",
    icon: "Clock",
    partnerProvided: true,
  },
];

export const CAR_UPSELLS: UpsellProduct[] = [
  {
    id: "cdw-insurance",
    name: "Collision Damage Waiver",
    description: "Zero excess in case of damage or theft",
    price: 12,
    currency: "USD",
    badge: "recommended",
    icon: "ShieldCheck",
    disclaimer: "Coverage terms vary by provider. Review full terms before booking.",
    partnerProvided: true,
  },
  {
    id: "gps-navigation",
    name: "GPS Navigation",
    description: "In-car GPS navigation system",
    price: 8,
    currency: "USD",
    icon: "Navigation",
    partnerProvided: true,
  },
  {
    id: "child-seat",
    name: "Child Seat",
    description: "Safe seating for young travelers",
    price: 12,
    currency: "USD",
    badge: "popular",
    icon: "Baby",
    partnerProvided: true,
  },
  {
    id: "additional-driver",
    name: "Additional Driver",
    description: "Add a second driver to your rental",
    price: 10,
    currency: "USD",
    icon: "Users",
    partnerProvided: true,
  },
  {
    id: "premium-insurance",
    name: "Premium Insurance Upgrade",
    description: "Full coverage with zero deductible",
    price: 15,
    currency: "USD",
    icon: "Shield",
    disclaimer: "Coverage provided by rental partner. Review full policy terms.",
    partnerProvided: true,
  },
];

export const INSURANCE_PLANS = [
  {
    id: "none",
    name: "Skip Protection",
    price: 0,
    features: [],
  },
  {
    id: "basic",
    name: "Basic",
    price: 29,
    features: ["Trip cancellation", "Basic medical coverage", "24/7 support"],
  },
  {
    id: "standard",
    name: "Standard",
    price: 59,
    badge: "recommended" as const,
    features: [
      "Trip cancellation",
      "Comprehensive medical",
      "Trip interruption",
      "Baggage protection",
      "24/7 support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 99,
    features: [
      "Cancel for any reason",
      "Full medical coverage",
      "Trip interruption",
      "Baggage & delay protection",
      "Rental car coverage",
      "24/7 concierge support",
    ],
  },
];
