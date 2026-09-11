import { expect, it } from 'vitest';
import { isPublicHomeEntry } from './publicHomeEntry';
it.each(['https://zivosmedia.com/', 'https://zivosmedia.com/?lang=km', 'http://127.0.0.1:5199/?utm_source=campaign'])('uses the small web entry for %s', href => {
  expect(isPublicHomeEntry(new URL(href), false)).toBe(true);
});
it.each(['https://zivostravel.com/', 'https://zivosoftware.com/', 'https://zivosmedia.com/feed', 'https://zivosmedia.com/?p=shared', 'https://zivosmedia.com/?code=oauth', 'https://zivosmedia.com/#access_token=token', 'https://zivosmedia.com/?error=denied'])('preserves full-router handling for %s', href => {
  expect(isPublicHomeEntry(new URL(href), false)).toBe(false);
});
it('preserves installed/native home behavior', () => {
  expect(isPublicHomeEntry(new URL('https://zivosmedia.com/'), true)).toBe(false);
});
