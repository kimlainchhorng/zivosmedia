import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CountryPhoneInput } from './CountryPhoneInput';
vi.mock('@/lib/visitorLocale', () => ({ visitorCountry: () => 'KH' }));
beforeEach(() => localStorage.clear());
afterEach(cleanup);
it('starts new numbers with Cambodia and accepts Khmer digits', () => {
  const onChange = vi.fn();
  render(<CountryPhoneInput value="" onChange={onChange} />);
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: '០១២៣៤៥៦៧៨' } });
  expect(onChange).toHaveBeenLastCalledWith('+85512345678');
});
it('preserves an existing international number instead of changing its country', () => {
  const onChange = vi.fn();
  render(<CountryPhoneInput value="+14155550123" onChange={onChange} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '4155550124' } });
  expect(onChange).toHaveBeenLastCalledWith('+14155550124');
});
