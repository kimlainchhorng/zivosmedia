// Dynamic flight route generator for realistic search results
import { allAirlines, getAirlineLogo, type Airline } from './airlines';
import { airports, type Airport } from './airports';

export interface GeneratedFlight {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  departure: {
    time: string;
    city: string;
    code: string;
    terminal?: string;
  };
  arrival: {
    time: string;
    city: string;
    code: string;
    terminal?: string;
  };
  duration: string;
  stops: number;
  stopCities?: string[];
  stopDurations?: string[];
  price: number;
  premiumEconomyPrice?: number;
  businessPrice?: number;
  firstPrice?: number;
  class: string;
  amenities: string[];
  seatsLeft: number;
  category: 'premium' | 'full-service' | 'low-cost';
  alliance: string;
  aircraft: string;
  onTimePerformance: number;
  carbonOffset: number;
  baggageIncluded: string;
  refundable: boolean;
  wifi: boolean;
  entertainment: boolean;
  meals: boolean;
  legroom: string;
  logo: string;
  bookingLink?: string;
  isRealPrice?: boolean;
}

// Aircraft types by category
const aircraftByCategory = {
  premium: [
    'Airbus A380-800', 'Airbus A350-1000', 'Airbus A350-900', 
    'Boeing 777-300ER', 'Boeing 787-9 Dreamliner', 'Boeing 787-10',
    'Airbus A350-900ULR'
  ],
  'full-service': [
    'Boeing 787-9', 'Boeing 787-8', 'Boeing 777-200ER', 
    'Airbus A330-300', 'Airbus A330-900neo', 'Boeing 767-400ER',
    'Airbus A321neo', 'Boeing 757-200'
  ],
  'low-cost': [
    'Boeing 737 MAX 8', 'Boeing 737-800', 'Airbus A320neo', 
    'Airbus A321neo', 'Airbus A319', 'Boeing 737 MAX 9'
  ]
};

// Realistic base prices by route type (one-way)
const basePricesByRouteType: Record<string, { economy: number; business: number; first: number }> = {
  domestic: { economy: 89, business: 450, first: 0 },
  shortHaul: { economy: 149, business: 650, first: 0 },
  transatlantic: { economy: 349, business: 2200, first: 8500 },
  transpacific: { economy: 449, business: 2800, first: 12000 },
  longHaul: { economy: 399, business: 2400, first: 9500 },
};

// Amenities by category
const amenitiesByCategory = {
  premium: ['wifi', 'entertainment', 'meals', 'power', 'lounge', 'priority', 'amenityKit'],
  'full-service': ['wifi', 'entertainment', 'meals', 'power'],
  'low-cost': ['snacks']
};

// Route distance estimation (simplified)
const getRouteType = (from: Airport, to: Airport): string => {
  if (from.country === to.country) return 'domestic';
  if (from.region === to.region) return 'shortHaul';
  if ((from.region === 'North America' && to.region === 'Europe') ||
      (from.region === 'Europe' && to.region === 'North America')) return 'transatlantic';
  if ((from.region === 'North America' && to.region === 'Asia') ||
      (from.region === 'Asia' && to.region === 'North America') ||
      (from.region === 'Asia' && to.region === 'Oceania')) return 'transpacific';
  return 'longHaul';
};

// Flight duration calculation (simplified)
const calculateDuration = (from: Airport, to: Airport): { hours: number; minutes: number } => {
  const distance = Math.sqrt(
    Math.pow((from.lat - to.lat) * 111, 2) + 
    Math.pow((from.lng - to.lng) * 111 * Math.cos(from.lat * Math.PI / 180), 2)
  );
  const avgSpeed = 850; // km/h
  const hours = distance / avgSpeed;
  const totalMinutes = Math.round(hours * 60);
  return { 
    hours: Math.floor(totalMinutes / 60), 
    minutes: totalMinutes % 60 
  };
};

const formatDuration = (hours: number, minutes: number): string => {
  return `${hours}h ${minutes}m`;
};

