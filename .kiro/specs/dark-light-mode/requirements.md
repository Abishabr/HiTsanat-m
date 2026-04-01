# Requirements Document

## Introduction

This feature adds dark mode and light mode support to the Hitsanat KFL Management System. The app already defines CSS custom properties for both themes in `src/styles/theme.css` (`:root` for light, `.dark` class for dark). The feature introduces a `ThemeContext` to manage theme state, persists the user's preference, respects the OS-level preference on first visit, and exposes a toggle control in the application's top navigation bar.

## Glossary

- **Theme_Context**: The React context responsible for storing and exposing the current theme state and the toggle function.
- **Theme_Toggle**: The UI control (button/switch) rendered in the top navigation bar that allows the user to switch between light and dark mode.
- **Theme_Preference**: The user's chosen theme value, either `"light"` or `"dark"`.
- **System_Preference**: The operating system or browser-level color scheme preference, detected via the `prefers-color-scheme` media query.
- **Dark_Class**: The CSS class `dark` applied to the `<html>` element that activates the dark theme CSS variables defined in `theme.css`.
- **Local_Storage**: The browser's `localStorage` API used to persist the Theme_Preference across sessions.

---

## Requirements

### Requirement 1: Theme State Management

**User Story:** As a developer, I want a centralized theme context, so that any component in the app can read and change the current theme without prop drilling.

#### Acceptance Criteria

1. THE Theme_Context SHALL expose the current Theme_Preference value (`"light"` or `"dark"`).
2. THE Theme_Context SHALL expose a `toggleTheme` function that switches the Theme_Preference between `"light"` and `"dark"`.
3. THE Theme_Context SHALL be provided at the application root so that all child components can consume it.
4. WHEN `toggleTheme` is called while the current Theme_Preference is `"light"`, THE Theme_Context SHALL update the Theme_Preference to `"dark"`.
5. WHEN `toggleTheme` is called while the current Theme_Preference is `"dark"`, THE Theme_Context SHALL update the Theme_Preference to `"light"`.

---

### Requirement 2: DOM Class Application

**User Story:** As a user, I want the correct theme to be visually applied to the entire application, so that all colors and styles reflect my chosen theme.

#### Acceptance Criteria

1. WHEN the Theme_Preference is `"dark"`, THE Theme_Context SHALL add the Dark_Class to the `<html>` element.
2. WHEN the Theme_Preference is `"light"`, THE Theme_Context SHALL remove the Dark_Class from the `<html>` element.
3. WHEN the Theme_Preference changes, THE Theme_Context SHALL apply the corresponding DOM change synchronously before the next render paint.

---

### Requirement 3: Persistence Across Sessions

**User Story:** As a user, I want my theme preference to be remembered between visits, so that I don't have to re-select my preferred theme every time I open the app.

#### Acceptance Criteria

1. WHEN the user changes the Theme_Preference, THE Theme_Context SHALL write the new value to Local_Storage under the key `"theme"`.
2. WHEN the application initialises, THE Theme_Context SHALL read the stored value from Local_Storage under the key `"theme"`.
3. WHEN a valid stored value (`"light"` or `"dark"`) exists in Local_Storage, THE Theme_Context SHALL use that value as the initial Theme_Preference.
4. IF Local_Storage is unavailable or throws an error, THEN THE Theme_Context SHALL fall back to the System_Preference without crashing.

---

### Requirement 4: System Preference Detection

**User Story:** As a first-time user, I want the app to default to my OS color scheme preference, so that the initial experience matches my system settings without any manual configuration.

#### Acceptance Criteria

1. WHEN no Theme_Preference is stored in Local_Storage, THE Theme_Context SHALL detect the System_Preference using the `prefers-color-scheme: dark` media query.
2. WHEN the System_Preference is `dark` and no stored preference exists, THE Theme_Context SHALL initialise the Theme_Preference to `"dark"`.
3. WHEN the System_Preference is `light` (or not detectable) and no stored preference exists, THE Theme_Context SHALL initialise the Theme_Preference to `"light"`.

---

### Requirement 5: Theme Toggle Control

**User Story:** As a user, I want a visible toggle in the navigation bar, so that I can switch themes at any time while using the app.

#### Acceptance Criteria

1. THE Theme_Toggle SHALL be rendered in the top navigation bar of the Layout component.
2. WHEN the current Theme_Preference is `"light"`, THE Theme_Toggle SHALL display a moon icon to indicate that clicking will switch to dark mode.
3. WHEN the current Theme_Preference is `"dark"`, THE Theme_Toggle SHALL display a sun icon to indicate that clicking will switch to light mode.
4. WHEN the user activates the Theme_Toggle, THE Theme_Context `toggleTheme` function SHALL be called.
5. THE Theme_Toggle SHALL include an accessible `aria-label` that describes the action it will perform (e.g., `"Switch to dark mode"` or `"Switch to light mode"`).

---

### Requirement 6: Authenticated and Unauthenticated Views

**User Story:** As a user, I want the theme to apply consistently on both the login page and the authenticated app, so that the experience is coherent regardless of my authentication state.

#### Acceptance Criteria

1. THE Theme_Context SHALL be provided at the application root, wrapping both the authenticated and unauthenticated (Login) views.
2. WHEN the Dark_Class is present on the `<html>` element, THE Login page SHALL render using the dark theme CSS variables.
3. WHEN the Dark_Class is present on the `<html>` element, THE authenticated Layout SHALL render using the dark theme CSS variables.

---

### Requirement 7: Tailwind Dark Mode Compatibility

**User Story:** As a developer, I want the theme system to integrate with the existing Tailwind CSS and shadcn/ui setup, so that all existing and future components automatically support both themes.

#### Acceptance Criteria

1. THE Theme_Context SHALL apply the Dark_Class to the `<html>` element, consistent with the `@custom-variant dark (&:is(.dark *))` declaration in `theme.css`.
2. WHEN the Dark_Class is applied to the `<html>` element, ALL shadcn/ui components SHALL render using the dark CSS custom property values defined in the `.dark` block of `theme.css`.
3. THE Theme_Context SHALL NOT modify or override any existing CSS custom property values in `theme.css`.
