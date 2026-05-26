/**
 * SEO-safe content for flight landing pages
 * OTA-compliant - no affiliate references, no partner comparisons
 */

export const FLIGHT_SEO_DISCLAIMERS = {
  /** Price disclaimer for landing pages */
  priceNote: "Prices and availability may change. Final price shown before payment.",
  
  /** Booking model explanation */
  bookingModel: "You book and pay on ZIVO. Tickets are issued by licensed partners.",
  
  /** No guarantee language */
  noGuarantee: "Flight prices vary by date and availability.",
  
  /** OTA clarification */
  otaClarification: "ZIVO is your booking agent. Tickets are issued through licensed airline ticketing partners.",
} as const;

export const FLIGHT_SEO_INTRO = {
  /** Generic intro for route pages */
  routeIntro: (origin: string, destination: string) => 
    `Search flights from ${origin} to ${destination}. Book directly on ZIVO and receive instant e-tickets. Tickets are issued by licensed airline ticketing partners.`,
  
  /** Intro for airport pages */
  airportIntro: (airportName: string, city: string) =>
    `Find flights from ${airportName} in ${city}. Search real-time prices and book securely on ZIVO.`,
  
  /** Intro for city pages */
  cityIntro: (cityName: string) =>
    `Discover flights to ${cityName}. Search real-time prices and book on ZIVO with instant ticket issuance.`,
  
  /** Generic flights intro when no route specified */
  genericIntro: () =>
    `Search and compare flights from global airlines. Book securely on ZIVO and receive instant e-tickets.`,
} as const;

export const FLIGHT_SEO_H1 = {
  /** H1 for route pages */
  route: (origin: string, destination: string) => `Flights from ${origin} to ${destination}`,
  
  /** H1 for airport pages */
  airport: (airportName: string, iata: string) => `Flights from ${airportName} (${iata})`,
  
  /** H1 for city destination pages */
  cityTo: (cityName: string) => `Flights to ${cityName}`,
  
  /** H1 for city origin pages */
  cityFrom: (cityName: string) => `Flights from ${cityName}`,
  
  /** Generic H1 */
  generic: () => `Search & Compare Flights Worldwide`,
} as const;