// Generate departure times throughout the day
const generateDepartureTimes = (count: number): string[] => {
  const times: string[] = [];
  const slots = ['06:00', '07:30', '08:00', '09:15', '10:30', '11:45', '12:00', 
                 '13:30', '14:00', '15:15', '16:30', '18:00', '19:30', '20:45', 
                 '21:30', '22:00', '23:00', '23:45'];
  const shuffled = [...slots].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// Add hours and minutes to time string
const addTime = (time: string, hours: number, minutes: number): string => {
  const [h, m] = time.split(':').map(Number);
  let newMinutes = m + minutes;
  let newHours = h + hours + Math.floor(newMinutes / 60);
  newMinutes = newMinutes % 60;
  newHours = newHours % 24;
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
};

// Generate flight number
const generateFlightNumber = (airlineCode: string): string => {
  const num = Math.floor(Math.random() * 9000) + 100;
  return `${airlineCode}-${num}`;
};

// Main generator function
export const generateFlights = (
  fromCode: string, 
  toCode: string, 
  date?: Date,
  count: number = 15
): GeneratedFlight[] => {
  const fromAirport = airports.find(a => a.code === fromCode);
  const toAirport = airports.find(a => a.code === toCode);
  
  if (!fromAirport || !toAirport) return [];
  
  const routeType = getRouteType(fromAirport, toAirport);
  const basePrices = basePricesByRouteType[routeType];
  const { hours, minutes } = calculateDuration(fromAirport, toAirport);
  const departureTimes = generateDepartureTimes(count);
  
  // Get airlines that operate this route type
  const eligibleAirlines = allAirlines.filter(airline => {
    // Premium airlines typically fly long-haul
    if (airline.category === 'premium' && routeType === 'domestic') return false;
    // Low-cost typically fly domestic/short-haul
    if (airline.category === 'low-cost' && ['transpacific', 'transatlantic'].includes(routeType)) return false;
    return true;
  });
  
  const flights: GeneratedFlight[] = [];
  
  for (let i = 0; i < count; i++) {
    const airline = eligibleAirlines[Math.floor(Math.random() * eligibleAirlines.length)];
    const departureTime = departureTimes[i] || '12:00';
    
    // Add some variation to duration (±15%)
    const durationVariation = 1 + (Math.random() - 0.5) * 0.15;
    const actualHours = Math.floor(hours * durationVariation);
    const actualMinutes = Math.round((hours * durationVariation - actualHours) * 60 + minutes * durationVariation);
    
    // Stops for some flights
    const hasStops = Math.random() > 0.7 && routeType !== 'domestic';
    const stops = hasStops ? 1 : 0;
    
    // Price calculation with variation
    const priceMultiplier = airline.category === 'premium' ? 1.4 : 
                            airline.category === 'low-cost' ? 0.6 : 1;
    const randomVariation = 0.85 + Math.random() * 0.3;
    const economyPrice = Math.round(basePrices.economy * priceMultiplier * randomVariation);
    const businessPrice = Math.round(basePrices.business * priceMultiplier * randomVariation);
    const firstPrice = airline.category === 'premium' && basePrices.first > 0 
      ? Math.round(basePrices.first * randomVariation) 
      : undefined;
    
    // Calculate arrival time
    const totalDuration = actualHours * 60 + actualMinutes + (stops ? 90 : 0);
    const arrivalTime = addTime(departureTime, Math.floor(totalDuration / 60), totalDuration % 60);
    
    // Seats left - fewer for premium and popular times
    const seatsBase = airline.category === 'premium' ? 4 : airline.category === 'low-cost' ? 35 : 15;
    const seatsLeft = Math.max(1, Math.floor(Math.random() * seatsBase) + 1);
    
    // Carbon offset based on duration
    const carbonOffset = Math.round((actualHours * 60 + actualMinutes) * 2.5 + Math.random() * 30);
    
    const stopCities = hasStops ? [getRandomStopCity(fromAirport, toAirport)] : undefined;
    
    flights.push({
      id: `${airline.code}-${Date.now()}-${i}`,
      airline: airline.name,
      airlineCode: airline.code,
      flightNumber: generateFlightNumber(airline.code),
      departure: {
        time: departureTime,
        city: fromAirport.city,
        code: fromAirport.code,
        terminal: ['1', '2', '3', '4', '5', 'A', 'B', 'C'][Math.floor(Math.random() * 8)]
      },
      arrival: {
        time: arrivalTime,
        city: toAirport.city,
        code: toAirport.code,
        terminal: ['1', '2', '3', '4', '5', 'A', 'B', 'C'][Math.floor(Math.random() * 8)]
      },
      duration: formatDuration(
        Math.floor((actualHours * 60 + actualMinutes + (stops ? 90 : 0)) / 60),
        (actualHours * 60 + actualMinutes + (stops ? 90 : 0)) % 60
      ),
      stops,
      stopCities,
      stopDurations: hasStops ? ['1h 30m'] : undefined,
      price: economyPrice,
      premiumEconomyPrice: airline.category !== 'low-cost' ? Math.round(economyPrice * 1.6) : undefined,
      businessPrice: airline.category !== 'low-cost' ? businessPrice : undefined,
      firstPrice,
      class: 'Economy',
      amenities: amenitiesByCategory[airline.category],
      seatsLeft,
      category: airline.category,
      alliance: airline.alliance || 'Independent',
      aircraft: aircraftByCategory[airline.category][Math.floor(Math.random() * aircraftByCategory[airline.category].length)],
      onTimePerformance: Math.floor(75 + Math.random() * 20),
      carbonOffset,
      baggageIncluded: airline.category === 'low-cost' ? 'Carry-on only' : 
                       airline.category === 'premium' ? '2 × 32kg checked' : '1 × 23kg checked',
      refundable: airline.category === 'premium',
      wifi: airline.category !== 'low-cost',
      entertainment: airline.category !== 'low-cost',
      meals: airline.category !== 'low-cost',
      legroom: airline.category === 'premium' ? '34"' : 
               airline.category === 'low-cost' ? '28"' : '31"',
      logo: getAirlineLogo(airline.code)
    });
  }
  
  // Sort by price
  return flights.sort((a, b) => a.price - b.price);
};

// Helper to get a random stop city between origin and destination
const getRandomStopCity = (from: Airport, to: Airport): string => {
  const hubs = ['Dubai', 'Singapore', 'Hong Kong', 'Frankfurt', 'Amsterdam', 
                'London', 'Tokyo', 'Los Angeles', 'Chicago', 'Doha', 'Istanbul'];
  const filtered = hubs.filter(h => h !== from.city && h !== to.city);
  return filtered[Math.floor(Math.random() * filtered.length)];
};

// Pre-defined popular routes with realistic data
export const popularRoutes = [
  { from: 'JFK', to: 'LHR', demand: 'high' },
  { from: 'LAX', to: 'NRT', demand: 'high' },
  { from: 'SFO', to: 'SIN', demand: 'high' },
  { from: 'JFK', to: 'CDG', demand: 'high' },
  { from: 'LAX', to: 'SYD', demand: 'medium' },
  { from: 'ORD', to: 'FRA', demand: 'high' },
  { from: 'MIA', to: 'MAD', demand: 'medium' },
  { from: 'SEA', to: 'ICN', demand: 'medium' },
  { from: 'BOS', to: 'DUB', demand: 'high' },
  { from: 'DFW', to: 'LHR', demand: 'high' },
  { from: 'JFK', to: 'DXB', demand: 'high' },
  { from: 'LAX', to: 'HKG', demand: 'high' },
  { from: 'SFO', to: 'TPE', demand: 'medium' },
  { from: 'JFK', to: 'FCO', demand: 'high' },
  { from: 'LAX', to: 'BKK', demand: 'medium' },
  { from: 'ORD', to: 'AMS', demand: 'high' },
  { from: 'MIA', to: 'GRU', demand: 'medium' },
  { from: 'ATL', to: 'LHR', demand: 'high' },
  { from: 'DEN', to: 'CDG', demand: 'medium' },
  { from: 'IAH', to: 'DOH', demand: 'medium' },
];

// Get trending destinations
export const getTrendingDestinations = () => [
  { code: 'NRT', city: 'Tokyo', country: 'Japan', trend: '+15%', fromPrice: 649 },
  { code: 'BCN', city: 'Barcelona', country: 'Spain', trend: '+22%', fromPrice: 399 },
  { code: 'DPS', city: 'Bali', country: 'Indonesia', trend: '+28%', fromPrice: 749 },
  { code: 'IST', city: 'Istanbul', country: 'Turkey', trend: '+18%', fromPrice: 449 },
  { code: 'SIN', city: 'Singapore', country: 'Singapore', trend: '+12%', fromPrice: 599 },
  { code: 'LIS', city: 'Lisbon', country: 'Portugal', trend: '+25%', fromPrice: 379 },
  { code: 'ICN', city: 'Seoul', country: 'South Korea', trend: '+20%', fromPrice: 599 },
  { code: 'CPT', city: 'Cape Town', country: 'South Africa', trend: '+10%', fromPrice: 899 },
];

// Fare class definitions
export const fareClasses = {
  economy: {
    name: 'Economy',
    features: ['Personal item', 'Seat selection (fee)', 'Standard legroom'],
    refundable: false
  },
  premiumEconomy: {
    name: 'Premium Economy',
    features: ['1 checked bag', 'Priority boarding', 'Extra legroom', 'Premium meals'],
    refundable: false
  },
  business: {
    name: 'Business',
    features: ['2 checked bags', 'Lounge access', 'Lie-flat seats', 'Premium dining', 'Priority everything'],
    refundable: true
  },
  first: {
    name: 'First Class',
    features: ['3 checked bags', 'Private suite', 'Personal concierge', 'Chauffeur service', 'Fine dining'],
    refundable: true
  }
};
