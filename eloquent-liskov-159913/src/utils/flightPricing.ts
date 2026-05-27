/**
 * Flight Pricing Utility
 * Base fare = Duffel API price (includes airline taxes)
 * Taxes, Fees & Charges = card processing (3.5%) + ZIVO booking fee
 */

// US average sales tax rates by state (simplified — top-level state rates)
const US_STATE_TAX_RATES: Record<string, { rate: number; label: string }> = {
  AL: { rate: 0.0922, label: "Alabama" },
  AK: { rate: 0.0176, label: "Alaska" },
  AZ: { rate: 0.0840, label: "Arizona" },
  AR: { rate: 0.0951, label: "Arkansas" },
  CA: { rate: 0.0868, label: "California" },
  CO: { rate: 0.0777, label: "Colorado" },
  CT: { rate: 0.0635, label: "Connecticut" },
  DE: { rate: 0.0000, label: "Delaware" },
  FL: { rate: 0.0701, label: "Florida" },
  GA: { rate: 0.0732, label: "Georgia" },
  HI: { rate: 0.0444, label: "Hawaii" },
  ID: { rate: 0.0602, label: "Idaho" },
  IL: { rate: 0.0882, label: "Illinois" },
  IN: { rate: 0.0700, label: "Indiana" },
  IA: { rate: 0.0694, label: "Iowa" },
  KS: { rate: 0.0871, label: "Kansas" },
  KY: { rate: 0.0600, label: "Kentucky" },
  LA: { rate: 0.0955, label: "Louisiana" },
  ME: { rate: 0.0550, label: "Maine" },
  MD: { rate: 0.0600, label: "Maryland" },
  MA: { rate: 0.0625, label: "Massachusetts" },
  MI: { rate: 0.0600, label: "Michigan" },
  MN: { rate: 0.0749, label: "Minnesota" },
  MS: { rate: 0.0707, label: "Mississippi" },
  MO: { rate: 0.0825, label: "Missouri" },
  MT: { rate: 0.0000, label: "Montana" },
  NE: { rate: 0.0694, label: "Nebraska" },
  NV: { rate: 0.0823, label: "Nevada" },
  NH: { rate: 0.0000, label: "New Hampshire" },
  NJ: { rate: 0.0660, label: "New Jersey" },
  NM: { rate: 0.0783, label: "New Mexico" },
  NY: { rate: 0.0852, label: "New York" },
  NC: { rate: 0.0698, label: "North Carolina" },
  ND: { rate: 0.0696, label: "North Dakota" },
  OH: { rate: 0.0723, label: "Ohio" },
  OK: { rate: 0.0895, label: "Oklahoma" },
  OR: { rate: 0.0000, label: "Oregon" },
  PA: { rate: 0.0634, label: "Pennsylvania" },
  RI: { rate: 0.0700, label: "Rhode Island" },
  SC: { rate: 0.0746, label: "South Carolina" },
  SD: { rate: 0.0640, label: "South Dakota" },
  TN: { rate: 0.0955, label: "Tennessee" },
  TX: { rate: 0.0820, label: "Texas" },
  UT: { rate: 0.0719, label: "Utah" },
  VT: { rate: 0.0624, label: "Vermont" },
  VA: { rate: 0.0575, label: "Virginia" },
  WA: { rate: 0.0923, label: "Washington" },
  WV: { rate: 0.0651, label: "West Virginia" },
  WI: { rate: 0.0543, label: "Wisconsin" },
  WY: { rate: 0.0536, label: "Wyoming" },
  DC: { rate: 0.0600, label: "Washington DC" },
};

const DEFAULT_TAX_RATE = 0.07; // 7% fallback
const CARD_PROCESSING_RATE = 0.035; // 3.5%
const ZIVO_FEE_FLAT = 10; // $10 if duffel price < $100
const ZIVO_FEE_PERCENT = 0.05; // 5% if duffel price >= $100
const ZIVO_FEE_THRESHOLD = 100;

export interface FlightPricingBreakdown {
  /** The displayed "base fare" = raw duffel price only */
  baseFare: number;
  /** Combined taxes, fees & charges = state tax + card fee + booking fee */
  taxesFeesCharges: number;
  /** State/county tax portion (for reference) */
  stateTax: number;
  stateTaxRate: number;
  stateTaxLabel: string;
  /** Card processing fee (3.5%) */
  cardFee: number;
  /** ZIVO booking fee */
  bookingFee: number;
  /** Total per passenger = baseFare + taxesFeesCharges */
  totalPerPassenger: number;
  totalAllPassengers: number;
  passengers: number;
  currency: string;
  /** Raw Duffel price (for reference / backend) */
  duffelPrice: number;
}

export function getStateTaxInfo(stateCode?: string): { rate: number; label: string } {
  if (!stateCode) return { rate: DEFAULT_TAX_RATE, label: "Estimated" };
  const upper = stateCode.toUpperCase();
  return US_STATE_TAX_RATES[upper] || { rate: DEFAULT_TAX_RATE, label: "Estimated" };
}

function calculateZivoBookingFee(duffelPrice: number): number {
  if (duffelPrice < ZIVO_FEE_THRESHOLD) return ZIVO_FEE_FLAT;
  return parseFloat((duffelPrice * ZIVO_FEE_PERCENT).toFixed(2));
}

/** Quick helper: returns the all-in price for display on cards */
export function getAllInPrice(duffelPrice: number): number {
  const cardFee = duffelPrice * CARD_PROCESSING_RATE;
  const bookingFee = duffelPrice < ZIVO_FEE_THRESHOLD ? ZIVO_FEE_FLAT : duffelPrice * ZIVO_FEE_PERCENT;
  return parseFloat((duffelPrice + cardFee + bookingFee).toFixed(2));
}

export function calculateFlightPricing(
  duffelPrice: number,
  passengers: number,
  currency: string = "USD",
  stateCode?: string,
): FlightPricingBreakdown {
  // Base fare = raw Duffel price (includes airline taxes)
  const baseFare = parseFloat(duffelPrice.toFixed(2));

  // Fees: card processing + ZIVO booking fee
  const cardFee = parseFloat((duffelPrice * CARD_PROCESSING_RATE).toFixed(2));
  const bookingFee = calculateZivoBookingFee(duffelPrice);

  // No separate state tax — Duffel price already includes airline taxes
  const taxesFeesCharges = parseFloat((cardFee + bookingFee).toFixed(2));

  const totalPerPassenger = parseFloat((baseFare + taxesFeesCharges).toFixed(2));
  const totalAllPassengers = parseFloat((totalPerPassenger * passengers).toFixed(2));

  return {
    baseFare,
    taxesFeesCharges,
    stateTax: 0,
    stateTaxRate: 0,
    stateTaxLabel: "",
    cardFee,
    bookingFee,
    totalPerPassenger,
    totalAllPassengers,
    passengers,
    currency,
    duffelPrice,
  };
}

export function getStateOptions() {
  return Object.entries(US_STATE_TAX_RATES).map(([code, { label }]) => ({
    code,
    label,
  })).sort((a, b) => a.label.localeCompare(b.label));
}
