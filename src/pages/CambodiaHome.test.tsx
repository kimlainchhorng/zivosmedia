import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CambodiaHome from './CambodiaHome';
afterEach(cleanup);
it('offers real service destinations and switches the entire homepage to Khmer', () => {
  render(<MemoryRouter initialEntries={['/?lang=en']}><CambodiaHome /></MemoryRouter>);
  expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('One app for Cambodia');
  expect(screen.getByRole('link', {name: 'For business Bring your business to ZIVO.'})).toHaveAttribute('href', 'https://zivobusiness.com');
  fireEvent.click(screen.getByRole('link', {name:'ភាសាខ្មែរ'}));
  expect(document.documentElement.lang).toBe('km');
  expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('កម្មវិធីតែមួយសម្រាប់កម្ពុជា');
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href','https://zivosmedia.com/');
  expect(document.querySelector('link[hreflang="km"]')).toHaveAttribute('href','https://zivosmedia.com/?lang=km');
  expect(document.getElementById('zivo-khmer-font')).not.toBeNull();
  fireEvent.click(screen.getByRole('link', {name:'English'}));
  expect(document.documentElement.lang).toBe('en');
});
