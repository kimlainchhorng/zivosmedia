/**
 * JSON-LD FlightReservation Schema for SEO
 * Renders structured data for flight confirmation pages
 */

interface FlightReservationSchemaProps {
  bookingReference: string;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalTime: string;
  passengerName: string;
  cabinClass?: string;
  price?: number;
  currency?: string;
}

export default function FlightReservationSchema({
  bookingReference,
  airline,
  flightNumber,
  departureAirport,
  departureTime,
  arrivalAirport,
  arrivalTime,
  passengerName,
  cabinClass = "Economy",
  price,
  currency = "USD",
}: FlightReservationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FlightReservation",
    reservationId: bookingReference,
    reservationStatus: "https://schema.org/ReservationConfirmed",
    underName: {
      "@type": "Person",
      name: passengerName,
    },
    reservationFor: {
      "@type": "Flight",
      flightNumber,
      provider: {
        "@type": "Airline",
        name: airline,
        iataCode: flightNumber?.substring(0, 2),
      },
      departureAirport: {
        "@type": "Airport",
        iataCode: departureAirport,
      },
      departureTime,
      arrivalAirport: {
        "@type": "Airport",
        iataCode: arrivalAirport,
      },
      arrivalTime,
    },
    ...(price && {
      totalPrice: price.toString(),
      priceCurrency: currency,
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
