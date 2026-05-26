/**
 * Hotelbeds API Types
 * Comprehensive types for Hotels, Activities, and Transfers APIs
 */

// ==================== COMMON TYPES ====================

export interface HotelbedsError {
  code: string;
  message: string;
}

export interface HotelbedsApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: HotelbedsError;
}

export interface GuestInfo {
  name: string;
  surname: string;
  type: "AD" | "CH"; // Adult or Child
  age?: number;
}

export interface HolderInfo {
  name: string;
  surname: string;
  email?: string;
  phone?: string;
}

// ==================== HOTELS TYPES ====================

export interface HotelbedsHotel {
  code: number;
  name: string;
  categoryCode: string;
  categoryName: string;
  destinationCode: string;
  destinationName: string;
  zoneCode: number;
  zoneName: string;
  latitude: string;
  longitude: string;
  rooms: HotelbedsRoom[];
  minRate: number;
  maxRate: number;
  currency: string;
  images?: HotelImage[];
  facilities?: HotelFacility[];
  reviews?: HotelReview[];
}

export interface HotelbedsRoom {
  code: string;
  name: string;
  rates: HotelbedsRate[];
}

export interface HotelbedsRate {
  rateKey: string;
  rateClass: string;
  rateType: "BOOKABLE" | "RECHECK";
  net: string;
  sellingRate?: string;
  hotelMandatory?: boolean;
  allotment: number;
  paymentType: "AT_WEB" | "AT_HOTEL";
  packaging: boolean;
  boardCode: string;
  boardName: string;
  rooms: number;
  adults: number;
  children: number;
  cancellationPolicies?: CancellationPolicy[];
  taxes?: Tax[];
  offers?: Offer[];
  rateBreakDown?: RateBreakDown;
}

export interface CancellationPolicy {
  amount: string;
  from: string;
  hotelAmount?: string;
  hotelCurrency?: string;
}

export interface Tax {
  included: boolean;
  amount: string;
  currency: string;
  clientAmount?: string;
  clientCurrency?: string;
  type?: string;
}

export interface Offer {
  code: string;
  name: string;
  amount: string;
}

export interface RateBreakDown {
  rateDiscounts?: Array<{
    code: string;
    name: string;
    amount: string;
  }>;
}

export interface HotelImage {
  imageTypeCode: string;
  path: string;
  order: number;
  visualOrder: number;
}

export interface HotelFacility {
  facilityCode: number;
  facilityGroupCode: number;
  description: string;
  order: number;
  indYesOrNo?: boolean;
  number?: number;
  voucher?: boolean;
}

export interface HotelReview {
  rate: number;
  reviewCount: number;
  type: string;
}

// Hotel Search Request/Response
export interface HotelSearchParams {
  checkIn: string;
  checkOut: string;
  destination: string;
  rooms: number;
  adults: number;
  children: number;
  childAges?: number[];
}

export interface HotelSearchRequest {
  stay: {
    checkIn: string;
    checkOut: string;
  };
  occupancies: Array<{
    rooms: number;
    adults: number;
    children: number;
    paxes?: Array<{ type: string; age?: number }>;
  }>;
  destination?: {
    code: string;
  };
  geolocation?: {
    latitude: number;
    longitude: number;
    radius: number;
    unit: string;
  };
  filter?: {
    minRate?: number;
    maxRate?: number;
    minCategory?: number;
    maxCategory?: number;
  };
}

export interface HotelSearchResponse {
  hotels: {
    hotels: HotelbedsHotel[];
    total: number;
    checkIn: string;
    checkOut: string;
  };
}

// Check Rates
export interface CheckRatesRequest {
  rooms: Array<{
    rateKey: string;
  }>;
}

export interface CheckRatesResponse {
  hotel: HotelbedsHotel;
}

// Booking
export interface HotelBookingRequest {
  holder: HolderInfo;
  rooms: Array<{
    rateKey: string;
    paxes: Array<{
      roomId: number;
      type: string;
      name: string;
      surname: string;
      age?: number;
    }>;
  }>;
  clientReference: string;
  remark?: string;
  tolerance?: number;
}

export interface HotelBookingResponse {
  booking: {
    reference: string;
    clientReference: string;
    creationDate: string;
    status: "CONFIRMED" | "PENDING" | "CANCELLED";
    modificationPolicies: {
      cancellation: boolean;
      modification: boolean;
    };
    holder: HolderInfo;
    hotel: HotelbedsHotel;
    totalNet: string;
    pendingAmount?: string;
    currency: string;
  };
}

// ==================== ACTIVITIES TYPES ====================

