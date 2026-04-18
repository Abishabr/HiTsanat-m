import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext';
import MemberRegistrationForm from './MemberRegistrationForm';
import ChildrenRegistrationForm from './ChildrenRegistrationForm';

// ── Mock context providers that require Supabase ──────────────────────────

vi.mock('../context/DataStore', () => ({
  useDataStore: () => ({ addMember: vi.fn().mockResolvedValue(undefined) }),
  DataStoreProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../context/ScheduleStore', () => ({
  useSchedule: () => ({ subDepts: [], notifications: [], markNotificationsRead: vi.fn() }),
  ScheduleProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, isLoading: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ── Helpers ───────────────────────────────────────────────────────────────

function renderMemberForm(lang: 'en' | 'am' = 'en') {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
    if (key === 'language') return lang;
    return null;
  });
  return render(
    <LanguageProvider>
      <MemberRegistrationForm />
    </LanguageProvider>,
  );
}

function renderChildrenForm(lang: 'en' | 'am' = 'en') {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
    if (key === 'language') return lang;
    return null;
  });
  return render(
    <LanguageProvider>
      <ChildrenRegistrationForm />
    </LanguageProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Form Translation Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 13.1 MemberRegistrationForm displays English text by default
  describe('13.1 MemberRegistrationForm — English by default', () => {
    it('shows "Member Registration" title when language is "en"', () => {
      renderMemberForm('en');
      expect(screen.getByText('Member Registration')).toBeInTheDocument();
    });

    it('shows "Personal" step label when language is "en"', () => {
      renderMemberForm('en');
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });
  });

  // 13.2 MemberRegistrationForm updates to Amharic when language is switched
  describe('13.2 MemberRegistrationForm — Amharic', () => {
    it('shows "የአባል ምዝገባ" title when language is "am"', () => {
      renderMemberForm('am');
      expect(screen.getByText('የአባል ምዝገባ')).toBeInTheDocument();
    });

    it('shows "ግላዊ" step label when language is "am"', () => {
      renderMemberForm('am');
      expect(screen.getByText('ግላዊ')).toBeInTheDocument();
    });
  });

  // 13.3 ChildrenRegistrationForm updates to Amharic when language is switched
  describe('13.3 ChildrenRegistrationForm — Amharic', () => {
    it('shows "የልጆች ምዝገባ" title when language is "am"', () => {
      renderChildrenForm('am');
      expect(screen.getByText('የልጆች ምዝገባ')).toBeInTheDocument();
    });

    it('shows "የልጅ መረጃ" step label when language is "am"', () => {
      renderChildrenForm('am');
      // "የልጅ መረጃ" appears both as a step label in the wizard and as a section title
      const elements = screen.getAllByText('የልጅ መረጃ');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 13.4 Step labels translate in both forms
  describe('13.4 Step labels translate in both forms', () => {
    it('MemberRegistrationForm shows all English step labels', () => {
      renderMemberForm('en');
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Campus')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('Kehnet')).toBeInTheDocument();
      expect(screen.getByText('Photo')).toBeInTheDocument();
    });

    it('MemberRegistrationForm shows all Amharic step labels', () => {
      renderMemberForm('am');
      expect(screen.getByText('ግላዊ')).toBeInTheDocument();
      expect(screen.getByText('ካምፓስ')).toBeInTheDocument();
      expect(screen.getByText('ግንኙነት')).toBeInTheDocument();
      expect(screen.getByText('ቀህነት')).toBeInTheDocument();
      expect(screen.getByText('ፎቶ')).toBeInTheDocument();
    });
  });

  // 13.5 Validation messages appear in the active language
  describe('13.5 Validation messages in Amharic', () => {
    it('calls toast.error with Amharic error message when submitting without required fields', async () => {
      const { toast } = await import('sonner');
      renderMemberForm('am');

      // Navigate to the last step (step 4) by clicking "Next" 4 times
      // In Amharic, the Next button text is "ቀጣይ →"
      const getNextButton = () => screen.getByText(/ቀጣይ/);

      act(() => { fireEvent.click(getNextButton()); }); // step 0 → 1
      act(() => { fireEvent.click(getNextButton()); }); // step 1 → 2
      act(() => { fireEvent.click(getNextButton()); }); // step 2 → 3
      act(() => { fireEvent.click(getNextButton()); }); // step 3 → 4

      // Now on step 4 (Photo), the submit button should be visible
      // In Amharic: "✓ ምዝገባ አስገባ"
      const submitButton = screen.getByText(/ምዝገባ አስገባ/);
      act(() => { fireEvent.click(submitButton); });

      expect(toast.error).toHaveBeenCalledWith('የተሰጠ ስም እና የአባት ስም ያስፈልጋሉ');
    });
  });
});
