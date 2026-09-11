import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cambodiaGuides } from '@/content/cambodiaGuides';
import CambodiaGuideView from '@/pages/CambodiaGuideView';
import CambodiaHomeView from '@/pages/CambodiaHomeView';
import { mediaPrerenderAsset } from '../../cloudflare/media-public-seo';
import { getAirportByCode } from '@/data/airports';
import { publicTravelText } from '@/i18n/publicTravelCopy';
import { formatTravelDate } from '@/i18n/travelDate';

describe('public content available without JavaScript', () => {
  it.each(['en', 'km'])('renders usable home links in %s', language => {
    const html = renderToStaticMarkup(<CambodiaHomeView km={language === 'km'} />);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain(`href="/?lang=${language === 'km' ? 'en' : 'km'}"`);
    expect(html).toContain('https://ride.zivosmedia.com');
  });
  it.each(cambodiaGuides)('renders $path in both languages with a real search destination', guide => {
    for (const km of [false, true]) {
      const html = renderToStaticMarkup(<CambodiaGuideView guide={guide} km={km} />);
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html).toContain(guide.title[km ? 1 : 0]);
      expect(html).toContain('href="/flights');
      expect(mediaPrerenderAsset(new URL(`https://zivosmedia.com${guide.path}?lang=${km ? 'km' : 'en'}`))).toMatch(/\.txt$/);
    }
    if (guide.airport && !['PNH', 'REP'].includes(guide.airport)) expect(getAirportByCode(guide.airport)).toBeDefined();
  });
  it.each(['https://zivostravel.com/', 'https://zivosmedia.com/?code=oauth', 'https://zivosmedia.com/?p=share', 'https://zivosmedia.com/flights', 'https://zivosmedia.com/nope'])('preserves non-prerender flows %s', raw => {
    expect(mediaPrerenderAsset(new URL(raw))).toBeNull();
  });
});
it('translates travel controls and formats readable Khmer dates without changing machine date keys', () => {
  expect(publicTravelText('Economy', 'km')).toMatch(/[\u1780-\u17ff]/);
  expect(publicTravelText('Increase Adults', 'km')).toMatch(/[\u1780-\u17ff]/);
  expect(publicTravelText('Under $100', 'km')).toContain('100 USD');
  expect(publicTravelText('Hotel Brand', 'km')).toBe('Hotel Brand');
  document.documentElement.lang = 'km';
  expect(formatTravelDate(new Date(2026, 8, 8), 'MMMM')).toMatch(/[\u1780-\u17ff]/);
  expect(formatTravelDate(new Date(2026, 8, 8), 'yyyy-MM-dd')).toBe('2026-09-08');
  document.documentElement.lang = 'en';
});
