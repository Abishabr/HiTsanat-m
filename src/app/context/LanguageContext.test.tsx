import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from './LanguageContext';

// Helper component that exposes context values for testing
function LanguageConsumer() {
  const { language, toggleLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="translation">{t('common.back')}</span>
      <button data-testid="toggle" onClick={toggleLanguage}>
        Toggle
      </button>
    </div>
  );
}

function MissingKeyConsumer() {
  const { t } = useLanguage();
  return <span data-testid="missing">{t('nonexistent.key')}</span>;
}

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 11.1 Test initial language defaults to 'en' when localStorage is empty
  it('defaults to "en" when localStorage is empty', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('language').textContent).toBe('en');
  });

  // 11.2 Test language restores from localStorage on mount
  it('restores language from localStorage on mount', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('am');

    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('language').textContent).toBe('am');
  });

  // 11.3 Test toggleLanguage switches between 'en' and 'am' and persists to localStorage
  it('toggleLanguage switches between "en" and "am" and persists to localStorage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('language').textContent).toBe('en');

    act(() => {
      screen.getByTestId('toggle').click();
    });

    expect(screen.getByTestId('language').textContent).toBe('am');
    expect(setItemSpy).toHaveBeenCalledWith('language', 'am');

    act(() => {
      screen.getByTestId('toggle').click();
    });

    expect(screen.getByTestId('language').textContent).toBe('en');
    expect(setItemSpy).toHaveBeenCalledWith('language', 'en');
  });

  // 11.4 Test t() returns correct translation for a known key in both languages
  it('t() returns correct translation for a known key in both languages', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>,
    );

    // In 'en': t('common.back') should return 'Back'
    expect(screen.getByTestId('translation').textContent).toBe('Back');

    // Switch to 'am'
    act(() => {
      screen.getByTestId('toggle').click();
    });

    // In 'am': t('common.back') should return 'ወደኋላ'
    expect(screen.getByTestId('translation').textContent).toBe('ወደኋላ');
  });

  // 11.5 Test t() returns the key itself as fallback when key is not found
  it('t() returns the key itself as fallback when key is not found', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    render(
      <LanguageProvider>
        <MissingKeyConsumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('missing').textContent).toBe('nonexistent.key');
  });

  // 11.6 Test graceful degradation when localStorage throws
  it('defaults to "en" and does not crash when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    expect(() => {
      render(
        <LanguageProvider>
          <LanguageConsumer />
        </LanguageProvider>,
      );
    }).not.toThrow();

    expect(screen.getByTestId('language').textContent).toBe('en');
  });
});
