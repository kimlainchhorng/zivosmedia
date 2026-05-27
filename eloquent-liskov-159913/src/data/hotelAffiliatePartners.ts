// Hotel affiliate partner configuration for booking redirects
export interface HotelAffiliatePartner {
  id: string;
  name: string;
  logo: string;
  baseUrl: string;
  urlTemplate: (params: HotelAffiliateParams) => string;
  priority: number;
  commissionRate: string;
  features: string[];
  color: string;
}

export interface HotelAffiliateParams {
  destination: string;
  checkIn?: string; // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD
  guests?: number;
  rooms?: number;
}

export const hotelAffiliatePartners: HotelAffiliatePartner[] = [
  {
    id: 'booking',
    name: 'Booking.com',
    logo: 'B',
    baseUrl: 'https://www.booking.com',
    urlTemplate: ({ destination, checkIn, checkOut, guests, rooms }) => {
      const params = new URLSearchParams();
      params.set('ss', destination);
      if (checkIn) params.set('checkin', checkIn);
      if (checkOut) params.set('checkout', checkOut);
      if (guests) params.set('group_adults', String(guests));
      if (rooms) params.set('no_rooms', String(rooms));
      return `https://www.booking.com/searchresults.html?${params.toString()}`;
    },
    priority: 100,
    commissionRate: 'Up to 40%',
    features: ['Free cancellation', 'No booking fees', 'Genius discounts'],
    color: 'bg-blue-600'
  },
  {
    id: 'hotels',
    name: 'Hotels.com',
    logo: 'H',
    baseUrl: 'https://www.hotels.com',
    urlTemplate: ({ destination, checkIn, checkOut, guests }) => {
      const params = new URLSearchParams();
      params.set('q-destination', destination);
      if (checkIn) params.set('q-check-in', checkIn);
      if (checkOut) params.set('q-check-out', checkOut);
      if (guests) params.set('q-room-0-adults', String(guests));
      return `https://www.hotels.com/search.do?${params.toString()}`;
    },
    priority: 95,
    commissionRate: 'Competitive',
    features: ['Collect 10 nights, get 1 free', 'Member prices', 'Secret prices'],
    color: 'bg-red-500'
  },
  {
    id: 'expedia',
    name: 'Expedia',
    logo: 'E',
    baseUrl: 'https://www.expedia.com',
    urlTemplate: ({ destination, checkIn, checkOut, guests, rooms }) => {
      const params = new URLSearchParams();
      params.set('destination', destination);
      if (checkIn) params.set('startDate', checkIn);
      if (checkOut) params.set('endDate', checkOut);
      if (guests) params.set('adults', String(guests));
      if (rooms) params.set('rooms', String(rooms));
      return `https://www.expedia.com/Hotel-Search?${params.toString()}`;
    },
    priority: 90,
    commissionRate: 'Competitive',
    features: ['Bundle & save', 'Member deals', 'Free cancellation'],
    color: 'bg-yellow-500'
  },
  {
    id: 'agoda',
    name: 'Agoda',
    logo: 'A',
    baseUrl: 'https://www.agoda.com',
    urlTemplate: ({ destination, checkIn, checkOut, guests, rooms }) => {
      const params = new URLSearchParams();
      params.set('city', destination);
      if (checkIn) params.set('checkIn', checkIn);
      if (checkOut) params.set('checkOut', checkOut);
      if (guests) params.set('adults', String(guests));
      if (rooms) params.set('rooms', String(rooms));
      return `https://www.agoda.com/search?${params.toString()}`;
    },
    priority: 85,
    commissionRate: 'Competitive',
    features: ['Best price guarantee', 'Insider deals', 'PointsMax'],
    color: 'bg-red-600'
  },
  {
    id: 'priceline',
    name: 'Priceline',
    logo: 'P',
    baseUrl: 'https://www.priceline.com',
    urlTemplate: ({ destination, checkIn, checkOut, guests, rooms }) => {
      const params = new URLSearchParams();
      params.set('destination', destination);
      if (checkIn) params.set('startDate', checkIn);
      if (checkOut) params.set('endDate', checkOut);
      if (guests) params.set('adults', String(guests));
      if (rooms) params.set('rooms', String(rooms));
      return `https://www.priceline.com/relax/at/${encodeURIComponent(destination)}/from/${checkIn || 'flexible'}/to/${checkOut || 'flexible'}/rooms/${rooms || 1}`;
    },
    priority: 80,
    commissionRate: 'Competitive',
    features: ['Express deals', 'Name your price', 'VIP access'],
    color: 'bg-blue-500'
  },
  {
    id: 'trivago',
    name: 'Trivago',
    logo: 'T',
    baseUrl: 'https://www.trivago.com',
    urlTemplate: ({ destination, checkIn, checkOut, guests, rooms }) => {
      const params = new URLSearchParams();
      params.set('search', destination);
      if (checkIn) params.set('aDateRange[arr]', checkIn);
      if (checkOut) params.set('aDateRange[dep]', checkOut);
      if (guests) params.set('iRoomType', String(guests));
      return `https://www.trivago.com/?${params.toString()}`;
    },
    priority: 75,
    commissionRate: 'Comparison',
    features: ['Compare 100+ sites', 'Real reviews', 'Best prices'],
    color: 'bg-sky-500'
  },
];

export function getHotelAffiliateUrl(
  partnerId: string,
  params: HotelAffiliateParams
): string {
  const partner = hotelAffiliatePartners.find(p => p.id === partnerId);
  if (!partner) {
    return hotelAffiliatePartners[0].urlTemplate(params);
  }
  return partner.urlTemplate(params);
}

export function getTopHotelPartners(limit: number = 6): HotelAffiliatePartner[] {
  return hotelAffiliatePartners
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}
