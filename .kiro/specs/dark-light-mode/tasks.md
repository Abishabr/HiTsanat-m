# Implementation Plan: Dark / Light Mode

## Overview

Implement a `ThemeContext` that manages dark/light theme state, persists to `localStorage`, detects OS preference on first visit, and exposes a toggle button in the top navigation bar. The `dark` CSS class is toggled on `document.documentElement`; all visual changes are handled by the existing `theme.css` definitions.

## Tasks

- [ ] 1. Create ThemeContext and ThemeProvider
  - Create `src/app/context/ThemeContext.tsx` with `Theme` type, `ThemeContextValue` interface, `ThemeProvider` component, and `useTheme` hook
  - Implement initialization logic: read `localStorage["theme"]` → fall back to `window.matchMedia("(prefers-color-scheme: dark)")` → fall back to `"light"`
  - Wrap `localStorage` and `matchMedia` calls in try/catch to prevent crashes
  - On every theme change, write new value to `localStorage["theme"]` and sync the `dark` class on `document.documentElement`
  - Throw a descriptive error from `useTheme()` when consumed outside `ThemeProvider`
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 6.1, 7.1, 7.3_

  - [ ]* 1.1 Write property test for toggle round-trip (Property 1)
    - **Property 1: Toggle is a round-trip**
    - Generate a random initial theme; call `toggleTheme` twice; assert theme equals initial value
    - **Validates: Requirements 1.2, 1.4, 1.5**

  - [ ]* 1.2 Write property test for DOM class sync (Property 2)
    - **Property 2: DOM class always matches theme preference**
    - For each of `"light"` and `"dark"`, set theme and assert `document.documentElement.classList.contains("dark")` matches `theme === "dark"`
    - **Validates: Requirements 2.1, 2.2, 7.1**

  - [ ]* 1.3 Write property test for localStorage persistence round-trip (Property 3)
    - **Property 3: localStorage persistence round-trip**
    - Generate a random theme; call `toggleTheme`; assert `localStorage.getItem("theme")` equals the new theme value
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 1.4 Write property test for system preference fallback (Property 4)
    - **Property 4: System preference used as fallback initial theme**
    - Mock `matchMedia` with random dark/light result; mount with empty storage; assert initial theme matches mock
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [ ]* 1.5 Write property test for no CSS mutation (Property 7)
    - **Property 7: Theme context does not modify CSS custom properties**
    - After any number of toggles, assert `document.documentElement` has no `style` attribute mutations from the context
    - **Validates: Requirements 7.3**

  - [ ]* 1.6 Write unit tests for ThemeContext initialization and error handling
    - Test initializes to `"dark"` when `localStorage` contains `"dark"`
    - Test initializes to `"light"` when `localStorage` contains `"light"`
    - Test falls back to system preference when `localStorage` is empty
    - Test falls back to `"light"` when both `localStorage` and `matchMedia` are unavailable
    - Test does not crash when `localStorage` throws on read or write
    - _Requirements: 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_

- [ ] 2. Checkpoint — Ensure all ThemeContext tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Create ThemeToggle component
  - Create `src/app/components/ThemeToggle.tsx` as a `<Button variant="ghost" size="icon">` that consumes `useTheme()`
  - Render `Moon` icon when theme is `"light"`; render `Sun` icon when theme is `"dark"` (both from `lucide-react`)
  - Set `aria-label="Switch to dark mode"` when light, `"Switch to light mode"` when dark
  - Call `toggleTheme()` on click
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 3.1 Write property test for toggle icon (Property 5)
    - **Property 5: Toggle icon reflects the opposite of the current theme**
    - For each theme value, render `ThemeToggle` and assert `Moon` icon present when `"light"`, `Sun` icon present when `"dark"`
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 3.2 Write property test for aria-label (Property 6)
    - **Property 6: Toggle aria-label describes the forthcoming action**
    - For each theme value, render `ThemeToggle` and assert `aria-label` references the opposite theme
    - **Validates: Requirements 5.5**

  - [ ]* 3.3 Write unit tests for ThemeToggle
    - Test clicking the toggle calls `toggleTheme`
    - _Requirements: 5.4_

- [ ] 4. Wire ThemeProvider into App.tsx
  - In `src/app/App.tsx`, import `ThemeProvider` from `./context/ThemeContext`
  - Wrap the entire tree with `<ThemeProvider>` above `<AuthProvider>` so both login and authenticated views share theme state
  - _Requirements: 1.3, 6.1, 6.2, 6.3_

  - [ ]* 4.1 Write unit test for ThemeProvider placement
    - Assert `ThemeProvider` wraps `AuthProvider` in the rendered `App` tree
    - _Requirements: 1.3, 6.1_

- [ ] 5. Add ThemeToggle to Layout top bar
  - In `src/app/components/Layout.tsx`, import `ThemeToggle`
  - Render `<ThemeToggle />` in the top bar `<header>` alongside the existing icon buttons (Bell, Settings)
  - _Requirements: 5.1_

  - [ ]* 5.1 Write unit test for ThemeToggle in Layout
    - Assert `ThemeToggle` renders inside the Layout top bar
    - _Requirements: 5.1_

- [ ] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** (already installed) with Vitest and run a minimum of 100 iterations
- Each property test file should include a comment: `// Feature: dark-light-mode, Property <N>: <property_text>`
- The `dark` class is toggled only on `document.documentElement` — no inline styles or CSS variable overrides
