import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ThemeContext, ThemeContextValue } from '../../context/ThemeContext';
import { ThemeToggle } from '../ThemeToggle';

function renderWithMockTheme(value: ThemeContextValue) {
  return render(
    <ThemeContext.Provider value={value}>
      <ThemeToggle />
    </ThemeContext.Provider>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  cleanup();
});

// Validates: Requirements 5.4
describe('ThemeToggle unit tests', () => {
  it('calls toggleTheme when clicked (light theme)', () => {
    const toggleTheme = vi.fn();
    const { container } = renderWithMockTheme({ theme: 'light', toggleTheme });

    fireEvent.click(container.querySelector('button')!);

    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('calls toggleTheme when clicked (dark theme)', () => {
    const toggleTheme = vi.fn();
    const { container } = renderWithMockTheme({ theme: 'dark', toggleTheme });

    fireEvent.click(container.querySelector('button')!);

    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });
});