export interface HotelbedsActivity {
  code: string;
  name: string;
  type: string;
  currencyName: string;
  country: {
    code: string;
    name: string;
  };
  destination: {
    code: string;
    name: string;
  };
  content?: ActivityContent;
  amountsFrom: ActivityAmount[];
  modalities: ActivityModality[];
  order: number;
  operationDates?: OperationDate[];
}

export interface ActivityContent {
  description: string;
  shortDescription?: string;
  media?: {
    images: ActivityImage[];
  };
  features?: ActivityFeature[];
  highligths?: string[];
  importantInfo?: string[];
  scheduling?: {
    duration?: {
      value: number;
      metric: string;
    };
    meetingPoint?: string;
    startTimes?: string[];
  };
  location?: {
    latitude: string;
    longitude: string;
    address?: string;
  };
}

export interface ActivityImage {
  imageType: string;
  urls: Array<{
    sizeType: string;
    resource: string;
  }>;
}

export interface ActivityFeature {
  featureType: string;
  value?: string;
}

export interface ActivityModality {
  code: string;
  name: string;
  contract?: {
    name: string;
  };
  duration?: {
    value: number;
    metric: string;
  };
  amountsFrom: ActivityAmount[];
  questions?: ActivityQuestion[];
  rates?: ActivityRate[];
  comments?: ActivityComment[];
}

export interface ActivityAmount {
  paxType: string;
  ageFrom: number;
  ageTo: number;
  amount: number;
  boxOfficeAmount?: number;
  mandatoryApplyAmount?: boolean;
}

export interface ActivityRate {
  rateKey: string;
  rateCode: string;
  rateClass: string;
  operationDates: OperationDate[];
  languages?: string[];
  sessions?: ActivitySession[];
  paxAmounts: ActivityAmount[];
  totalAmount: {
    amount: number;
    boxOfficeAmount?: number;
  };
  cancellationPolicies?: ActivityCancellationPolicy[];
}

export interface ActivitySession {
  code: string;
  startTime: string;
  endTime?: string;
}

export interface ActivityCancellationPolicy {
  dateFrom: string;
  amount: number;
}

export interface OperationDate {
  from: string;
  to: string;
}

export interface ActivityQuestion {
  code: string;
  required: boolean;
  text: string;
}

export interface ActivityComment {
  type: string;
  text: string;
}

// Activity Search Request/Response
export interface ActivitySearchParams {
  destination: string;
  from: string;
  to: string;
  adults?: number;
  children?: number;
  childAges?: number[];
}

export interface ActivitySearchRequest {
  from: string;
  to: string;
  language?: string;
  destination: string;
  paxes?: Array<{
    type: string;
    age?: number;
  }>;
  filters?: {
    searchFilterItems?: Array<{
      type: string;
      value: string[];
    }>;
  };
  pagination?: {
    itemsPerPage: number;
    page: number;
  };
  order?: string;
}

export interface ActivitySearchResponse {
  activities: HotelbedsActivity[];
  total: number;
}

// Activity Booking
export interface ActivityBookingRequest {
  holder: {
    name: string;
    surname: string;
    email: string;
    telephones: Array<{
      type: string;
      number: string;
    }>;
  };
  activities: Array<{
    preferedLanguage?: string;
    serviceLanguage?: string;
    rateKey: string;
    from: string;
    to: string;
    paxes: GuestInfo[];
    answers?: Array<{
      question: string;
      answer: string;
    }>;
  }>;
  clientReference: string;
}

export interface ActivityBookingResponse {
  booking: {
    reference: string;
    clientReference: string;
    creationDate: string;
    status: "CONFIRMED" | "PENDING" | "CANCELLED";
    holder: HolderInfo;
    activities: Array<{
      code: string;
      name: string;
      dateFrom: string;
      dateTo: string;
      totalAmount: number;
      currency: string;
      paxes: GuestInfo[];
    }>;
    totalAmount: number;
    currency: string;
  };
}

// ==================== TRANSFERS TYPES ====================

export interface HotelbedsTransfer {
  id: string;
  direction: "OUTBOUND" | "INBOUND" | "ROUNDTRIP";
  transferType: "PRIVATE" | "SHARED" | "SHUTTLE";
  vehicle: TransferVehicle;
  category: TransferCategory;
  pickupInformation: TransferPickup;
  rateKey: string;
  price: TransferPrice;
  cancellationPolicies: TransferCancellationPolicy[];
  links?: TransferLink[];
  content?: TransferContent;
  minPaxCapacity?: number;
  maxPaxCapacity?: number;
  factsheetId?: string;
}

export interface TransferVehicle {
  code: string;
  name: string;
}

export interface TransferCategory {
  code: string;
  name: string;
}

