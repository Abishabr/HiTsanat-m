// Feature: dark-light-mode, Property 5: Toggle icon reflects the opposite of the current theme
// Feature: dark-light-mode, Property 6: Toggle aria-label describes the forthcoming action

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { ThemeProvider, Theme } from '../../context/ThemeContext';
import { ThemeToggle } from '../ThemeToggle';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

// ---------------------------------------------------------------------------
// Property 5: Toggle icon reflects the opposite of the current theme
// Validates: Requirements 5.2, 5.3
// ---------------------------------------------------------------------------
describe('Property 5: Toggle icon reflects the opposite of the current theme', () => {
  it('renders Moon when light and Sun when dark', () => {
    fc.assert(
      fc.property(fc.constantFrom<Theme>('light', 'dark'), (theme) => {
        localStorage.setItem('theme', theme);

        const { container, unmount } = render(
          <ThemeProvider>
            <ThemeToggle />
          </ThemeProvider>
        );

        const button = container.querySelector('button')!;

        if (theme === 'light') {
          // Moon icon: lucide renders an svg with data-lucide="moon" or class containing "lucide-moon"
          const moonSvg = button.querySelector('[data-lucide="moon"], .lucide-moon, svg');
          expect(moonSvg).not.toBeNull();
          // Ensure no sun svg is present
          const sunSvg = button.querySelector('[data-lucide="sun"], .lucide-sun');
          expect(sunSvg).toBeNull();
        } else {
          // Sun icon
          const sunSvg = button.querySelector('[data-lucide="sun"], .lucide-sun, svg');
          expect(sunSvg).not.toBeNull();
          const moonSvg = button.querySelector('[data-lucide="moon"], .lucide-moon');
          expect(moonSvg).toBeNull();
        }

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
// Property 6: Toggle aria-label describes the forthcoming action
// Validates: Requirements 5.5
// ---------------------------------------------------------------------------
describe('Property 6: Toggle aria-label describes the forthcoming action', () => {
  it('aria-label references the opposite theme', () => {
    fc.assert(
      fc.property(fc.constantFrom<Theme>('light', 'dark'), (theme) => {
        localStorage.setItem('theme', theme);

        const { container, unmount } = render(
          <ThemeProvider>
            <ThemeToggle />
          </ThemeProvider>
        );

        const button = container.querySelector('button')!;
        const ariaLabel = button.getAttribute('aria-label') ?? '';

        if (theme === 'light') {
          expect(ariaLabel.toLowerCase()).toContain('dark');
        } else {
          expect(ariaLabel.toLowerCase()).toContain('light');
        }

        unmount();
        cleanup();
        localStorage.clear();
        document.documentElement.classList.remove('dark');
      }),
      { numRuns: 100 }
    );
  });
});
