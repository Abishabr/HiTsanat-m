// Feature: dark-light-mode, Property 1: Toggle is a round-trip
// Feature: dark-light-mode, Property 2: DOM class always matches theme preference
// Feature: dark-light-mode, Property 3: localStorage persistence round-trip
// Feature: dark-light-mode, Property 4: System preference used as fallback initial theme
// Feature: dark-light-mode, Property 7: Theme context does not modify CSS custom properties

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { ThemeProvider, useTheme, Theme } from '../ThemeContext';
import { useRef } from 'react';

// Helper: a component that exposes theme context values via a ref
function ThemeCapture({
  onMount,
}: {
  onMount: (ctx: { theme: Theme; toggleTheme: () => void }) => void;
}) {
  const ctx = useTheme();
  const called = useRef(false);
  if (!called.current) {
    called.current = true;
    onMount(ctx);
  }
  return null;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  document.documentElement.removeAttribute('style');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Property 1: Toggle is a round-trip
// Validates: Requirements 1.2, 1.4, 1.5
// ---------------------------------------------------------------------------
describe('Property 1: Toggle is a round-trip', () => {
  it('calling toggleTheme twice returns to the initial theme', () => {
    fc.assert(
      fc.property(fc.constantFrom<Theme>('light', 'dark'), (initialTheme) => {
        // Seed localStorage so the provider starts with the desired theme
        localStorage.setItem('theme', initialTheme);

        let capturedCtx: { theme: Theme; toggleTheme: () => void } | null = null;

        const { unmount } = render(
          <ThemeProvider>
            <ThemeCapture onMount={(ctx) => { capturedCtx = ctx; }} />
          </ThemeProvider>
        );

        expect(capturedCtx!.theme).toBe(initialTheme);

        act(() => { capturedCtx!.toggleTheme(); });
        act(() => { capturedCtx!.toggleTheme(); });

        expect(capturedCtx!.theme).toBe(initialTheme);

        unmount();
        cleanup();
        localStorage.clear();
        document.documentElement.classList.remove('dark');
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: DOM class always matches theme preference
// Validates: Requirements 2.1, 2.2, 7.1
// ---------------------------------------------------------------------------
describe('Property 2: DOM class always matches theme preference', () => {
  it('document.documentElement.classList.contains("dark") matches theme === "dark"', () => {
    fc.assert(
      fc.property(fc.constantFrom<Theme>('light', 'dark'), (theme) => {
        localStorage.setItem('theme', theme);

        const { unmount } = render(<ThemeProvider>{null}</ThemeProvider>);

        expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark');

        unmount();
        cleanup();
        localStorage.clear();
        document.documentElement.classList.remove('dark');
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: localStorage persistence round-trip
// Validates: Requirements 3.1, 3.2, 3.3
// ---------------------------------------------------------------------------
describe('Property 3: localStorage persistence round-trip', () => {
  it('after toggleTheme, localStorage["theme"] equals the new theme', () => {
    fc.assert(
      fc.property(fc.constantFrom<Theme>('light', 'dark'), (initialTheme) => {
        localStorage.setItem('theme', initialTheme);

        let capturedCtx: { theme: Theme; toggleTheme: () => void } | null = null;

        const { unmount } = render(
          <ThemeProvider>
            <ThemeCapture onMount={(ctx) => { capturedCtx = ctx; }} />
          </ThemeProvider>
        );

        act(() => { capturedCtx!.toggleTheme(); });

        const expectedNew: Theme = initialTheme === 'light' ? 'dark' : 'light';
        expect(localStorage.getItem('theme')).toBe(expectedNew);

        unmount();
        cleanup();
        localStorage.clear();
        document.documentElement.classList.remove('dark');
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: System preference used as fallback initial theme
// Validates: Requirements 4.1, 4.2, 4.3
// ---------------------------------------------------------------------------
describe('Property 4: System preference used as fallback initial theme', () => {
  it('initial theme matches matchMedia result when localStorage is empty', () => {
    fc.assert(
      fc.property(fc.boolean(), (prefersDark) => {
        localStorage.clear();

        // Mock matchMedia (jsdom doesn't implement it, so we define it directly)
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          configurable: true,
          value: (query: string) => ({
            matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }),
        });

        let capturedTheme: Theme | null = null;

        const { unmount } = render(
          <ThemeProvider>
            <ThemeCapture onMount={(ctx) => { capturedTheme = ctx.theme; }} />
          </ThemeProvider>
        );

        const expected: Theme = prefersDark ? 'dark' : 'light';
        expect(capturedTheme).toBe(expected);

        unmount();
        cleanup();
        localStorage.clear();
        document.documentElement.classList.remove('dark');
        // Reset matchMedia to undefined after each iteration
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          configurable: true,
          value: undefined,
        });
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Theme context does not modify CSS custom properties
// Validates: Requirements 7.3
// ---------------------------------------------------------------------------
describe('Property 7: Theme context does not modify CSS custom properties', () => {
  it('document.documentElement has no style attribute mutations after any number of toggles', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Theme>('light', 'dark'),
        fc.integer({ min: 0, max: 10 }),
        (initialTheme, toggleCount) => {
          localStorage.setItem('theme', initialTheme);
          document.documentElement.removeAttribute('style');

          let capturedCtx: { theme: Theme; toggleTheme: () => void } | null = null;

          const { unmount } = render(
            <ThemeProvider>
              <ThemeCapture onMount={(ctx) => { capturedCtx = ctx; }} />
            </ThemeProvider>
          );

          for (let i = 0; i < toggleCount; i++) {
            act(() => { capturedCtx!.toggleTheme(); });
          }

          // The context must NOT set any inline styles on documentElement
          expect(document.documentElement.getAttribute('style')).toBeNull();

          unmount();
          cleanup();
          localStorage.clear();
          document.documentElement.classList.remove('dark');
          document.documentElement.removeAttribute('style');
        }
      ),
      { numRuns: 100 }
    );
  });
});