export interface TransferPickup {
  from: {
    code: string;
    description: string;
    type: string;
  };
  to: {
    code: string;
    description: string;
    type: string;
  };
  date: string;
  time: string;
  pickup?: {
    address?: string;
    number?: string;
    town?: string;
    zip?: string;
    description?: string;
    altitude?: string;
    latitude?: string;
    longitude?: string;
    checkPickup?: {
      mustCheckPickupTime: boolean;
      url?: string;
      hoursBeforeConsulting?: number;
    };
    pickupId?: string;
    stopName?: string;
    image?: string;
  };
}

export interface TransferPrice {
  totalAmount: number;
  netAmount?: number;
  currencyId: string;
}

export interface TransferCancellationPolicy {
  amount: number;
  from: string;
  currencyId: string;
}

export interface TransferLink {
  rel: string;
  href: string;
  method: string;
}

export interface TransferContent {
  vehicle?: {
    code: string;
    name: string;
  };
  category?: {
    code: string;
    name: string;
  };
  images?: Array<{
    url: string;
    type: string;
  }>;
  transferDetailInfo?: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
  }>;
  customerTransferTimeInfo?: string[];
  supplierTransferTimeInfo?: string[];
}

// Transfer Search Request/Response
export interface TransferSearchParams {
  fromType: "IATA" | "ATLAS" | "GPS";
  fromCode: string;
  toType: "IATA" | "ATLAS" | "GPS";
  toCode: string;
  outboundDate: string;
  outboundTime: string;
  inboundDate?: string;
  inboundTime?: string;
  adults: number;
  children: number;
  infants: number;
}

export interface TransferAvailabilityRequest {
  language: string;
  fromType: string;
  fromCode: string;
  toType: string;
  toCode: string;
  outbound: {
    date: string;
    time: string;
    companyName?: string;
    flightNumber?: string;
  };
  inbound?: {
    date: string;
    time: string;
    companyName?: string;
    flightNumber?: string;
  };
  adults: number;
  children: number;
  infants: number;
}

export interface TransferAvailabilityResponse {
  search: {
    adults: number;
    children: number;
    infants: number;
  };
  services: HotelbedsTransfer[];
}

// Transfer Booking
export interface TransferBookingRequest {
  holder: {
    name: string;
    surname: string;
    email: string;
    phone: string;
  };
  transfers: Array<{
    rateKey: string;
    transferDetails: Array<{
      type: string;
      direction: string;
      code: string;
      companyName?: string;
      number?: string;
    }>;
  }>;
  clientReference: string;
  welcomeMessage?: string;
  remark?: string;
}

export interface TransferBookingResponse {
  booking: {
    reference: string;
    clientReference: string;
    creationDate: string;
    status: "CONFIRMED" | "PENDING" | "CANCELLED";
    holder: HolderInfo;
    transfers: Array<{
      id: number;
      rateKey: string;
      direction: string;
      transferType: string;
      vehicle: TransferVehicle;
      pickupInformation: TransferPickup;
      price: TransferPrice;
    }>;
    totalAmount: number;
    currency: string;
  };
}

// ==================== TRANSFORMED TYPES (ZIVO FORMAT) ====================

export interface ZivoHotel {
  id: string;
  code: number;
  name: string;
  stars: number;
  starsLabel: string;
  destination: string;
  zone: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  images: string[];
  minPrice: number;
  maxPrice: number;
  currency: string;
  rooms: ZivoRoom[];
  facilities: string[];
  reviewScore?: number;
  reviewCount?: number;
}

export interface ZivoRoom {
  code: string;
  name: string;
  rates: ZivoRate[];
}

export interface ZivoRate {
  rateKey: string;
  price: number;
  pricePerNight: number;
  nights: number;
  currency: string;
  boardType: string;
  boardName: string;
  paymentType: "prepaid" | "pay_at_hotel";
  requiresRecheck: boolean;
  freeCancellation: boolean;
  cancellationDeadline?: string;
  taxes?: number;
}

export interface ZivoActivity {
  id: string;
  code: string;
  name: string;
  description: string;
  shortDescription?: string;
  imageUrl: string;
  images: string[];
  destination: string;
  country: string;
  duration?: string;
  minPrice: number;
  currency: string;
  highlights?: string[];
  meetingPoint?: string;
  modalities: ZivoActivityModality[];
}

export interface ZivoActivityModality {
  code: string;
  name: string;
  duration?: string;
  price: number;
  currency: string;
  rateKey?: string;
  sessions?: Array<{
    code: string;
    time: string;
  }>;
}

export interface ZivoTransfer {
  id: string;
  rateKey: string;
  type: "private" | "shared" | "shuttle";
  vehicleName: string;
  vehicleCategory: string;
  maxPassengers: number;
  price: number;
  currency: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  imageUrl?: string;
  freeCancellation: boolean;
  cancellationDeadline?: string;
}
