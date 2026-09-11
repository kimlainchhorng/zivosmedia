import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CookieConsent from './CookieConsent';
import { COOKIE_CONSENT_STORAGE_KEY } from '@/hooks/useCookiePrefs';
vi.mock('@capacitor/core', () => ({Capacitor:{isNativePlatform: () => false}}));
beforeEach(() => {localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY); window.__zivoLoadAnalytics=vi.fn();});
afterEach(() => {cleanup();localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);});
it('lets the initiating click finish before showing consent without enabling tracking', () => {
 const action=vi.fn();
 render(<MemoryRouter><button onClick={action}>Retry wallet</button><CookieConsent /></MemoryRouter>);
 expect(screen.queryByRole('region', {name:'Cookie consent'})).toBeNull();
 fireEvent.pointerDown(screen.getByRole('button',{name:'Retry wallet'}));
 expect(screen.queryByRole('region', {name:'Cookie consent'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Retry wallet'}));
 expect(action).toHaveBeenCalledTimes(1);
 expect(screen.getByRole('region', {name:'Cookie consent'})).toBeInTheDocument();
 expect(window.__zivoLoadAnalytics).not.toHaveBeenCalled();
 expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
 fireEvent.click(screen.getByRole('button', {name:'Reject All'}));
 expect(JSON.parse(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)!)).toMatchObject({analytics:false,marketing:false});
 expect(window.__zivoLoadAnalytics).not.toHaveBeenCalled();
});
it('shows a lazily mounted banner after the triggering interaction without enabling tracking', () => {
 render(<MemoryRouter><CookieConsent interactionDetected /></MemoryRouter>);
 expect(screen.getByRole('region', {name:'Cookie consent'})).toBeInTheDocument();
 expect(window.__zivoLoadAnalytics).not.toHaveBeenCalled();
 expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
});
