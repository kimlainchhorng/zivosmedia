// Enhanced flight routes data with realistic pricing and CDN logo support

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

export interface FlightRoute {
  id: string;
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  departure: {
    airport: string;
    city: string;
    time: string;
  };
  arrival: {
    airport: string;
    city: string;
    time: string;
  };
  duration: string;
  stops: number;
  stopCities?: string[];
  aircraft: string;
  prices: {
    economy: number;
    premiumEconomy?: number;
    business?: number;
    first?: number;
  };
  amenities: string[];
  seatsLeft: number;
  category: 'premium' | 'full-service' | 'low-cost';
  alliance?: 'Star Alliance' | 'Oneworld' | 'SkyTeam' | 'Independent';
  onTimePercentage: number;
  carbonOffset: number; // kg CO2
}

// Popular airports
export const airports: Record<string, Airport> = {
  JFK: { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'USA', timezone: 'EST' },
  LAX: { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'USA', timezone: 'PST' },
  LHR: { code: 'LHR', name: 'Heathrow', city: 'London', country: 'UK', timezone: 'GMT' },
  CDG: { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', timezone: 'CET' },
  NRT: { code: 'NRT', name: 'Narita International', city: 'Tokyo', country: 'Japan', timezone: 'JST' },
  HND: { code: 'HND', name: 'Haneda', city: 'Tokyo', country: 'Japan', timezone: 'JST' },
  DXB: { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'UAE', timezone: 'GST' },
  SIN: { code: 'SIN', name: 'Changi', city: 'Singapore', country: 'Singapore', timezone: 'SGT' },
  HKG: { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'Hong Kong', timezone: 'HKT' },
  SYD: { code: 'SYD', name: 'Kingsford Smith', city: 'Sydney', country: 'Australia', timezone: 'AEST' },
  FRA: { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', timezone: 'CET' },
  AMS: { code: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands', timezone: 'CET' },
  ORD: { code: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'USA', timezone: 'CST' },
  MIA: { code: 'MIA', name: 'Miami International', city: 'Miami', country: 'USA', timezone: 'EST' },
  SFO: { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'USA', timezone: 'PST' },
  SEA: { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', country: 'USA', timezone: 'PST' },
  BOS: { code: 'BOS', name: 'Logan International', city: 'Boston', country: 'USA', timezone: 'EST' },
  DOH: { code: 'DOH', name: 'Hamad International', city: 'Doha', country: 'Qatar', timezone: 'AST' },
  ICN: { code: 'ICN', name: 'Incheon International', city: 'Seoul', country: 'South Korea', timezone: 'KST' },
  PEK: { code: 'PEK', name: 'Beijing Capital', city: 'Beijing', country: 'China', timezone: 'CST' },
};

// Generate realistic flight routes for LAX-JFK
export const generateFlightRoutes = (from: string, to: string, date: Date): FlightRoute[] => {
  const routes: FlightRoute[] = [
    // Premium carriers
    {
      id: 'sq-001',
      airlineCode: 'SQ',
      airlineName: 'Singapore Airlines',
      flightNumber: 'SQ-8834',
      departure: { airport: from, city: airports[from]?.city || from, time: '08:00' },
      arrival: { airport: to, city: airports[to]?.city || to, time: '16:30' },
      duration: '5h 30m',
      stops: 0,
      aircraft: 'Airbus A380-800',
      prices: { economy: 489, premiumEconomy: 789, business: 2450, first: 8900 },
      amenities: ['wifi', 'entertainment', 'meals', 'power', 'lounge'],
      seatsLeft: 4,
      category: 'premium',
      alliance: 'Star Alliance',
      onTimePercentage: 92,
      carbonOffset: 184,
    },
    {
      id: 'ek-001',
      airlineCode: 'EK',
      airlineName: 'Emirates',
      flightNumber: 'EK-2205',
      departure: { airport: from, city: airports[from]?.city || from, time: '10:15' },
      arrival: { airport: to, city: airports[to]?.city || to, time: '19:00' },
      duration: '5h 45m',
      stops: 0,
      aircraft: 'Boeing 777-300ER',
      prices: { economy: 549, premiumEconomy: 899, business: 3200, first: 12500 },
      amenities: ['wifi', 'entertainment', 'meals', 'power', 'lounge', 'shower'],
      seatsLeft: 2,
      category: 'premium',
      alliance: 'Independent',
      onTimePercentage: 89,
      carbonOffset: 195,
    },
    {
      id: 'qr-001',
      airlineCode: 'QR',
      airlineName: 'Qatar Airways',
      flightNumber: 'QR-7731',
      departure: { airport: from, city: airports[from]?.city || from, time: '23:00' },
      arrival: { airport: to, city: airports[to]?.city || to, time: '07:30' },
      duration: '5h 30m',
      stops: 0,
      aircraft: 'Airbus A350-1000',
      prices: { economy: 529, premiumEconomy: 829, business: 2890 },
      amenities: ['wifi', 'entertainment', 'meals', 'power', 'lounge'],
      seatsLeft: 6,
      category: 'premium',
      alliance: 'Oneworld',
      onTimePercentage: 91,
      carbonOffset: 178,
    },
    
    // Full-service carriers
    {
      id: 'dl-001',
      airlineCode: 'DL',
      airlineName: 'Delta Air Lines',
      flightNumber: 'DL-890',
      departure: { airport: from, city: airports[from]?.city || from, time: '06:00' },
      arrival: { airport: to, city: airports[to]?.city || to, time: '14:15' },
      duration: '5h 15m',
      stops: 0,
      aircraft: 'Boeing 757-200',
      prices: { economy: 299, premiumEconomy: 479, business: 1450 },
      amenities: ['wifi', 'entertainment', 'meals'],
      seatsLeft: 12,
      category: 'full-service',
      alliance: 'SkyTeam',
      onTimePercentage: 86,
      carbonOffset: 165,
    },
    {
      id: 'aa-001',
      airlineCode: 'AA',
      airlineName: 'American Airlines',
      flightNumber: 'AA-1123',
      departure: { airport: from, city: airports[from]?.city || from, time: '07:30' },
      arrival: { airport: to, city: airports[to]?.city || to, time: '15:50' },
      duration: '5h 20m',
      stops: 0,
      aircraft: 'Airbus A321neo',
      prices: { economy: 279, premiumEconomy: 459, business: 1380 },
      amenities: ['wifi', 'entertainment', 'power'],
      seatsLeft: 18,
      category: 'full-service',
      alliance: 'Oneworld',
      onTimePercentage: 82,
      carbonOffset: 158,
    },
    {
      id: 'ua-001',
      airlineCode: 'UA',
      airlineName: 'United Airlines',
      flightNumber: 'UA-2456',
      departure: { airport: from, city: airports[from]?.city || from, time: '09:45' },
      arrival: { airport: to, city: airports[to]?.city || to, time: '18:05' },
      duration: '5h 20m',
      stops: 0,
      aircraft: 'Boeing 787-9',
      prices: { economy: 289, premiumEconomy: 499, business: 1520 },
      amenities: ['wifi', 'entertainment', 'meals', 'power'],
      seatsLeft: 9,
      category: 'full-service',
      alliance: 'Star Alliance',
      onTimePercentage: 84,
      carbonOffset: 172,
    },
    {
      id: 'b6-001',
      airlineCode: 'B6',
      airlineName: 'JetBlue Airways',
      flightNumber: 'B6-422',
      departure: { airport: from, city: airports[from]?.city || from, time: '11:30' },
      arrival: { airport: to, city: airports[to]?.city || to, time: '19:50' },
      duration: '5h 20m',
      stops: 0,
      aircraft: 'Airbus A321LR',
      prices: { economy: 189, business: 899 },
      amenities: ['wifi', 'entertainment', 'snacks'],
      seatsLeft: 24,
      category: 'full-service',
      alliance: 'Independent',
      onTimePercentage: 80,
      carbonOffset: 155,
    },
    {
      id: 'as-001',
      airlineCode: 'AS',
      airlineName: 'Alaska Airlines',
      flightNumber: 'AS-1089',
      departure: { airport: from, city: airports[from]?.city || from, time: '14:00' },
      arrival: { airport: to, city: airports[to]?.city || to, time: '22:25' },
      duration: '5h 25m',
      stops: 0,
      aircraft: 'Boeing 737 MAX 9',
      prices: { economy: 229, premiumEconomy: 389, business: 1150 },
      amenities: ['wifi', 'entertainment', 'snacks', 'power'],
      seatsLeft: 15,
      category: 'full-service',
      alliance: 'Oneworld',
      onTimePercentage: 88,
      carbonOffset: 148,
    },
    
    // Connecting flights (1 stop)
    {
      id: 'dl-002',
      airlineCode: 'DL',
      airlineName: 'Delta Air Lines',
      flightNumber: 'DL-1567',
      departure: { airport: from, city: airports[from]?.city || from, time: '05:30' },
      arrival: { airport: to, city: airports[to]?.city || to, time: '16:45' },
      duration: '8h 15m',
      stops: 1,
      stopCities: ['Atlanta'],
      aircraft: 'Boeing 737-900',
      prices: { economy: 199, premiumEconomy: 349, business: 980 },
      amenities: ['wifi', 'entertainment'],
      seatsLeft: 28,
      category: 'full-service',
      alliance: 'SkyTeam',
      onTimePercentage: 78,
      carbonOffset: 210,
    },
    {
      id: 'ua-002',
      airlineCode: 'UA',
      airlineName: 'United Airlines',
      flightNumber: 'UA-3892',
      departure: { airport: from, city: airports[from]?.city || from, time: '12:15' },
      arrival: { airport: to, city: airports[to]?.city || to, time: '23:30' },
      duration: '8h 15m',
      stops: 1,
      stopCities: ['Denver'],
      aircraft: 'Airbus A320',
      prices: { economy: 179, premiumEconomy: 329, business: 920 },
      amenities: ['wifi', 'snacks'],
      seatsLeft: 32,
      category: 'full-service',
      alliance: 'Star Alliance',
      onTimePercentage: 76,
      carbonOffset: 225,
    },
    
    // Low-cost option
    {
      id: 'wn-001',
      airlineCode: 'WN',
      airlineName: 'Southwest Airlines',
      flightNumber: 'WN-2341',
      departure: { airport: from, city: airports[from]?.city || from, time: '16:00' },
      arrival: { airport: to, city: airports[to]?.city || to, time: '00:30' },
      duration: '5h 30m',
      stops: 0,
      aircraft: 'Boeing 737 MAX 8',
      prices: { economy: 149 },
      amenities: ['snacks'],
      seatsLeft: 42,
      category: 'low-cost',
      alliance: 'Independent',
      onTimePercentage: 75,
      carbonOffset: 152,
    },
  ];

  return routes;
};

// Get airline logo from CDN
export const getAirlineLogoUrl = (airlineCode: string, size: number = 200): string => {
  return `https://pics.avs.io/${size}/${size}/${airlineCode}.png`;
};

// Get airline logo with fallback
export const getAirlineLogoWithFallback = (airlineCode: string): string => {
  return getAirlineLogoUrl(airlineCode, 200);
};

// Format price with currency
export const formatPrice = (price: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price);
};

// Get badge for flight status
export const getFlightBadge = (route: FlightRoute): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null => {
  if (route.seatsLeft <= 3) {
    return { label: `Only ${route.seatsLeft} left!`, variant: 'destructive' };
  }
  if (route.category === 'premium' && route.prices.economy < 500) {
    return { label: 'Best Value', variant: 'default' };
  }
  if (route.stops === 0 && route.duration.includes('5h')) {
    return { label: 'Fastest', variant: 'secondary' };
  }
  if (route.onTimePercentage >= 90) {
    return { label: 'Most Reliable', variant: 'outline' };
  }
  return null;
};
