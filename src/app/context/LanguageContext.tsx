import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { translations } from '../lib/translations';

export type Language = 'en' | 'am';

export interface LanguageContextValue {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem('language');
    if (stored === 'en' || stored === 'am') return stored;
  } catch { /* ignore */ }
  return 'en';
}

function applyLanguage(language: Language) {
  try {
    localStorage.setItem('language', language);
  } catch { /* ignore */ }
}

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  const toggleLanguage = () => {
    const newLang: Language = language === 'en' ? 'am' : 'en';
    setLanguage(newLang);
    applyLanguage(newLang);

    // Announce language change to screen readers
    const announcement =
      newLang === 'en' ? 'Language changed to English' : 'ቋንቋ ወደ አማርኛ ተቀይሯል';

    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.className = 'sr-only';
    liveRegion.textContent = announcement;
    document.body.appendChild(liveRegion);

    setTimeout(() => document.body.removeChild(liveRegion), 1000);
  };

  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.');
      let value: unknown = translations[language];

      for (const k of keys) {
        if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
          value = (value as Record<string, unknown>)[k];
        } else {
          console.warn(`Translation key not found: ${key}`);
          return key;
        }
      }

      return typeof value === 'string' ? value : key;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
