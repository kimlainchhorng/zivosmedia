import { afterEach, expect, it, vi } from 'vitest';
import { publicHomeLanguage, syncPublicHomeLanguage } from '@/lib/publicHomeLanguage';

afterEach(() => { localStorage.removeItem('zivo_lang'); document.getElementById('zivo-khmer-font')?.remove(); vi.restoreAllMocks(); });
it('honors an explicit query language and otherwise preserves the visitor choice', () => {
  localStorage.setItem('zivo_lang', 'km');
  expect(publicHomeLanguage(null)).toBe('km');
  expect(publicHomeLanguage('en')).toBe('en');
  expect(publicHomeLanguage('km')).toBe('km');
});
it('updates the document, font and existing language listeners without the app catalog', () => {
  const event=vi.fn();window.addEventListener('zivo-lang-change',event);
  syncPublicHomeLanguage('km');syncPublicHomeLanguage('km');
  expect(document.documentElement.lang).toBe('km');
  expect(localStorage.getItem('zivo_lang')).toBe('km');
  expect(document.querySelectorAll('#zivo-khmer-font')).toHaveLength(1);
  expect(event.mock.calls[0][0].detail).toBe('km');
  syncPublicHomeLanguage('en');expect(document.documentElement.lang).toBe('en');
  window.removeEventListener('zivo-lang-change',event);
});
it('keeps language switching available when storage is restricted', () => {
  vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw Error('storage denied');});
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('storage denied');});
  expect(publicHomeLanguage(null)).toBe('en');
  expect(()=>syncPublicHomeLanguage('km')).not.toThrow();
  expect(document.documentElement.lang).toBe('km');
});
