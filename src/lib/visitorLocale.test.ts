import { afterEach, expect, it } from 'vitest';
import { edgeCountry, visitorCountry, visitorCurrency } from './visitorLocale';

afterEach(() => { localStorage.clear(); document.head.querySelectorAll('meta[name="zivo-country"]').forEach(node => node.remove()); });
function country(value: string) { const meta = document.createElement('meta'); meta.name = 'zivo-country'; meta.content = value; document.head.append(meta); }
it('uses country, independently of English or Khmer preference', () => {
  country('KH');
  for (const language of ['en', 'km']) { localStorage.setItem('zivo_lang', language); expect(visitorCurrency()).toBe('KHR'); }
});
it('preserves a selected country over IP detection', () => { country('KH'); localStorage.setItem('zivo_country', 'US'); expect(visitorCurrency()).toBe('USD'); });
it('rejects malformed metadata and invalid stored countries', () => { country('<script>'); localStorage.setItem('zivo_country', 'bad'); expect(edgeCountry()).toBeNull(); expect(visitorCountry()).not.toBe('bad'); });
it('keeps another visitor country distinct from Cambodia', () => { country('SG'); expect(visitorCurrency()).toBe('SGD'); });
