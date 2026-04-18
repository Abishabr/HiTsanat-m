import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';

describe('LanguageToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 12.1 Test renders "EN" when language is 'en'
  it('renders "EN" when language is "en"', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null); // defaults to 'en'

    render(
      <LanguageProvider>
        <LanguageToggle />
      </LanguageProvider>,
    );

    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  // 12.2 Test renders "አማ" when language is 'am'
  it('renders "አማ" when language is "am"', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('am');

    render(
      <LanguageProvider>
        <LanguageToggle />
      </LanguageProvider>,
    );

    expect(screen.getByText('አማ')).toBeInTheDocument();
  });

  // 12.3 Test calls toggleLanguage when clicked
  it('toggles language when clicked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null); // starts as 'en'

    render(
      <LanguageProvider>
        <LanguageToggle />
      </LanguageProvider>,
    );

    expect(screen.getByText('EN')).toBeInTheDocument();

    act(() => {
      screen.getByRole('button').click();
    });

    expect(screen.getByText('አማ')).toBeInTheDocument();
  });

  // 12.4 Test aria-label is present and correct for each language
  it('has correct aria-label in English', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null); // 'en'

    render(
      <LanguageProvider>
        <LanguageToggle />
      </LanguageProvider>,
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Toggle language');
  });

  it('has correct aria-label in Amharic', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('am');

    render(
      <LanguageProvider>
        <LanguageToggle />
      </LanguageProvider>,
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'ቋንቋ ቀይር');
  });
});
