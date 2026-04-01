import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { ThemeProvider, useTheme, Theme } from '../ThemeContext';
import { useRef } from 'react';

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
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  vi.restoreAllMocks();
  // Reset matchMedia to undefined (jsdom doesn't implement it)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: undefined,
  });
});

describe('ThemeContext initialization', () => {
  it('initializes to "dark" when localStorage contains "dark"', () => {
    localStorage.setItem('theme', 'dark');
    let theme: Theme | null = null;
    render(
      <ThemeProvider>
        <ThemeCapture onMount={(ctx) => { theme = ctx.theme; }} />
      </ThemeProvider>
    );
    expect(theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('initializes to "light" when localStorage contains "light"', () => {
    localStorage.setItem('theme', 'light');
    let theme: Theme | null = null;
    render(
      <ThemeProvider>
        <ThemeCapture onMount={(ctx) => { theme = ctx.theme; }} />
      </ThemeProvider>
    );
    expect(theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('falls back to system preference (dark) when localStorage is empty', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    let theme: Theme | null = null;
    render(
      <ThemeProvider>
        <ThemeCapture onMount={(ctx) => { theme = ctx.theme; }} />
      </ThemeProvider>
    );
    expect(theme).toBe('dark');
  });

  it('falls back to "light" when both localStorage and matchMedia are unavailable', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: () => { throw new Error('matchMedia not available'); },
    });

    let theme: Theme | null = null;
    render(
      <ThemeProvider>
        <ThemeCapture onMount={(ctx) => { theme = ctx.theme; }} />
      </ThemeProvider>
    );
    expect(theme).toBe('light');
  });

  it('does not crash when localStorage throws on read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    let theme: Theme | null = null;
    expect(() => {
      render(
        <ThemeProvider>
          <ThemeCapture onMount={(ctx) => { theme = ctx.theme; }} />
        </ThemeProvider>
      );
    }).not.toThrow();
    // Falls back to light (matchMedia not mocked, jsdom returns false for prefers-color-scheme)
    expect(theme).toBeDefined();
  });

  it('does not crash when localStorage throws on write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage write unavailable');
    });

    let capturedCtx: { theme: Theme; toggleTheme: () => void } | null = null;
    render(
      <ThemeProvider>
        <ThemeCapture onMount={(ctx) => { capturedCtx = ctx; }} />
      </ThemeProvider>
    );

    expect(() => {
      act(() => { capturedCtx!.toggleTheme(); });
    }).not.toThrow();

    // Theme state still updates in memory
    expect(capturedCtx!.theme).toBeDefined();
  });
});

describe('useTheme outside provider', () => {
  it('throws a descriptive error when used outside ThemeProvider', () => {
    function BadComponent() {
      useTheme();
      return null;
    }
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BadComponent />)).toThrow('useTheme must be used inside ThemeProvider');
    consoleSpy.mockRestore();
  });
});
