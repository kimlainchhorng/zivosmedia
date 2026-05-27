/**
 * ZIVO Outbound Link Hook
 * 
 * Provides easy-to-use functions for generating tracked affiliate links
 * All links route through /out for proper tracking
 */

import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { buildOutboundURL } from '@/lib/outboundTracking';
import { 
  TRAVELPAYOUTS_DIRECT_LINKS,
  FLIGHT_PARTNERS,
  CAR_PARTNERS,
  HOTEL_PARTNERS,
  TRANSFER_PARTNERS,
  ACTIVITY_PARTNERS,
  ESIM_PARTNERS,
  LUGGAGE_PARTNERS,
  COMPENSATION_PARTNERS,
  
} from '@/config/affiliateLinks';

type ServiceType = 'flights' | 'hotels' | 'cars' | 'transfers' | 'activities' | 'esim' | 'luggage' | 'compensation' | 'extras';

interface UseOutboundLinkOptions {
  /** The product/service type */
  product: ServiceType;
  /** Custom page source override (defaults to current path) */
  pageSource?: string;
}

export function useOutboundLink(options: UseOutboundLinkOptions) {
  const location = useLocation();
  const pageSource = options.pageSource || location.pathname.replace(/^\//, '').replace(/\//g, '-') || 'home';
  
  /**
   * Get an outbound URL for a specific partner
   */
  const getPartnerLink = useCallback((partnerId: string, partnerName: string, destinationUrl: string) => {
    return buildOutboundURL(partnerId, partnerName, options.product, pageSource, destinationUrl);
  }, [options.product, pageSource]);
  
  /**
   * Get the primary partner link for this service
   */
  const getPrimaryLink = useMemo(() => {
    switch (options.product) {
      case 'flights':
        return getPartnerLink('aviasales', 'Aviasales', TRAVELPAYOUTS_DIRECT_LINKS.flights.backup);
      case 'hotels':
        return getPartnerLink('hotellook', 'Hotellook', 'https://hotellook.tpo.li');
      case 'cars':
        return getPartnerLink('economybookings', 'EconomyBookings', TRAVELPAYOUTS_DIRECT_LINKS.cars.economybookings);
      case 'transfers':
        return getPartnerLink('kiwitaxi', 'KiwiTaxi', TRAVELPAYOUTS_DIRECT_LINKS.transfers.kiwitaxi);
      case 'activities':
        return getPartnerLink('tiqets', 'Tiqets', TRAVELPAYOUTS_DIRECT_LINKS.activities.tiqets);
      case 'esim':
        return getPartnerLink('airalo', 'Airalo', TRAVELPAYOUTS_DIRECT_LINKS.esim.airalo);
      case 'luggage':
        return getPartnerLink('radicalstorage', 'Radical Storage', TRAVELPAYOUTS_DIRECT_LINKS.luggage.radicalstorage);
      case 'compensation':
        return getPartnerLink('airhelp', 'AirHelp', TRAVELPAYOUTS_DIRECT_LINKS.compensation.airhelp);
      default:
        return '/';
    }
  }, [options.product, getPartnerLink]);
  
  /**
   * Get all available partners for this service
   */
  const getPartners = useMemo(() => {
    switch (options.product) {
      case 'flights':
        return FLIGHT_PARTNERS.filter(p => p.isActive).map(p => ({
          id: p.id,
          name: p.name,
          link: getPartnerLink(p.id, p.name, p.trackingUrl),
          priority: p.priority,
          features: p.features,
          logo: p.logo,
        }));
      case 'hotels':
        return HOTEL_PARTNERS.filter(p => p.isActive).map(p => ({
          id: p.id,
          name: p.name,
          link: getPartnerLink(p.id, p.name, p.trackingUrl),
          priority: p.priority,
          features: p.features,
          logo: p.logo,
        }));
      case 'cars':
        return CAR_PARTNERS.filter(p => p.isActive).map(p => ({
          id: p.id,
          name: p.name,
          link: getPartnerLink(p.id, p.name, p.trackingUrl),
          priority: p.priority,
          features: p.features,
          logo: p.logo,
        }));
      case 'transfers':
        return TRANSFER_PARTNERS.filter(p => p.isActive).map(p => ({
          id: p.id,
          name: p.name,
          link: getPartnerLink(p.id, p.name, p.trackingUrl),
          priority: p.priority,
          features: p.features,
          logo: p.logo,
        }));
      case 'activities':
        return ACTIVITY_PARTNERS.filter(p => p.isActive).map(p => ({
          id: p.id,
          name: p.name,
          link: getPartnerLink(p.id, p.name, p.trackingUrl),
          priority: p.priority,
          features: p.features,
          logo: p.logo,
        }));
      case 'esim':
        return ESIM_PARTNERS.filter(p => p.isActive).map(p => ({
          id: p.id,
          name: p.name,
          link: getPartnerLink(p.id, p.name, p.trackingUrl),
          priority: p.priority,
          features: p.features,
          logo: p.logo,
        }));
      case 'luggage':
        return LUGGAGE_PARTNERS.filter(p => p.isActive).map(p => ({
          id: p.id,
          name: p.name,
          link: getPartnerLink(p.id, p.name, p.trackingUrl),
          priority: p.priority,
          features: p.features,
          logo: p.logo,
        }));
      case 'compensation':
        return COMPENSATION_PARTNERS.filter(p => p.isActive).map(p => ({
          id: p.id,
          name: p.name,
          link: getPartnerLink(p.id, p.name, p.trackingUrl),
          priority: p.priority,
          features: p.features,
          logo: p.logo,
        }));
      default:
        return [];
    }
  }, [options.product, getPartnerLink]);
  
  return {
    getPartnerLink,
    primaryLink: getPrimaryLink,
    partners: getPartners,
    pageSource,
  };
}

/**
 * Common extras links with tracking
 */
export const EXTRAS_LINKS = {
  activities: {
    id: 'tiqets',
    name: 'Tiqets',
    url: 'https://tiqets.tpo.li/5fqrcQWZ',
    product: 'activities',
  },
  museums: {
    id: 'tiqets',
    name: 'Tiqets',
    url: 'https://tiqets.tpo.li/5fqrcQWZ',
    product: 'activities',
  },
  airportTransfers: {
    id: 'kiwitaxi',
    name: 'KiwiTaxi',
    url: 'https://kiwitaxi.tpo.li/Bj6zghJH',
    product: 'transfers',
  },
  transfersMarketplace: {
    id: 'gettransfer',
    name: 'GetTransfer',
    url: 'https://gettransfer.tpo.li/FbrIguyh',
    product: 'transfers',
  },
  esimAiralo: {
    id: 'airalo',
    name: 'Airalo',
    url: 'https://airalo.tpo.li/zVRtp8Zt',
    product: 'esim',
  },
  esimYesim: {
    id: 'yesim',
    name: 'Yesim',
    url: 'https://yesim.tpo.li/OpjeHJgH',
    product: 'esim',
  },
  simDrimsim: {
    id: 'drimsim',
    name: 'Drimsim',
    url: 'https://drimsim.tpo.li/A9yKO5oA',
    product: 'esim',
  },
  luggage: {
    id: 'radicalstorage',
    name: 'Radical Storage',
    url: 'https://radicalstorage.tpo.li/4W0KR99h',
    product: 'luggage',
  },
  audioTours: {
    id: 'wegotrip',
    name: 'WeGoTrip',
    url: 'https://wegotrip.tpo.li/QSrOpIdV',
    product: 'activities',
  },
  compensationAirhelp: {
    id: 'airhelp',
    name: 'AirHelp',
    url: 'https://airhelp.tpo.li/7Z5saPi2',
    product: 'compensation',
  },
  compensationAlt: {
    id: 'compensair',
    name: 'Compensair',
    url: 'https://compensair.tpo.li/npsp8pm0',
    product: 'compensation',
  },
  hotelsTpo: {
    id: 'hotels-tpo',
    name: 'Hotels',
    url: 'https://hotels.tpo.li/mszBRRYU',
    product: 'hotels',
  },
} as const;

/**
 * Build an outbound URL for an extras link
 */
export function buildExtrasOutboundURL(
  extraKey: keyof typeof EXTRAS_LINKS,
  pageSource: string = 'extras'
): string {
  const extra = EXTRAS_LINKS[extraKey];
  return buildOutboundURL(extra.id, extra.name, extra.product, pageSource, extra.url);
}
