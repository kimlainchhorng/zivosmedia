// Car rental affiliate partner configuration for booking redirects
// Updated with new Travelpayouts links

import { TRAVELPAYOUTS_DIRECT_LINKS } from '@/config/affiliateLinks';

export interface CarAffiliatePartner {
  id: string;
  name: string;
  logo: string;
  baseUrl: string;
  trackingUrl: string;
  urlTemplate: (params: CarAffiliateParams) => string;
  priority: number;
  commissionRate: string;
  features: string[];
  color: string;
}

export interface CarAffiliateParams {
  pickupLocation: string;
  pickupDate?: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  pickupTime?: string; // HH:MM
  returnTime?: string; // HH:MM
  driverAge?: number;
}

export const carAffiliatePartners: CarAffiliatePartner[] = [
  {
    id: 'economybookings',
    name: 'EconomyBookings',
    logo: 'car',
    baseUrl: 'https://www.economybookings.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.cars.economybookings,
    urlTemplate: () => TRAVELPAYOUTS_DIRECT_LINKS.cars.economybookings,
    priority: 100,
    commissionRate: '4-6%',
    features: ['500+ providers', 'No hidden fees', 'Free cancellation', 'Best price guarantee'],
    color: 'bg-violet-500'
  },
  {
    id: 'qeeq',
    name: 'QEEQ',
    logo: 'car-front',
    baseUrl: 'https://www.qeeq.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.cars.qeeq,
    urlTemplate: () => TRAVELPAYOUTS_DIRECT_LINKS.cars.qeeq,
    priority: 95,
    commissionRate: '4-8%',
    features: ['Price match', 'Full insurance options', '24/7 support'],
    color: 'bg-blue-500'
  },
  {
    id: 'getrentacar',
    name: 'GetRentACar',
    logo: 'truck',
    baseUrl: 'https://www.getrentacar.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.cars.getrentacar,
    urlTemplate: () => TRAVELPAYOUTS_DIRECT_LINKS.cars.getrentacar,
    priority: 90,
    commissionRate: '4-6%',
    features: ['Local providers', 'Budget-friendly', 'Easy booking'],
    color: 'bg-emerald-500'
  },
];

export function getCarAffiliateUrl(
  partnerId: string,
  _params: CarAffiliateParams
): string {
  const partner = carAffiliatePartners.find(p => p.id === partnerId);
  if (!partner) {
    return carAffiliatePartners[0].trackingUrl;
  }
  return partner.trackingUrl;
}

export function getTopCarPartners(limit: number = 3): CarAffiliatePartner[] {
  return carAffiliatePartners
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}
